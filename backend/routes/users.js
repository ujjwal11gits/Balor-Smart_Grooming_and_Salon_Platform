const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// PATCH /api/users/profile  — update own profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select('-password -resetToken -refreshToken');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/me  — get own profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetToken -refreshToken')
      .populate({
        path: 'favoriteBarbers',
        select: 'name imageUrl rating totalReviews specializations bio salonId',
        populate: {
          path: 'salonId',
          select: 'name'
        }
      })
      .populate('favoriteSalons', 'name imageUrl address');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const userObj = user.toObject();
    if (userObj.favoriteBarbers) {
      userObj.favoriteBarbers = userObj.favoriteBarbers.filter(Boolean);
    }
    if (userObj.favoriteSalons) {
      userObj.favoriteSalons = userObj.favoriteSalons.filter(Boolean);
    }
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/favorites/barber/:id
router.post('/favorites/barber/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const index = user.favoriteBarbers.indexOf(req.params.id);
    if (index === -1) user.favoriteBarbers.push(req.params.id);
    else user.favoriteBarbers.splice(index, 1);
    await user.save();
    res.json(user.favoriteBarbers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/favorites/salon/:id
router.post('/favorites/salon/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const index = user.favoriteSalons.indexOf(req.params.id);
    if (index === -1) user.favoriteSalons.push(req.params.id);
    else user.favoriteSalons.splice(index, 1);
    await user.save();
    res.json(user.favoriteSalons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
