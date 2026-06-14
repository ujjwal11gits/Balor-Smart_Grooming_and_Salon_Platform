const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Use configured SMTP (production)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,  // 10s to establish connection
      greetingTimeout: 10000,    // 10s for SMTP greeting
      socketTimeout: 15000,      // 15s for socket inactivity
      pool: true,                // reuse connections for multiple sends
      maxConnections: 3,
      maxMessages: 50,
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
 * Send an email with automatic retry (up to 3 attempts with exponential backoff).
 * Ensures emails are reliably delivered even if the first attempt fails
 * due to transient SMTP issues (network hiccups, Gmail rate-limits, etc).
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
      // For Ethereal: log the preview URL so you can see the email in browser
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log('[MAIL] Preview URL:', preview);
      console.log(`[MAIL] ✅ Sent to ${to} — "${subject}" (attempt ${attempt})`);
      return; // success — exit immediately
    } catch (err) {
      console.error(`[MAIL] ❌ Attempt ${attempt}/${retries} failed for ${to}: ${err.message}`);
      if (attempt < retries) {
        // Exponential backoff: 2s, 4s before retrying
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[MAIL] ⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // If connection-level error, force a fresh transporter on next attempt
        if (err.code === 'ECONNECTION' || err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
          transporter = null;
        }
      } else {
        console.error(`[MAIL] 🚨 All ${retries} attempts failed for ${to} — "${subject}". Email was NOT delivered.`);
      }
    }
  }
}

module.exports = { sendMail };
