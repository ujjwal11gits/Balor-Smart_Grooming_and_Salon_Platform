const express = require('express');
const router = express.Router();
const { getAnswer } = require('../services/faqService'); // returns answer for a question

// Rate limiter: 10 requests per IP per minute
const rateLimit = require('express-rate-limit');

/**
 * `chatLimiter` middleware
 * - Protects the chatbot endpoint from abuse by limiting requests to 10 per
 *   IP per minute and returns a friendly rate-limit message on excess.
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests — please wait a moment before asking again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/chatbot
 * - Accepts `{ question }` in the request body and returns `{ answer }`.
 * - Validates the question is present and non-empty, applies `chatLimiter`.
 * - Uses `getAnswer` from `faqService` to compute the response; returns
 *   400 for missing input and 500 on internal errors.
 */
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

// Export the router so this route can be mounted (typically at `/api/chatbot`).
module.exports = router;
