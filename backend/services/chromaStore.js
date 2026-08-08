// backend/services/chromaStore.js
// Simple wrapper around Chroma (SQLite) vector store.
// Uses @langchain/chroma (which provides a ChromaClient).

const { ChromaClient } = require("@langchain/chroma");
const path = require("path");

// Create a client that stores data in a local SQLite file inside the project.
const client = new ChromaClient({
  // Directory where Chroma will keep its DB (relative to project root).
  // Using an absolute path ensures it works with PM2.
  path: path.resolve(__dirname, "../../data/chroma"),
});

// Collection name for our FAQ vectors
const COLLECTION_NAME = "faq_collection";

/** Ensure the collection exists (creates if missing). */
async function getCollection() {
  const collections = await client.listCollections();
  const exists = collections.some(c => c.name === COLLECTION_NAME);
  if (!exists) {
    await client.createCollection({ name: COLLECTION_NAME, metadata: { description: "FAQ vectors for chatbot" } });
  }
  return client.getCollection(COLLECTION_NAME);
}

/** Upsert an array of FAQ objects into the collection.
 * @param {{question:string, answer:string, role:string}[]} faqs
 */
async function upsertFAQs(faqs, embeddings) {
  const collection = await getCollection();
  // Each document gets an id = `${role}-${index}`
  const ids = faqs.map((f, i) => `${f.role}-${i}`);
  const documents = faqs.map(f => `${f.question}\n${f.answer}`);
  // Metadata can be used for filtering later
  const metadatas = faqs.map(f => ({ role: f.role, question: f.question }));
  await collection.upsert({ ids, embeddings, documents, metadatas });
}

/** Perform a similarity search for a query.
 * @param {string} query
 * @param {number} k top‑k results
 * @param {string} role filter ("customer" or "shop")
 * @returns {Promise<Array<{question:string, answer:string, score:number}>>}
 */
async function similaritySearch(query, k = 3, role = null) {
  const collection = await getCollection();
  const results = await collection.query({ queryTexts: [query], nResults: k, where: role ? { role } : undefined });
  // results.documents is an array of arrays (one per query)
  const matches = results.documents[0].map((doc, idx) => ({
    id: results.ids[0][idx],
    content: doc,
    score: results.distances[0][idx],
    metadata: results.metadatas[0][idx]
  }));
  // Split content back into question/answer
  return matches.map(m => {
    const [question, answer] = m.content.split("\n");
    return { question, answer, score: m.score, role: m.metadata.role };
  });
}

module.exports = { upsertFAQs, similaritySearch };
