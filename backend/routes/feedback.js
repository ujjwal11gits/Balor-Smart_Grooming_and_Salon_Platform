const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Notification = require('../models/Notification');

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

// POST /api/feedback - Public endpoint to submit feedback
router.post('/', optionalAuth, async (req, res) => {
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

    // Trigger real-time notifications to Admins ONLY if feedback is a Bug
    if (type === 'bug') {
      try {
        const admins = await User.find({ role: 'admin' }).select('_id');
        const notifications = admins.map((admin) => ({
          userId: admin._id,
          message: `New bug report from ${feedback.userName || feedback.userEmail || 'Guest'}: "${description.substring(0, 35)}..."`,
          type: 'feedback_created',
          link: '/admin/dashboard',
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notifErr) {
        console.error('Failed to create admin notifications for bug report:', notifErr);
      }
    }

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
