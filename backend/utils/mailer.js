const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Use configured SMTP (Gmail, etc.)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,  // use STARTTLS for port 587
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,  // 10s to establish connection
      greetingTimeout: 10000,    // 10s for SMTP greeting
      socketTimeout: 15000,      // 15s for socket inactivity
    });
  } else {
    // Auto-create Ethereal test account — works out of the box, no setup needed
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    console.log('[MAIL] Using Ethereal test account:', testAccount.user);
  }

  return transporter;
}

/**
 * Send a single email with retry logic (up to 3 attempts, exponential backoff).
 * Each attempt gets a fresh transporter connection to avoid stale pool issues.
 */
async function sendMail({ to, subject, html }, retries = 3) {
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
      return; // success — exit
    } catch (err) {
      console.error(`[MAIL] ❌ Attempt ${attempt}/${retries} failed for ${to}: ${err.message}`);
      // Reset transporter so next attempt gets a fresh connection
      transporter = null;
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[MAIL] ⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[MAIL] 🚨 All ${retries} attempts failed for ${to} — "${subject}".`);
      }
    }
  }
}

/**
 * Fire-and-forget: send email in the background without blocking the caller.
 * Uses the retry mechanism internally — emails ARE reliably delivered.
 */
function sendMailBackground({ to, subject, html }) {
  // Intentionally not awaited — runs in background
  sendMail({ to, subject, html }).catch((err) => {
    console.error(`[MAIL-BG] Unhandled error sending to ${to}:`, err.message);
  });
}

module.exports = { sendMail, sendMailBackground };
