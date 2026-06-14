const router = require('express').Router();
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const { notifyBookingStatusChange } = require('../utils/bookingAlerts');
const Waitlist = require('../models/Waitlist');

async function createNotification(userId, message, type, link) {
  try {
    await Notification.create({ userId, message, type, link });
  } catch {}
}

// POST /api/bookings  — user creates a booking
router.post('/', protect, requireRole('user'), async (req, res) => {
  try {
    const booking = await Booking.create({ ...req.body, userId: req.user.id });

    const Barber = require('../models/Barber');
    const barber = await Barber.findById(booking.barberId);
    const User = require('../models/User');

    // Notify barber user via DB notification & Email
    if (barber?.userId) {
      await createNotification(
        barber.userId,
        `[BOOKED] New booking from ${req.user.name} on ${new Date(booking.date).toLocaleDateString()}`,
        'booking_created',
        '/barber/dashboard'
      );
      const barberUser = await User.findById(barber.userId).select('email name');
      if (barberUser?.email) {
        await sendMail({
          to: barberUser.email,
          subject: 'New Booking Request — BarberApp',
          html: `<p>Hi ${barberUser.name}, you have a new booking request for <b>${booking.service}</b> on <b>${new Date(booking.date).toLocaleDateString()}</b> at <b>${booking.timeSlot}</b> from customer <b>${req.user.name}</b>.</p>`,
        });
      }
    }

    // Notify Shop Owner via DB notification & Email
    const Salon = require('../models/Salon');
    const salon = await Salon.findById(booking.salonId);
    if (salon?.ownerId) {
      await createNotification(
        salon.ownerId,
        `[BOOKED] New booking at ${salon.name} for ${barber?.name} on ${new Date(booking.date).toLocaleDateString()}`,
        'booking_created',
        '/shop/dashboard'
      );
      const ownerUser = await User.findById(salon.ownerId).select('email name');
      if (ownerUser?.email) {
        await sendMail({
          to: ownerUser.email,
          subject: 'New Salon Booking — BarberApp',
          html: `<p>Hi ${ownerUser.name}, a new booking has been made at <b>${salon.name}</b> for barber <b>${barber?.name || 'Staff'}</b> on <b>${new Date(booking.date).toLocaleDateString()}</b> at <b>${booking.timeSlot}</b>.</p>`,
        });
      }
    }

    // Email receipt to user while the booking is pending review
    const user = await User.findById(req.user.id).select('email name');
    await sendMail({
      to: user.email,
      subject: 'Booking Received — BarberApp',
      html: `<p>Hi ${user.name}, your booking for <b>${booking.service}</b> on <b>${new Date(booking.date).toLocaleDateString()}</b> at <b>${booking.timeSlot}</b> has been received and is currently <b>pending review</b>.</p>`,
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/barber/earnings  — barber earnings summary
router.get('/barber/earnings', protect, requireRole('barber'), async (req, res) => {
  try {
    const Barber = require('../models/Barber');
    const barber = await Barber.findOne({ userId: req.user.id });
    if (!barber) return res.status(404).json({ message: 'Barber profile not found' });

    const completed = await Booking.find({ barberId: barber._id, status: 'completed' });
    const total = completed.reduce((s, b) => s + b.price, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = completed
      .filter((b) => new Date(b.createdAt) >= startOfMonth)
      .reduce((s, b) => s + b.price, 0);

    res.json({ total, thisMonth, completedCount: completed.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/my  — user sees their own bookings
router.get('/my', protect, requireRole('user'), async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('barberId', 'name imageUrl')
      .populate('salonId', 'name address')
      .sort({ createdAt: -1 });

    const Review = require('../models/Review');
    const bookingIds = bookings.map(b => b._id);
    const reviews = await Review.find({ bookingId: { $in: bookingIds } }).select('bookingId');
    const reviewedBookingIds = new Set(reviews.map(r => String(r.bookingId)));

    const bookingsWithReviewStatus = bookings.map(b => {
      const bObj = b.toObject();
      bObj.isReviewed = reviewedBookingIds.has(String(b._id));
      return bObj;
    });

    res.json(bookingsWithReviewStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/barber  — barber sees their bookings
router.get('/barber', protect, requireRole('barber'), async (req, res) => {
  try {
    const Barber = require('../models/Barber');
    const barber = await Barber.findOne({ userId: req.user.id });
    if (!barber) return res.status(404).json({ message: 'Barber profile not found' });

    const bookings = await Booking.find({ barberId: barber._id })
      .populate('userId', 'name phone')
      .populate('salonId', 'name')
      .sort({ date: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/bookings/:id/cancel  — user cancels own booking
router.patch('/:id/cancel', protect, requireRole('user'), async (req, res) => {
  try {
    const { cancelReason } = req.body;
    if (!cancelReason || !cancelReason.trim()) {
      return res.status(400).json({ message: 'Cancellation reason is required.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.userId) !== req.user.id)
      return res.status(403).json({ message: 'Not your booking' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled booking' });

    booking.status = 'cancelled';
    booking.cancelledBy = 'customer';
    booking.cancelReason = cancelReason.trim();
    await booking.save();
    await notifyBookingStatusChange(booking, 'cancelled');

    const Barber = require('../models/Barber');
    const barber = await Barber.findById(booking.barberId);
    const User = require('../models/User');

    // Notify Barber of cancellation
    if (barber?.userId) {
      await createNotification(
        barber.userId,
        `[CANCELLED] Booking cancelled by ${req.user.name} on ${new Date(booking.date).toLocaleDateString()} (Reason: ${booking.cancelReason})`,
        'booking_cancelled',
        '/barber/dashboard'
      );
      const barberUser = await User.findById(barber.userId).select('email name');
      if (barberUser?.email) {
        await sendMail({
          to: barberUser.email,
          subject: 'Booking Cancelled by Customer — Balor',
          html: `<p>Hi ${barberUser.name}, the booking for <b>${booking.service}</b> on <b>${new Date(booking.date).toLocaleDateString()}</b> at <b>${booking.timeSlot}</b> has been cancelled by customer <b>${req.user.name}</b>.</p><p><b>Reason:</b> ${booking.cancelReason}</p>`,
        });
      }
    }

    // Notify Shop Owner of cancellation
    const Salon = require('../models/Salon');
    const salon = await Salon.findById(booking.salonId);
    if (salon?.ownerId) {
      await createNotification(
        salon.ownerId,
        `[CANCELLED] Booking cancelled at ${salon.name} for ${barber?.name} on ${new Date(booking.date).toLocaleDateString()} (Reason: ${booking.cancelReason})`,
        'booking_cancelled',
        '/shop/dashboard'
      );
      const ownerUser = await User.findById(salon.ownerId).select('email name');
      if (ownerUser?.email) {
        await sendMail({
          to: ownerUser.email,
          subject: 'Salon Booking Cancelled — Balor',
          html: `<p>Hi ${ownerUser.name}, the booking at <b>${salon.name}</b> for barber <b>${barber?.name || 'Staff'}</b> on <b>${new Date(booking.date).toLocaleDateString()}</b> at <b>${booking.timeSlot}</b> has been cancelled by customer <b>${req.user.name}</b>.</p><p><b>Reason:</b> ${booking.cancelReason}</p>`,
        });
      }
    }

    // Notify waitlist
    const waitlisted = await Waitlist.find({
      barberId: booking.barberId,
      date: booking.date,
      status: 'pending'
    }).populate('userId');

    for (const entry of waitlisted) {
      entry.status = 'notified';
      await entry.save();
      await createNotification(entry.userId._id, `A slot opened up on ${new Date(booking.date).toLocaleDateString()}! Book now before it's gone.`, 'waitlist', '/my-bookings');
      await sendMail({
        to: entry.userId.email,
        subject: 'Waitlist Alert — Balor',
        html: `<p>Hi ${entry.userId.name}, a slot just opened up for your waitlisted date: <b>${new Date(booking.date).toLocaleDateString()}</b>.</p><p>Hurry to the app to book it!</p>`
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/bookings/:id/status  — barber or admin updates status
router.patch('/:id/status', protect, requireRole('barber', 'admin'), async (req, res) => {
  try {
    const { status, otp } = req.body;
    const booking = await Booking.findById(req.params.id).populate('userId', 'email name');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (status === 'completed') {
      if (!otp) {
        return res.status(400).json({ message: 'Customer completion OTP is required to complete this service.' });
      }
      if (booking.completionOtp !== otp) {
        return res.status(400).json({ message: 'Incorrect completion OTP.' });
      }
    }

    booking.status = status;
    if (status === 'cancelled') {
      booking.cancelledBy = 'shop';
    }
    await booking.save();

    await notifyBookingStatusChange(booking, status);

    if (status === 'cancelled') {
      // Notify waitlist
      const waitlisted = await Waitlist.find({
        barberId: booking.barberId,
        date: booking.date,
        status: 'pending'
      }).populate('userId');

      for (const entry of waitlisted) {
        entry.status = 'notified';
        await entry.save();
        await createNotification(entry.userId._id, `A slot opened up on ${new Date(booking.date).toLocaleDateString()}! Book now before it's gone.`, 'waitlist', '/my-bookings');
        await sendMail({
          to: entry.userId.email,
          subject: 'Waitlist Alert — Balor',
          html: `<p>Hi ${entry.userId.name}, a slot just opened up for your waitlisted date: <b>${new Date(booking.date).toLocaleDateString()}</b>.</p><p>Hurry to the app to book it!</p>`
        });
      }
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings/:id/send-completion-otp  — send completion OTP to customer
router.post('/:id/send-completion-otp', protect, requireRole('barber', 'shop', 'admin'), async (req, res) => {
  try {
    const Barber = require('../models/Barber');
    const Salon = require('../models/Salon');

    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'email name')
      .populate('barberId', 'name')
      .populate('salonId', 'name');
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Generate a fresh 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    booking.completionOtp = otp;
    await booking.save();

    if (booking.userId?.email) {
      await sendMail({
        to: booking.userId.email,
        subject: 'Service Completion OTP — Balor',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#e94560">&#9986; Balor</h2>
            <p>Hi <strong>${booking.userId.name}</strong>,</p>
            <p>Your service with barber <strong>${booking.barberId?.name || 'Staff'}</strong> at <strong>${booking.salonId?.name || 'our salon'}</strong> is almost complete!</p>
            <p>Please share the 4-digit OTP below with the salon to confirm the completion of your service:</p>
            <div style="text-align:center;margin:24px 0">
              <span style="font-size:2rem;font-weight:900;letter-spacing:0.18em;color:#111;background:#f4f4f4;padding:12px 24px;border-radius:10px;display:inline-block">${otp}</span>
            </div>
            <p style="color:#666;font-size:0.9rem">If you are not at the salon right now, do not share this OTP.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#aaa;font-size:0.8rem">&copy; ${new Date().getFullYear()} Balor &mdash; Smart Grooming & Salon Platform</p>
          </div>
        `,
      });
    }

    res.json({ success: true, message: 'OTP sent to customer' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
