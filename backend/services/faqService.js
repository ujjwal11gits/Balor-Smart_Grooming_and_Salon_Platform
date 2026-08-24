// backend/services/faqService.js
// Smart FAQ service with keyword-based matching, intent detection, and graceful fallbacks.
const path = require('path');
const { generateChat } = require('./geminiService');

const faqs = require(path.resolve(__dirname, '../data/faq.json'));

// ── Stop words to ignore ──
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'the', 'a', 'an', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'not', 'and', 'but', 'or', 'if', 'of', 'at', 'by', 'for', 'with', 'about',
  'to', 'from', 'in', 'on', 'it', 'its', 'this', 'that', 'what', 'which',
  'who', 'when', 'where', 'why', 'all', 'each', 'some', 'any', 'no',
  'so', 'than', 'too', 'very', 'just', 'also', 'more', 'there', 'here',
  'then', 'now', 'get', 'got', 'make', 'give', 'want', 'need', 'tell',
  'please', 'hey', 'hello', 'thanks', 'thank', 'know', 'like', 'thing',
  'way', 'let', 'use', 'take', 'go', 'going', 'come', 'see'
]);

// ── Greeting / chitchat patterns ──
const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|hola|yo|sup|hii+|heyy+)\s*[!?.]*$/i,
  /^good\s+(morning|afternoon|evening|day)/i,
  /^what'?s?\s+up/i,
];
const GREETING_RESPONSES = [
  "Hey there! 👋 Welcome to Balor. I can help you with bookings, finding salons, services, account help, and more. What would you like to know?",
  "Hi! 😊 I'm your Balor assistant. Ask me about booking a service, finding salons, managing your account, or anything about our platform!",
  "Hello! 👋 I'm here to help. You can ask about how to book, cancel, pay, register, or anything about using Balor!",
];

const IDENTITY_PATTERNS = [
  /what.*(?:your|ur)\s*name/i,
  /who\s+are\s+you/i,
  /what\s+are\s+you/i,
  /tell.*about\s+(?:you|yourself)/i,
  /introduce/i,
];
const IDENTITY_RESPONSE = "I'm the Balor Assistant — your friendly helper built into this salon booking platform! 💈 I can answer questions about bookings, services, salon discovery, your account, and how the app works. Ask me anything!";

const WELLBEING_PATTERNS = [
  /how\s+are\s+you/i,
  /how.*doing/i,
  /how.*going/i,
  /you\s+(?:okay|ok|good|fine|alright)/i,
];
const WELLBEING_RESPONSE = "I'm doing great, thanks for asking! 😊 Ready to help you out. What can I assist you with — booking a service, finding a salon, or something else?";

const CAPABILITIES_PATTERNS = [
  /what\s+(?:can|do)\s+you\s+(?:do|answer|help|know)/i,
  /what\s+(?:questions|things|topics)/i,
  /what.*answers.*give/i,
  /help.*with/i,
  /capabilities/i,
  /what.*you.*help/i,
];
const CAPABILITIES_RESPONSE = "Here's what I can help with! 😊\n\n📅 Bookings — How to book, cancel, or check your bookings\n🔍 Salons — Finding and searching salons near you\n💈 Services — What services are available and pricing\n👤 Account — Registration, login, password reset\n💳 Payments — How and when to pay\n⏳ Waitlist — What to do when slots are full\n⭐ Reviews — How to rate your barber\n🏪 Shop owners — Managing your salon dashboard\n\nJust ask naturally!";

const THANKS_PATTERNS = [/\b(thanks|thank\s+you|thx|ty|appreciate)\b/i];
const THANKS_RESPONSES = [
  "You're welcome! 😊 Let me know if there's anything else I can help with.",
  "Happy to help! Feel free to ask more questions anytime. 💈",
  "Glad I could help! 😊 Anything else on your mind?",
];

const GOODBYE_PATTERNS = [/\b(bye|goodbye|see\s+you|take\s+care|cya|later|gotta\s+go)\b/i];
const GOODBYE_RESPONSES = [
  "Goodbye! 👋 Have a great day. Come back anytime you need help!",
  "See you later! 😊 Enjoy your salon experience!",
  "Bye! 👋 We're always here if you need us. Take care!",
];

