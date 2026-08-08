// backend/services/rag.service.js
// Orchestrates similarity search + Gemini LLM answer generation.
const { similaritySearch } = require('./chromaStore');
const { generateChat } = require('./geminiService');

/**
 * Get a chat answer for a user message.
 * @param {string} role - "customer" or "shop"
 * @param {string} message - user query
 * @returns {Promise<string>} answer
 */
async function getAnswer(role, message) {
  // 1️⃣ Retrieve top 3 relevant FAQs for the role
  const faqs = await similaritySearch(message, 3, role);
  // 2️⃣ Build a context string from the retrieved Q&A
  const context = faqs.map((f, i) => `FAQ ${i + 1}: Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  const prompt = `You are a helpful assistant for a barber appointment app. Use only the information below to answer the user's question. If the answer cannot be found, politely say you don't have that info.\n\nContext:\n${context}\n\nUser question: ${message}`;
  // 3️⃣ Call Gemini chat model
  const answer = await generateChat(prompt);
  return answer.trim();
}

module.exports = { getAnswer };
