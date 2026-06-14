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
    });
  } else {
    // Auto-create Ethereal test account — works out of the box, no setup needed
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('[MAIL] Using Ethereal test account:', testAccount.user);
  }

  return transporter;
}

async function sendMail({ to, subject, html }) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"Balor" <noreply@balor.app>',
      to,
      subject,
      html,
    });
    // For Ethereal: log the preview URL so you can see the email in browser
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('[MAIL] Preview URL:', preview);
  } catch (err) {
    console.error('[MAIL] Failed to send email:', err.message);
  }
}

module.exports = { sendMail };
