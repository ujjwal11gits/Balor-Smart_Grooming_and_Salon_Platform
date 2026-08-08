const router = require('express').Router();
const Salon = require('../models/Salon');
const Barber = require('../models/Barber');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect, requireRole } = require('../middleware/auth');

// API to list all salons with search and city filters
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    const filter = {};
    
    // Case-insensitive search for salon names
    if (search) filter.name = { $regex: search, $options: 'i' };
    
    // Filter by city or address if provided
    if (city) {
      filter.$or = [
        { address: { $regex: city, $options: 'i' } },
        { city: { $regex: city, $options: 'i' } }
      ];
    }
    
    // Find salons and attach basic owner details
    let salons = await Salon.find(filter).populate('ownerId', 'name email phone'); 

    const salonIds = salons.map(s => s._id);
    // Fetch all barbers belonging to the filtered salons
    const allBarbers = await Barber.find({ salonId: { $in: salonIds } });
    
    // Map barbers to their respective salons for easy access
    const barbersBySalon = {};
    allBarbers.forEach(b => {
      const sId = String(b.salonId);
      if (!barbersBySalon[sId]) barbersBySalon[sId] = [];
      barbersBySalon[sId].push(b);
    });

    // Define time range for 'Today' to calculate current queue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get all pending or confirmed bookings for these salons today
    const activeBookingsAll = await Booking.find({
      salonId: { $in: salonIds },
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Group bookings by salon
    const bookingsBySalon = {};
    activeBookingsAll.forEach(b => {
      const sId = String(b.salonId);
      if (!bookingsBySalon[sId]) bookingsBySalon[sId] = [];
      bookingsBySalon[sId].push(b);
    });

    // Process each salon to add calculated fields
    salons = salons.map(s => {
      const salonBarbers = barbersBySalon[String(s._id)] || [];
      const salonBookings = bookingsBySalon[String(s._id)] || [];
      
      // Calculate max rating from the barber team
      const maxRating = salonBarbers.length > 0
        ? Math.max(...salonBarbers.map(b => b.rating || 0))
        : 0;
        
      const numBarbers = Math.max(1, salonBarbers.length);
      // Estimate wait time (assuming 30 mins per service)
      const estWaitMins = Math.round((salonBookings.length * 30) / numBarbers);

      const obj = s.toObject(); // Convert Mongoose doc to plain object
      obj.avgRating = Number(maxRating.toFixed(1));
      obj.liveQueue = {
        activeCount: salonBookings.length,
        estWaitMins
      };
      return obj;
    });

    // Sort by rating (or recency if city is filtered)
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

// API to get a single salon's full profile and its barbers
router.get('/:id', async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) return res.status(404).json({ message: 'Salon not found' });
    
    const barbers = await Barber.find({ salonId: req.params.id });
    
    const maxRating = barbers.length > 0
      ? Math.max(...barbers.map(b => b.rating || 0))
      : 0;
      
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

// Create new salon (Restricted to Admins)
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const salon = await Salon.create(req.body);
    res.status(201).json(salon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update salon details (Restricted to Admins)
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const salon = await Salon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(salon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a salon (Restricted to Admins)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await Salon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Salon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
