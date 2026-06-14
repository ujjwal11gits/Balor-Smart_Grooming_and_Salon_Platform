const router = require('express').Router();
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const { protect, requireRole } = require('../middleware/auth');
const { upsertSalonBarber, removeSalonBarber } = require('../utils/salonBarberSync');

// GET /api/barbers/:id/available-slots?date=YYYY-MM-DD
router.get('/:id/available-slots', async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) return res.status(404).json({ message: 'Barber not found' });

    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param required' });

    // Check if date is in unavailableDates
    const inputDate = new Date(date);
    const isUnavailable = barber.unavailableDates.some(
      (d) => new Date(d).toDateString() === inputDate.toDateString()
    );
    if (isUnavailable) return res.json({ slots: [], unavailable: true });

    // Find already-booked slots on that date
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const booked = await Booking.find({
      barberId: req.params.id,
      date: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed'] },
    }).select('timeSlot duration');

    const timeToMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const requestedMins = parseInt(req.query.duration) || 30;
    const maxWorkingMins = Math.max(...barber.workingSlots.map(timeToMins));
    const endOfDayMins = maxWorkingMins + 60; // Assume last slot allows up to 60 mins by default

    const occupiedIntervals = booked.map((b) => ({
      start: timeToMins(b.timeSlot),
      end: timeToMins(b.timeSlot) + (b.duration || 30),
    }));

    const available = barber.workingSlots.filter((slot) => {
      const slotStart = timeToMins(slot);
      const slotEnd = slotStart + requestedMins;

      if (slotEnd > endOfDayMins) return false;

      for (const occ of occupiedIntervals) {
        if (Math.max(slotStart, occ.start) < Math.min(slotEnd, occ.end)) {
          return false;
        }
      }
      return true;
    });

    res.json({ slots: available });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/barbers/:id
router.get('/:id', async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id).populate('salonId', 'name address services phone openingTime closingTime');
    if (!barber) return res.status(404).json({ message: 'Barber not found' });
    res.json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/barbers/working-slots  — barber updates their own working slots + unavailable dates
router.put('/working-slots', protect, requireRole('barber'), async (req, res) => {
  try {
    const barber = await Barber.findOneAndUpdate(
      { userId: req.user.id },
      { workingSlots: req.body.workingSlots, unavailableDates: req.body.unavailableDates },
      { new: true }
    );
    res.json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/barbers  — admin only
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const barber = await Barber.create(req.body);
    await upsertSalonBarber(Salon, barber);
    res.status(201).json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/barbers/:id  — admin only
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const barber = await Barber.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (barber) await upsertSalonBarber(Salon, barber);
    res.json(barber);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/barbers/:id  — admin only
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    await Barber.findByIdAndDelete(req.params.id);
    if (barber?.salonId) await removeSalonBarber(Salon, barber.salonId, req.params.id);
    res.json({ message: 'Barber deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
