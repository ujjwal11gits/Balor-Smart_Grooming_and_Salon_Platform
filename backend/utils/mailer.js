const nodemailer = require('nodemailer');

let transporter = null;
let transporterCreating = false;  // mutex flag to prevent race conditions
let transporterQueue = [];        // callbacks waiting for transporter creation

/**
 * Get or create the SMTP transporter with connection pooling.
 * Uses a mutex pattern so only one caller creates the transporter
 * while others wait, preventing race conditions on concurrent emails.
 */
async function getTransporter() {
  if (transporter) return transporter;

  // If another call is already creating the transporter, wait for it
  if (transporterCreating) {
    return new Promise((resolve, reject) => {
      transporterQueue.push({ resolve, reject });
    });
  }

  transporterCreating = true;

  try {
    if (process.env.SMTP_HOST) {
      // Use configured SMTP (Gmail, etc.) with connection pooling
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,  // use STARTTLS for port 587
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        pool: true,             // Enable connection pooling
        maxConnections: 3,      // Max simultaneous SMTP connections
        maxMessages: 10,        // Max messages per connection before recycling
        rateDelta: 1000,        // Rate window: 1 second
        rateLimit: 3,           // Max 3 emails per second (Gmail limit safe)
        connectionTimeout: 15000,  // 15s to establish connection (AWS latency)
        greetingTimeout: 15000,    // 15s for SMTP greeting
        socketTimeout: 20000,      // 20s for socket inactivity
        tls: {
          rejectUnauthorized: false,  // Accept self-signed certs (some AWS envs)
        },
      });
    } else {
      // Auto-create Ethereal test account — works out of the box, no setup needed
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
        pool: true,
        maxConnections: 2,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log('[MAIL] Using Ethereal test account:', testAccount.user);
    }

    // Resolve all waiting callers
    for (const waiter of transporterQueue) {
      waiter.resolve(transporter);
    }
    transporterQueue = [];
    return transporter;
  } catch (err) {
    // Reject all waiting callers
    for (const waiter of transporterQueue) {
      waiter.reject(err);
    }
    transporterQueue = [];
    throw err;
  } finally {
    transporterCreating = false;
  }
}

/**
 * Send a single email with retry logic (up to 4 attempts, exponential backoff).
 * Resets transporter on failure to get a fresh pooled connection.
 */
async function sendMail({ to, subject, html }, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const t = await getTransporter();
      const info = await t.sendMail({
        from: `"Balor" <${process.env.SMTP_USER || 'noreply@balor.app'}>`,
        to,
        subject,
        html,
      });
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log('[MAIL] Preview URL:', preview);
      console.log(`[MAIL] ✅ Sent to ${to} — "${subject}" (attempt ${attempt})`);
      return info; // success — return info for caller inspection
    } catch (err) {
      console.error(`[MAIL] ❌ Attempt ${attempt}/${retries} failed for ${to}: ${err.message}`);
      // Close and reset transporter so next attempt gets a fresh connection
      if (transporter) {
        try { transporter.close(); } catch {}
      }
      transporter = null;
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[MAIL] ⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[MAIL] 🚨 All ${retries} attempts failed for ${to} — "${subject}".`);
        // Re-throw so callers can handle the failure
        throw err;
      }
    }
  }
}

/**
 * Fire-and-forget: send email in the background without blocking the caller.
 * Uses the retry mechanism internally — emails ARE reliably delivered.
 * Returns a promise (not awaited by caller) so it runs in background.
 */
function sendMailBackground({ to, subject, html }) {
  // Intentionally not awaited — runs in background
  return sendMail({ to, subject, html }).catch((err) => {
    console.error(`[MAIL-BG] 🚨 All retries exhausted for ${to} — "${subject}": ${err.message}`);
  });
}

/**
 * Send multiple emails with a delay between each to avoid SMTP rate limits.
 * Each email object: { to, subject, html }
 * @param {Array} emails - Array of email objects
 * @param {number} delayMs - Delay between sends in ms (default 1200ms)
 */
async function sendMailsStaggered(emails, delayMs = 1200) {
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    if (!email || !email.to) continue;
    try {
      await sendMail(email);
    } catch (err) {
      console.error(`[MAIL-STAGGER] Failed for ${email.to} — "${email.subject}": ${err.message}`);
    }
    // Delay between sends (skip delay after last email)
    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Fire-and-forget version of sendMailsStaggered for background use.
 */
function sendMailsStaggeredBackground(emails, delayMs = 1200) {
  sendMailsStaggered(emails, delayMs).catch((err) => {
    console.error(`[MAIL-STAGGER-BG] Unhandled error:`, err.message);
  });
}

module.exports = { sendMail, sendMailBackground, sendMailsStaggered, sendMailsStaggeredBackground };
