# Part 9: AI RAG Chatbot, Cloudflare & Resume Bullet Deep Dive

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Resume Focus:** AI RAG Chatbot (Google Gemini LLM), Cloudflare WAF, 4-Digit Service OTP, Business Analytics Pipelines, Multi-Tenant Security

---

## 📌 Table of Contents
1. [RAG Architecture & Google Gemini LLM Integration](#q1-how-is-the-ai-rag-retrieval-augmented-generation-chatbot-architected-using-google-gemini)
2. [Data Chunking & Keyword Retrieval Pipeline with Fallback](#q2-how-does-the-keyword-retrieval-pipeline-and-fallback-logic-work-in-your-rag-system)
3. [Preventing LLM Hallucinations & Managing Token Costs](#q3-how-do-you-prevent-llm-hallucinations-and-manage-api-rate-limits--token-costs-with-google-gemini)
4. [Cloudflare DNS/Proxy vs Nginx Setup on AWS EC2](#q4-how-does-cloudflare-dns-proxy-work-together-with-nginx-and-aws-ec2)
5. [4-Digit OTP Service Verification Lifecycle](#q5-how-does-the-4-digit-otp-service-verification-work-upon-booking-completion)
6. [Business Analytics Pipeline (Leaderboards & Heatmaps)](#q6-how-are-barber-leaderboards-peak-hour-charts-and-retention-metrics-calculated-in-mongodb)
7. [Multi-Tenant Scoping & Role Fencing](#q7-how-do-you-enforce-multi-tenant-data-fencing-across-customer-owner-barber-and-admin-roles)
8. [Automated Waitlist Real-Time Notification Pipeline](#q8-how-does-the-automated-waitlist-engine-trigger-real-time-notifications-upon-cancellation)
9. [PM2 Process Manager Cluster Mode & Auto-Restart](#q9-how-does-pm2-run-node-in-cluster-mode-and-ensure-zero-downtime)
10. [Rate-Limited JWT Authentication Infrastructure](#q10-how-is-jwt-authentication-hardened-with-rate-limiting-against-brute-force-attacks)
11. [Vector Database vs MongoDB Keyword/Vector Hybrid Search](#q11-why-use-mongodb-keywordvector-hybrid-retrieval-instead-of-a-dedicated-vector-database-like-pinecone)
12. [Handling Asynchronous AI LLM Stream Responses](#q12-how-do-you-stream-or-handle-async-responses-from-google-gemini-in-the-express-backend)
13. [Cloudflare WAF Rules & DDoS Protection Mechanics](#q13-what-security-protections-does-cloudflare-provide-in-front-of-nginx)
14. [Frontend Analytics Integration (`react-chartjs-2`)](#q14-how-do-you-render-real-time-analytics-dashboards-in-react-without-performance-lag)
15. [End-to-End Security Audit across Resume Tech Stack](#q15-give-a-complete-end-to-end-security-audit-of-balors-tech-stack)

---

### Q1: How is the AI RAG (Retrieval-Augmented Generation) Chatbot architected using Google Gemini?

**Difficulty:** Advanced AI / Backend  
**Importance:** 🔥🔥🔥🔥🔥 (Featured in Resume Bullet 2)

#### System Flow Diagram:
```
                                 ┌───────────────────────────────┐
                                 │ User Query ("What are hair    │
                                 │ haircut prices at Salon X?")  │
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │ Context Retrieval Step        │
                                 │ Query MongoDB Salon Services  │
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │ Construct Augmented Prompt     │
                                 │ "Context: [...] Question: [...]"│
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │ Google Gemini LLM API Call    │
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │ Sanitized JSON AI Response    │
                                 └───────────────────────────────┘
```

#### Explanation:
Standard LLMs hallucinate when asked about specific local business data (e.g. current pricing of a specific barber at Salon A). 

Our **RAG pipeline**:
1. Intercepts the user query in Express (`/api/chat`).
2. Extracts target `salonId` and performs a fast database lookup against `Salon` services and policy documents.
3. Constructs an **Augmented Prompt**:  
   `"You are a helpful salon assistant. Answer strictly using this context: [Salon Services & Prices]. Question: [User Question]"`
4. Dispatches prompt to **Google Gemini API** (`@google/generative-ai`), returning accurate, grounded responses.

---

### Q2: How does the Keyword Retrieval Pipeline and Fallback Logic work in your RAG system?

**Difficulty:** Practical AI Design  
**Importance:** 🔥🔥🔥🔥🔥 (Featured in Resume Bullet 2)

#### Breakdown:
To optimize latency and handle external API failures:
1. **Keyword Retrieval Pipeline:** We tokenized salon FAQs and service catalogs in MongoDB. When a query arrives, we perform a regex/text index search to fetch top 3 matching context snippets.
2. **Fallback Logic:** If Google Gemini API hits rate limits (429) or fails:
   - The system intercepts the catch block.
   - Falls back to a deterministic **Local Intent Rule Engine** (matching regex triggers like `prices`, `timing`, `address`).
   - Returns a structured rule-based response instantly without failing the customer chat session.

---

### Q3: How do you prevent LLM Hallucinations and manage API Rate Limits / Token Costs with Google Gemini?

**Difficulty:** AI System Optimization  
**Importance:** 🔥🔥🔥🔥

- **Preventing Hallucinations:** Include strict System Prompt instructions: *"If the answer is not present in the provided context, reply: 'I do not have pricing info for that specific service. Please call the salon directly.' Do not guess."*
- **Managing Token Costs:** Trim context payloads before sending to Gemini by truncating long descriptions and caching common salon FAQs in Redis with a 24-hour TTL.

---

### Q4: How does Cloudflare DNS/Proxy work together with Nginx and AWS EC2?

**Difficulty:** DevOps / Cloud  
**Importance:** 🔥🔥🔥🔥🔥 (Featured in Resume Bullet 5)

#### 1. What is Cloudflare's Role? (Edge Network Guard)
Cloudflare operates as an **Edge Network Reverse Proxy and Web Application Firewall (WAF)**.
- **Functions:** Manages DNS resolution via Anycast IP routing, absorbs L3/L4 volumetric DDoS floods at the edge, blocks malicious XSS/NoSQL injection payloads, and caches static assets globally.

#### 2. What is Nginx's Role on AWS EC2? (Origin Server Reverse Proxy)
Nginx operates inside the AWS EC2 virtual machine instance as the **Origin Server Reverse Proxy**.
- **Functions:** Receives HTTPS traffic forwarded from Cloudflare edge nodes, validates origin SSL certificates, terminates internal HTTPS, and proxies HTTP requests to PM2 Node.js instances (`http://127.0.0.1:5000`).

```
[ Client Browser ] ──► [ Cloudflare Edge (WAF + DNS + SSL) ] ──► [ AWS EC2 (Nginx :443) ] ──► [ PM2 Node :5000 ]
```

#### 3. Execution Steps:
1. **DNS Routing:** Domain `balorgrooming.com` points to Cloudflare Anycast IPs (Orange Cloud Proxy active).
2. **Cloudflare WAF:** Filters malicious SQL/NoSQL payloads, blocks bot scrapers, and terminates edge SSL.
3. **Nginx Reverse Proxy:** Cloudflare proxies requests to AWS EC2 Elastic IP. Nginx validates the `Cloudflare-SSL` origin, terminates internal HTTPS, and proxies traffic to localhost Node.js server (`http://127.0.0.1:5000`).

---

### Q5: How does the 4-Digit OTP Service Verification work upon booking completion?

**Difficulty:** Core Feature Logic  
**Importance:** 🔥🔥🔥🔥🔥 (Featured in Resume Bullet 1)

#### Problem & Solution:
*Problem:* Dishonest barbers could mark bookings as "Completed" prematurely to claim commissions without providing the service.

*Solution:*
1. When a customer books, the backend generates a cryptographically secure 4-digit code (`crypto.randomInt(1000, 9999)`) saved in `Booking` model as `completionOTP`.
2. The OTP is visible **only** on the customer's mobile app screen.
3. Upon finishing the haircut, the customer verbally shares the 4-digit OTP with the barber.
4. The barber submits the OTP via `/api/bookings/:id/complete`. The backend verifies `submittedOTP === booking.completionOTP` before transitioning status to `COMPLETED` and releasing barber payouts.

---

### Q6: How are Barber Leaderboards, Peak-Hour Charts, and Retention Metrics calculated in MongoDB?

**Difficulty:** Analytics Engineering  
**Importance:** 🔥🔥🔥🔥🔥 (Featured in Resume Bullet 3)

#### MongoDB Aggregation Code (Peak-Hour Heatmap):
```javascript
const peakHours = await Booking.aggregate([
  { $match: { salonId: new mongoose.Types.ObjectId(salonId), status: 'COMPLETED' } },
  {
    $group: {
      _id: { $hour: "$startTimeDate" }, // Extracts hour (0-23)
      totalBookings: { $sum: 1 },
      totalRevenue: { $sum: "$totalPrice" }
    }
  },
  { $sort: { "_id": 1 } } // Sort chronologically by hour
]);
```

---

### Q7: How do you enforce Multi-Tenant Data Fencing across Customer, Owner, Barber, and Admin roles?

**Difficulty:** Security Architecture  
**Importance:** 🔥🔥🔥🔥 (Featured in Resume Bullet 1)

Multi-tenancy is enforced using **Query Scoping**:
- **Customer Role:** Scoped to `customerId: req.user.id`.
- **Barber Role:** Scoped to `barberId: req.user.barberId`.
- **Shop Owner Role:** Scoped to `salonId: req.user.salonId`.
- **Admin Role:** Bypasses scope filters for platform-wide metrics.

Middleware automatically verifies JWT roles and injects tenant IDs into Mongoose query filters, ensuring Shop Owner A cannot view Shop Owner B's financial data.

---

### Q8: How does the Automated Waitlist Engine trigger real-time notifications upon cancellation?

**Difficulty:** Feature Architecture  
**Importance:** 🔥🔥🔥🔥 (Featured in Resume Bullet 4)

1. When a booking is cancelled (`PATCH /api/bookings/:id/cancel`), the backend queries the `Waitlist` collection for the earliest entry matching `(barberId, date, slotTime)` sorted by `createdAt: 1`.
2. The system sends a transactional email via **Nodemailer** containing a dynamic confirmation token: `/confirm-waitlist?token=xyz`.
3. Sets a temporary 10-minute slot lock in Redis. If unconfirmed after 10 minutes, a cron worker releases the lock to the next waitlisted user.

---

### Q9: How does PM2 run Node in Cluster Mode and ensure zero downtime?

**Difficulty:** DevOps Ops  
**Importance:** 🔥🔥🔥🔥 (Featured in Resume Bullet 5)

PM2 uses Node's native `cluster` module. Running `pm2 start server.js -i max` spawns $N$ worker processes matching physical CPU cores. Worker 1 listens on port 5000 via master process socket sharing. When executing `pm2 reload server`, PM2 restarts workers sequentially so at least $N-1$ workers handle live incoming traffic.

---

### Q10: How is JWT Authentication hardened with Rate Limiting against brute-force attacks?

**Difficulty:** Security Engineering  
**Importance:** 🔥🔥🔥🔥 (Featured in Resume Bullet 5)

Sensitive auth endpoints (`/api/auth/login`, `/api/auth/verify-otp`) are guarded by `express-rate-limit`:
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minute window
  max: 10, // Max 10 attempts per IP
  message: { message: "Too many authentication attempts. Please try again after 15 minutes." }
});
app.use('/api/auth/', authLimiter);
```

---

### Q11: Why use MongoDB Keyword/Vector Hybrid Retrieval instead of a dedicated Vector Database like Pinecone?

**Difficulty:** AI Architecture  
**Importance:** 🔥🔥🔥

#### 1. What are Dedicated Vector Databases? (Pinecone / Weaviate / Qdrant)
Purpose-built databases designed specifically for high-dimensional vector similarity search.
- **Drawbacks for SMB Platforms:** Introduces extra cloud infrastructure costs, network latency overhead for external vector RPC lookups, and dual-database sync complexity (keeping MongoDB business records in sync with Pinecone vector IDs).

#### 2. What is MongoDB Keyword / Vector Hybrid Retrieval? (Used in Balor)
Leveraging native MongoDB text search indexes and vector embeddings directly inside the existing MongoDB Atlas database cluster.
- **Advantages:** Zero extra database setup, zero network hop latency between databases, unified transactional consistency, and drastically reduced cloud bill.

---

#### 3. Architectural Decision Matrix:

| Metric | Dedicated Vector DB (Pinecone) | MongoDB Hybrid Search (Balor Choice) |
| :--- | :--- | :--- |
| **Infrastructure Complexity** | High (2 separate database clusters). | Low (1 unified primary database). |
| **Data Sync Overhead** | Dual-write sync required. | Zero sync overhead (Atomic in-database). |
| **Cost & Latency** | Higher cost & external API latency. | Lower cost & sub-10ms local DB queries. |

---

### Q12: How do you stream or handle async responses from Google Gemini in the Express backend?

**Difficulty:** Advanced Backend  
**Importance:** 🔥🔥🔥

We call `model.generateContentStream({ contents })` from `@google/generative-ai`. Express pipes chunks to the HTTP response stream using Server-Sent Events (`res.setHeader('Content-Type', 'text/event-stream')`), allowing the React frontend to display dynamic typing animations character-by-character.

---

### Q13: What security protections does Cloudflare provide in front of Nginx?

**Difficulty:** Infrastructure Security  
**Importance:** 🔥🔥🔥

1. **DDoS Mitigation:** Absorbs L3/L4 volumetric SYN floods at Anycast edge.
2. **WAF Rules:** Blocks SQLi, XSS, and bad user-agent bots before traffic hits AWS EC2.
3. **SSL/TLS Encryption:** Provides SSL certificates between Client $\leftrightarrow$ Cloudflare and Cloudflare $\leftrightarrow$ Origin Server.

---

### Q14: How do you render real-time analytics dashboards in React without performance lag?

**Difficulty:** Frontend Optimization  
**Importance:** 🔥🔥🔥

1. Wrap canvas charts in `useMemo` to prevent re-rendering during parent state changes.
2. Destroy previous Chart.js instances on component unmount (`chartInstance.destroy()`).
3. Fetch analytics data lazily only when tab becomes active.

---

### Q15: Give a complete end-to-end Security Audit of Balor's tech stack.

**Difficulty:** Comprehensive Security  
**Importance:** 🔥🔥🔥🔥🔥

```
[ Client Layer ]    ──► HTTPS / TLS 1.3 Encryption
[ Network Layer ]   ──► Cloudflare WAF + DDoS Filtering
[ Server Guard ]    ──► Nginx Reverse Proxy + HTTP Headers (Helmet)
[ Access Control ]  ──► Rate Limiting + Bearer JWT + RBAC Guards
[ Password Layer ]  ──► bcrypt Salting (Cost Factor 10)
[ Verification ]    ──► 4-Digit Completion OTP + Email Token Expiry
[ Database Layer ]  ──► Mongo Sanitization (Prevents NoSQL Injections)
```

---
