const router = require('express').Router();
const Review = require('../models/Review');
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');
const { protect, requireRole } = require('../middleware/auth');

// POST /api/reviews  — user submits review for a completed booking
router.post('/', protect, requireRole('user'), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.userId) !== req.user.id)
      return res.status(403).json({ message: 'Not your booking' });
    if (booking.status !== 'completed')
      return res.status(400).json({ message: 'Can only review completed bookings' });

    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(400).json({ message: 'Already reviewed this booking' });

    const review = await Review.create({
      userId: req.user.id,
      barberId: booking.barberId,
      bookingId,
      rating,
      comment,
    });

    // Recalculate barber rating
    const allReviews = await Review.find({ barberId: booking.barberId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    const barber = await Barber.findByIdAndUpdate(booking.barberId, {
      rating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    }, { new: true });

    // Sync to Salon subdocument
    const Salon = require('../models/Salon');
    const { upsertSalonBarber } = require('../utils/salonBarberSync');
    await upsertSalonBarber(Salon, barber);

    // Notify Barber & Shop Owner of the new review
    const Notification = require('../models/Notification');
    if (barber?.userId) {
      await Notification.create({
        userId: barber.userId,
        message: `You received a new ${rating}-star review from ${req.user.name}`,
        type: 'review_created',
        link: '/barber/dashboard'
      }).catch(() => {});
    }

    const salon = await Salon.findById(booking.salonId);
    if (salon?.ownerId) {
      await Notification.create({
        userId: salon.ownerId,
        message: `${barber.name} received a new ${rating}-star review from ${req.user.name}`,
        type: 'review_created',
        link: '/shop/dashboard'
      }).catch(() => {});
    }

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/barber/:barberId  — public
router.get('/barber/:barberId', async (req, res) => {
  try {
    const reviews = await Review.find({ barberId: req.params.barberId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
