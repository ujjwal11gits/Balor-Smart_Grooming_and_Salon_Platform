# Part 5: Low-Level Design (LLD), High-Level Design (HLD) & Platform Algorithms

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** Double Booking Race Conditions, Slot Algorithms, System Design (HLD/LLD), Redis Caching, Geospatial Math, Load Balancing

---

## 📌 Table of Contents
1. [🔥 CRITICAL: Solving Double-Booking Race Conditions (3-Level Defense Architecture)](#q1-critical-how-do-you-prevent-double-booking-race-conditions-when-two-users-try-to-book-the-same-slot-simultaneously)
2. [Barber Time-Slot Generation & Conflict Detection Algorithm](#q2-how-does-the-time-slot-generation-and-overlap-conflict-detection-algorithm-work)
3. [Waitlist Queue Management & Auto-Promotion System](#q3-how-is-the-salon-waitlist-queue-designed-when-all-time-slots-are-fully-booked)
4. [High-Level System Design (HLD): Scalable Salon Grooming Platform](#q4-high-level-design-hld-how-would-you-design-a-scalable-salon-booking-platform-for-million-users)
5. [Geospatial Search Mathematics (2dsphere vs Euclidean Distance)](#q5-how-does-geospatial-radius-search-math-work-in-2dsphere)
6. [Rate Limiting Algorithms (Token Bucket vs Sliding Window)](#q6-system-design-how-do-you-design-an-api-rate-limiter)
7. [Distributed Caching Strategies with Redis](#q7-what-are-the-different-redis-caching-strategies-cache-aside-write-through-write-behind)
8. [Cache Stampede / Thundering Herd Problem & Mutex Locks](#q8-what-is-the-cache-stampede-problem-and-how-do-you-prevent-it)
9. [Idempotency Key Pattern for Financial & Booking Endpoints](#q9-how-do-you-implement-idempotent-booking-and-payment-apis)
10. [Event-Driven Asynchronous Notification Architecture](#q10-how-do-you-design-an-asynchronous-multi-channel-notification-system)
11. [Consistent Hashing in Load Balancers and Distributed Caches](#q11-what-is-consistent-hashing-and-why-is-it-used-in-distributed-systems)
12. [Load Balancing Algorithms Comparison](#q12-tech-stack-comparison-round-robin-vs-least-connections-vs-ip-hash)
13. [Real-time Communication: WebSockets vs SSE vs Long Polling](#q13-tech-stack-comparison-websockets-vs-server-sent-events-sse-vs-long-polling)
14. [Full-Text Search Architecture: MongoDB Text Search vs Elasticsearch](#q14-how-do-you-design-a-fast-auto-complete-salon-search-engine)
15. [Circuit Breaker Pattern for Microservices Fault Tolerance](#q15-what-is-the-circuit-breaker-pattern-and-how-does-it-prevent-cascading-failures)
16. [CAP Theorem & PACELC Theorem Deep Dive](#q16-what-are-the-cap-and-pacelc-theorems-in-distributed-databases)
17. [Database Read-Write Splitting & Replication Lag Handling](#q17-how-do-you-handle-database-read-replica-lag-in-a-booking-system)
18. [Media Upload Architecture (S3 Presigned URLs + CDN)](#q18-how-do-you-design-a-scalable-image upload-system-for-salon-portfolios)
19. [Distributed Lock Algorithm (`Redlock`)](#q19-how-does-the-redlock-algorithm-work-in-redis)
20. [Leader Election & Distributed Consensus (Raft Consensus)](#q20-how-does-leader-election-work-in-distributed-systems)
21. [HyperLogLog for High-Scale Unique Visitor Counting](#q21-how-do-you-count-unique-salon-page-views-in-redis)
22. [B-Trees vs LSM-Trees in Storage Engines](#q22-tech-stack-comparison-b-trees-read-optimized-vs-lsm-trees-write-optimized)
23. [SPOF (Single Point of Failure) Elimination](#q23-how-do-you-design-a-zero-single-point-of-failure-cloud-architecture)
24. [Synchronous REST/gRPC vs Asynchronous Message Queues](#q24-tech-stack-comparison-restgrpc-synchronous-vs-kafka-asynchronous)
25. [Disaster Recovery: RPO & RTO Objectives](#q25-what-are-rpo-and-rto-in-disaster-recovery-planning)

---

### Q1: 🔥 CRITICAL: How do you prevent double-booking race conditions when two users try to book the SAME barber slot at the exact same millisecond?

**Difficulty:** Core System Challenge  
**Importance:** 🔥🔥🔥🔥🔥 (The Most Important Question for Balor)

#### The Problem Scenario:
Imagine User A and User B both view Barber Alex's 5:00 PM slot. At 5:00:00.100 PM, both click "Confirm Booking".
If the backend uses naive **Read-then-Write** logic:
1. Server checks DB for User A: Slot is `AVAILABLE`.
2. Server checks DB for User B: Slot is `AVAILABLE` (Before User A's write completes!).
3. Server saves User A's booking.
4. Server saves User B's booking.
❌ **DOUBLE BOOKING CRASH!** Both users hold a confirmed ticket for 1 barber.

#### The 3-Level Defense Architecture (Balor Solution):

```
                   ┌─────────────────────────────────────────┐
                   │  Incoming HTTP Requests (User A & B)    │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │ Level 1: Redis Distributed Lock         │
                   │ Lock Key: barber:123:slot:17:00         │
                   └────────────────────┬────────────────────┘
                                        │ (Only 1 user gets lock)
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │ Level 2: Atomic DB Conditional Update   │
                   │ findOneAndUpdate({ status: 'AVAILABLE'})│
                   └────────────────────┬────────────────────┘
                                        │ (Database-engine guaranteed)
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │ Level 3: MongoDB Unique Compound Index  │
                   │ { barberId: 1, date: 1, startTime: 1 }  │
                   └─────────────────────────────────────────┘
```

#### Code Snippet (Level 2: Atomic Conditional Update):
```javascript
// routes/bookings.js
const booking = await Slot.findOneAndUpdate(
  {
    barberId: req.body.barberId,
    date: req.body.date,
    startTime: req.body.startTime,
    status: 'AVAILABLE' // 👈 CRITICAL: Must be available at the exact millisecond of write
  },
  {
    $set: {
      status: 'BOOKED',
      bookedBy: req.user.id,
      updatedAt: new Date()
    }
  },
  { new: true }
);

if (!booking) {
  // If null, another concurrent request grabbed the slot first!
  return res.status(409).json({ message: 'Slot already reserved by another user!' });
}
```

---

### Q2: How does the Time-Slot Generation and Overlap Conflict Detection Algorithm work?

**Difficulty:** Algorithmic LLD  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `routes/barbers.js`)

#### Algorithm Breakdown:
Given: Barber working shift (9:00 AM – 5:00 PM), Service duration (45 mins), Break time (1:00 PM – 2:00 PM), and existing confirmed bookings.

```
Working Window: [09:00 ---------------------------------------------------- 17:00]
Break Window:                 [13:00 ---------- 14:00]
Booking 1:      [09:30 --- 10:15]
Calculated Available Slot:  09:00-09:30, 10:15-11:00, 11:00-11:45...
```

#### Step-by-Step Logic:
1. Convert time strings (`"09:30"`) into **total minutes from midnight** ($9 \times 60 + 30 = 570$).
2. Iterate loop from `shiftStart` to `shiftEnd` in steps of `serviceDuration`.
3. For each candidate slot `[candidateStart, candidateEnd]`:
   - Check if candidate falls within `breakStart` and `breakEnd`.
   - Check against existing bookings for overlap using interval math:
     $$\text{Overlap} \iff (\text{candidateStart} < \text{bookingEnd}) \land (\text{candidateEnd} > \text{bookingStart})$$
4. If no overlap occurs, add candidate slot to available array.

---

### Q3: How is the Salon Waitlist Queue designed when all time slots are fully booked?

**Difficulty:** Queue LLD  
**Importance:** 🔥🔥🔥🔥 (Used in `models/Waitlist.js` & `routes/waitlist.js`)

When a slot is booked, customers can join a **FIFO Waitlist**.
1. **Joining:** Customer inserts a document in `Waitlist` collection with `position: Date.now()`.
2. **Cancellation Trigger:** If a confirmed booking is cancelled:
   - Mark booking as `CANCELLED`.
   - Pop the first customer from `Waitlist` queue (`findOneAndDelete` sorted by `createdAt: 1`).
   - Reserve slot temporarily (10-minute hold window) and trigger Nodemailer email/SMS notification: *"A slot freed up! Click link within 10 minutes to confirm."*
   - If 10-minute timer expires without confirmation, pass opportunity to the next waitlisted customer.

---

### Q4: High-Level Design (HLD): How would you design a scalable Salon Booking Platform for 1 Million Users?

**Difficulty:** High Level System Design  
**Importance:** 🔥🔥🔥🔥🔥

```
                                 [ Client Web App / Mobile ]
                                              │
                                              ▼
                                 [ Cloudflare CDN / WAF ]
                                              │
                                              ▼
                                  [ Nginx Load Balancer ]
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
         [ Node.js API Service 1 ]                           [ Node.js API Service 2 ]
                    │                                                   │
         ┌──────────┴─────────────────────────┬─────────────────────────┴──────────┐
         ▼                                    ▼                                    ▼
[ Redis Cluster ]                    [ MongoDB Primary DB ]               [ RabbitMQ / BullMQ ]
(Caching & Locks)                   (Write Transactions)                           │
                                              │                                    ▼
                                              ▼                          [ Email / SMS Workers ]
                                   [ MongoDB Read Replicas ]
                                   (Analytics & Searches)
```

#### Key Architecture Trade-Offs:
- **Read/Write Ratio:** 90% Reads (Browsing salons/slots) vs 10% Writes (Booking). Read Replicas handle browsing traffic while Primary node handles write transactions.
- **Caching Layer:** Redis caches Salon Profile details (`salon:{id}`) with 1-hour TTL, invalidated on shop owner updates.

---

### Q5: How does Geospatial Radius Search math work in `2dsphere`?

**Difficulty:** Spatial Algorithms  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
MongoDB uses the **Haversine Formula** to compute great-circle distances between two points on a sphere given their longitudes and latitudes:

$$d = 2r \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$

Where $\phi$ is latitude, $\lambda$ is longitude, and $r$ is Earth's radius (6,371 km). The `2dsphere` index uses S2 Quadtree cell bounding boxes to eliminate 99% of non-matching coordinates before running Haversine distance checks on remaining candidates.

---

### Q6: System Design: How do you design an API Rate Limiter?

**Difficulty:** System Design  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Fixed Window Counter?
Divides time into fixed intervals (e.g. 1-minute blocks) and increments a counter per IP/user key.
- **Pros:** Extremely memory-efficient ($O(1)$ memory).
- **Cons:** Vulnerable to traffic spikes at window boundaries (2x limit burst within seconds).

#### 2. What is Sliding Window Log?
Stores timestamps of all incoming requests in a Redis Sorted Set (`ZSET`).
- **Pros:** Perfectly smooth and accurate rate enforcement without boundary spikes.
- **Cons:** High memory consumption ($O(N)$ stored request timestamps per user).

#### 3. What is Token Bucket? (Recommended)
Maintains a bucket per user filled with tokens at a constant rate $R$. Each request consumes 1 token.
- **Pros:** Smoothly accommodates legitimate bursty traffic (up to bucket capacity $B$) while enforcing average rate limit over time.

---

#### 4. Summary Matrix:

| Algorithm | Burst Traffic Support | Memory Overhead | Complexity |
| :--- | :--- | :--- | :--- |
| **Fixed Window** | ❌ Vulnerable at boundary. | $O(1)$ | Low |
| **Sliding Log** | ✅ Perfectly smooth. | $O(N)$ High | Medium |
| **Token Bucket** | ✅ Excellent burst handling. | $O(1)$ | Medium |

---

### Q7: What are the different Redis Caching Strategies (Cache-Aside, Write-Through, Write-Behind)?

**Difficulty:** System Design  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Cache-Aside (Lazy Loading)? (Used in Balor)
The application code manages the cache directly.
- **How it works:** App checks Redis first. On **Cache Hit**, returns data immediately. On **Cache Miss**, reads from MongoDB, populates Redis with TTL, and returns data to client.
- **Pros:** Cache only contains requested data; resilient to DB failures.
- **Cons:** Cache miss introduces higher initial query latency.

#### 2. What is Write-Through Caching?
App writes data to the Cache and Database simultaneously in a single transaction.
- **Pros:** Cache is always up-to-date; zero cache miss latency for newly created records.
- **Cons:** Higher write latency because every write hits both cache and database.

#### 3. What is Write-Behind (Write-Back) Caching?
App writes data directly to Redis immediately. Redis asynchronously syncs data to MongoDB in background batches.
- **Pros:** Ultra-fast write performance (zero database write latency for client HTTP requests).
- **Cons:** Risk of data loss if Redis crashes before async background flush to disk finishes.

---

### Q8: What is the Cache Stampede problem and how do you prevent it?

**Difficulty:** Distributed Systems  
**Importance:** 🔥🔥🔥🔥

**Cache Stampede (Thundering Herd):** Occurs when a high-demand cache key (e.g. Popular Salon Profile) expires. Thousands of concurrent requests experience a cache miss simultaneously, swamping MongoDB and causing database failure.

#### Solution: Mutex Locking (Redis Lock)
```javascript
async function getSalon(id) {
  let salon = await redis.get(`salon:${id}`);
  if (!salon) {
    const acquireLock = await redis.set(`lock:salon:${id}`, 'locked', 'NX', 'EX', 5);
    if (acquireLock) {
      salon = await Salon.findById(id);
      await redis.set(`salon:${id}`, JSON.stringify(salon), 'EX', 3600);
      await redis.del(`lock:salon:${id}`);
    } else {
      await new Promise(res => setTimeout(res, 50)); // Wait and retry
      return getSalon(id);
    }
  }
  return typeof salon === 'string' ? JSON.parse(salon) : salon;
}
```

---

### Q9: How do you implement Idempotent Booking and Payment APIs?

**Difficulty:** Financial Security  
**Importance:** 🔥🔥🔥🔥

Include a unique **`Idempotency-Key: UUID`** in HTTP headers. Backend stores the key in Redis before executing the operation. If a duplicate request with the same key arrives within 24 hours, the backend skips DB execution and returns the cached response directly.

---

### Q10: How do you design an Asynchronous Multi-Channel Notification System?

**Difficulty:** System Design  
**Importance:** 🔥🔥🔥

Decouple API route HTTP handlers from email/SMS dispatch. When a booking succeeds, publish an event `BOOKING_CREATED` to **BullMQ / RabbitMQ**. Independent background worker processes consume queue messages and execute Nodemailer / Twilio API dispatches with exponential retry backoff.

---

### Q11: What is Consistent Hashing and why is it used in Distributed Systems?

**Difficulty:** System Design HLD  
**Importance:** 🔥🔥🔥

Standard modulo hashing ($\text{server} = \text{hash}(\text{key}) \pmod N$) causes mass cache invalidation when adding or removing a server. **Consistent Hashing** maps keys and servers onto a circular $2^{32}-1$ hash ring, ensuring that adding or removing a server node requires re-mapping only $K/N$ keys.

---

### Q12: Tech Stack Comparison: Round Robin vs Least Connections vs IP Hash Load Balancing

**Difficulty:** Infrastructure Design  
**Importance:** 🔥🔥🔥

#### 1. What is Round Robin Load Balancing?
Distributes incoming requests sequentially down a list of backend application servers (Server A -> Server B -> Server C -> Server A).
- **Best For:** Homogeneous server clusters where all nodes possess identical CPU/RAM specs and tasks take uniform execution time.

#### 2. What is Least Connections Load Balancing?
Routes incoming HTTP requests to the backend server with the **fewest active open socket connections**.
- **Best For:** Requests with non-uniform processing times or long-lived persistent connections (e.g. WebSocket chat connections).

#### 3. What is IP Hash Load Balancing?
Hashes the client's IP address to map them consistently to a specific backend node (Sticky Sessions).
- **Best For:** Stateful web applications requiring a client to hit the same server instance consistently.

---

### Q13: Tech Stack Comparison: WebSockets vs Server-Sent Events (SSE) vs Long Polling

**Difficulty:** Real-time Systems  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Long Polling?
The client requests data from the server. The server holds the request open until new data arrives or a timeout occurs, at which point the client immediately issues a new request.
- **Drawbacks:** High HTTP header overhead ($O(N)$ repeated handshakes).

#### 2. What are Server-Sent Events (SSE)?
A persistent **unidirectional HTTP connection** (`text/event-stream`) where the server streams real-time updates down to the client.
- **Pros:** Built on standard HTTP, native browser auto-reconnect, lightweight.
- **Best For:** Live updates where client only receives data (e.g., live barber waitlist queue position updates).

#### 3. What are WebSockets?
A persistent **full-duplex bidirectional TCP connection** established via an initial HTTP upgrade handshake (`ws://` or `wss://`).
- **Pros:** Extremely low latency, client and server transmit data simultaneously.
- **Best For:** Bidirectional real-time interaction (e.g. live chat, multiplayer collaboration).

---

#### 4. Summary Comparison Matrix:

| Metric | Long Polling | Server-Sent Events (SSE) | WebSockets |
| :--- | :--- | :--- | :--- |
| **Communication** | Simulated Push via repeated HTTP calls. | **Unidirectional** (Server to Client Push). | **Full-Duplex Bidirectional**. |
| **Protocol** | Standard HTTP/HTTPS | Standard HTTP (Event Stream) | WS / WSS Protocol |
| **Reconnection** | Native | Auto-reconnect natively | Requires JS custom handling |
| **Use Case:** | Low-frequency fallback | Live barber waitlist position feeds | Real-time chat & gaming |

---

### Q14: How do you design a fast Auto-Complete Salon Search Engine?

**Difficulty:** HLD  
**Importance:** 🔥🔥🔥

For high-scale auto-complete search, use **Trie Data Structures** in memory or index salon titles in **Elasticsearch / Meilisearch** with N-gram tokenizers to return prefix matches in sub-10ms.

---

### Q15: What is the Circuit Breaker Pattern and how does it prevent cascading failures?

**Difficulty:** Microservices Reliability  
**Importance:** 🔥🔥🔥

If an external payment service (e.g. Stripe/Razorpay) fails, continuing to send HTTP requests exhausts server socket threads. A **Circuit Breaker** trips into `OPEN` state after $N$ consecutive failures, returning immediate fallback errors without sending network requests until the remote service recovers (`HALF-OPEN`).

---

### Q16: What are the CAP and PACELC Theorems in Distributed Databases?

**Difficulty:** System Theory  
**Importance:** 🔥🔥🔥

- **CAP Theorem:** In a network partition (**P**), a system must trade off between Consistency (**C**) or Availability (**A**).
- **PACELC Theorem:** Extends CAP: **If Partition (P)**, trade off Availability (A) vs Consistency (C); **Else (E)**, trade off Latency (L) vs Consistency (C).

---

### Q17: How do you handle Database Read-Replica Lag in a booking system?

**Difficulty:** Database HLD  
**Importance:** 🔥🔥🔥

If a user books a slot and is immediately redirected to `/my-bookings` page, reading from a lagging Read Replica might show old data!  
*Solution:* **Read-Your-Own-Writes Consistency.** Route user requests to Primary DB for 5 seconds after a write before switching back to Read Replicas.

---

### Q18: How do you design a Scalable Image Upload System for Salon Portfolios?

**Difficulty:** Cloud Systems  
**Importance:** 🔥🔥🔥

1. Client requests a **Presigned S3 URL** from Node.js backend.
2. Client uploads image binary directly to AWS S3 bucket (bypassing backend server RAM).
3. S3 triggers an AWS Lambda function to generate compressed WebP thumbnails and deliver them via CloudFront CDN.

---

### Q19: How does the Redlock Algorithm work in Redis?

**Difficulty:** Distributed Locks  
**Importance:** 🔥🔥🔥

To acquire a lock across a multi-node Redis cluster, `Redlock` attempts to set a key with `NX` (Not Exists) and `PX` (TTL) on $N$ independent master nodes. The lock is granted only if acquired on a majority ($\ge N/2 + 1$) of nodes within a set time threshold.

---

### Q20: How does Leader Election work in Distributed Systems?

**Difficulty:** Distributed Systems  
**Importance:** 🔥🔥🔥

Distributed systems use consensus algorithms like **Raft** or **Paxos**. In Raft, nodes transition between Candidate, Follower, and Leader states, relying on randomized heartbeats and majority voting epochs to elect a single Primary coordinator.

---

### Q21: How do you count unique salon page views in Redis using HyperLogLog?

**Difficulty:** High-Scale Analytics  
**Importance:** 🔥🔥🔥

Instead of storing millions of IP addresses in memory, Redis **HyperLogLog (`PFADD`, `PFCOUNT`)** uses probabilistic cardinality estimation to approximate billions of distinct items with >99% accuracy using only 12KB of memory.

---

### Q22: Tech Stack Comparison: B-Trees (Read-Optimized) vs LSM-Trees (Write-Optimized)

**Difficulty:** Storage Engine Internals  
**Importance:** 🔥🔥🔥

#### 1. What are B-Trees? (MongoDB WiredTiger, PostgreSQL)
Balanced self-sorting tree structures stored on disk.
- **How it works:** Keeps in-place update pointers to data pages. Navigates tree branches in $O(\log N)$ time.
- **Tradeoffs:** Highly read-optimized, but random disk writes incur seek overhead.

#### 2. What are LSM-Trees? (Log-Structured Merge-Trees - Cassandra, RocksDB)
Append-only storage engine structure.
- **How it works:** Writes are appended sequentially into memory (`MemTable`) and flushed to disk as immutable sorted files (`SSTables`).
- **Tradeoffs:** Extremely write-optimized, but reads may require checking multiple SSTable file levels.

---

### Q23: How do you design a Zero Single Point of Failure (SPOF) Cloud Architecture?

**Difficulty:** Cloud Infrastructure  
**Importance:** 🔥🔥🔥

Deploy backend app nodes across multiple **AWS Availability Zones (AZs)** behind an Application Load Balancer (ALB), backed by a Multi-AZ MongoDB Atlas Cluster and Multi-AZ ElastiCache Redis.

---

### Q24: Tech Stack Comparison: REST/gRPC (Synchronous) vs Kafka (Asynchronous)

**Difficulty:** Microservice Communication  
**Importance:** 🔥🔥🔥

#### 1. What is Synchronous REST / gRPC Communication?
The caller service sends a request and blocks execution waiting for the target service to complete processing and return an HTTP/gRPC response.
- **Tradeoffs:** Simple, but introduces tight temporal coupling and cascading latency.

#### 2. What is Asynchronous Kafka Messaging?
The producer service publishes an event to a distributed append-only log topic in Kafka without waiting for consumers to process it.
- **Tradeoffs:** Loose coupling, high throughput, and replayable event logs, but introduces eventual consistency.

---

### Q25: What are RPO and RTO in Disaster Recovery Planning?

**Difficulty:** DevOps / SRE  
**Importance:** 🔥🔥🔥

- **RPO (Recovery Point Objective):** Maximum acceptable data loss duration (e.g., maximum 5 minutes of lost DB backups).
- **RTO (Recovery Time Objective):** Maximum acceptable system downtime before full service restoration (e.g., system restored within 30 minutes).

---
