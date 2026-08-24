# Part 6: Computer Networks, REST APIs & Web Infrastructure

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** REST vs GraphQL vs gRPC, HTTP/1.1 to HTTP/3, TCP/IP, TLS Handshake, DNS, HTTP Caching

---

## 📌 Table of Contents
1. [Tech Stack Comparison: REST vs GraphQL vs gRPC](#q1-tech-stack-comparison-rest-vs-graphql-vs-grpc)
2. [HTTP Protocol Evolution: HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)](#q2-tech-stack-comparison-http11-vs-http2-vs-http3)
3. [TCP 3-Way Handshake & 4-Way Teardown](#q3-how-does-the-tcp-3-way-handshake-and-4-way-teardown-work)
4. [TLS/SSL Handshake & Asymmetric/Symmetric Encryption](#q4-how-does-the-tlsssl-handshake-process-secure-https-connections)
5. [HTTP Status Code Taxonomy & API Error Standards](#q5-what-is-the-taxonomy-of-http-status-codes-and-what-do-key-codes-mean)
6. [REST API Design Principles & Idempotency](#q6-what-are-the-core-principles-of-rest-api-design-and-which-methods-are-idempotent)
7. [DNS Lookup Resolution Flow](#q7-what-happens-behind-the-scenes-during-a-dns-domain-lookup)
8. [Forward Proxy vs Reverse Proxy](#q8-tech-stack-comparison-forward-proxy-vs-reverse-proxy)
9. [OSI 7-Layer Model vs TCP/IP Model](#q9-how-does-the-osi-7-layer-model-map-to-the-tcpip-stack)
10. [GraphQL N+1 Query Problem & DataLoader Solution](#q10-what-is-the-n1-problem-in-graphql-and-how-does-dataloader-solve-it)
11. [HTTP Caching Mechanics (`Cache-Control`, `ETag`, `If-None-Match`)](#q11-how-does-http-caching-work-with-etag-and-cache-control-headers)
12. [Content Delivery Networks (CDNs) & Edge POP Architecture](#q12-how-does-a-cdn-cache-and-deliver-static-assets-fast)
13. [WebSocket Protocol Upgrade Handshake (`101 Switching Protocols`)](#q13-how-does-an-http-connection-upgrade-to-a-websocket-connection)
14. [TCP vs UDP Transport Protocols](#q14-tech-stack-comparison-tcp-vs-udp)
15. [API Gateway Pattern Architecture](#q15-what-is-the-api-gateway-pattern-and-what-responsibilities-does-it-handle)
16. [IPv4 vs IPv6 & CIDR Subnetting Basics](#q16-what-is-the-difference-between-ipv4-and-ipv6)
17. [`X-Forwarded-For` Proxy Headers & IP Extraction](#q17-what-is-the-x-forwarded-for-header-and-why-is-it-critical-behind-proxies)
18. [Keep-Alive Connection Reuse in HTTP](#q18-what-is-http-keep-alive-and-how-does-it-improve-latency)
19. [REST API Versioning Strategies](#q19-what-are-the-different-strategies-for-versioning-rest-apis)
20. [Cross-Origin Resource Sharing (CORS) Network Mechanics](#q20-how-do-browsers-enforce-cors-at-the-network-level)

---

### Q1: Tech Stack Comparison: REST vs GraphQL vs gRPC

**Difficulty:** Core API Architecture  
**Importance:** 🔥🔥🔥🔥🔥 (Critical API comparison question)

#### 1. What is REST? (Representational State Transfer - Used in Balor)
Resource-oriented architectural style communicating over standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
- **How it works:** Exposes distinct endpoint URIs (`/api/salons`, `/api/bookings`). Returns JSON or XML.
- **Tradeoffs:** Simple, cacheable via standard HTTP headers, but prone to **Overfetching** (getting unused fields) or **Underfetching** (requiring multiple waterfall requests for related data).

#### 2. What is GraphQL?
Query language and runtime for APIs created by Meta.
- **How it works:** Exposes a single `/graphql` endpoint. The client sends a declarative POST query specifying the exact schema fields it needs.
- **Tradeoffs:** Solves overfetching/underfetching; ideal for complex dynamic frontends, but adds server CPU parsing overhead and complicates traditional HTTP response caching.

#### 3. What is gRPC?
High-performance Remote Procedure Call (RPC) framework created by Google.
- **How it works:** Defines API contracts using **Protocol Buffers (`.proto`)** and serializes payloads into compact binary streams over **HTTP/2**.
- **Tradeoffs:** 5-10x faster than REST JSON; supports native streaming, but lacks native browser support (requires gRPC-Web proxy).

---

#### 4. Detailed Architectural Comparison:

| Category | REST (Used in Balor) | GraphQL | gRPC |
| :--- | :--- | :--- | :--- |
| **Data Protocol** | JSON / XML over HTTP | JSON over HTTP | Protocol Buffers (Binary) over HTTP/2 |
| **Data Fetching** | Fixed endpoints (`/api/salons`). Risks Overfetching or Underfetching. | Client requests exact schema fields required. | Defined RPC Service Methods. |
| **Performance** | Medium (Text JSON parsing). | Medium (GraphQL AST execution engine overhead). | **Ultra-High** (Compact binary serialization, 5-10x faster). |
| **Streaming** | Hard (Requires WebSockets/SSE). | GraphQL Subscriptions. | Native Bidirectional Streaming. |
| **Best Use Case:** | Public Web/Mobile REST APIs. | Dynamic multi-client frontend apps. | Internal Microservice-to-Microservice calls. |

---

### Q2: Tech Stack Comparison: HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)

**Difficulty:** Network Protocols  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is HTTP/1.1?
Legacy web protocol operating over plain TCP connections.
- **Limitation (Head-of-Line Blocking):** Processes requests sequentially over a TCP connection. Browsers open up to 6 parallel TCP connections per domain to compensate, incurring TCP handshake overhead.

#### 2. What is HTTP/2?
Major revision introducing **Binary Framing and Multiplexing**.
- **Features:** Multiple request/response streams are multiplexed concurrently over a **single TCP socket**. Uses HPACK header compression.
- **Limitation:** TCP-level packet loss stalls ALL multiplexed streams on that socket (TCP Head-of-Line blocking).

#### 3. What is HTTP/3? (QUIC)
Modern web protocol replacing TCP with **UDP-based QUIC protocol**.
- **Features:** Implements per-stream congestion control over UDP. Packet loss on one stream does NOT block other streams (Zero TCP Head-of-Line blocking). Achieves 0-RTT connection resumption.

```
HTTP/1.1 : [ Request 1 ] ──► [ Response 1 ]  (Head-of-Line Blocking)
HTTP/2   : [ Req 1 ][ Req 2 ][ Req 3 ] ──► Multiplexed Binary Streams over 1 TCP
HTTP/3   : [ Stream 1 ][ Stream 2 ] ──► Multiplexed over UDP (QUIC Protocol)
```

---

#### 4. Summary Matrix:

| Metric | HTTP/1.1 | HTTP/2 | HTTP/3 |
| :--- | :--- | :--- | :--- |
| **Transport Protocol** | TCP | TCP | **UDP (QUIC)** |
| **Multiplexing** | No (Max 6 parallel TCP connections). | **Yes** (Multiple streams over 1 TCP socket). | **Yes** (Zero TCP Head-of-Line blocking). |
| **Header Compression** | No | HPACK | QPACK |
| **Connection Setup** | TCP 3-Way + TLS (~2-3 RTT). | TCP 3-Way + TLS (~2 RTT). | **QUIC 0-RTT / 1-RTT** fast handshake. |

---

### Q3: How does the TCP 3-Way Handshake and 4-Way Teardown work?

**Difficulty:** Network Layer 4  
**Importance:** 🔥🔥🔥🔥

#### TCP 3-Way Handshake (Establishing Connection):
```
Client                                   Server
  │ ─── 1. SYN (seq = x) ──────────────────► │ (Client requests connection)
  │ ◄── 2. SYN-ACK (seq = y, ack = x+1) ─── │ (Server acknowledges)
  │ ─── 3. ACK (ack = y+1) ────────────────► │ (Connection ESTABLISHED)
```

#### TCP 4-Way Teardown (Closing Connection):
Client sends `FIN` $\rightarrow$ Server sends `ACK` $\rightarrow$ Server sends `FIN` $\rightarrow$ Client sends `ACK`.

---

### Q4: How does the TLS/SSL Handshake process secure HTTPS connections?

**Difficulty:** Network Security  
**Importance:** 🔥🔥🔥🔥

1. **Client Hello:** Sends supported TLS versions and cipher suites.
2. **Server Hello:** Selects cipher suite and returns SSL Digital Certificate containing Public Key.
3. **Certificate Verification:** Client verifies certificate against trusted Certificate Authorities (CAs).
4. **Key Exchange:** Uses **Asymmetric Encryption** (RSA / Diffie-Hellman) to exchange a secret **Symmetric Session Key**.
5. **Encrypted Communication:** All subsequent HTTP data is encrypted using fast **Symmetric Encryption** (AES-GCM).

---

### Q5: What is the taxonomy of HTTP Status Codes, and what do key codes mean?

**Difficulty:** Core REST  
**Importance:** 🔥🔥🔥🔥🔥

- **1xx (Informational):** `101 Switching Protocols` (WebSockets upgrade).
- **2xx (Success):** `200 OK`, `201 Created`, `204 No Content`.
- **3xx (Redirection):** `301 Moved Permanently`, `304 Not Modified` (Cached response).
- **4xx (Client Errors):** `400 Bad Request`, `401 Unauthorized` (Missing Token), `403 Forbidden` (Role Denied), `404 Not Found`, `409 Conflict` (Duplicate Slot), `429 Too Many Requests` (Rate Limited).
- **5xx (Server Errors):** `500 Internal Error`, `502 Bad Gateway` (Nginx can't reach Node), `503 Service Unavailable`, `504 Gateway Timeout`.

---

### Q6: What are the core principles of REST API design, and which methods are Idempotent?

**Difficulty:** REST Design  
**Importance:** 🔥🔥🔥🔥

**Idempotent Operation:** Executing a request multiple times yields the exact same server state as executing it once.

| Method | Safe? | Idempotent? | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | Yes | Yes | Retrieve resource. |
| `POST` | No | **No** | Create new resource. |
| `PUT` | No | **Yes** | Replace entire resource. |
| `PATCH` | No | **No** (unless designed) | Partially update resource fields. |
| `DELETE` | No | **Yes** | Remove resource. |

---

### Q7: What happens behind the scenes during a DNS Domain Lookup?

**Difficulty:** Networking  
**Importance:** 🔥🔥🔥🔥

When typing `https://balorgrooming.com`:
1. **Browser & OS Cache Check:** Checks local DNS cache.
2. **Recursive Resolver (ISP / 8.8.8.8):** Receives query if cache misses.
3. **Root Nameserver (`.`):** Points to `.com` TLD Nameserver.
4. **TLD Nameserver (`.com`):** Points to Authoritative Nameserver hosting `balorgrooming.com`.
5. **Authoritative Nameserver:** Returns destination IP address (e.g. `54.210.12.5`).

---

### Q8: Tech Stack Comparison: Forward Proxy vs Reverse Proxy

**Difficulty:** Infrastructure Architecture  
**Importance:** 🔥🔥🔥🔥

#### 1. What is a Forward Proxy?
A server that sits in front of **clients (users)** to intercept outward internet requests.
- **How it works:** Client configures browser to send web requests through the Forward Proxy. The proxy forwards requests to origin servers on behalf of the client.
- **Use Cases:** Hiding client IP addresses (VPNs), bypassing geo-restrictions, enforcing corporate content filtering and employee access policies.

#### 2. What is a Reverse Proxy? (Nginx - Used in Balor)
A server that sits in front of **backend origin application servers** to intercept incoming client traffic.
- **How it works:** Clients connect to the Reverse Proxy (e.g. Nginx on port 443). Nginx decrypts SSL, balances load, and proxies requests to Node.js instances running on local ports (`localhost:5000`).
- **Use Cases:** SSL/TLS Termination, Load Balancing across backend clusters, static asset response caching, and protecting origin servers from direct public internet exposure (DDoS defense).

---

#### 3. Summary Comparison Matrix:

| Feature | Forward Proxy | Reverse Proxy (Nginx) |
| :--- | :--- | :--- |
| **Position** | Sits in front of **Clients (Users)**. | Sits in front of **Backend Origin Servers**. |
| **Identity Masked** | Hides Client IP from destination websites. | Hides internal Backend Server IPs from public users. |
| **Primary Goal** | Protect client privacy & filter outgoing requests. | Protect backend infrastructure, load balance, & terminate SSL. |

---

### Q9: How does the OSI 7-Layer Model map to the TCP/IP Stack?

**Difficulty:** Core CS Networking  
**Importance:** 🔥🔥🔥

```
OSI 7-LAYER MODEL                       TCP/IP 4-LAYER MODEL
┌─────────────────────────┐             ┌─────────────────────────┐
│ 7. Application Layer    │ ──────────► │ Application Layer       │
│ 6. Presentation Layer   │             │ (HTTP, HTTPS, WebSocket,│
│ 5. Session Layer        │             │  DNS, SSH, FTP)         │
├─────────────────────────┤             ├─────────────────────────┤
│ 4. Transport Layer      │ ──────────► │ Transport Layer         │
│                         │             │ (TCP, UDP)              │
├─────────────────────────┤             ├─────────────────────────┤
│ 3. Network Layer        │ ──────────► │ Internet Layer (IP)     │
├─────────────────────────┤             ├─────────────────────────┤
│ 2. Data Link Layer      │ ──────────► │ Network Access Layer    │
│ 1. Physical Layer       │             │ (Ethernet, Wi-Fi)       │
└─────────────────────────┘             └─────────────────────────┘
```

---

### Q10: What is the N+1 Problem in GraphQL and how does DataLoader solve it?

**Difficulty:** API Optimization  
**Importance:** 🔥🔥🔥

In GraphQL, fetching a list of 100 bookings and their corresponding barber requires 1 query for bookings + 100 individual queries for barbers ($N+1 = 101$ queries!). **DataLoader** uses batching and memoization to combine 100 individual IDs into a single SQL/NoSQL `$in` query: `Barber.find({ _id: { $in: [100 ids] } })`.

---

### Q11: How does HTTP Caching work with `ETag` and `Cache-Control` headers?

**Difficulty:** Web Caching  
**Importance:** 🔥🔥🔥

- **`Cache-Control: max-age=3600`:** Directs browser to serve asset directly from local memory disk for 1 hour without hitting server.
- **`ETag` (Entity Tag):** A hash fingerprint generated by server for a resource. On subsequent requests, browser sends `If-None-Match: "hash"`. If unchanged, server returns `304 Not Modified` with zero body payload.

---

### Q12: How does a CDN cache and deliver static assets fast?

**Difficulty:** Edge Infrastructure  
**Importance:** 🔥🔥🔥

A **Content Delivery Network (CDN)** deploys edge Points of Presence (PoPs) worldwide. When a user in London requests `/logo.webp`, Cloudflare routes the request to the nearest London edge server rather than fetching it across the Atlantic from an AWS origin server in Virginia.

---

### Q13: How does an HTTP connection upgrade to a WebSocket connection?

**Difficulty:** Protocol Internals  
**Importance:** 🔥🔥🔥

Client sends a standard HTTP `GET` request containing headers:
```http
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```
Server responds with `101 Switching Protocols`, keeping the TCP socket open for bidirectional binary/text frames.

---

### Q14: Tech Stack Comparison: TCP vs UDP

**Difficulty:** Layer 4 Protocols  
**Importance:** 🔥🔥🔥

#### 1. What is TCP? (Transmission Control Protocol)
A connection-oriented transport layer protocol.
- **How it works:** Requires a 3-way handshake (`SYN`, `SYN-ACK`, `ACK`) before transmitting data. Enforces in-order delivery, packet sequence numbers, and automatic retransmission of lost packets.
- **Use Cases:** Web HTTP/HTTPS requests, database connections, file transfers (SSH/FTP).

#### 2. What is UDP? (User Datagram Protocol)
A connectionless, lightweight transport layer protocol.
- **How it works:** Sends datagram packets to the destination immediately without establishing a prior handshake or checking if packets arrive safely.
- **Use Cases:** Real-time video streaming, DNS lookups, online multiplayer gaming, WebRTC audio/video calls.

---

#### 3. Summary Comparison:

| Attribute | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection** | Connection-Oriented (Handshake required). | Connectionless (Fire and forget). |
| **Reliability** | Guaranteed in-order delivery & packet re-transmission. | No delivery guarantee or ordering. |
| **Header Overhead** | 20 Bytes | 8 Bytes |
| **Use Case:** | HTTP, Web, Database Queries, SSH. | Live Video Streaming, DNS, Gaming, WebRTC. |

---

### Q15: What is the API Gateway Pattern and what responsibilities does it handle?

**Difficulty:** HLD  
**Importance:** 🔥🔥🔥

An **API Gateway** acts as the single entry point for clients in a microservice architecture, handling Centralized Auth Verification, Rate Limiting, SSL Termination, Request Routing, and Protocol Translation.

---

### Q16: What is the difference between IPv4 and IPv6?

**Difficulty:** Network Basics  
**Importance:** 🔥🔥🔥

#### 1. What is IPv4?
32-bit numerical IP address format (`192.168.1.1`).
- **Limitation:** Yields $2^{32} \approx 4.3$ billion addresses, which are now completely exhausted globally.

#### 2. What is IPv6?
128-bit hexadecimal IP address format (`2001:0db8:85a3::8a2e:0370:7334`).
- **Advantage:** Yields $2^{128} \approx 3.4 \times 10^{38}$ unique addresses (enough to assign trillions of IPs to every device on earth). Includes native IPSec security.

---

### Q17: What is the `X-Forwarded-For` header and why is it critical behind proxies?

**Difficulty:** Reverse Proxy Security  
**Importance:** 🔥🔥🔥

When Nginx proxies HTTP requests to Express, `req.ip` yields Nginx's internal IP (`127.0.0.1`). Nginx attaches `X-Forwarded-For: <Client_Real_IP>` so Express rate limiters can track the true client device IP.

---

### Q18: What is HTTP Keep-Alive and how does it improve latency?

**Difficulty:** Network Performance  
**Importance:** 🔥🔥🔥

HTTP Keep-Alive allows a single TCP connection to remain open for multiple sequential HTTP requests/responses, avoiding the latency overhead of repeatedly executing TCP 3-way handshakes.

---

### Q19: What are the different strategies for versioning REST APIs?

**Difficulty:** API Design  
**Importance:** 🔥🔥🔥

1. **URI Path Versioning (Recommended):** `/api/v1/salons` vs `/api/v2/salons`.
2. **Query Parameter Versioning:** `/api/salons?version=2`.
3. **Custom Header Versioning:** `Accept-Version: v2`.

---

### Q20: How do browsers enforce CORS at the network level?

**Difficulty:** Web Browsers  
**Importance:** 🔥🔥🔥

CORS is enforced **entirely by the browser engine**, not the server. If the server does not return `Access-Control-Allow-Origin` headers matching the client domain, the browser blocks the calling JavaScript from reading the HTTP response payload.

---
