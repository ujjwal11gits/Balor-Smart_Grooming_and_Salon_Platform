const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMail } = require('./mailer');

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

  let label, type, subject, htmlContent;
  if (status === 'confirmed') {
    label = 'confirmed';
    type = 'booking_confirmed';
    subject = 'Booking Confirmed — Balor';
    htmlContent = `<p>Hi ${user.name},</p><p>Your booking for <b>${booking.service}</b> on <b>${formatBookingDate(booking.date)}</b> at <b>${booking.timeSlot}</b> has been <b>confirmed</b>.</p>`;
  } else if (status === 'completed') {
    label = 'completed';
    type = 'booking_completed';
    subject = 'Service Completed — Balor';
    htmlContent = `<p>Hi ${user.name},</p><p>Your booking for <b>${booking.service}</b> on <b>${formatBookingDate(booking.date)}</b> at <b>${booking.timeSlot}</b> has been marked as <b>completed</b>. We hope you enjoyed your service!</p>`;
  } else {
    label = 'cancelled';
    type = 'booking_cancelled';
    subject = 'Booking Cancelled — Balor';
    htmlContent = `<p>Hi ${user.name},</p><p>Your booking for <b>${booking.service}</b> on <b>${formatBookingDate(booking.date)}</b> at <b>${booking.timeSlot}</b> has been <b>cancelled</b>.</p>${booking.cancelReason ? `<p><b>Reason:</b> ${booking.cancelReason}</p>` : ''}`;
  }

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