# Balor — Backend System Architecture & Design Guide

This guide details the complete backend implementation of the Balor grooming booking system, detailing all design patterns, directory configurations, security systems, database designs, and core business logics. Use this document to review the backend structure, architecture, and system design.

---

## 1. Folder Architecture & Entry Points

The backend follows a modular, RESTful design built with **Node.js**, **Express.js**, and **Mongoose**.

### Directory Structure
```
backend/
├── middleware/
│   └── auth.js              # Authentication and authorization guards (JWT + Role Checks)
├── models/
│   ├── User.js              # User details, passwords, dynamic OTPs and roles
│   ├── Salon.js             # Salon schema containing subdocuments for services and barbers
│   ├── Barber.js            # Barber schemas, ratings, working slots, and leaves
│   ├── Booking.js           # Appointment details, price, duration, and OTP status
│   ├── Review.js            # Star ratings, comments, and reference relations
│   ├── Notification.js      # In-app user notifications history
│   └── Waitlist.js          # Booking waitlist for fully booked slots
├── routes/
│   ├── auth.js              # Registration OTP verification, Login, and OTP Password Resets
│   ├── salons.js            # Customer-facing searches, location geolocation, and detail pages
│   ├── barbers.js           # Barber queries, working slots, and slot calculations
│   ├── bookings.js          # Booking reservations, cancels, and OTP-based completions
│   ├── reviews.js           # Review creation and barber-to-salon rating sync
│   ├── notifications.js     # User notification retrievals and reads
│   ├── users.js             # Profile updates and customer favorites management
│   ├── admin.js             # Platform-wide statistics, user lists, and booking controls
│   ├── shop.js              # Shop owner configs, services management, and staff updates
│   └── waitlist.js          # Queue waitlist operations
├── utils/
│   └── mailer.js            # SMTP email services (Nodemailer, Gmail, and Ethereal)
├── .env                     # Production environment variables (credentials hidden)
├── dev-server.js            # Development server runner equipped with Nodemon
└── server.js                # Global app entry point, loading express and middlewares
```

### Entry Points Explanation
- **`server.js`**: Initializes the Mongoose connection and maps global middlewares (Helmet, CORS, body parsers, and cookie parsers). Maps router routes to respective `/api/...` sub-paths, and registers the global error handling middleware.
- **`dev-server.js`**: Imports the configured Express app from `server.js` and fires up the HTTP server on `PORT`. It is designed to work with `nodemon` to enable hot reloading during local development.

---

## 2. Security Hardening & Middlewares

Balor implements production-grade security measures to protect API endpoints and user credentials:

### A. HTTP Headers Hardening (`helmet`)
Helmet secures HTTP headers to prevent web exploits (e.g. clickjacking, cross-site scripting, and packet sniffing):
```javascript
app.use(helmet());
```

### B. Restricted Cross-Origin Requests (CORS)
Restricted CORS ensures only authorized web apps can call the API:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true // Crucial: Permits secure browser cookie transmissions
}));
```

### C. Authentication Rate Limiter (`express-rate-limit`)
Restricts brute-force attempts on sensitive endpoints (e.g. logins and OTP submissions):
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: { message: "Too many authentication requests, please try again after 15 minutes." }
});
```

### D. JWT Verification Middleware (`middleware/auth.js`)
Authenticates request packets via their HTTP header Bearer token and verifies user role authorization:
```javascript
module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token missing' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Contains id, email, and role
      
      // If role checks are defined, enforce them
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Access token expired or invalid' });
    }
  };
};
```

### E. Global JSON Error Formatting
Prevents Express from returning its default HTML stack trace page (which leaks folder trees and directory structures):
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

---

## 3. Database Schema Design & Indexing

Balor uses **MongoDB** with **Mongoose**. Below are the core schemas and optimization index designs:

