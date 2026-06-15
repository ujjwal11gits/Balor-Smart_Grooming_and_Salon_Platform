const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Rate limiter: max 5 requests per hour per IP to prevent spamming
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many feedback reports from this IP. Please try again after an hour.' }
});

// Optional middleware to extract user context if token is present
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore invalid token and treat user as guest
    }
  }
  next();
};

// POST /api/feedback - Public endpoint to submit feedback with rate limit protection
router.post('/', feedbackLimiter, optionalAuth, async (req, res) => {
  try {
    const { type, description, email, url, userAgent, screenSize } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'Type and description are required.' });
    }

    const feedbackData = {
      type,
      description,
      url,
      userAgent,
      screenSize,
    };

    // If user is authenticated, associate their details
    if (req.user) {
      feedbackData.userId = req.user.id;
      feedbackData.userEmail = req.user.email;
      feedbackData.userName = req.user.name;
    } else if (email) {
      // If guest user supplied their email
      feedbackData.userEmail = email;
    }

    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // Trigger notification to all admins ONLY if it is a Bug report
    if (type === 'bug') {
      try {
        const admins = await User.find({ role: 'admin' });
        const senderName = req.user ? req.user.name : (email ? email.split('@')[0] : 'Guest');
        let relativePath = 'the platform';
        if (url) {
          try {
            relativePath = new URL(url).pathname;
          } catch (e) {
            // ignore malformed url
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
