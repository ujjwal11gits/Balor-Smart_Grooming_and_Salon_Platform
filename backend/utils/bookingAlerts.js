const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMail, getEmailTemplate } = require('./mailer');

function formatBookingDate(date) {
  return new Date(date).toLocaleDateString();
}

/**
 * Notify the customer (DB notification + email) when their booking status changes.
 * Uses sendMail with retries (not fire-and-forget) because customer notifications are important.
 */
async function notifyBookingStatusChange(booking, status) {
  if (!booking || !['confirmed', 'cancelled', 'completed'].includes(status)) {
    console.log(`[BOOKING-ALERT] Skipped — invalid booking or status: ${status}`);
    return;
  }

  // Resolve the user — might already be populated or just an ObjectId
  let user;
  if (booking.userId?.email) {
    user = booking.userId; // already populated
  } else {
    user = await User.findById(booking.userId).select('email name');
  }

  if (!user?.email) {
    console.warn(`[BOOKING-ALERT] ⚠️ No email found for userId=${booking.userId} — skipping email for status="${status}"`);
    return;
  }

  let label, type, subject, title, intro, detailHtml;
  const dateStr = formatBookingDate(booking.date);

  const bookingDetails = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #888; border-bottom: 1px solid #f0f0f0;">Service:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.service}</td></tr>
      <tr><td style="padding: 6px 0; color: #888; border-bottom: 1px solid #f0f0f0;">Date:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${dateStr}</td></tr>
      <tr><td style="padding: 6px 0; color: #888;">Time Slot:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${booking.timeSlot}</td></tr>
    </table>
  `;

  if (status === 'confirmed') {
    label = 'confirmed';
    type = 'booking_confirmed';
    subject = 'Booking Confirmed — Balor';
    title = 'Booking Confirmed 🎉';
    intro = `Great news! Your booking has been <strong>confirmed</strong> by the salon. We look forward to seeing you.`;
    detailHtml = bookingDetails;
  } else if (status === 'completed') {
    label = 'completed';
    type = 'booking_completed';
    subject = 'Service Completed — Balor';
    title = 'Service Completed ✂️';
    intro = `Your service has been marked as <strong>completed</strong>. We hope you had a wonderful experience at Balor!`;
    detailHtml = bookingDetails;
  } else {
    label = 'cancelled';
    type = 'booking_cancelled';
    subject = 'Booking Cancelled — Balor';
    title = 'Booking Cancelled ❌';
    intro = `Your booking has been <strong>cancelled</strong>.`;
    detailHtml = bookingDetails + (booking.cancelReason ? `<div style="margin-top: 12px; border-top: 1px dashed #ddd; padding-top: 12px; font-style: italic; color: #666;"><strong>Reason:</strong> ${booking.cancelReason}</div>` : '');
  }

  const htmlContent = getEmailTemplate({
    userName: user.name,
    title,
    intro,
    detailHtml
  });

  // Create in-app notification (non-critical, swallow errors)
  try {
    await Notification.create({
      userId: user._id || booking.userId,
      message: `Your booking has been ${label}.`,
      type,
      link: '/my-bookings',
    });
  } catch (notifErr) {
    console.error(`[BOOKING-ALERT] DB notification creation failed for ${user.email}:`, notifErr.message);
  }

  // Send email with retries — this is important for the customer
  try {
    await sendMail({ to: user.email, subject, html: htmlContent });
    console.log(`[BOOKING-ALERT] ✅ Email sent to ${user.email} for status="${status}"`);
  } catch (mailErr) {
    console.error(`[BOOKING-ALERT] ❌ Failed to send email to ${user.email} for status="${status}": ${mailErr.message}`);
  }
}

module.exports = { notifyBookingStatusChange };