### A. Mongoose Schema Definitions
- **User**: Stores login credentials (`email`, hashed `password`), `role` (`user`, `shop`, `barber`, `admin`), `avatar` image URL, `favoriteBarbers` list, and `favoriteSalons` list.
- **Salon**: Contains salon profiles (`name`, `address`, `city`, `phone`, `openingTime`, `closingTime`). It contains **embedded subdocument arrays** for `services` (service names, prices, durations) and `barbers` (barber profile data copies) for high-speed details-page rendering.
- **Barber**: Stores detailed records for active barbers (`name`, `rating`, `totalReviews`, `workingSlots` array, `unavailableDates` array, and a reference link `salonId`).
- **Booking**: Tracks booking sheets (`userId`, `barberId`, `salonId`, `date`, `timeSlot`, `service`, `price`, `duration`, `status` (`pending`, `confirmed`, `completed`, `cancelled`), and `completionOtp`).
- **Review**: Maps a single customer review to an appointment (`userId`, `barberId`, `bookingId`, `rating`, `comment`). Has a unique constraint on `bookingId` to prevent duplicate reviews.
- **Notification**: Stores user alerts (`userId`, `message`, `type`, `link`, `read` boolean).
- **Waitlist**: Implements booking queues for fully booked slots (`userId`, `barberId`, `date`, `status`).
- **Feedback**: Stores platform feedback and technical bug reports submitted by users or guests (`userId`, `userEmail`, `userName`, `type` (`bug`, `suggestion`, `other`), `description`, `url`, `userAgent`, `screenSize`, and `status` (`pending`, `reviewed`, `resolved`)).

### B. Database Indexing (Performance Optimization)
To prevent heavy Collection Scans ($O(N)$), we added B-Tree indexes ($O(\log N)$) to key foreign lookup fields:
```javascript
bookingSchema.index({ userId: 1 });
bookingSchema.index({ barberId: 1 });
bookingSchema.index({ salonId: 1 });
bookingSchema.index({ date: 1 });

barberSchema.index({ userId: 1 });
barberSchema.index({ salonId: 1 });

salonSchema.index({ ownerId: 1 });

reviewSchema.index({ barberId: 1 });

notificationSchema.index({ userId: 1 });

// Compound Index: Used when querying waitlist for a specific barber on a specific date
waitlistSchema.index({ barberId: 1, date: 1 });
```

---

## 4. Core API Routes & Business Logic

### A. Auth Flow & Session Management (HttpOnly Cookie Rotation)
To protect sessions from XSS scripting access, Balor splits JWT handling:
1. **Login (`POST /api/auth/login`)**:
   - Authenticates credentials.
   - Generates a short-lived **Access Token** (JWT, valid for 1 day, returns in JSON body) and a long-lived **Refresh Token** (JWT, valid for 30 days).
   - Sets the Refresh Token inside a **secure, HttpOnly cookie** with `SameSite: 'None'` or `'Lax'`.
2. **Session Refresh (`POST /api/auth/refresh`)**:
   - Reads the refresh cookie. Verifies the token.
   - Generates a new short-lived access token and sends it back to the client.
3. **Logout (`POST /api/auth/logout`)**:
   - Clears the refresh token cookie on the server.

### B. Dynamic Time-Slot Calculations
When a user requests free slots for a barber on a selected date (`GET /api/barbers/:id/available-slots?date=...`):
1. Loads the barber's configuration `workingSlots` (e.g. `['09:00', '10:00', ...]`).
2. Checks if the selected date is in the barber's `unavailableDates` array. If yes, returns an empty array.
3. Queries the `Booking` collection to fetch all active appointments (`confirmed`, `pending`) for that barber on that date.
4. Maps the duration of bookings. For example, if a barber has a booking starting at `10:00` with a duration of `60 minutes`, it blocks both the `10:00` and `10:30` slot segments.
5. If the booking date is **today**, it dynamically filters out slots that have already passed in the barber's local timezone.
6. Returns the remaining free slots to the user.

### C. Live Queue Waiting Times
Calculated dynamically based on today's scheduled queues:
1. Counts the number of active bookings (`confirmed` or `pending`) for today that are scheduled before the current local time and are not yet marked `completed`.
2. Applies the average service multiplier:
   $$\text{Wait Time} = \text{Queue Count} \times 30 \text{ minutes}$$

### D. Rating Recalculation & Salon Subdocument Sync
When a customer submits a review (`POST /api/reviews`):
1. Inserts the `Review` document into the database (checking first that `bookingId` is unique and the booking status is `completed`).
2. Calculates the barber's new average rating:
   $$\text{New Rating} = \frac{\sum(\text{All reviews for barber})}{\text{Total review count}}$$
