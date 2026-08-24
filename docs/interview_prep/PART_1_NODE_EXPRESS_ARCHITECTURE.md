# Part 1: Node.js, Express & Backend System Architecture

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** Node.js, Express.js, V8 Engine, Async I/O, Backend Design Patterns

---

## 📌 Table of Contents
1. [Node.js Event Loop Architecture & Phases](#q1-how-does-the-nodejs-event-loop-work-internally-and-how-does-it-achieve-high-concurrency-despite-being-single-threaded)
2. [Single Thread vs Multi-Core Scaling (`libuv` & Thread Pool)](#q2-how-does-nodejs-handle-io-operations-without-blocking-if-javascript-runs-on-a-single-thread)
3. [Microtask Queue vs Macrotask Queue (`nextTick`, `setImmediate`, `setTimeout`)](#q3-what-is-the-execution-order-between-processnexttick-promisethen-settimeout-and-setimmediate)
4. [Express.js Middleware Architecture & Global Error Handling](#q4-how-does-expressjs-middleware-pipeline-work-under-the-hood-and-how-should-error-handling-be-structured)
5. [Tech Stack Comparison: Express.js vs NestJS vs Fastify](#q5-tech-stack-comparison-why-choose-expressjs-over-nestjs-or-fastify)
6. [Node.js V8 Memory Management & Preventing Memory Leaks](#q6-how-does-v8-garbage-collection-work-in-nodejs-and-how-do-you-detect-and-prevent-memory-leaks)
7. [Cluster Module vs Worker Threads](#q7-when-should-you-use-worker-threads-versus-the-cluster-module-in-nodejs)
8. [Streams & Buffers (Handling Large Data & Backpressure)](#q8-what-are-nodejs-streams-and-buffers-how-do-they-prevent-out-of-memory-oom-errors-when-handling-large-files)
9. [CommonJS (`require`) vs ES Modules (`import`)](#q9-what is-the-difference-between-commonjs-and-es-modules-in-nodejs)
10. [Graceful Shutdown of Backend Services](#q10-how-do-you-implement-a-graceful-shutdown-in-a-production-nodejs-express-app)
11. [Uncaught Exceptions & Unhandled Rejections](#q11-how-should-you-handle-uncaughtexception-and-unhandledrejection-in-a-production-nodejs-server)
12. [CORS Mechanism & Preflight Requests](#q12-what-is-cors-how-do-preflight-options-requests-work-and-how-do-you-configure-it-securely)
13. [Security Hardening with HTTP Headers (`helmet`)](#q13-what-security-headers-does-helmetjs-set-and-why-is-each-header-important)
14. [Rate Limiting Algorithms (Fixed Window vs Sliding Window)](#q14-how-does-rate-limiting-work-in-express-and-what-is-the-difference-between-fixed-window-and-sliding-window)
15. [Event Emitter Pattern & Memory Leaks](#q15-what-is-eventemitter-in-nodejs-and-how-can-it-cause-memory-leaks-if-mismanaged)
16. [Stateful Sessions vs Stateless JWT Architecture](#q16-tech-stack-comparison-session-based-authentication-vs-token-based-jwt-authentication)
17. [Handling File Uploads Safely in Express](#q17-how-do-you-handle-file-uploads-safely-in-nodeexpress-without-clogging-server-memory)
18. [Request Tracing & Context Tracking (`AsyncLocalStorage`)](#q18-how-do-you-track-requests-across-async-call-stacks-for-logging-in-nodejs)
19. [In-Process Queues vs External Task Queues (BullMQ/Redis)](#q19-when-should-you-move-background-tasks-from-in-memory-callbacks-to-external-queues-like-bullmq)
20. [Node.js Performance Profiling (`clinic.js` & Chrome DevTools)](#q20-how-do-you-profile-a-slow-nodejs-api-endpoint-to-identify-cpu-or-io-bottlenecks)

---

### Q1: How does the Node.js Event Loop work internally, and how does it achieve high concurrency despite being single-threaded?

**Difficulty:** Core / High-Frequency  
**Importance:** 🔥🔥🔥🔥🔥 (Critical for all SDE Backend Interviews)

#### Intuitive Explanation:
JavaScript execution in Node.js runs on a **single main thread**. However, Node.js delegates asynchronous I/O tasks (file reading, database queries, network requests) to the operating system kernel or to `libuv`'s worker thread pool. Once the asynchronous operation finishes, a callback is pushed to one of the Event Loop queues.

The **Event Loop** is an infinite loop managed by `libuv` that continuously picks callbacks from these queues and executes them on the main thread when the call stack is empty.

```
                   ┌───────────────────────────┐
                   │        START LOOP         │
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │          TIMERS           │ ◄── setTimeout(), setInterval()
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │     PENDING CALLBACKS     │ ◄── I/O callbacks deferred from previous loop
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │       IDLE, PREPARE       │ ◄── Internal Node.js usage
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │           POLL            │ ◄── Fetch new I/O events & run callbacks
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │           CHECK           │ ◄── setImmediate() callbacks
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │      CLOSE CALLBACKS      │ ◄── e.g., socket.on('close', ...)
                   └─────────────┬─────────────┘
                                 │
                   ┌─────────────▼─────────────┐
                   │   Check for Microtasks    │ ◄── process.nextTick() & Promises
                   └───────────────────────────┘
```

#### Detailed Breakdown of Event Loop Phases:

| Phase | Description | Key Functions Handled |
| :--- | :--- | :--- |
| **Timers** | Executes callbacks scheduled by `setTimeout()` and `setInterval()`. | `setTimeout(cb, 100)` |
| **Pending Callbacks** | Executes I/O callbacks deferred from the previous loop iteration (e.g., TCP errors). | Operating system level errors |
| **Idle, Prepare** | Internal phase used by Node.js for engine optimization. | Node internal |
| **Poll** | Retrieves new I/O events (database queries, network requests, disk reads) and runs their callbacks. If queue is empty, it blocks here briefly waiting for I/O. | `fs.readFile`, DB responses |
| **Check** | Executes callbacks registered via `setImmediate()`. | `setImmediate(cb)` |
| **Close Callbacks** | Executes cleanup callbacks when resources close abruptly. | `socket.on('close')` |

> ⚠️ **The Microtask Queue Priority Rule:**  
> Between **EVERY SINGLE PHASE** (and even between individual callback executions within a phase), Node.js drains the **Microtask Queue**.  
> Order inside Microtasks: `process.nextTick()` runs FIRST, followed by `Promise.then()` microtasks.

---

### Q2: How does Node.js handle I/O operations without blocking if JavaScript runs on a single thread?

**Difficulty:** Core  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
Node.js relies on **`libuv`**, a C library that abstracts asynchronous I/O across platforms.
1. **Network I/O:** Modern OS kernels (Linux `epoll`, macOS `kqueue`, Windows `IOCP`) provide non-blocking asynchronous system calls. Node delegates network requests directly to the OS kernel. The kernel notifies Node via events when data arrives.
2. **File Disk I/O & DNS Lookups:** OS kernels often do not provide non-blocking disk I/O APIs. `libuv` manages a **Thread Pool** (default size = 4, configurable via `UV_THREADPOOL_SIZE`). Disk read/write operations are offloaded to one of these threads. When done, the thread notifies the main event loop thread.

---

### Q3: What is the execution order between `process.nextTick()`, `Promise.then()`, `setTimeout()`, and `setImmediate()`?

**Difficulty:** Tricky / Practical  
**Importance:** 🔥🔥🔥🔥

#### Code Challenge Example:
```javascript
console.log('1. Script Start');

setTimeout(() => console.log('2. setTimeout (Timer Queue)'), 0);
setImmediate(() => console.log('3. setImmediate (Check Queue)'));

Promise.resolve().then(() => console.log('4. Promise (Microtask Queue)'));
process.nextTick(() => console.log('5. nextTick (Microtask Queue)'));

console.log('6. Script End');
```

#### Output:
```text
1. Script Start
6. Script End
5. nextTick (Microtask Queue)
4. Promise (Microtask Queue)
2. setTimeout (Timer Queue)  <-- Or 3 depending on timer resolution at startup
3. setImmediate (Check Queue)
```

#### Explanation:
1. Synchronous code executes line by line (`1`, `6`).
2. Microtask queue drains before moving to any event loop phase. `process.nextTick()` holds highest microtask priority (`5`), followed by `Promise.then()` (`4`).
3. Macrotask queues (Timers phase vs Check phase) run next.

---

### Q4: How does Express.js Middleware Pipeline work under the hood, and how should error handling be structured?

**Difficulty:** Practical / Project Relevant  
**Importance:** 🔥🔥🔥🔥🔥 (Directly used in `server.js` & `middleware/auth.js`)

#### Explanation:
Express uses an internal middleware stack (an array of layer objects containing path regex and handler functions). When an HTTP request enters, Express iterates through matching layers sequentially via `next()`.

```
[ Incoming HTTP Request ]
          │
          ▼
   ┌──────────────┐
   │ Helmet Guard │ ──► Sets HTTP Security Headers
   └──────┬───────┘
          │ next()
          ▼
   ┌──────────────┐
   │  CORS Check  │ ──► Validates Allowed Origins
   └──────┬───────┘
          │ next()
          ▼
   ┌──────────────┐
   │ Rate Limiter │ ──► Rejects if requests > threshold (429)
   └──────┬───────┘
          │ next()
          ▼
   ┌──────────────┐
   │  JWT Auth    │ ──► Decodes Token & Attaches req.user
   └──────┬───────┘
          │ next()
          ▼
   ┌──────────────┐
   │ Route Handler│ ──► Executes Controller Logic
   └──────┬───────┘
          │ next(err) if error occurs
          ▼
   ┌────────────────────────────────┐
   │ Central Error Handling (4 args)│ ──► Formats JSON Response (500/400)
   └────────────────────────────────┘
```

#### Code Snippet (Central Error Middleware in `server.js`):
```javascript
// Global Central Error Handler (Must have EXACTLY 4 parameters)
app.use((err, req, res, next) => {
  console.error(`[API ERROR] ${req.method} ${req.url} - ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

---

### Q5: Tech Stack Comparison: Why choose Express.js over NestJS or Fastify?

**Difficulty:** Architectural Comparison  
**Importance:** 🔥🔥🔥🔥 (Frequently asked in tech stack defense)

#### 1. What is Express.js?
**Express.js** is an unopinionated, minimalist web framework for Node.js. It acts as a lightweight wrapper around Node's HTTP module, routing incoming requests through a sequential array of middleware functions.
- **Key Features:** Minimal abstraction, maximum developer freedom, massive ecosystem of existing npm middleware (Helmet, CORS, Morgan).
- **Pros:** Zero rigid structure overhead, easy to learn, quick setup for small-to-medium microservices.
- **Cons:** Developer must design project structure, error handling, and architecture manually.

#### 2. What is Fastify?
**Fastify** is a modern Node.js framework focused on ultra-high throughput and low overhead.
- **Key Features:** Built-in JSON Schema validation (powered by Ajv) to validate request parameters and fast-json-stringify for rapid response serialization.
- **Pros:** Reaches 30k+ requests/sec (roughly double Express), native TypeScript support, asynchronous plugin system.
- **Cons:** Smaller ecosystem compared to Express, requires learning Fastify-specific plugin patterns.

#### 3. What is NestJS?
**NestJS** is a heavily opinionated, enterprise-grade framework inspired by Angular architecture.
- **Key Features:** Built natively with TypeScript, uses Object-Oriented Programming (OOP), Controllers, Services/Providers, Modules, and Dependency Injection (DI). It uses Express or Fastify under the hood.
- **Pros:** Enforces consistent architecture across enterprise teams, out-of-the-box support for Microservices, WebSockets, and GraphQL.
- **Cons:** High learning curve, heavy boilerplate overhead, steep setup time for simple REST APIs.

---

#### 4. Detailed Architectural Comparison:

| Metric / Feature | Express.js (Used in Balor) | Fastify | NestJS |
| :--- | :--- | :--- | :--- |
| **Architecture** | Unopinionated, minimal middleware pipeline. | Schema-driven, JSON optimized. | Highly structured (Angular-like MVC, Dependency Injection). |
| **Performance** | High (~15k req/sec) | Ultra-High (~30k+ req/sec) | Medium-High (Built on top of Express/Fastify). |
| **Learning Curve** | Extremely Low | Low | High (Requires TypeScript, Decorators, Modules). |
| **Ecosystem** | Massive, industry standard for 10+ years. | Fast growing. | Popular for enterprise Angular-based teams. |
| **Why we chose Express:** | Gives complete lightweight flexibility for small-to-medium REST services without heavy OOP boilerplate overhead. |

---

### Q6: How does V8 Garbage Collection work in Node.js, and how do you detect and prevent Memory Leaks?

**Difficulty:** Advanced Backend  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
V8 manages heap memory using two main spaces:
1. **New Space (Young Generation):** Small memory region (1-8 MB) for short-lived allocations. Garbage collection uses the fast **Scavenge (Cheney's) algorithm**.
2. **Old Space (Old Generation):** Survived two GC cycles in New Space. Uses **Mark-Sweep-Compact algorithm** to mark reachable objects and reclaim unmarked space.

#### Common Causes of Memory Leaks in Node.js:
- **Global Variables:** Assigning objects without `const`/`let` keeps them in global memory forever.
- **Uncleaned Event Listeners / Timers:** Forgetting `clearInterval()` or `emitter.removeListener()`.
- **Closures holding big scope:** Outer function scope held in memory by inner references.

---

### Q7: When should you use Worker Threads versus the Cluster Module in Node.js?

**Difficulty:** Conceptual / Scaling  
**Importance:** 🔥🔥🔥

#### 1. What is the Cluster Module? (`cluster`)

The **Cluster Module** enables a Node.js application to spawn multiple **separate child processes** (OS-level processes), each running its own independent instance of the V8 engine, event loop, and memory space.

- **How it works:** A **Master (or Primary) process** binds to the application server port (e.g., port 5000) and uses OS IPC (Inter-Process Communication) sockets to distribute incoming HTTP requests among multiple **Worker processes** (typically 1 worker process per CPU core) using a round-robin algorithm.
- **Memory Isolation:** Each cluster worker runs in complete memory isolation. If a worker process crashes due to an unhandled exception, the primary process detects the exit event and forks a new worker process without dropping the web server.
- **Primary Use Case:** **Horizontal scaling of I/O-bound web HTTP servers across multi-core CPUs.** It allows Node.js to utilize all available CPU cores on a machine to handle more concurrent network requests.

```
                  ┌──────────────────────────────┐
                  │    Primary / Master Process   │ (Binds to Port 5000)
                  └──────────────┬───────────────┘
                                 │ Inter-Process Communication (IPC)
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │ Worker Proc 1│      │ Worker Proc 2│      │ Worker Proc 3│ (Isolated V8 Heaps,
    │ (V8 + Loop)  │      │ (V8 + Loop)  │      │ (V8 + Loop)  │  Independent Memory)
    └──────────────┘      └──────────────┘      └──────────────┘
```

#### 2. What are Worker Threads? (`worker_threads`)

The **Worker Threads** module (`require('worker_threads')`) enables Node.js to execute multiple **threads** concurrently within a **single Node.js OS process**.

- **How it works:** Each worker thread receives its own V8 isolate and event loop, but all worker threads live within the **same OS process space**.
- **Shared Memory:** Unlike cluster processes, worker threads can share memory directly using `SharedArrayBuffer` objects without serializing or copying data back and forth over IPC sockets.
- **Primary Use Case:** **Offloading CPU-bound intensive operations within a single request.** Examples include image processing, video transcoding, PDF invoice generation, machine learning calculations, or complex cryptographic operations. Without worker threads, heavy CPU tasks block Node's single main event loop, stalling all HTTP request handling.

```
                   ┌───────────────────────────────────────────┐
                   │           Single Node.js Process          │
                   │                                           │
                   │   ┌───────────────────────────────────┐   │
                   │   │            Main Thread            │   │
                   │   │    (V8 Engine + Event Loop)       │   │
                   │   └─────────────────┬─────────────────┘   │
                   │                     │ Shared Memory        │
                   │      ┌──────────────┴──────────────┐      │
                   │      ▼                             ▼      │
                   │ ┌──────────────┐             ┌──────────────┐ │
                   │ │ Worker Thread│             │ Worker Thread│ │
                   │ │ (CPU Task 1) │             │ (CPU Task 2) │ │
                   │ └──────────────┘             └──────────────┘ │
                   └───────────────────────────────────────────┘
```

---

#### 3. Detailed Architectural Comparison:

| Feature / Metric | `cluster` Module | `worker_threads` Module |
| :--- | :--- | :--- |
| **Execution Model** | Spawns multiple **separate OS processes**. | Spawns multiple **threads within 1 OS process**. |
| **V8 Engine & Memory** | Isolated V8 heap & memory space per process. | Separate V8 isolates, but **shared process memory**. |
| **Data Transfer** | IPC (Inter-Process Communication) via serialized messages (`process.send()`). | `MessagePort` messaging or zero-copy `SharedArrayBuffer`. |
| **Startup Overhead** | Higher (loads full Node.js binary & memory footprint per process). | Lower (threads share process overhead). |
| **Fault Isolation** | High (if 1 worker process crashes, other workers continue). | Lower (an unhandled error in a thread can crash the process). |
| **Network Port Sharing** | Master process automatically balances incoming HTTP sockets across workers. | Threads do NOT natively load-balance incoming HTTP connections. |
| **Primary Objective** | Scale **HTTP request throughput** across all CPU cores. | Execute **CPU-heavy tasks** without blocking Event Loop. |

---

### Q8: What are Node.js Streams and Buffers? How do they prevent Out-Of-Memory (OOM) errors when handling large files?

**Difficulty:** Practical / Deep Backend  
**Importance:** 🔥🔥🔥🔥

#### 1. What is a Buffer?
A **Buffer** is a fixed-size chunk of raw binary memory allocated **outside the V8 JavaScript heap** (directly in RAM).
- **How it works:** When Node.js reads data (from disk, socket, or network), it temporarily stores binary bytes in a Buffer until the entire payload is collected.
- **Limitation:** If you attempt to read a 4GB file using `fs.readFile()`, Node allocates a 4GB Buffer in RAM at once. If server RAM is limited, V8 throws an **`ERR_BUFFER_TOO_LARGE` / Out-Of-Memory (OOM) crash**.

#### 2. What is a Stream?
A **Stream** is an asynchronous data-handling pattern that processes data **piece-by-piece (chunk by chunk)** sequentially, without requiring the entire payload to reside in RAM.
- **4 Core Types of Streams:**
  1. **Readable:** Source stream from which data is read (e.g., `fs.createReadStream()`, incoming `req` object).
  2. **Writable:** Destination stream to which data is written (e.g., `fs.createWriteStream()`, outgoing `res` object).
  3. **Duplex:** Both Readable and Writable (e.g., TCP socket).
  4. **Transform:** Duplex stream that modifies data as it is read/written (e.g., `zlib.createGzip()` compression stream).
- **Backpressure Handling:** When a Writable stream is slower than a Readable stream, `stream.pipe()` automatically pauses the Readable stream so RAM buffers don't overflow.

```
Without Stream:  [ Large 5GB File ] ──► [ Entire 5GB in RAM (OOM Crash!) ] ──► Client
With Stream:     [ Large 5GB File ] ──► [ Small 64KB Chunks in RAM ] ────────► Client
```

```javascript
// Piping readable stream directly to writable response stream
const fs = require('fs');
app.get('/download-report', (req, res) => {
  const readStream = fs.createReadStream('./large-analytics.csv');
  readStream.pipe(res); // Automatically manages backpressure!
});
```

---

### Q9: What is the difference between CommonJS and ES Modules in Node.js?

**Difficulty:** Basic / Fundamental  
**Importance:** 🔥🔥🔥

#### 1. What is CommonJS? (`CJS`)
**CommonJS** is the original synchronous module system built for server-side Node.js (`require()` and `module.exports`).
- **How it works:** Modules are loaded **synchronously at runtime** when `require()` execution hits a given line of code.
- **Features:** Dynamic imports inside `if` blocks are supported (`if (condition) require('./module')`). Values are exported by copying the `module.exports` object.

#### 2. What is ES Modules? (`ESM`)
**ES Modules** is the official standardized module system for JavaScript (`import` and `export`).
- **How it works:** Module dependencies are parsed **statically before execution** during code compilation.
- **Features:** Enables Tree-Shaking (dead code elimination by bundlers), natively supports top-level `await`, and exports live bindings (references to exported values update dynamically).

---

#### 3. Detailed Comparison:

| Feature | CommonJS (`require`) | ES Modules (`import/export`) |
| :--- | :--- | :--- |
| **Loading Phase** | Synchronous, dynamic loading at runtime. | Asynchronous, static parsing before code execution. |
| **Top-Level `await`** | Not supported directly inside module root. | Supported natively in modern Node.js. |
| **File Resolution** | Defaults to `.js` files; omit extension allowed. | Requires explicit file extensions (`import x from './file.js'`). |
| **Tree Shaking** | Hard for bundlers (dynamic loading). | Excellent (static dependency graph). |
| **File Extension** | `.js` (default in older Node) or `.cjs`. | `.mjs` or `"type": "module"` in `package.json`. |

---

### Q10: How do you implement a Graceful Shutdown in a production Node/Express app?

**Difficulty:** Production Engineering  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
When deploying new backend versions (or when Kubernetes/PM2 sends a `SIGTERM`/`SIGINT` signal), we must stop accepting new HTTP requests, finish processing in-flight requests, close DB sockets, and exit cleanly.

```javascript
const server = app.listen(PORT, () => console.log(`Server on ${PORT}`));

function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  // 1. Stop accepting new HTTP requests
  server.close(async () => {
    console.log('HTTP server closed.');
    
    // 2. Close Database connections
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    
    // 3. Exit process cleanly
    process.exit(0);
  });

  // Force shutdown after 10 seconds if connections are stuck
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

### Q11: How should you handle `uncaughtException` and `unhandledRejection` in a production Node.js server?

**Difficulty:** Production Best Practices  
**Importance:** 🔥🔥🔥

```javascript
// Catch uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception!', err);
  // Log error to monitoring tool (Sentry/Datadog) then exit safely
  process.exit(1); // Process is in an unpredictable state; restart via PM2
});

// Catch unhandled Promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
```

---

### Q12: What is CORS? How do preflight (`OPTIONS`) requests work, and how do you configure it securely?

**Difficulty:** Web Security / API Design  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `server.js` line 60)

#### Explanation:
**CORS (Cross-Origin Resource Sharing)** is a browser security feature that blocks web pages from making AJAX requests to a different domain/port than the one that served the page.

If a request uses non-simple HTTP methods (`PUT`, `DELETE`, `PATCH`) or custom headers (`Authorization`), the browser automatically sends a **Preflight `OPTIONS` request** first to verify if the server permits the operation.

```javascript
// Secure CORS configuration in server.js
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allows sending Cookies & Authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### Q13: What security headers does `helmet.js` set, and why is each header important?

**Difficulty:** Security  
**Importance:** 🔥🔥🔥🔥 (Used in `server.js` line 55)

| Header set by `helmet()` | Purpose / Vulnerability Prevented |
| :--- | :--- |
| `Content-Security-Policy` | Restricts sources from which scripts, images, and frames can be loaded (Prevents XSS). |
| `X-Frame-Options: SAMEORIGIN` | Prevents rendering the site inside an `<iframe>` on external sites (Prevents Clickjacking). |
| `Strict-Transport-Security (HSTS)` | Enforces browser connection over secure HTTPS only. |
| `X-Content-Type-Options: nosniff` | Blocks browsers from MIME-sniffing responses away from declared `Content-Type`. |

---

### Q14: How does Rate Limiting work in Express, and what is the difference between Fixed Window and Sliding Window?

**Difficulty:** System Security  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Fixed Window Rate Limiting?
The **Fixed Window** algorithm divides time into static, fixed intervals (e.g., 1-minute blocks from 12:00 to 12:01).
- **How it works:** It maintains a request counter for a user/IP per fixed block. When the window resets at 12:01, the request counter resets back to 0.
- **Vulnerability (Traffic Spike at Boundary):** If a limit is 100 req/min, an attacker can send 100 requests at 12:00:59 and another 100 requests at 12:01:01. The server receives **200 requests within 2 seconds**, potentially overwhelming the system despite technically staying within rate limits.

#### 2. What is Sliding Window Rate Limiting?
The **Sliding Window** algorithm tracks requests relative to a moving timestamp window (e.g., looking backward 60 seconds from the exact current millisecond).
- **How it works (Sliding Log / Counter):** It stores request timestamps in Redis (e.g., using a Sorted Set `ZSET`). When a new request arrives, timestamps older than `now - 60s` are pruned, and the count of remaining timestamps is evaluated.
- **Advantage:** Eliminates boundary traffic spikes, smoothing out traffic enforcement accurately across time.

---

#### 3. Summary Comparison:

| Metric | Fixed Window (Default `express-rate-limit`) | Sliding Window (Redis Sorted Set) |
| :--- | :--- | :--- |
| **Implementation Complexity** | Low (simple memory counter). | Medium (requires Redis `ZADD`/`ZREMRANGEBYSCORE`). |
| **Memory Overhead** | Extremely Low ($O(1)$ per IP key). | Higher ($O(N)$ stored timestamps per IP). |
| **Burst Protection** | ⚠️ Vulnerable at window boundary resets. | ✅ Full protection against boundary bursts. |

---

### Q15: What is `EventEmitter` in Node.js, and how can it cause memory leaks if mismanaged?

**Difficulty:** Core Node.js  
**Importance:** 🔥🔥🔥

#### Explanation:
`EventEmitter` implements the Publish-Subscribe (Pub/Sub) pattern. Node issues a warning if more than 10 listeners are attached to a single event without increasing `emitter.setMaxListeners(n)`, indicating a potential memory leak where listeners are repeatedly registered inside request handlers without being removed.

---

### Q16: Tech Stack Comparison: Session-Based Authentication vs Token-Based (JWT) Authentication

**Difficulty:** Authentication Architecture  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is Stateful Session-Based Authentication?
In **Session Authentication**, the server verifies credentials and creates a session record stored in server memory or a database/Redis store.
- **How it works:** The server sends back a `sessionId` string stored in a browser cookie. On every HTTP request, the browser sends `sessionId`, and the backend queries server memory/Redis to validate if the session exists and fetch the user profile.
- **Pros:** Instant revocation (deleting the session key from Redis instantly logs out the user).
- **Cons:** Harder to scale horizontally across distributed microservices (requires centralized Redis cluster).

#### 2. What is Stateless Token-Based (JWT) Authentication?
In **JWT Authentication**, the server verifies credentials and returns a self-contained, digitally signed token.
- **How it works:** The token payload (e.g. `{ userId, role }`) is Base64 encoded and signed with a secret key (`JWT_SECRET`). On every HTTP request, the client sends `Authorization: Bearer <token>`. The server verifies the signature cryptographically **without making any database lookup**.
- **Pros:** Extremely scalable across horizontal microservices (zero DB latency per request).
- **Cons:** Revoking a token before its expiration requires building a Redis token-blacklist.

---

#### 3. Detailed Comparison:

| Attribute | Stateful Session Auth | Stateless JWT Auth (Balor Architecture) |
| :--- | :--- | :--- |
| **State Location** | Stored on Server Memory / Redis session store. | Stored on Client (Encrypted/Signed Token). |
| **Database Query** | Required on every API call to validate sessionId. | Zero DB calls needed (Signature validated cryptographically). |
| **Scalability** | Harder across multi-region server clusters. | Extremely easy across horizontal microservices. |
| **Revocation** | Instant (Delete session key from Redis). | Harder before token expiry (Requires token blacklisting). |

---

### Q17: How do you handle file uploads safely in Node/Express without clogging server memory?

**Difficulty:** Practical Backend  
**Importance:** 🔥🔥🔥

#### Explanation:
Never parse file uploads directly into server RAM as base64 buffers! Use multipart streams (e.g., `multer`) configured with disk storage limits or directly pipe streams to Cloud Storage (AWS S3) using S3 Presigned URLs.

---

### Q18: How do you track requests across async call stacks for logging in Node.js?

**Difficulty:** Advanced Operations  
**Importance:** 🔥🔥🔥

#### Solution:
Node.js provides **`AsyncLocalStorage`** (from `async_hooks`). It allows attaching a unique `requestId` to the execution context of an HTTP request, making it accessible inside nested async database functions without explicitly passing `req` down through every function signature.

---

### Q19: When should you move background tasks from in-memory callbacks to external queues like BullMQ?

**Difficulty:** System Design / Messaging  
**Importance:** 🔥🔥🔥🔥

#### 1. What are In-Memory Async Callbacks?
In-memory tasks are background operations initiated directly inside Node request handlers using `setTimeout()`, `setImmediate()`, or unhandled Promises (e.g., `sendEmail().catch(...)`).
- **Drawbacks:** If the server crashes or restarts, pending in-memory tasks are lost forever. They consume main thread resources and lack retry logic or concurrency rate limits.

#### 2. What are External Task Queues? (BullMQ + Redis)
An external queue delegates heavy tasks to a separate worker process backed by persistent storage (**Redis**).
- **How it works:** Web nodes push job payloads to Redis (`await queue.add('sendEmail', data)`). Dedicated worker processes pick jobs from Redis, execute them, and automatically retry on failure using exponential backoff.
- **Benefits:** Job persistence across server restarts, retry management, rate limiting, and complete isolation of heavy CPU/network tasks away from HTTP web servers.

---

#### 3. Decision Matrix:

| Requirement | In-Memory Callbacks | BullMQ + Redis Queue |
| :--- | :--- | :--- |
| **Durability / Loss Protection** | ❌ Lost on process crash/restart. | ✅ Persisted to Redis disk. |
| **Automatic Retries** | ❌ Manual boilerplate required. | ✅ Built-in configurable retry backoff strategies. |
| **Worker Isolation** | ❌ Runs on HTTP main thread. | ✅ Runs in dedicated background worker processes. |
| **Use Case** | Non-critical analytics logging. | Payment processing, mass emails, video rendering, invoice PDFs. |

---

### Q20: How do you profile a slow Node.js API endpoint to identify CPU or I/O bottlenecks?

**Difficulty:** Performance Tuning  
**Importance:** 🔥🔥🔥🔥

#### Step-by-Step Diagnostic Approach:
1. **Identify Bottleneck Type:** Check if high latency is due to CPU (heavy loops) or I/O (slow MongoDB query).
2. **CPU Profiling:** Run Node with `--inspect` flag and connect Chrome DevTools (`chrome://inspect`) to take a Flamegraph CPU profile.
3. **Database Profiling:** Enable Mongoose debug logging (`mongoose.set('debug', true)`) or inspect MongoDB Slow Query Logs (`system.profile` collection).
4. **Tooling:** Use `clinic.js` (`clinic doctor -- node server.js`) to automatically diagnose Event Loop delay, Garbage Collection spikes, or I/O bottlenecking.

---
