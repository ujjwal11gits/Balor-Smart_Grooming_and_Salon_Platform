const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Salon = require('../models/Salon');
const { sendMail, sendMailBackground } = require('../utils/mailer');

const signAccess = (user) =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

const signRefresh = (user) => {
  const days = process.env.SESSION_EXPIRY_DAYS || '30';
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: `${days}d`,
  });
};

const getCookieOptions = () => {
  const days = Number(process.env.SESSION_EXPIRY_DAYS) || 30;
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: days * 24 * 60 * 60 * 1000
  };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, salonName, salonAddress, salonRegId } = req.body;
    const allowedRoles = ['user', 'shop'];
    if (role && !allowedRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    let user = await User.findOne({ email });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: 'Email already registered' });
      } else {
        // Unverified user trying again -> update info and resend OTP
        user.name = name;
        user.password = password; // will be hashed by pre-save
        user.role = role || 'user';
        user.phone = phone;
        user.otpCode = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
        
        // If shop role, update or create salon
        if (user.role === 'shop') {
          await Salon.findOneAndUpdate(
            { ownerId: user._id },
            { name: salonName || `${name}'s Salon`, address: salonAddress || 'Address not set', registrationId: salonRegId },
            { upsert: true }
          );
        }
      }
    } else {
      user = await User.create({ 
        name, email, password, role: role || 'user', phone,
        otpCode: otp,
        otpExpiry,
        isVerified: false
      });
      
      // Auto-create Salon for shop owners
      if (user.role === 'shop') {
        await Salon.create({
          name: salonName || `${name}'s Salon`,
          address: salonAddress || 'Address not set',
          ownerId: user._id,
          registrationId: salonRegId,
        });
      }
    }

    // Send OTP email
    await sendMail({
      to: email,
      subject: 'Verify your Balor Registration',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#e94560">&#9986; Balor</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Welcome to Balor! Use the OTP below to verify your email and complete registration. It expires in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:28px 0">
            <span style="font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#111;background:#f4f4f4;padding:18px 32px;border-radius:12px;display:inline-block">${otp}</span>
          </div>
          <p style="color:#666;font-size:0.9rem">If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#aaa;font-size:0.8rem">&copy; ${new Date().getFullYear()} Balor &mdash; Smart Grooming & Salon Platform</p>
        </div>
      `,
    });

    // Return a short-lived temp token so frontend can call verify-otp
    const tempToken = jwt.sign(
      { id: user._id, purpose: 'otp' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.status(201).json({ requiresOtp: true, tempToken, email, testOtp: process.env.SMTP_HOST ? undefined : otp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Email not verified. Please register again to verify your email.' });
    }

    const refreshToken = signRefresh(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    let salonId = null;
    if (user.role === 'shop') {
      const salon = await Salon.findOne({ ownerId: user._id });
      salonId = salon ? salon._id : null;
    }

    res.json({
      token: signAccess(user),
      role: user.role,
      name: user.name,
      id: user._id,
      avatar: user.avatar,
      salonId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp  — Step 2: verify OTP, return full token
router.post('/verify-otp', async (req, res) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp)
      return res.status(400).json({ message: 'Missing token or OTP' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    if (decoded.purpose !== 'otp')
      return res.status(401).json({ message: 'Invalid session token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.otpCode || user.otpCode !== otp)
      return res.status(400).json({ message: 'Incorrect OTP' });
    if (!user.otpExpiry || user.otpExpiry < new Date())
      return res.status(400).json({ message: 'OTP has expired. Please log in again.' });

    // Clear OTP, mark verified, and issue tokens
    user.isVerified = true;
    user.otpCode   = undefined;
    user.otpExpiry = undefined;
    const refreshToken = signRefresh(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    let salonId = null;
    if (user.role === 'shop') {
      const salon = await Salon.findOne({ ownerId: user._id });
      salonId = salon ? salon._id : null;
    }

    res.json({
      token: signAccess(user),
      role: user.role,
      name: user.name,
      id: user._id,
      avatar: user.avatar,
      salonId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token cookie' });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: 'Invalid refresh token' });

    res.json({ token: signAccess(user) });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // ✅ Respond immediately — token is saved in DB
    res.json({ message: 'If that email exists, a reset link was sent.' });

    // 🔔 Send reset link email in background (not OTP, just a link notification)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    sendMailBackground({
      to: email,
      subject: 'Password Reset — Balor',
      html: `<p>Click to reset your password (valid 1 hour):</p><a href="${resetUrl}">${resetUrl}</a>`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetToken: hashed,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.password = req.body.password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password-otp
router.post('/forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not registered' });
    if (!user.isVerified) return res.status(400).json({ message: 'Email not verified. Please register first.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendMail({
      to: email,
      subject: 'Password Reset OTP — Balor',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#e94560">&#9986; Balor</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password. Use the OTP below to verify your identity. It expires in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:28px 0">
            <span style="font-size:2.4rem;font-weight:900;letter-spacing:0.18em;color:#111;background:#f4f4f4;padding:18px 32px;border-radius:12px;display:inline-block">${otp}</span>
          </div>
          <p style="color:#666;font-size:0.9rem">If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#aaa;font-size:0.8rem">&copy; ${new Date().getFullYear()} Balor &mdash; Smart Grooming & Salon Platform</p>
        </div>
      `,
    });

    const tempToken = jwt.sign(
      { email, purpose: 'reset-otp-verify' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ requiresOtp: true, tempToken, email, testOtp: process.env.SMTP_HOST ? undefined : otp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp)
      return res.status(400).json({ message: 'Missing token or OTP' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please try again.' });
    }

    if (decoded.purpose !== 'reset-otp-verify')
      return res.status(401).json({ message: 'Invalid session token' });

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.otpCode || user.otpCode !== otp)
      return res.status(400).json({ message: 'Incorrect OTP' });
    if (!user.otpExpiry || user.otpExpiry < new Date())
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    // Clear OTP
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password-action' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ success: true, resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password-otp
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password)
      return res.status(400).json({ message: 'Missing reset token or password' });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Reset session expired. Please request OTP again.' });
    }

    if (decoded.purpose !== 'reset-password-action')
      return res.status(401).json({ message: 'Invalid reset token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
