const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Spam protection: max 3 feedback submissions per IP per 1 hour
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: 'Too many feedback reports from this IP. Please try again after an hour.' }
});

// Optional middleware to extract user context if JWT token is present
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Treat as guest if token is invalid or expired
    }
  }
  next();
};

// POST /api/feedback - Public endpoint with rate limiting
router.post('/', feedbackLimiter, optionalAuth, async (req, res) => {
  try {
    const { type, description, email, url, userAgent, screenSize } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'Type and description are required.' });
    }

    // Guest route restriction checks
    if (!req.user) {
      let isAuthPage = false;
      if (url) {
        try {
          const path = new URL(url).pathname;
          isAuthPage = ['/login', '/register', '/forgot-password'].includes(path) || path.startsWith('/reset-password');
        } catch (e) {
          // Fallback simple checks if URL parsing fails
          isAuthPage = url.includes('/login') || url.includes('/register') || url.includes('/forgot-password') || url.includes('/reset-password');
        }
      }
      if (!isAuthPage) {
        return res.status(403).json({ message: 'Feedback submissions are restricted to authenticated sessions on this page.' });
      }
    }

    const feedbackData = {
      type,
      description,
      url,
      userAgent,
      screenSize,
    };

    if (req.user) {
      feedbackData.userId = req.user.id;
      feedbackData.userEmail = req.user.email;
      feedbackData.userName = req.user.name;
    } else if (email) {
      feedbackData.userEmail = email;
    }

    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // Trigger notification to admins only if the category is a Urgent Bug
    if (type === 'bug') {
      try {
        const admins = await User.find({ role: 'admin' });
        const senderName = req.user ? req.user.name : (email ? email.split('@')[0] : 'Guest');
        let relativePath = 'the platform';
        if (url) {
          try {
            relativePath = new URL(url).pathname;
          } catch (e) {
            // Ignore malformed url
          }
        }

        const notificationPromises = admins.map(admin => {
          return new Notification({
            userId: admin._id,
            message: `Urgent Bug: ${senderName} reported an issue on ${relativePath}`,
            type: 'feedback_created',
            link: '/admin/dashboard'
          }).save();
        });

        await Promise.all(notificationPromises);
      } catch (notifyErr) {
        console.error('Failed to notify admins of feedback bug:', notifyErr);
      }
    }

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
