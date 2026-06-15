/**
 * Test the actual sendMail function from our mailer utility.
 * Run: node test-smtp.js
 */
require('dotenv').config();
const { sendMail } = require('./utils/mailer');

async function test() {
  console.log('\n=== Testing sendMail() from utils/mailer.js ===\n');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('');

  console.log('Sending test email to', process.env.SMTP_USER, '...');
  const start = Date.now();
  
  await sendMail({
    to: process.env.SMTP_USER,
    subject: 'Balor Mailer Test — ' + new Date().toLocaleTimeString(),
    html: '<p>If you see this email, the mailer is working correctly! ✅</p><p>Sent at: ' + new Date().toLocaleString() + '</p>',
  });

  console.log(`\nTotal time: ${Date.now() - start}ms`);
  console.log('Check your inbox!');
  
  // Wait a moment for any background operations to finish
  setTimeout(() => process.exit(0), 1000);
}

test();
