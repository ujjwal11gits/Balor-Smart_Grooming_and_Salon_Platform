const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMailBackground } = require('./mailer');

function formatBookingDate(date) {
  return new Date(date).toLocaleDateString();
}

async function notifyBookingStatusChange(booking, status) {
  if (!booking || !['confirmed', 'cancelled', 'completed'].includes(status)) return;

  const user = booking.userId?.email
    ? booking.userId
    : await User.findById(booking.userId).select('email name');

  if (!user?.email) return;

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

  try {
    await Notification.create({
      userId: user._id || booking.userId,
      message: `Your booking has been ${label}.`,
      type,
      link: '/my-bookings',
    });
  } catch {}

  // Send email in background — does NOT block the API response
  sendMailBackground({ to: user.email, subject, html: htmlContent });
}

module.exports = { notifyBookingStatusChange };