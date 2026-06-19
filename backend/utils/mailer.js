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
        from: `"Balor" <${process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@balor.app'}>`,
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

/**
 * Generate a premium, beautiful HTML email template.
 */
function getEmailTemplate({ userName, title, intro, detailHtml, footerText }) {
  return `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff; color: #333333; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 24px; font-weight: 800; color: #e94560; letter-spacing: 1px; display: inline-block;">&#9986; Balor</span>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-top: 4px;">Smart Grooming & Salon</div>
      </div>
      
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px 0;">${title}</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #555555; margin: 0 0 16px 0;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #555555; margin: 0 0 20px 0;">${intro}</p>
      </div>

      ${detailHtml ? `
      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #e94560;">
        ${detailHtml}
      </div>
      ` : ''}

      ${footerText ? `<p style="font-size: 13px; color: #666666; line-height: 1.5; margin: 0 0 24px 0;">${footerText}</p>` : ''}

      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="color: #999999; font-size: 12px; margin: 0 0 8px 0;">This is an automated email from Balor. Please do not reply.</p>
        <p style="color: #bbbbbb; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Balor &mdash; All Rights Reserved.</p>
      </div>
    </div>
  `;
}

module.exports = { sendMail, sendMailBackground, sendMailsStaggered, sendMailsStaggeredBackground, getEmailTemplate };
