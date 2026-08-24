# Part 2: MongoDB, Mongoose & Database Engineering

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** MongoDB, Mongoose ODM, NoSQL vs SQL, Geospatial Indexing, Aggregations, WiredTiger Engine

---

## 📌 Table of Contents
1. [Tech Stack Comparison: NoSQL (MongoDB) vs Relational SQL (Postgres/MySQL)](#q1-tech-stack-comparison-nosql-mongodb-vs-relational-sql-postgresqlmysql)
2. [ACID vs BASE Consistency Models](#q2-what-is-the-difference-between-acid-compliance-in-sql-and-base-consistency-in-nosql)
3. [`2dsphere` Geospatial Indexing & `$near` Queries](#q3-how-does-mongodbs-2dsphere-index-work-internally-and-how-is-it-used-for-nearby-salon-search)
4. [Compound Indexes & The ESR (Equal, Sort, Range) Rule](#q4-what-is-a-compound-index-in-mongodb-and-what-is-the-esr-rule)
5. [How Indexes Work Internally (B-Trees) & Read vs Write Tradeoffs](#q5-how-do-indexes-work-internally-in-mongodb-and-why-do-they-speed-up-reads-while-slowing-down-writes)
6. [Atomic Conditional Updates vs Multi-Document ACID Transactions](#q6-atomic-updates-findoneandupdate-vs-multi-document-acid-transactions-in-mongodb)
7. [Mongoose `populate()` vs MongoDB Aggregation `$lookup`](#q7-mongoose-populate-vs-mongodb-aggregation-lookup-which-is-more-performant-and-why)
8. [MongoDB Aggregation Pipeline Optimization](#q8-how-do-you-optimize-a-complex-mongodb-aggregation-pipeline-for-dashboard-analytics)
9. [Schema Design Decision: Embedded Subdocuments vs Referenced Collections](#q9-embedded-documents-vs-referenced-collections-how-do-you-decide-schema-design)
10. [Dual-Rating Sync Architecture (Barber & Salon Aggregation)](#q10-how-is-dual-rating-sync-barber-rating--salon-aggregate-rating-implemented-efficiently)
11. [MongoDB Write Concern & Read Preference](#q11-what-are-write-concern-and-read-preference-in-mongodb-and-why-do-they-matter-for-high-availability)
12. [MongoDB Replica Sets & Election Consensus](#q12-how-does-mongodb-replica-set-high-availability-and-primary-election-work)
13. [Horizontal Sharding & Shard Key Selection Strategy](#q13-what-is-sharding-in-mongodb-and-how-do-you-choose-an-effective-shard-key)
14. [TTL (Time-To-Live) Indexes for Automatic Expiration](#q14-how-do-ttl-time-to-live-indexes-work-in-mongodb-and-where-are-they-used-in-balor)
15. [Preventing NoSQL Injection Attacks](#q15-what-is-nosql-injection-and-how-do-you-prevent-it-in-express-and-mongoose)
16. [WiredTiger Storage Engine & Document-Level Concurrency](#q16-how-does-the-wiredtiger-storage-engine-handle-concurrency-and-locking)
17. [Mongoose Virtuals vs Schema Properties](#q17-what-are-mongoose-virtuals-and-when-should-you-use-them-over-stored-database-fields)
18. [Database Connection Pooling in Mongoose](#q18-how-does-connection-pooling-work-in-mongoose-and-how-do-you-size-the-pool)
19. [Text Search Indexing vs Regex Performance Gotchas](#q19-why-are-regex-searches-slow-in-mongodb-and-how-does-a-text-index-fix-it)
20. [Capped Collections & Real-time Logs](#q20-what-are-capped-collections-in-mongodb-and-when-would-you-use-them)

---

### Q1: Tech Stack Comparison: NoSQL (MongoDB) vs Relational SQL (PostgreSQL/MySQL)

**Difficulty:** Core Architectural Choice  
**Importance:** 🔥🔥🔥🔥🔥 (Critical for all system design & project defense rounds)

#### 1. What is Relational SQL? (PostgreSQL / MySQL)
Relational databases store data in rigid, tabular structures composed of **Tables, Rows, and Columns**.
- **Key Concepts:** Requires predefined schemas (Data Definition Language migrations). Enforces relationships using Primary Key and Foreign Key constraints. Executes multi-table `JOIN` queries natively.
- **Scaling:** Primarily scales **vertically** (upgrading CPU/RAM hardware on a single master node). Horizontal sharding requires complex application middleware.
- **Best For:** Financial transaction engines, banking systems, systems requiring strict multi-table relational integrity.

#### 2. What is Document NoSQL? (MongoDB)
Document NoSQL databases store data in flexible, self-contained **BSON (Binary JSON) documents** organized into collections.
- **Key Concepts:** Schema-less / Dynamic schema (fields can vary across documents within the same collection). Supports nested sub-documents and arrays directly inside a record.
- **Scaling:** Designed natively for **horizontal scaling (Sharding)**, automatically partitioning document datasets across distributed clusters.
- **Best For:** Content management, mobile apps, e-commerce product catalogs, salon/grooming service menus where data schemas vary and read throughput is high.

```
RELATIONAL SQL (PostgreSQL / MySQL)         DOCUMENT NoSQL (MongoDB)
┌──────────────┐   ┌──────────────┐          ┌──────────────────────────────────┐
│  Users Table │───│ Bookings Table│          │ User Document                    │
└──────────────┘   └──────────────┘          │ { id, name, favorites: [...] }   │
   (Fixed Schema, Foreign Keys,               └──────────────────────────────────┘
    Strict Joins, Vertical Scaling)             (Dynamic JSON/BSON, Flexible,
                                                 Embedded Arrays, Horizontal Scale)
```

---

#### 3. Detailed Comparison Table:

| Metric | Relational SQL (PostgreSQL/MySQL) | Document NoSQL (MongoDB - Used in Balor) |
| :--- | :--- | :--- |
| **Data Format** | Structured Tables with Rows & Columns. | Hierarchical BSON (Binary JSON) documents. |
| **Schema Strictness** | Strict pre-defined schema. Altering tables requires DDL migrations. | Dynamic/Flexible schema. Documents in the same collection can vary in fields. |
| **Scaling Strategy** | **Vertical Scaling** (Buying bigger CPU/RAM hardware). | **Horizontal Scaling** (Sharding across distributed node clusters natively). |
| **Relationships / Joins**| Native $O(1)$ fast Foreign Key `JOIN` operations. | Denormalization preferred or `$lookup` aggregation joins. |
| **Transaction Model** | ACID compliance out-of-the-box across all tables. | Atomic at single document level. Multi-document ACID supported via 2-phase commit. |
| **Why MongoDB for Balor?**| Grooming services, salon catalog hierarchies, dynamic barber slots, and working hours vary per salon. BSON subdocuments allow storing nested slots/services without complex 5-table joins. |

---

### Q2: What is the difference between ACID compliance in SQL and BASE consistency in NoSQL?

**Difficulty:** Theoretical Core  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
- **ACID (Relational DBs):**
  - **A**tomic: All operations in a transaction succeed or all fail.
  - **C**onsistent: Database valid state constraints are strictly preserved.
  - **I**solated: Concurrent transactions do not interfere with each other.
  - **D**urable: Committed transactions persist even during power loss.
- **BASE (NoSQL DBs):**
  - **B**asically **A**vailable: High availability via replicas.
  - **S**oft-state: State can change over time without user interaction due to eventual consistency.
  - **E**ventual consistency: Replicas sync data across nodes asynchronously.

---

### Q3: How does MongoDB's `2dsphere` index work internally, and how is it used for nearby salon search?

**Difficulty:** Project Relevant / High Impact  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `routes/salons.js` for geolocation search)

#### Intuitive Explanation:
Earth is a curved sphere, so flat 2D distance calculations ($x^2 + y^2$) become inaccurate over distances. MongoDB’s `2dsphere` index projects longitude and latitude coordinates onto Google's **S2 Geometry spherical grid**, dividing the sphere into hierarchical quadtree cells.

```
       Step 1: Map [Longitude, Latitude] to S2 Sphere Quadtree Cell
       Step 2: Build B-Tree Index on Spatial Cell IDs
       Step 3: Query $near -> Traverses index cell boundaries in O(log N)
```

#### Code Snippet (Mongoose Schema & Route Query):
```javascript
// 1. Schema Index Definition in models/Salon.js
const salonSchema = new mongoose.Schema({
  name: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  }
});
salonSchema.index({ location: '2dsphere' }); // 👈 Geospatial Index

// 2. Query in routes/salons.js
const nearbySalons = await Salon.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
      $maxDistance: 5000 // Distance in meters (5 km)
    }
  }
});
```

---

### Q4: What is a Compound Index in MongoDB, and what is the ESR (Equal, Sort, Range) Rule?

**Difficulty:** Practical Database Tuning  
**Importance:** 🔥🔥🔥🔥🔥

#### Explanation:
A compound index indexes multiple fields within a single collection document. The order of fields in a compound index is **critical**.

#### The ESR Rule for Optimal Field Ordering:
1. **E - Equality:** Place fields queried with exact matches first (e.g., `{ status: "ACTIVE" }`).
2. **S - Sort:** Place fields used in `.sort()` operations second (e.g., `{ createdAt: -1 }`).
3. **R - Range:** Place fields queried with range operators (`$gte`, `$lte`, `$in`) last.

```javascript
// Optimal Index following ESR:
BookingSchema.index({ salonId: 1, createdAt: -1, price: { $gte: 500 } });
//                     ^^^^^^^^     ^^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^^
//                    Equality         Sort                Range
```

---

### Q5: How do Indexes work internally in MongoDB, and why do they speed up Reads while slowing down Writes?

**Difficulty:** Database Internals  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
MongoDB uses **B-Tree (Balanced Tree)** data structures for indexes.
- **Read Speed:** Without an index, MongoDB performs a **Collection Scan (`COLLSCAN`)** checking every single document ($O(N)$). With a B-Tree index, it performs an **Index Scan (`IXSCAN`)** navigating tree nodes in $O(\log N)$ time.
- **Write Penalty:** When inserting, updating, or deleting a document, MongoDB must not only write the raw document to disk but must also re-balance and update every associated B-Tree index structure.

---

### Q6: Atomic Updates (`findOneAndUpdate`) vs Multi-Document ACID Transactions in MongoDB

**Difficulty:** Concurrency / Deep Architecture  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What are Single-Document Atomic Updates? (`findOneAndUpdate`)
In MongoDB, operations targeting a single document are **guaranteed to be atomic** at the WiredTiger storage engine level.
- **How it works:** Modifies matching fields in-place in a single disk-write step without holding long multi-phase locks.
- **Pros:** Ultra-high throughput, zero lock contention, immune to deadlocks. Ideal for slot reservations (`status: 'AVAILABLE' -> 'BOOKED'`).

#### 2. What are Multi-Document ACID Transactions? (`session.startTransaction()`)
Multi-document transactions allow coordinating updates across multiple distinct collections or documents.
- **How it works:** Uses WiredTiger's Two-Phase Commit (2PC) protocol. Changes are staged in a transaction log and committed together.
- **Pros:** Guarantees strict ACID consistency across multiple collections (e.g. deducting user wallet balance while creating a booking record).
- **Cons:** Higher write latency, lock contention, and risk of transaction aborts under high concurrency.

---

#### 3. Summary Comparison:

| Attribute | Atomic Update (`findOneAndUpdate`) | Multi-Doc Transaction (`session`) |
| :--- | :--- | :--- |
| **Scope** | Single document within 1 collection. | Multiple documents across N collections. |
| **Performance Overhead** | Minimal ($O(1)$ single operation). | High (2-Phase Commit locking & log sync). |
| **Use Case in Balor** | Barber slot reservation, view counters. | Payment checkout (Wallet + Booking + Invoice). |

---

### Q7: Mongoose `populate()` vs MongoDB Aggregation `$lookup`: Which is more performant and why?

**Difficulty:** Performance Optimization  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Mongoose `populate()`?
`populate()` is an abstraction provided by Mongoose at the Node.js application layer.
- **How it works:** Mongoose sends **2 separate database queries**! Query 1 fetches the main documents (e.g., `Bookings`). Mongoose extracts foreign IDs, then sends Query 2 (`Barber.find({ _id: { $in: ids } })`). Mongoose joins the documents in **Node.js RAM memory**.
- **Drawbacks:** Double network round-trip latency; loads unnecessary fields into server RAM.

#### 2. What is MongoDB Aggregation `$lookup`?
`$lookup` is a native pipeline operator executed inside the MongoDB C++ database engine.
- **How it works:** Performs a server-side left outer join directly inside database RAM in a **single database roundtrip**.
- **Advantages:** Drastically lower network I/O latency, supports streaming pipeline transformations.

```javascript
// Aggregation $lookup (Single Database Roundtrip)
const bookings = await Booking.aggregate([
  { $match: { customerId: new mongoose.Types.ObjectId(userId) } },
  {
    $lookup: {
      from: 'barbers',           // Target collection name in DB
      localField: 'barberId',    // Field in Booking
      foreignField: '_id',       // Field in Barber
      as: 'barberDetails'
    }
  },
  { $unwind: '$barberDetails' }
]);
```

---

### Q8: How do you optimize a complex MongoDB Aggregation Pipeline for dashboard analytics?

**Difficulty:** Analytics / Optimization  
**Importance:** 🔥🔥🔥🔥

1. **Filter First (`$match` at Stage 1):** Reduces document count before passing data down the pipeline pipeline.
2. **Sort Early (`$sort` at Stage 2):** Allows MongoDB to leverage indexes for sorting before grouping.
3. **Project Selective Fields (`$project`):** Drops unused heavy text fields early to reduce RAM usage during `$group`.
4. **Use `$facet` for Multi-Tab Dashboards:** Computes multiple aggregation breakdowns (e.g., total revenue AND top barbers) in a single database execution pass.

---

### Q9: Embedded Documents vs Referenced Collections: How do you decide Schema Design?

**Difficulty:** Data Modeling  
**Importance:** 🔥🔥🔥🔥

#### 1. What are Embedded Subdocuments?
Data is nested directly inside the parent document as a sub-object or array of objects (`{ name: "Salon A", services: [{ name: "Haircut", price: 300 }] }`).
- **Pros:** Fetching parent record retrieves all related data in a single read without joins.
- **Cons:** BSON document size is capped at 16MB. Unbounded arrays (e.g. 100,000 reviews) will exceed document limits.

#### 2. What are Referenced Collections?
Data lives in separate collections connected via ObjectIds (`booking.salonId = salon._id`).
- **Pros:** Scales infinitely without 16MB document size limits; referenced entities update independently.
- **Cons:** Requires `$lookup` aggregation or multiple queries to fetch related data.

---

#### 3. Decision Matrix:

```
Rule of Thumb:
┌───────────────────────────────────────┬───────────────────────────────────────┐
│ Embed Subdocument                     │ Reference Collection                  │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • 1-to-1 or 1-to-Few relationships.  │ • 1-to-Many or Many-to-Many relations.│
│ • Data is read together frequently.   │ • Data updates independently.         │
│ • Subdocument size is small & bounded.│ • Unbounded growth (e.g., >1000 items)│
└───────────────────────────────────────┴───────────────────────────────────────┘
```

*In Balor:* Salon Services are **Embedded** inside `Salon.js` (a salon has 5–20 services max), while Bookings are **Referenced** in a separate `Booking.js` collection because booking volume grows infinitely.

---

### Q10: How is Dual-Rating Sync (Barber Rating + Salon Aggregate Rating) implemented efficiently?

**Difficulty:** Practical Architecture  
**Importance:** 🔥🔥🔥🔥 (Feature in `routes/reviews.js`)

#### Strategy:
When a customer posts a review for a barber:
1. Save the new `Review` document.
2. Run an aggregation on `Review` collection to calculate new average rating for `barberId`.
3. Update `Barber.rating`.
4. Run aggregate query across all barbers belonging to that `salonId` and update `Salon.rating` asynchronously to prevent locking the customer's HTTP response stream.

---

### Q11: What are Write Concern and Read Preference in MongoDB, and why do they matter for High Availability?

**Difficulty:** Distributed Systems  
**Importance:** 🔥🔥🔥

- **Write Concern (`w`):** Controls acknowledgment level requested from MongoDB for write operations.
  - `w: 1` (Default) -> Acknowledged by Primary node only.
  - `w: "majority"` -> Acknowledged by a majority of replica set nodes (Prevents data loss during failover).
- **Read Preference:** Controls which node reads are routed to:
  - `primary` (Default) -> High consistency.
  - `secondaryPreferred` -> Read offloads to read-replicas for high read throughput.

---

### Q12: How does MongoDB Replica Set High Availability and Primary Election work?

**Difficulty:** Infrastructure / System Design  
**Importance:** 🔥🔥🔥

A MongoDB Replica Set consists of **1 Primary node** and **2+ Secondary nodes**. Secondaries replicate the Primary's write operation stream (**oplog**). If the Primary crashes, remaining nodes run a **Raft-based consensus election** to elect a new Primary in <2 seconds.

---

### Q13: What is Sharding in MongoDB, and how do you choose an effective Shard Key?

**Difficulty:** Distributed Systems / HLD  
**Importance:** 🔥🔥🔥

Sharding partitions large collections across multiple physical database servers.
- **Good Shard Key:** High cardinality, even distribution of values (e.g., `hashed(userId)`).
- **Bad Shard Key:** Monotonically increasing values (e.g., `createdAt`), which causes all writes to hit a single shard (hotspotting).

---

### Q14: How do TTL (Time-To-Live) Indexes work in MongoDB, and where are they used in Balor?

**Difficulty:** Feature Implementation  
**Importance:** 🔥🔥🔥

#### Explanation:
A TTL index automatically deletes documents from a collection after a specified duration.
```javascript
// Automatically delete unverified OTPs or Notifications after 10 minutes (600s)
UserOTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
```

---

### Q15: What is NoSQL Injection, and how do you prevent it in Express and Mongoose?

**Difficulty:** Security  
**Importance:** 🔥🔥🔥🔥

#### Threat Example:
If an attacker sends JSON `{ "username": "admin", "password": { "$ne": null } }`, standard un-sanitized queries `User.findOne(req.body)` evaluate `$ne: null` to `true`, logging the attacker in without a password!

#### Prevention:
Use `express-mongo-sanitize` middleware to strip any keys containing `$` or `.` from `req.body`, `req.query`, and `req.params`.

---

### Q16: How does the WiredTiger Storage Engine handle Concurrency and Locking?

**Difficulty:** Internals  
**Importance:** 🔥🔥🔥

WiredTiger uses **Document-Level Concurrency Control**. It employs optimistic concurrency control: operations lock individual documents during updates rather than locking whole collections or database tables, enabling multi-threaded parallel writes.

---

### Q17: What are Mongoose Virtuals, and when should you use them over stored database fields?

**Difficulty:** Mongoose Concepts  
**Importance:** 🔥🔥🔥

Virtuals are document properties that can be gotten and set, but **are not persisted to MongoDB disk**.
```javascript
// Dynamically compute full name without storing redundant string in DB
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
```

---

### Q18: How does Connection Pooling work in Mongoose, and how do you size the pool?

**Difficulty:** Backend Performance  
**Importance:** 🔥🔥🔥

Mongoose reuses TCP database sockets via an internal pool (default `maxPoolSize: 100`). Sizing depends on available CPU threads and MongoDB memory: `maxPoolSize = (Concurrent Requests * Avg Query Time (s))`.

---

### Q19: Why are Regex searches slow in MongoDB, and how does a Text Index fix it?

**Difficulty:** Database Query Tuning  
**Importance:** 🔥🔥🔥

Queries like `find({ name: /barber/i })` with leading wildcards force a full collection scan (`COLLSCAN`) because B-Trees cannot perform index prefix lookups. A **Text Index** (`schema.index({ name: 'text' })`) builds an inverted index word token map for fast full-text searching.

---

### Q20: What are Capped Collections in MongoDB, and when would you use them?

**Difficulty:** Storage Optimization  
**Importance:** 🔥🔥🔥

Capped collections are fixed-size collections that preserve insertion order. Once allocated space fills up, old documents are automatically overwritten by new ones in a circular FIFO buffer—ideal for high-speed audit logging or real-time event streaming.

---