function randomPick(arr) {
  // return a random element from an array
  return arr[Math.floor(Math.random() * arr.length)];
}

function matchesAny(query, patterns) {
  // return true if any regex pattern matches the query
  return patterns.some(p => p.test(query));
}

/** Tokenize into meaningful words */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Score a FAQ using its keywords field (primary) + question text (secondary).
 * Keywords from the FAQ definition are explicitly curated, so matches there are higher-quality.
 */
function scoreFaq(faq, queryTokens) {
  const faqKeywords = (faq.keywords || []).map(k => k.toLowerCase());
  const faqQuestion = faq.question.toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    // Exact keyword match = 3 points (high confidence)
    if (faqKeywords.includes(token)) {
      score += 3;
    }
    // Partial keyword match (e.g., "booking" matches "book") = 2 points
    else if (faqKeywords.some(k => k.startsWith(token) || token.startsWith(k))) {
      score += 2;
    }
    // Question text match = 1 point
    else if (faqQuestion.includes(token)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Main: Get a chatbot answer for the user's question.
 */
async function getAnswer(question) {
  const q = question.trim();

  // ── 1. Handle greetings & chitchat ──
  if (matchesAny(q, GREETING_PATTERNS)) return randomPick(GREETING_RESPONSES);
  if (matchesAny(q, IDENTITY_PATTERNS)) return IDENTITY_RESPONSE;
  if (matchesAny(q, WELLBEING_PATTERNS)) return WELLBEING_RESPONSE;
  if (matchesAny(q, CAPABILITIES_PATTERNS)) return CAPABILITIES_RESPONSE;
  if (matchesAny(q, THANKS_PATTERNS)) return randomPick(THANKS_RESPONSES);
  if (matchesAny(q, GOODBYE_PATTERNS)) return randomPick(GOODBYE_RESPONSES);

  // ── 2. Keyword matching against FAQs ──
  const queryTokens = tokenize(q);
  if (queryTokens.length === 0) {
    return "I'm not sure I understood that. 😅 Could you rephrase? I can help with bookings, salons, services, account help, and more!";
  }

  const scored = faqs
    .map(f => ({ ...f, score: scoreFaq(f, queryTokens) }))
    .filter(f => f.score >= 3) // Minimum 3 points to avoid false matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // ── 3. Try Gemini for a natural answer ──
  if (scored.length > 0) {
    const context = scored
      .map((f, i) => `FAQ ${i + 1}:\nQ: ${f.question}\nA: ${f.answer}`)
      .join('\n\n');

    try {
      const prompt = `You are the virtual assistant for "Balor", a modern barber & salon booking app. Your name is Balor Assistant.

RULES:
- Answer ONLY using the FAQ context below. Do NOT invent information.
- Sound natural, warm, and conversational — like a helpful friend.
- Keep answers concise: 2-4 sentences max.
- Use a friendly emoji occasionally (but max 1-2 per answer).
- NEVER copy the FAQ answer word-for-word. Rephrase it in your own words naturally.
- If multiple FAQs are relevant, combine the key info into one cohesive answer.
- Use the actual feature names from the app (e.g., "Salons page", "My Bookings", "Dashboard").

FAQ Context:
${context}

User: ${q}
Assistant:`;
      const answer = await generateChat(prompt);
      if (answer && answer.trim().length > 10) {
        return answer.trim();
      }
    } catch (err) {
      console.error('Gemini failed, using fallback:', err.message);
    }

    // ── Fallback: return best FAQ answer (not raw — add a friendly wrapper) ──
    const best = scored[0];
    const wrappers = [
      `${best.answer}\n\nHope that helps! Let me know if you have more questions. 😊`,
      `Here's what I know: ${best.answer}\n\nAnything else I can help with?`,
      `${best.answer}\n\nFeel free to ask if you need more details! 💈`,
    ];
    return randomPick(wrappers);
  }

  // ── 4. No match — graceful response ──
  return "That's a great question, but it's outside what I can help with right now. 😊 I'm best at answering questions about:\n\n• Booking & managing appointments\n• Finding salons & services\n• Account, login & registration\n• Payments & cancellation\n• Waitlist & reviews\n• Shop owner dashboard features\n\nTry asking something like \"How do I book a service?\" or \"How do I cancel a booking?\"";
}

module.exports = { getAnswer };