3. Updates the `rating` and `totalReviews` fields inside the `Barber` collection.
4. Immediately syncs these changes to the embedded barbers array subdocument within the `Salon` collection, ensuring that customer-facing salon search lists display the correct maximum barber rating without delay.

### E. On-Demand OTP generation & Verification
To guarantee OTP codes are valid at checkout and prevent email spamming:
1. The shop owner, barber, or admin clicks "Send OTP" in their dashboard.
2. The server generates a fresh 4-digit code and saves it to the `Booking` document along with a timestamp.
3. Dispatches an email to the client using **Nodemailer SMTP** (Gmail or Ethereal test inbox).
4. The owner enters the code, which the backend verifies. If correct, the booking is marked `completed` and the code is cleared.

### F. Developer Test OTP Fallback (For Seamless Onboarding)
To prevent deployment lockouts for developers who host the application without configuring real SMTP details (like Gmail App Passwords):
1. In the `/register` and `/forgot-password-otp` endpoints, the backend checks if `process.env.SMTP_HOST` is configured.
2. If it is NOT configured, the backend appends `testOtp` inside the JSON response payload, transmitting the generated OTP code directly to the client.
3. If `SMTP_HOST` is configured, it sends `testOtp` as `undefined` to guarantee standard secure operations for production users.
4. The frontend intercepts this response, saving the `testOtp` in state and displaying it within a "Test Mode" banner so the flow can be verified.

### G. Public Feedback & Issue Reporting (with Guest Rate Limiting)
Handles system feedback and technical bug reports (`POST /api/feedback`):
1. **Spam Prevention**: Locked with a rate limiter restricting submissions to **max 3 requests per 1 hour** per IP.
2. **Access Control**: Users logged in as non-admins can submit feedback from any page. Guests (unauthenticated users) can ONLY submit reports from auth/onboarding routes (`/login`, `/register`, `/forgot-password`, `/reset-password`). Attempts to submit from other pages are blocked with `403 Forbidden`.
3. **Admin Alerts**: If the feedback is labeled as a `bug`, the server automatically loops through all registered admin accounts and inserts a real-time notification to pop the notification bells on their dashboard.

---

## 5. Backend Technical & System Design FAQ

### Q1: Why do you store the Refresh Token in an HttpOnly cookie instead of LocalStorage?
* **Answer**: Storing tokens in LocalStorage makes them vulnerable to XSS (Cross-Site Scripting). If a malicious script is injected into the site, it can read all LocalStorage data. Setting the `httpOnly: true` flag on the cookie prevents browser JavaScript from reading it entirely, keeping the session safe.

### Q2: What is the purpose of CORS and how is it configured in this project?
* **Answer**: CORS (Cross-Origin Resource Sharing) is a browser security feature that prevents web pages from making requests to a different domain than the one that served the page. In this project, CORS is configured using the `cors` package, restricting origin access solely to the domain set in `process.env.FRONTEND_URL` and enabling `credentials: true` to allow cookie transmission.

### Q3: Explain what Helmet middleware does.
* **Answer**: Helmet is a collection of middleware functions that set secure HTTP headers (e.g. `X-DNS-Prefetch-Control`, `X-Frame-Options` to prevent clickjacking, `X-Content-Type-Options` to prevent MIME-sniffing, and Content-Security-Policy rules), hardening the app against common security vulnerabilities.

### Q4: How does MongoDB indexing improve query speeds? What is the lookup time complexity?
* **Answer**: Indexing creates a sorted B-Tree data structure of key values. Instead of performing a linear collection scan ($O(N)$) where MongoDB reads every document, it searches the B-Tree in logarithmic time ($O(\log N)$), resolving lookups in less than 1ms.

### Q5: When should you avoid creating an index on a schema field?
* **Answer**: You should avoid indexing fields that have low selectivity (e.g. fields with only a few options like boolean values), or tables that experience highly frequent write operations relative to reads. Since indexes must be updated on every write, over-indexing slows down database write speeds.

