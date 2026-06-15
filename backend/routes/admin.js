const router = require('express').Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Barber = require('../models/Barber');
const Salon = require('../models/Salon');
const Feedback = require('../models/Feedback');
const { protect, requireRole } = require('../middleware/auth');
const { notifyBookingStatusChange } = require('../utils/bookingAlerts');

const guard = [protect, requireRole('admin')];

// GET /api/admin/stats
router.get('/stats', ...guard, async (req, res) => {
  try {
    const [totalBookings, totalUsers, totalSalons, totalBarbers] = await Promise.all([
      Booking.countDocuments(),
      User.countDocuments(),
      Salon.countDocuments(),
      Barber.countDocuments(),
    ]);

    const revenueAgg = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const statusCounts = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Bookings per day — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const perDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topBarbers = await Barber.find().sort({ rating: -1 }).limit(5).populate('salonId', 'name');

    res.json({
      totalBookings,
      totalUsers,
      totalSalons,
      totalBarbers,
      totalRevenue,
      statusCounts,
      bookingsPerDay: perDay,
      topBarbers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users?page=1&limit=10
router.get('/users', ...guard, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', ...guard, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/bookings?page=1&limit=10&search=...&status=...
router.get('/bookings', ...guard, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const { search, status } = req.query;

    let query = {};

    // Apply status filter
    if (status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Apply search filter (customer name, barber name, salon name, service)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      const [matchingUsers, matchingBarbers, matchingSalons] = await Promise.all([
        User.find({ name: searchRegex }).select('_id'),
        Barber.find({ name: searchRegex }).select('_id'),
        Salon.find({ name: searchRegex }).select('_id')
      ]);

      const userIds = matchingUsers.map(u => u._id);
      const barberIds = matchingBarbers.map(b => b._id);
      const salonIds = matchingSalons.map(s => s._id);

      query.$or = [
        { userId: { $in: userIds } },
        { barberId: { $in: barberIds } },
        { salonId: { $in: salonIds } },
        { service: searchRegex }
      ];
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('userId', 'name email')
      .populate('barberId', 'name')
      .populate('salonId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/bookings/:id/status
router.patch('/bookings/:id/status', ...guard, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId', 'email name');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { status, otp } = req.body;

    // 1. Prevent changing already completed or cancelled bookings
    if (['completed', 'cancelled'].includes(booking.status) && booking.status !== status) {
      return res.status(400).json({ message: `Cannot change status of a ${booking.status} booking.` });
    }

    // 2. Verify completion OTP if status is set to completed
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
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/shop-owners
router.get('/shop-owners', ...guard, async (req, res) => {
  try {
    const owners = await User.find({ role: 'shop' }).select('name email');
    res.json(owners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/feedback?page=1&limit=10&type=...&status=...
router.get('/feedback', ...guard, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const { type, status } = req.query;

    let query = {};
    if (type && ['bug', 'suggestion', 'other'].includes(type)) {
      query.type = type;
    }
    if (status && ['pending', 'reviewed', 'resolved'].includes(status)) {
      query.status = status;
    }

    const total = await Feedback.countDocuments(query);
    const feedback = await Feedback.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ feedback, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/feedback/:id/status
router.patch('/feedback/:id/status', ...guard, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid feedback status.' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email role');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/feedback/:id
router.delete('/feedback/:id', ...guard, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }
    res.json({ message: 'Feedback deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
