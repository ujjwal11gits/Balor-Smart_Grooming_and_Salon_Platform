const router = require('express').Router();
const Waitlist = require('../models/Waitlist');
const Barber = require('../models/Barber');
const { protect } = require('../middleware/auth');

// POST /api/waitlist - Join waitlist
router.post('/', protect, async (req, res) => {
  try {
    const { barberId, date } = req.body;
    if (!barberId || !date) return res.status(400).json({ message: 'Barber and date required' });

    const barber = await Barber.findById(barberId);
    if (!barber) return res.status(404).json({ message: 'Barber not found' });

    const waitDate = new Date(date);
    waitDate.setHours(0, 0, 0, 0);

    const existing = await Waitlist.findOne({
      userId: req.user.id,
      barberId,
      date: waitDate,
      status: 'pending',
    });

    if (existing) return res.status(400).json({ message: 'You are already on the waitlist for this day' });

    const waitlist = await Waitlist.create({
      userId: req.user.id,
      barberId,
      date: waitDate,
    });

    res.status(201).json(waitlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/waitlist/my - Get user's waitlisted entries
router.get('/my', protect, async (req, res) => {
  try {
    const waitlists = await Waitlist.find({ userId: req.user.id })
      .populate('barberId', 'name imageUrl')
      .sort({ createdAt: -1 });
    res.json(waitlists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
