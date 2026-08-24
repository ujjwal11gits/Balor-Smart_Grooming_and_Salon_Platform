# Part 4: Authentication, Authorization & Web Security

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** JWT, OAuth 2.0, Cookies, XSS, CSRF, Password Salting (`bcrypt`), RBAC, API Security

---

## 📌 Table of Contents
1. [JWT Anatomy & Signature Verification (HMAC-SHA256 vs RS256)](#q1-what-is-a-jwt-how-is-it-structured-and-how-does-signature-verification-work)
2. [Token Storage: LocalStorage vs HTTP-Only SameSite Cookies](#q2-tech-stack-comparison-localstorage-vs-http-only-samesite-cookies)
3. [Access Token + Refresh Token Rotation Flow](#q3-how-does-access-token--refresh-token-rotation-work)
4. [Role-Based Access Control (RBAC) Architecture](#q4-how-is-role-based-access-control-rbac-implemented-in-express)
5. [Cross-Site Scripting (XSS): Types & Defenses](#q5-what-is-cross-site-scripting-xss-and-how-do-you-prevent-it)
6. [Cross-Site Request Forgery (CSRF): Attacks & Defenses](#q6-what-is-csrf-and-how-do-samesite-cookie-flags-and-csrf-tokens-prevent-it)
7. [Password Hashing & Salting (`bcrypt` Mechanics)](#q7-why-are-sha256-or-md5-unsuitable-for-passwords-how-does-bcrypt-salting-work)
8. [OTP Authentication & Security Controls](#q8-how-do-you-design-a-secure-otp-based-email-verification--password-reset-flow)
9. [OAuth 2.0 & PKCE (Proof Key for Code Exchange)](#q9-how-does-oauth-20-authorization-code-flow-with-pkce-work)
10. [Insecure Direct Object Reference (IDOR) Defenses](#q10-what-is-idor-and-how-do-you-prevent-it-in-booking-endpoints)
11. [Preventing JWT Revocation / Instant Blacklisting Limitations](#q11-how-do-you-revoke-a-stateless-jwt-token-before-it-expires)
12. [Content Security Policy (CSP) Configuration](#q12-what-is-a-content-security-policy-csp-and-how-does-it-stop-xss)
13. [Clickjacking & `X-Frame-Options`](#q13-what-is-clickjacking-and-how-do-you-prevent-it)
14. [Man-In-The-Middle (MITM) & HSTS Enforcement](#q14-how-does-hsts-protect-against-ssl-stripping-mitm-attacks)
15. [Secure Cookie Flags (`HttpOnly`, `Secure`, `SameSite`)](#q15-what-do-httponly-secure-and-samesite-cookie-attributes-do)
16. [NoSQL & SQL Query Injection Defenses](#q16-how-do-you-prevent-query-injections-in-mongoose-and-express)
17. [Session Fixation vs Session Hijacking](#q17-what-is-the-difference-between-session-fixation-and-session-hijacking)
18. [API Rate Limiting & DDoS Mitigation](#q18-how-do-you-defend-rest-apis-against-ddos-and-brute-force-login-attacks)
19. [Zero Trust Architecture in Microservices](#q19-what-is-zero-trust-security-in-backend-microservices)
20. [CORS Security Misconfigurations & Wildcards](#q20-what-are-the-risks-of-setting-access-control-allow-origin-)

---

### Q1: What is a JWT, how is it structured, and how does Signature Verification work? (HMAC-SHA256 vs RS256)

**Difficulty:** Core Auth Security  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. JWT Structure
A **JSON Web Token (JWT)** is an open standard (RFC 7519) for transmitting secure claims between two parties. It consists of 3 dot-separated Base64Url-encoded strings: `Header.Payload.Signature`.

```
          HEADER                          PAYLOAD                         SIGNATURE
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ {                       │     │ {                       │     │ HMACSHA256(             │
│   "alg": "HS256",       │  .  │   "sub": "12345",       │  .  │   base64(Header) + "." +│
│   "typ": "JWT"          │     │   "role": "CUSTOMER"    │     │   base64(Payload),      │
│ }                       │     │ }                       │     │   JWT_SECRET            │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

#### 2. Symmetric Signature (HMAC-SHA256 / HS256)
- **How it works:** Uses a single **shared secret key** (`JWT_SECRET`) for both signing and verifying the token.
- **Pros:** Fast and lightweight signature generation.
- **Cons:** Any backend microservice that needs to verify tokens must possess the secret key. If a service is compromised, the secret key leaks.

#### 3. Asymmetric Signature (RS256 / RSA-SHA256)
- **How it works:** Uses a **Public/Private key pair**. The authentication server signs the token with its **Private Key**, while consumer microservices verify the token using the **Public Key**.
- **Pros:** Microservices can safely verify tokens without holding the private key used to mint tokens.

---

### Q2: Tech Stack Comparison: LocalStorage vs HTTP-Only SameSite Cookies

**Difficulty:** Security Architecture  
**Importance:** 🔥🔥🔥🔥🔥 (High Frequency Interview Question)

#### 1. What is Browser LocalStorage?
Web storage API providing key-value string storage persisted across browser sessions (~5MB limit).
- **Vulnerability (XSS Risk):** ⚠️ **Extremely Vulnerable to XSS.** Any malicious script injected into the webpage via XSS can execute `localStorage.getItem('token')` and send client tokens to an attacker server.
- **Advantage:** Protected against CSRF attacks because browsers do not automatically attach LocalStorage to cross-site requests.

#### 2. What are HTTP-Only SameSite Cookies?
HTTP headers set by the server (`Set-Cookie: token=xyz; HttpOnly; Secure; SameSite=Strict`).
- **XSS Protection:** ✅ **Immune to XSS script theft.** Client-side JavaScript (`document.cookie`) cannot read `HttpOnly` cookies.
- **CSRF Protection:** Setting `SameSite=Strict` or `SameSite=Lax` prevents browsers from attaching the cookie to cross-site third-party requests.

---

#### 3. Detailed Comparison:

| Metric | LocalStorage | HTTP-Only SameSite Cookie |
| :--- | :--- | :--- |
| **XSS Vulnerability** | ⚠️ **Vulnerable:** Any injected script can call `localStorage.getItem('token')` and exfiltrate data. | ✅ **Immune:** JavaScript cannot read `HttpOnly` cookies. |
| **CSRF Vulnerability** | ✅ **Immune:** LocalStorage headers are not automatically sent by browsers. | ⚠️ **Vulnerable unless** `SameSite=Strict/Lax` is set. |
| **Storage Capacity** | ~5MB | ~4KB per cookie. |
| **Best Practice Strategy:** | Store **Access Token** in memory (React state) and **Refresh Token** in HTTP-Only SameSite Cookie. |

---

### Q3: How does Access Token + Refresh Token Rotation work?

**Difficulty:** Advanced Auth Design  
**Importance:** 🔥🔥🔥🔥🔥

#### Flow Diagram:
```
  Client (React)                                      Server (Express)
    │                                                      │
    │ ─── 1. Login Request (Email/Password) ────────────► │
    │ ◄── 2. Return AccessToken (15m) & RefreshCookie ──── │
    │                                                      │
    │ ─── 3. Call API with AccessToken ─────────────────► │
    │ ◄── 4. Token Expired (401 Unauthorized) ──────────── │
    │                                                      │
    │ ─── 5. Call /api/auth/refresh (Sends Cookie) ──────► │
    │ ◄── 6. Return NEW AccessToken & NEW RefreshCookie ── │ (Token Rotation)
```

---

### Q4: How is Role-Based Access Control (RBAC) implemented in Express?

**Difficulty:** Practical Implementation  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `middleware/auth.js`)

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      req.user = decoded; // { id, email, role: 'SHOP_OWNER' }

      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token invalid or expired' });
    }
  };
};
```

---

### Q5: What is Cross-Site Scripting (XSS) and how do you prevent it?

**Difficulty:** Web Security  
**Importance:** 🔥🔥🔥🔥🔥

#### Types of XSS:
1. **Stored XSS:** Malicious script `<script>sendTokenToAttacker()</script>` is saved into DB comments and served to all users.
2. **Reflected XSS:** Malicious payload in URL query params is rendered directly into HTML response without escaping.
3. **DOM-based XSS:** Client-side JS reads untrusted URL data and passes it to `eval()` or `innerHTML`.

#### Defenses:
- Sanitize HTML inputs using `DOMPurify`.
- Use React JSX text interpolation `{text}` (React automatically escapes HTML entities).
- Enforce strict `Content-Security-Policy` HTTP headers via Helmet.

---

### Q6: What is CSRF and how do `SameSite` cookie flags and CSRF Tokens prevent it?

**Difficulty:** Web Security  
**Importance:** 🔥🔥🔥🔥

**CSRF (Cross-Site Request Forgery)** tricks an authenticated victim browser into sending unauthorized requests to a target website where the user is currently logged in.

#### Defense:
Set `SameSite=Lax` or `SameSite=Strict` on cookies. This tells the browser **not** to send the cookie along with cross-site third-party POST requests.

---

### Q7: Why are SHA256 or MD5 unsuitable for passwords? How does `bcrypt` salting work?

**Difficulty:** Cryptography / Security  
**Importance:** 🔥🔥🔥🔥

#### Explanation:
SHA256 and MD5 are **fast hash functions**. Attackers compute billions of SHA256 hashes per second using GPUs and pre-computed **Rainbow Tables**.

**`bcrypt`** is a **slow adaptive hash function**:
1. **Salting:** Appends a random 16-byte salt to the password before hashing, making Rainbow Table lookups impossible.
2. **Cost / Work Factor:** Configures internal iterations ($2^{\text{cost}}$ rounds, e.g. cost = 10). Increases CPU time per hash to ~100ms, crippling brute-force attempts.

---

### Q8: How do you design a secure OTP-based email verification & password reset flow?

**Difficulty:** Practical Auth Design  
**Importance:** 🔥🔥🔥🔥 (Used in `routes/auth.js` & `utils/mailer.js`)

1. Generate a 6-digit cryptographically secure random number (`crypto.randomInt(100000, 999999)`).
2. Store hashed OTP in MongoDB with a 10-minute TTL expiration index (`expireAfterSeconds: 600`).
3. Enforce rate limiting (max 3 OTP requests per 15 minutes per IP/Email).
4. After 5 failed verification attempts, invalidate the OTP to prevent brute-forcing.

---

### Q9: How does OAuth 2.0 Authorization Code Flow with PKCE work?

**Difficulty:** Protocols  
**Importance:** 🔥🔥🔥

**PKCE (Proof Key for Code Exchange)** protects SPA single-page applications against authorization code interception:
1. Client generates a random `code_verifier` string and hashes it to create a `code_challenge`.
2. Client redirects user to Provider (Google/GitHub) with `code_challenge`.
3. Provider returns authorization `code`.
4. Client exchanges `code` + original `code_verifier` for tokens. Provider verifies hash before returning tokens.

---

### Q10: What is IDOR and how do you prevent it in booking endpoints?

**Difficulty:** API Vulnerability  
**Importance:** 🔥🔥🔥🔥

**IDOR (Insecure Direct Object Reference)** occurs when an endpoint accepts `GET /api/bookings/:id` without checking if `:id` belongs to `req.user.id`.

#### Prevention:
Always combine database query filters with authenticated user context:
```javascript
const booking = await Booking.findOne({ _id: req.params.id, customerId: req.user.id });
if (!booking) return res.status(404).json({ message: "Booking not found or access denied" });
```

---

### Q11: How do you revoke a stateless JWT token before it expires?

**Difficulty:** Auth Limitations  
**Importance:** 🔥🔥🔥🔥

Since JWTs are stateless, once issued, they remain valid until expiration.
- **Solution 1 (Redis Blacklist):** Save revoked `jti` (JWT ID) or token string in Redis with TTL matching remaining token lifespan. Check Redis inside Auth middleware.
- **Solution 2 (User Token Version):** Store `tokenVersion: Number` in DB. Increment version on logout, causing old tokens with lower version numbers to fail validation.

---

### Q12: What is a Content Security Policy (CSP) and how does it stop XSS?

**Difficulty:** Security Headers  
**Importance:** 🔥🔥🔥

CSP is an HTTP response header that dictates approved origin domains from which browsers can download JS, CSS, images, and fonts:
`Content-Security-Policy: default-src 'self'; script-src 'self' https://trustedscripts.com`

---

### Q13: What is Clickjacking and how do you prevent it?

**Difficulty:** Web Security  
**Importance:** 🔥🔥🔥

Clickjacking overlays invisible `<iframe>` elements over legitimate buttons to trick users into clicking links. Defend via HTTP header `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`.

---

### Q14: How does HSTS protect against SSL Stripping MITM attacks?

**Difficulty:** Network Security  
**Importance:** 🔥🔥🔥

**HSTS (HTTP Strict Transport Security)** forces browsers to interact with the server strictly via HTTPS URLs, rejecting any un-encrypted HTTP downgrades attempted by attacker proxies.

---

### Q15: What do `HttpOnly`, `Secure`, and `SameSite` cookie attributes do?

**Difficulty:** Cookie Security  
**Importance:** 🔥🔥🔥🔥

- **`HttpOnly`:** Blocks JavaScript `document.cookie` access (Stops XSS token theft).
- **`Secure`:** Transmits cookie exclusively over encrypted HTTPS connections.
- **`SameSite=Strict`:** Blocks browser from sending cookies on cross-site links (Stops CSRF).

---

### Q16: How do you prevent query injections in Mongoose and Express?

**Difficulty:** Injection Security  
**Importance:** 🔥🔥🔥

Never pass un-validated `req.body` directly into Mongoose filters. Sanitize keys with `express-mongo-sanitize` and enforce Mongoose Schema type constraints.

---

### Q17: What is the difference between Session Fixation and Session Hijacking?

**Difficulty:** Security Concepts  
**Importance:** 🔥🔥🔥

#### 1. What is Session Fixation?
An attack where the attacker **forces a known session ID onto the victim** before the victim logs in.
- **How it works:** 
  1. Attacker obtains a valid anonymous session ID (e.g. `session_123`) from the target website.
  2. Attacker tricks the victim into clicking a link with that session ID attached (`http://salon.com/login?SID=session_123`).
  3. Victim logs in using that session. If the server does NOT regenerate the session ID upon authentication, `session_123` is now authenticated for the victim!
  4. Attacker uses `session_123` to access the victim's account.
- **Defense:** Always **regenerate session IDs immediately upon user login** (`req.session.regenerate()`).

#### 2. What is Session Hijacking?
An attack where the attacker **steals an existing, valid session token/cookie** from an already authenticated victim.
- **How it works:** Attacker steals the session cookie via XSS scripts, network packet sniffing (on un-encrypted HTTP Wi-Fi), or malware.
- **Defense:** Use `HttpOnly` cookies (blocks XSS theft), enforce HTTPS via HSTS (blocks Wi-Fi sniffing), and bind session tokens to client TLS/IP fingerprints.

---

#### 3. Summary Comparison:

| Feature | Session Fixation | Session Hijacking |
| :--- | :--- | :--- |
| **Timing** | Attacker sets session ID **BEFORE** user logs in. | Attacker steals session token **AFTER** user logs in. |
| **Primary Vector** | Malicious URLs / Un-regenerated session IDs. | XSS scripts, unencrypted HTTP sniffing, MITM attacks. |
| **Primary Defense** | Regenerate session ID on login (`req.session.regenerate()`). | `HttpOnly` cookie flag, strict HTTPS HSTS, short token expiry. |

---

### Q18: How do you defend REST APIs against DDoS and Brute Force login attacks?

**Difficulty:** Infrastructure Security  
**Importance:** 🔥🔥🔥

Combine **Cloudflare IP filtering / Rate Limiting**, Nginx `limit_req_zone`, and Express `authLimiter` (`express-rate-limit`) to block IPs exceeding request limits.

---

### Q19: What is Zero Trust Security in backend microservices?

**Difficulty:** Enterprise Security  
**Importance:** 🔥🔥🔥

Zero Trust operates under the principle: *"Never trust, always verify."* Even internal service-to-service communication inside a private network cluster requires mTLS encryption and JWT authorization checks.

---

### Q20: What are the risks of setting `Access-Control-Allow-Origin: *`?

**Difficulty:** CORS Security  
**Importance:** 🔥🔥🔥

Using wildcard `*` allows any malicious website on the internet to invoke your API via client AJAX calls. Furthermore, browsers disallow sending `credentials: true` (cookies) when `Origin` is set to `*`.

---
