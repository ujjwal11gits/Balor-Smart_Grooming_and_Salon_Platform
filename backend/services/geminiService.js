// backend/services/geminiService.js
// Wrapper around Google Gemini REST API for chat completions.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Generate a chat completion from a prompt.
 * @param {string} prompt – full prompt (including context)
 * @returns {Promise<string>} generated answer
 */
async function generateChat(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }
  const url = `${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Gemini API error ${res.status}:`, errBody);
    throw new Error(`Gemini API error: ${res.status}`);
  }
  const data = await res.json();
  const msg = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return msg || "";
}

module.exports = { generateChat };
