// scripts/embedFaq.js
// Reads backend/data/faq.json, generates embeddings via Gemini, and upserts into Chroma.

const path = require('path');
const fs = require('fs');
const { generateEmbedding } = require('../backend/services/geminiService');
const { upsertFAQs } = require('../backend/services/chromaStore');

async function main() {
  const faqPath = path.resolve(__dirname, '../backend/data/faq.json');
  const raw = fs.readFileSync(faqPath, 'utf-8');
  const faqs = JSON.parse(raw);

  // Generate embeddings for each FAQ (question + answer combined)
  const embeddings = [];
  for (const item of faqs) {
    const text = `${item.question}\n${item.answer}`;
    try {
      const vec = await generateEmbedding(text);
      embeddings.push(vec);
    } catch (e) {
      console.error('Embedding failed for', item.question, e);
      process.exit(1);
    }
  }

  await upsertFAQs(faqs, embeddings);
  console.log('✅ FAQ embeddings indexed in Chroma');
}

main().catch(err => {
  console.error('Fatal error in embedFaq:', err);
  process.exit(1);
});