### Q6: How does the backend prevent double-bookings (race conditions) on the same slot?
* **Answer**: The backend verifies slot availability immediately prior to saving. In production, we can enforce this using unique compound index constraints in MongoDB (e.g. `{ barberId: 1, date: 1, timeSlot: 1 }` set to unique), or handle concurrent requests using a transaction lock.

### Q7: What are MongoDB subdocuments and why did you use them in the Salon schema?
* **Answer**: Subdocuments are nested schemas embedded directly inside a parent document array. In this project, `Salon` embeds arrays of `services` and `barbers`. We used this design because salon details and barber profiles are queried together on details page mounts; embedding them retrieves all data in a single database lookup instead of doing multiple collections joins.

### Q8: How did you implement password hashing in the User model?
* **Answer**: We used `bcryptjs` inside a Mongoose pre-save hook. When a user is saved or their password is modified, Mongoose automatically generates a cryptographic salt, hashes the plain text password, and overwrites the field prior to saving:
```javascript
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

### Q9: How does the on-demand OTP booking completion mechanism prevent email spamming?
* **Answer**: By decoupling OTP generation from booking creation. Instead of sending emails automatically upon booking, the email is dispatched only when the staff clicks "Send OTP" from their authenticated dashboard. We can also add rate-limiters to the `POST /api/bookings/:id/send-otp` route to restrict calls from a single IP.

### Q10: How did you handle JWT token expiry checks?
* **Answer**: We set the token expiry parameter when signing JWTs (e.g. `expiresIn: '1d'` for access tokens). The `jwt.verify()` method inside our auth middleware throws a `TokenExpiredError` if the token has expired, returning a `401 Unauthorized` status to trigger a client-side refresh request.

### Q11: Explain how the rating sync works between the Barber collection and the Salon document.
* **Answer**: We use Mongoose queries inside [reviews.js](file:///d:/barber_app/barber-app/backend/routes/reviews.js). After saving a new review, we query the `Review` collection for all ratings matching `barberId`. We calculate the average and update the `Barber` collection. We then update the corresponding barber subdocument inside the parent `Salon` collection by locating the salon and matching the subdocument ID.

### Q12: How do you handle database connection failures in production?
* **Answer**: We set up listeners on the Mongoose connection. If the connection fails on startup or disconnects in production, we log the error and call `process.exit(1)`. This allows container managers (like PM2, Docker, or Kubernetes) to detect the crash and restart the process.

### Q13: What does the `express-rate-limit` package do and why is it important?
* **Answer**: It limits repeated requests to public endpoints (like login forms and OTP requests) from the same IP address. It is crucial for preventing brute-force attacks and DDoS (Distributed Denial of Service) attempts.

### Q14: How does the forgot password OTP flow work securely without access tokens?
* **Answer**: When a user requests a reset email, the server verifies the email and returns a temporary token (`tempToken`) signed with a short expiry (10 minutes). The user submits the OTP along with `tempToken` to verify. The server validates the OTP, and returns a `resetToken`. The user then submits their new password with the `resetToken` to finalize the reset.

### Q15: Why is it bad practice to return default HTML error pages in an API?
* **Answer**: Default HTML pages returned by Express contain full execution stack traces, database schema variables, and folder structures. If exposed, this information helps attackers find backend vulnerabilities. Returning formatted JSON errors prevents data leaks.

### Q16: How does the backend calculate wait times?
* **Answer**: The backend queries the `Booking` collection to count active appointments scheduled for today that are pending or confirmed, and whose scheduled times are earlier than or equal to the selected booking time. It then multiplies this count by 30 minutes to get the estimated wait time.

### Q17: How did you implement the "Test OTP Fallback" mechanism to handle unconfigured SMTP hosts securely on deployment?
* **Answer**: If `process.env.SMTP_HOST` is not configured on the server, the backend defaults to using Nodemailer's Ethereal Mail sandbox. To prevent users from getting locked out because they cannot see the backend terminal logs, the server conditionally appends a `testOtp` property containing the generated OTP code directly in the JSON response payload of `/api/auth/register` and `/api/auth/forgot-password-otp` ONLY if `SMTP_HOST` is missing. If real SMTP credentials are set, `testOtp` is returned as `undefined`, preserving production security.
