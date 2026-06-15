const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Feedback = require('../models/Feedback');

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

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
