const router = require('express').Router();
const Salon = require('../models/Salon');
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { notifyBookingStatusChange } = require('../utils/bookingAlerts');
const { upsertSalonBarber, removeSalonBarber } = require('../utils/salonBarberSync');

const guard = [protect, requireRole('shop')];

// Helper: get this shop owner's salon
async function getOwnedSalon(userId) {
  const salon = await Salon.findOne({ ownerId: userId }).populate('ownerId', 'name email');
  return salon;
}

// GET /api/shop/my-salon  — get own salon info + barbers
router.get('/my-salon', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found for this account' });
    const barbers = await Barber.find({ salonId: salon._id });
    res.json({ salon, barbers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/shop/my-salon  — update own salon info
router.put('/my-salon', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found for this account' });
    const { name, ownerName, address, city, state, zipCode, description, imageUrl, services, phone, openingTime, closingTime } = req.body;
    
    // Update owner name on User model if provided
    if (ownerName && salon.ownerId) {
      await User.findByIdAndUpdate(salon.ownerId._id, { name: ownerName });
    }

    salon.name = name ?? salon.name;
    salon.address = address ?? salon.address;
    salon.city = city ?? salon.city;
    salon.state = state ?? salon.state;
    salon.zipCode = zipCode ?? salon.zipCode;
    salon.description = description ?? salon.description;
    salon.imageUrl = imageUrl ?? salon.imageUrl;
    salon.services = services ?? salon.services;
    salon.phone = phone ?? salon.phone;
    salon.openingTime = openingTime ?? salon.openingTime;
    salon.closingTime = closingTime ?? salon.closingTime;
    await salon.save();
    // Re-populate ownerId to make sure name and email are returned correctly
    await salon.populate('ownerId', 'name email');
    res.json(salon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/shop/bookings?page=1&limit=10  — bookings for own salon
router.get('/bookings', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found for this account' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const total = await Booking.countDocuments({ salonId: salon._id });
    const bookings = await Booking.find({ salonId: salon._id })
      .populate('userId', 'name email phone')
      .populate('barberId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/shop/bookings/:id/status  — update a booking's status
router.patch('/bookings/:id/status', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found' });

    const booking = await Booking.findOne({ _id: req.params.id, salonId: salon._id }).populate('userId', 'email name');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const previousStatus = booking.status;
    const { status, cancelReason, otp } = req.body;

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
      // Require cancelReason if the booking was already confirmed
      if (previousStatus === 'confirmed') {
        if (!cancelReason || !cancelReason.trim()) {
          return res.status(400).json({ message: 'Cancellation reason is required for confirmed bookings.' });
        }
        booking.cancelReason = cancelReason.trim();
      }
    }
    await booking.save();

    // ✅ Respond immediately — status is saved
    res.json(booking);

    // 🔔 Send notification email in the background (notifyBookingStatusChange uses sendMailBackground)
    notifyBookingStatusChange(booking, status).catch((err) => {
      console.error('[SHOP] Status notification error:', err.message);
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shop/barbers  — add a barber to own salon
router.post('/barbers', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found for this account' });

    const { name, specializations, bio, imageUrl } = req.body;
    const barber = await Barber.create({
      name,
      salonId: salon._id,
      specializations: specializations || [],
      bio,
      imageUrl,
    });
    await upsertSalonBarber(Salon, barber);
    res.status(201).json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/shop/barbers/:id  — update a barber in own salon
router.put('/barbers/:id', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found' });

    const barber = await Barber.findOne({ _id: req.params.id, salonId: salon._id });
    if (!barber) return res.status(404).json({ message: 'Barber not found or not in your salon' });

    const { name, specializations, bio, imageUrl, workingSlots } = req.body;
    barber.name = name ?? barber.name;
    barber.specializations = specializations ?? barber.specializations;
    barber.bio = bio ?? barber.bio;
    barber.imageUrl = imageUrl ?? barber.imageUrl;
    barber.workingSlots = workingSlots ?? barber.workingSlots;
    await barber.save();
    await upsertSalonBarber(Salon, barber);
    res.json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/shop/barbers/:id  — remove a barber from own salon
router.delete('/barbers/:id', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found' });

    const barber = await Barber.findOne({ _id: req.params.id, salonId: salon._id });
    if (!barber) return res.status(404).json({ message: 'Barber not found or not in your salon' });

    await barber.deleteOne();
    await removeSalonBarber(Salon, salon._id, req.params.id);
    res.json({ message: 'Barber removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/shop/stats  — quick stats for dashboard overview
router.get('/stats', ...guard, async (req, res) => {
  try {
    const salon = await getOwnedSalon(req.user.id);
    if (!salon) return res.status(404).json({ message: 'No salon found' });

    const [totalBookings, totalBarbers] = await Promise.all([
      Booking.countDocuments({ salonId: salon._id }),
      Barber.countDocuments({ salonId: salon._id }),
    ]);

    const revenueAgg = await Booking.aggregate([
      { $match: { salonId: salon._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayBookings = await Booking.countDocuments({
      salonId: salon._id,
      date: { $gte: today, $lt: tomorrow },
    });

    const statusCounts = await Booking.aggregate([
      { $match: { salonId: salon._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Bookings per day — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const bookingsPerDay = await Booking.aggregate([
      { $match: { salonId: salon._id, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 1. Revenue and Completed Booking Count per Barber
    const barberPerformance = await Booking.aggregate([
      { $match: { salonId: salon._id, status: 'completed' } },
      {
        $group: {
          _id: '$barberId',
          revenue: { $sum: '$price' },
          completedCount: { $sum: 1 },
          users: { $push: '$userId' }
        }
      }
    ]);

    // Fetch all barbers to map names
    const barbers = await Barber.find({ salonId: salon._id });
    const barbersMap = {};
    barbers.forEach(b => {
      barbersMap[String(b._id)] = { name: b.name, imageUrl: b.imageUrl, rating: b.rating };
    });

    // Calculate Retention Rate per Barber
    const leaderboard = barberPerformance.map(perf => {
      const bId = String(perf._id);
      const bInfo = barbersMap[bId] || { name: 'Unknown Barber', imageUrl: '', rating: 0 };
      
      const userCounts = {};
      perf.users.forEach(uId => {
        if (uId) userCounts[String(uId)] = (userCounts[String(uId)] || 0) + 1;
      });
      const uniqueUsers = Object.keys(userCounts).length;
      const repeatUsers = Object.values(userCounts).filter(c => c > 1).length;
      const retentionRate = uniqueUsers > 0 ? Math.round((repeatUsers / uniqueUsers) * 100) : 0;

      return {
        barberId: bId,
        name: bInfo.name,
        imageUrl: bInfo.imageUrl,
        rating: bInfo.rating,
        revenue: perf.revenue,
        completedCount: perf.completedCount,
        retentionRate
      };
    });

    leaderboard.sort((a, b) => b.revenue - a.revenue);

    // 2. Peak Hours / Time Slots
    const peakHours = await Booking.aggregate([
      { $match: { salonId: salon._id, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalBookings,
      totalBarbers,
      totalRevenue,
      todayBookings,
      statusCounts,
      bookingsPerDay,
      leaderboard,
      peakHours
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
