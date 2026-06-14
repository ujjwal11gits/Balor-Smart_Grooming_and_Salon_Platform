const router = require('express').Router();
const Salon = require('../models/Salon');
const Barber = require('../models/Barber');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/salons?search=&city=
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (city) {
      filter.$or = [
        { address: { $regex: city, $options: 'i' } },
        { city: { $regex: city, $options: 'i' } }
      ];
    }
    
    let salons = await Salon.find(filter).populate('ownerId', 'name email phone');
    
    // Fetch all barbers for these salons to dynamically calculate the correct rating
    const salonIds = salons.map(s => s._id);
    const allBarbers = await Barber.find({ salonId: { $in: salonIds } });
    
    // Group barbers by salon
    const barbersBySalon = {};
    allBarbers.forEach(b => {
      const sId = String(b.salonId);
      if (!barbersBySalon[sId]) barbersBySalon[sId] = [];
      barbersBySalon[sId].push(b);
    });

    // Fetch active bookings for today for live queue calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeBookingsAll = await Booking.find({
      salonId: { $in: salonIds },
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    const bookingsBySalon = {};
    activeBookingsAll.forEach(b => {
      const sId = String(b.salonId);
      if (!bookingsBySalon[sId]) bookingsBySalon[sId] = [];
      bookingsBySalon[sId].push(b);
    });

    salons = salons.map(s => {
      const salonBarbers = barbersBySalon[String(s._id)] || [];
      const salonBookings = bookingsBySalon[String(s._id)] || [];
      const maxRating = salonBarbers.length > 0
        ? Math.max(...salonBarbers.map(b => b.rating || 0))
        : 0;
      const numBarbers = Math.max(1, salonBarbers.length);
      const estWaitMins = Math.round((salonBookings.length * 30) / numBarbers);

      const obj = s.toObject();
      obj.avgRating = Number(maxRating.toFixed(1));
      obj.liveQueue = {
        activeCount: salonBookings.length,
        estWaitMins
      };
      return obj;
    });

    if (!city) {
      salons.sort((a, b) => b.avgRating - a.avgRating);
    } else {
      salons.sort((a, b) => b.avgRating - a.avgRating || new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    res.json(salons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salons/:id  — salon + its barbers
router.get('/:id', async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) return res.status(404).json({ message: 'Salon not found' });
    
    // Always fetch from Barber collection to get the most up-to-date ratings
    const barbers = await Barber.find({ salonId: req.params.id });
    
    const maxRating = barbers.length > 0
      ? Math.max(...barbers.map(b => b.rating || 0))
      : 0;
      
    // Fetch active bookings for today for live queue calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeBookings = await Booking.find({
      salonId: req.params.id,
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    const numBarbers = Math.max(1, barbers.length);
    const estWaitMins = Math.round((activeBookings.length * 30) / numBarbers);

    const salonObj = salon.toObject();
    salonObj.avgRating = Number(maxRating.toFixed(1));
    salonObj.liveQueue = {
      activeCount: activeBookings.length,
      estWaitMins
    };
    
    res.json({ salon: salonObj, barbers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/salons  — admin only
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const salon = await Salon.create(req.body);
    res.status(201).json(salon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salons/:id  — admin only
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const salon = await Salon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(salon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/salons/:id  — admin only
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await Salon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Salon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
