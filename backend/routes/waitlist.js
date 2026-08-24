const router = require('express').Router();
const Waitlist = require('../models/Waitlist'); //stores requests to be notified when slots open for a date.
const Barber = require('../models/Barber');

// `protect` middleware: requires an authenticated user on the request.
const { protect } = require('../middleware/auth');

/**
 * POST /api/waitlist
 * Adds the authenticated user to a barber's waitlist for a specific date.
 * - Validates `barberId` and `date`, ensures the barber exists, and that the
 *   user isn't already pending on the same date.
 * - Creates a `Waitlist` entry and returns it.
 */
router.post('/', protect, async (req, res) => {
  try {
    const { barberId, date } = req.body;
    if (!barberId || !date) return res.status(400).json({ message: 'Barber and date required' });

    const barber = await Barber.findById(barberId);
    if (!barber) return res.status(404).json({ message: 'Barber not found' });

    const waitDate = new Date(date);
    waitDate.setHours(0, 0, 0, 0);

    // Check if the user is already on the waitlist for this barber and date
    const existing = await Waitlist.findOne({
      userId: req.user.id,
      barberId,
      date: waitDate,
      status: 'pending',
    });

    if (existing) return res.status(400).json({ message: 'You are already on the waitlist for this day' });
    
    // Create a new waitlist entry
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
/**
 * GET /api/waitlist/my
 * Returns the authenticated user's waitlist entries.
 * - Uses `protect` to require authentication.
 * - Populates barber display fields (`name`, `imageUrl`) and sorts newest-first.
 */
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

// Export router so these endpoints can be mounted by the main app
module.exports = router;
