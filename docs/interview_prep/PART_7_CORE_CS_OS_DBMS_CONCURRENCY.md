# Part 7: Core CS Fundamentals (OS, DBMS & Concurrency)

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Core CS Focus:** OS Processes/Threads, Deadlocks, Virtual Memory, DBMS Isolation Levels, B+ Trees

---

## 📌 Table of Contents
1. [Process vs Thread & Memory Layout](#q1-tech-stack-comparison-process-vs-thread)
2. [Concurrency vs Parallelism](#q2-what-is-the-difference-between-concurrency-and-parallelism)
3. [Deadlock: 4 Coffman Conditions & Prevention](#q3-what-is-a-deadlock-what-are-the-4-necessary-coffman-conditions)
4. [CPU Scheduling Algorithms (Round Robin vs SJF)](#q4-how-do-cpu-scheduling-algorithms-round-robin-vs-sjf-work)
5. [Virtual Memory, Paging & Page Faults](#q5-how-does-virtual-memory-and-paging-work-in-operating-systems)
6. [Synchronization Primitives: Mutex vs Semaphore](#q6-tech-stack-comparison-mutex-vs-semaphore)
7. [Race Conditions & Critical Section Problem](#q7-what-is-the-critical-section-problem-and-how-do-we-solve-it)
8. [Database Index Internals: B-Trees vs B+ Trees](#q8-tech-stack-comparison-b-tree-vs-b-tree-indexes)
9. [DBMS Transaction Isolation Levels & Read Anomalies](#q9-what-are-the-dbms-transaction-isolation-levels-and-read-anomalies)
10. [Write-Ahead Logging (WAL) & Crash Recovery](#q10-what-is-write-ahead-logging-wal-and-how-does-it-ensure-durability)
11. [Relational Database Normalization (1NF to BCNF)](#q11-what-is-database-normalization-1nf-2nf-3nf-bcnf)
12. [Two-Phase Locking (2PL) Protocol](#q12-how-does-two-phase-locking-2pl-ensure-serializability)
13. [Storage Memory Hierarchy & Cache Coherence](#q13-what-is-the-computer-storage-memory-hierarchy)
14. [Thrashing & The Working Set Model](#q14-what-is-thrashing-in-operating-systems)
15. [Linux File System Inodes](#q15-what-is-an-inode-in-unixlinux-file-systems)
16. [Zombie Processes vs Orphan Processes](#q16-tech-stack-comparison-zombie-process-vs-orphan-process)
17. [Starvation vs Deadlock](#q17-tech-stack-comparison-starvation-vs-deadlock)
18. [Database Query Execution & `EXPLAIN ANALYZE`](#q18-how-does-a-database-query-optimizer-execute-a-query)
19. [Optimistic Concurrency Control (OCC) vs Pessimistic Locking](#q19-tech-stack-comparison-optimistic-locking-vs-pessimistic-locking)
20. [Connection Pooling & OS Socket Backlog Queues](#q20-how-do-tcp-listen-backlog-queues-work-in-the-os-kernel)

---

### Q1: Tech Stack Comparison: Process vs Thread

**Difficulty:** Core OS  
**Importance:** 🔥🔥🔥🔥🔥 (Foundational SDE Question)

#### 1. What is an OS Process?
An independent execution environment created by the operating system containing its own allocated memory space.
- **Components:** Has its own private Code, Data, Heap, and Stack segments.
- **Isolation:** Isolated from other processes. A crash in one process does not affect other processes.
- **Overhead:** High creation and context-switching overhead (flushes CPU Translation Lookaside Buffer / TLB).

#### 2. What is an OS Thread? (Lightweight Process)
The smallest sequence of programmed instructions that can be managed independently by the OS scheduler.
- **Components:** Lives inside a parent process. Has its own register set and execution stack, but shares Heap, Data, and Code segments with brother threads in the same process.
- **Overhead:** Low creation and context-switching overhead (shares memory space, zero TLB flush).
- **Risk:** Unhandled crash or memory corruption in one thread can crash the entire parent process.

```
PROCESS A (Isolated Memory Space)          PROCESS B (Isolated Memory Space)
┌───────────────────────────────┐          ┌───────────────────────────────┐
│ Code Segment | Data Segment   │          │ Code Segment | Data Segment   │
├──────────────┬────────────────┤          ├──────────────┬────────────────┤
│ Thread 1     │ Thread 2       │          │ Thread 1     │ Thread 2       │
│ (Stack/Regs) │ (Stack/Regs)   │          │ (Stack/Regs) │ (Stack/Regs)   │
└──────────────┴────────────────┘          └──────────────┴────────────────┘
```

---

#### 3. Summary Comparison:

| Metric | Process | Thread (Lightweight Process) |
| :--- | :--- | :--- |
| **Memory Sharing** | Isolated memory space per process. | Shared heap memory within parent process. |
| **Creation Overhead** | High (Requires OS memory allocation). | Low (Shares parent resources). |
| **Context Switching** | Slow (Flushes CPU TLB cache). | Fast (No TLB flush required). |
| **Crash Impact** | Process crash does not affect other processes. | Thread crash can corrupt entire process heap memory. |

---

### Q2: What is the difference between Concurrency and Parallelism?

**Difficulty:** Core CS  
**Importance:** 🔥🔥🔥🔥

- **Concurrency:** Dealing with multiple tasks at once by interleaving execution on a single core (e.g. Node.js Event Loop switching between I/O callbacks).
- **Parallelism:** Executing multiple tasks simultaneously on multiple physical CPU cores.

---

### Q3: What is a Deadlock? What are the 4 necessary Coffman Conditions?

**Difficulty:** OS Concurrency  
**Importance:** 🔥🔥🔥🔥🔥

A **Deadlock** occurs when a set of processes are permanently blocked because each holds a resource while waiting for another resource held by another process.

#### The 4 Coffman Conditions (Must all hold for Deadlock to occur):
1. **Mutual Exclusion:** Resources cannot be shared simultaneously.
2. **Hold and Wait:** Process holds a resource while waiting for additional resources.
3. **No Preemption:** Resources cannot be forcibly taken away from a process.
4. **Circular Wait:** Closed chain of processes where each waits for a resource held by the next.

---

### Q4: How do CPU Scheduling Algorithms (Round Robin vs SJF) work?

**Difficulty:** OS Fundamentals  
**Importance:** 🔥🔥🔥

#### 1. What is Shortest Job First (SJF)?
Non-preemptive or preemptive scheduling algorithm that picks the process with the smallest estimated CPU burst time next.
- **Pros:** Provably minimizes average waiting time across all processes.
- **Cons:** Suffers from **Starvation** (long CPU burst jobs may wait indefinitely if short jobs keep arriving).

#### 2. What is Round Robin (RR)?
Preemptive scheduling algorithm designed specifically for time-sharing systems.
- **How it works:** Assigns a fixed time quantum (e.g. 10ms–20ms) per process in a circular ready queue. When the time quantum expires, the process is preempted and pushed to the back of the queue.
- **Pros:** Guarantees fair CPU distribution and fast response times for interactive applications.

---

### Q5: How does Virtual Memory and Paging work in Operating Systems?

**Difficulty:** OS Memory Management  
**Importance:** 🔥🔥🔥🔥

Virtual Memory gives applications the illusion of a contiguous address space larger than physical RAM.
- **Pages & Frames:** Fixed-size memory blocks (typically 4KB). Virtual memory is split into Pages; physical RAM into Frames.
- **Page Table & TLB:** Maps Virtual Page Numbers to Physical Frame Numbers. The **Translation Lookaside Buffer (TLB)** is a CPU hardware cache speeding up page lookups.
- **Page Fault:** Triggers when a process accesses a page not currently loaded in physical RAM, forcing OS to fetch it from disk swap space.

---

### Q6: Tech Stack Comparison: Mutex vs Semaphore

**Difficulty:** Synchronization Primitives  
**Importance:** 🔥🔥🔥🔥

#### 1. What is a Mutex? (Mutual Exclusion Lock)
A locking mechanism owned by a single thread at a time.
- **How it works:** Binary lock (value 0 or 1). Only the specific thread that acquired/locked the Mutex is permitted to unlock it.

#### 2. What is a Semaphore?
A signaling mechanism controlling concurrent access to a finite pool of $N$ identical resources.
- **How it works:** Maintains an integer counter. `sem_wait()` decrements the count (blocks if count is 0), while `sem_post()` increments the count. Any thread can signal a Semaphore.

---

#### 3. Summary Comparison:

| Attribute | Mutex | Counting Semaphore |
| :--- | :--- | :--- |
| **Mechanism** | Locking mechanism (Ownership enforced). | Signaling mechanism (No ownership concept). |
| **Capacity** | Strictly Binary (1 thread at a time). | Integer count ($N$ concurrent threads permitted). |
| **Unlock Constraint** | Must be unlocked by the exact same thread that locked it. | Can be incremented/signaled by any thread. |

---

### Q7: What is the Critical Section Problem and how do we solve it?

**Difficulty:** Concurrency  
**Importance:** 🔥🔥🔥

A **Critical Section** is a code block that accesses shared mutable data. Any solution must guarantee 3 properties:
1. **Mutual Exclusion:** Only 1 process in critical section at a time.
2. **Progress:** If no process is in critical section, selection of next process cannot be postponed indefinitely.
3. **Bounded Waiting:** Limits how many times other processes can enter critical section after a request is made.

---

### Q8: Tech Stack Comparison: B-Tree vs B+ Tree Indexes

**Difficulty:** DBMS Internals  
**Importance:** 🔥🔥🔥🔥🔥 (Critical DBMS Index Question)

#### 1. What is a B-Tree?
Self-balancing search tree where data key-value pointers reside in **both internal nodes and leaf nodes**.
- **Drawback for Databases:** Range queries (`WHERE age BETWEEN 20 AND 30`) require traversing up and down tree parent-child pointers repeatedly.

#### 2. What is a B+ Tree? (Used in MongoDB WiredTiger & InnoDB)
Modified self-balancing tree where data pointers reside **EXCLUSIVELY in leaf nodes**. Internal nodes store search key indices only.
- **Doubly Linked Leaf Level:** All leaf nodes are linked together sequentially in a **Doubly Linked List**.
- **Advantage:** Range queries execute at lightning speed by jumping to the start leaf node and scanning horizontally across the linked list without touching parent nodes!

```
B-TREE: Data pointers stored in BOTH internal and leaf nodes.
B+ TREE: Data pointers stored ONLY in leaf nodes. Leaf nodes form a Doubly Linked List!

Leaf Level Doubly Linked List (B+ Tree):
[ Node 1 (Keys 1-10) ] ◄────► [ Node 2 (Keys 11-20) ] ◄────► [ Node 3 (Keys 21-30) ]
```

---

#### 3. Detailed Comparison:

| Feature | B-Tree | B+ Tree (Used in DB Engines) |
| :--- | :--- | :--- |
| **Data Pointer Location**| Internal + Leaf Nodes. | **Leaf Nodes Only**. |
| **Leaf Node Structure** | Independent nodes. | **Doubly Linked List** of leaves. |
| **Range Queries** | Slow (Requires tree traversals). | **Ultra Fast** (Sequential linked list traversal). |

---

### Q9: What are the DBMS Transaction Isolation Levels and Read Anomalies?

**Difficulty:** DBMS Core  
**Importance:** 🔥🔥🔥🔥🔥

#### Read Anomalies:
1. **Dirty Read:** Reading uncommitted data from a transaction that later rolls back.
2. **Non-Repeatable Read:** Re-reading a row yields different column values because another committed transaction updated it.
3. **Phantom Read:** Re-executing a range query returns new "phantom" rows inserted by another committed transaction.

#### Isolation Levels Matrix:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
| :--- | :--- | :--- | :--- |
| **Read Uncommitted** | ⚠️ Allowed | ⚠️ Allowed | ⚠️ Allowed |
| **Read Committed** (Default Postgres) | ✅ Prevented | ⚠️ Allowed | ⚠️ Allowed |
| **Repeatable Read** (Default MySQL) | ✅ Prevented | ✅ Prevented | ⚠️ Allowed |
| **Serializable** | ✅ Prevented | ✅ Prevented | ✅ Prevented |

---

### Q10: What is Write-Ahead Logging (WAL) and how does it ensure Durability?

**Difficulty:** Database Crash Recovery  
**Importance:** 🔥🔥🔥🔥

Before any database modification is written to dirty data pages on disk, a log record describing the change is sequentially written to the **Write-Ahead Log (WAL)** on non-volatile storage. In a crash, the DB replays the WAL (**REDO phase**) to restore committed operations.

---

### Q11: What is Database Normalization (1NF, 2NF, 3NF, BCNF)?

**Difficulty:** Relational Schema Design  
**Importance:** 🔥🔥🔥

- **1NF:** Atomic values per cell; no repeating groups.
- **2NF:** In 1NF + All non-key attributes are fully dependent on the primary key (No partial functional dependencies).
- **3NF:** In 2NF + No transitive dependencies (Non-key fields cannot depend on other non-key fields).
- **BCNF:** Strict 3NF where every determinant is a candidate key.

---

### Q12: How does Two-Phase Locking (2PL) ensure Serializability?

**Difficulty:** DBMS Concurrency  
**Importance:** 🔥🔥🔥

2PL divides locking into 2 phases:
1. **Growing Phase:** Transaction acquires locks, but cannot release any lock.
2. **Shrinking Phase:** Transaction releases locks, but cannot acquire new locks.

---

### Q13: What is the Computer Storage Memory Hierarchy?

**Difficulty:** Computer Architecture  
**Importance:** 🔥🔥🔥

`CPU Registers (<1 ns) -> L1/L2/L3 Cache (1-10 ns) -> RAM (100 ns) -> NVMe SSD (50 us) -> HDD (10 ms)`

---

### Q14: What is Thrashing in Operating Systems?

**Difficulty:** OS Memory Management  
**Importance:** 🔥🔥🔥

Thrashing occurs when an OS spends more time swapping pages in and out of virtual memory disk swap than executing process instructions due to insufficient physical RAM.

---

### Q15: What is an Inode in Unix/Linux File Systems?

**Difficulty:** OS File Systems  
**Importance:** 🔥🔥🔥

An **Inode (Index Node)** is a data structure storing file metadata (file size, permissions, owner, timestamps, and physical disk block pointers), excluding the actual file name.

---

### Q16: Tech Stack Comparison: Zombie Process vs Orphan Process

**Difficulty:** Unix OS  
**Importance:** 🔥🔥🔥

#### 1. What is an Orphan Process?
A running child process whose **parent process has terminated or crashed**.
- **OS Resolution:** The OS automatically re-parents the orphan process to `init` (PID 1). `init` periodically calls `wait()` to reap the orphan when it finishes execution.

#### 2. What is a Zombie Process? (Defunct Process)
A child process that has **finished execution**, but still retains an entry in the OS process table.
- **Why it occurs:** The parent process has not yet executed `wait()` or `waitpid()` system call to read the child's exit status code.
- **Resource Footprint:** Consumes zero RAM or CPU, but holds a Process ID (PID) slot in the process table. High numbers of zombies exhaust available PIDs.

---

#### 3. Summary Comparison:

| Attribute | Orphan Process | Zombie Process |
| :--- | :--- | :--- |
| **Execution State** | Still actively running. | Finished execution (Terminated). |
| **Parent Status** | Parent is dead (Re-parented to `init` PID 1). | Parent is alive, but failed to call `wait()`. |
| **Resource Usage** | Consumes CPU and RAM memory. | Consumes 0 CPU/RAM, but holds a PID slot. |

---

### Q17: Tech Stack Comparison: Starvation vs Deadlock

**Difficulty:** Concurrency  
**Importance:** 🔥🔥🔥

#### 1. What is Starvation?
A process is delayed indefinitely because **higher priority processes continuously monopolize CPU/resource access**.
- **Status:** The system as a whole continues making forward progress, but a specific low-priority thread never gets scheduled.
- **Solution:** **Aging technique** (gradually increasing process priority as it waits in queue).

#### 2. What is a Deadlock?
Two or more processes are **permanently blocked** waiting on each other to release locked resources.
- **Status:** Complete system freeze—zero forward progress occurs for all involved processes.
- **Solution:** Resource ordering rules, banker's algorithm, or deadlock detection & thread termination.

---

#### 3. Summary Comparison:

| Feature | Starvation | Deadlock |
| :--- | :--- | :--- |
| **System Progress** | System makes progress; specific task starves. | Zero progress across all deadlocked processes. |
| **Cause** | Unfair priority scheduling algorithm. | Circular wait condition across locked resources. |
| **Fix Mechanism** | Aging algorithm (boost priority over time). | Resource ordering, lock timeouts, process aborts. |

---

### Q18: How does a Database Query Optimizer execute a query?

**Difficulty:** DBMS Query Engine  
**Importance:** 🔥🔥🔥

1. **Parser:** Validates SQL syntax and generates Parse Tree.
2. **Logical Planner:** Transforms query into Relational Algebra expressions.
3. **Cost-Based Optimizer (CBO):** Evaluates CPU and I/O costs of multiple physical execution plans (Index Scan vs Full Table Scan) using database column statistics (`ANALYZE`).

---

### Q19: Tech Stack Comparison: Optimistic Locking vs Pessimistic Locking

**Difficulty:** DB Concurrency  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Pessimistic Locking?
Assumes concurrent write conflicts are **highly likely to happen**.
- **How it works:** Locks the target database row immediately upon reading (`SELECT ... FOR UPDATE`). Prevents all other transactions from reading or updating the row until the locking transaction commits or rolls back.
- **Pros:** Guarantees strict data consistency.
- **Cons:** High lock contention; risks deadlocks and reduces throughput in web applications.

#### 2. What is Optimistic Locking?
Assumes concurrent write conflicts are **rare**.
- **How it works:** Does not lock rows on read. Instead, tracks a version field (e.g. `__v` or `updatedAt`). On write, executes `UPDATE ... WHERE id = x AND version = expectedVersion`. If version was bumped by another transaction, the write fails and retries.
- **Pros:** Zero DB lock contention, ultra-high read/write concurrency. Perfect for high-traffic web applications.

---

#### 3. Decision Matrix:

| Attribute | Pessimistic Locking (`FOR UPDATE`) | Optimistic Locking (`version` check) |
| :--- | :--- | :--- |
| **Locking Mechanism** | Physical DB row/table locks held. | Zero physical DB locks held. |
| **Conflict Handling** | Prevents concurrent access up front. | Detects conflicts at commit time and retries. |
| **Best For** | Banking wire transfers, high conflict rates. | E-commerce items, salon bookings, high read volume. |

---

### Q20: How do TCP listen backlog queues work in the OS kernel?

**Difficulty:** Network OS Kernel  
**Importance:** 🔥🔥🔥

The Linux kernel maintains 2 queues per listening TCP socket:
1. **SYN Queue (Incomplete Connection):** Stores sockets in `SYN-RECEIVED` state during 3-way handshake.
2. **Accept Queue (Completed Connection):** Stores fully established sockets (`ESTABLISHED`) awaiting application `accept()` call.

---
