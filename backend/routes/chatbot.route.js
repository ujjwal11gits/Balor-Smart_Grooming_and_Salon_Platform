// backend/routes/chatbot.route.js
const express = require('express');
const router = express.Router();
const { getAnswer } = require('../services/faqService');

// Rate limiter: 10 requests per IP per minute
const rateLimit = require('express-rate-limit');
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests — please wait a moment before asking again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/chatbot  (mounted as app.use('/api/chatbot', ...))
router.post('/', chatLimiter, async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Please provide a question.' });
  }
  try {
    const answer = await getAnswer(question.trim());
    res.json({ answer });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Sorry, something went wrong. Please try again.' });
  }
});

module.exports = router;
