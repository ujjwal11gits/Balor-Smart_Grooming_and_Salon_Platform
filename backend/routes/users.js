const router = require('express').Router();
const User = require('../models/User');
// `protect` middleware: requires a valid authenticated user for protected routes.
const { protect } = require('../middleware/auth');

/**
 * PATCH /api/users/profile
 * Updates the authenticated user's profile fields (`name`, `phone`, `avatar`).
 * - Uses `protect` to ensure the requester is authenticated.
 * - Returns the updated user document excluding sensitive tokens and password.
 */
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select('-password -resetToken -refreshToken'); // It make ensure to remove sensitive fields like tokens, password from the response.
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/users/me
 * Returns the authenticated user's profile.
 * - Uses `protect` middleware.
 * - Excludes sensitive fields (`password`, `resetToken`, `refreshToken`).
 * - Populates `favoriteBarbers` (with nested `salonId.name`) and `favoriteSalons`.
 * - Filters out any null/removed referenced favorites before returning.
 */
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

/**
 * POST /api/users/favorites/barber/:id
 * Toggles a barber in the authenticated user's `favoriteBarbers` list.
 * - Adds the barber if not present, removes it if already favorited.
 * - Uses `protect` to ensure the requester is authenticated.
 * - Returns the updated `favoriteBarbers` array.
 */
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

/**
 * POST /api/users/favorites/salon/:id
 * Toggles a salon in the authenticated user's `favoriteSalons` list.
 * - Adds the salon if not present, removes it if already favorited.
 * - Uses `protect` to ensure the requester is authenticated.
 * - Returns the updated `favoriteSalons` array.
 */
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

// Export the router so these user-related endpoints can be mounted
// (typically at `/api/users`).
module.exports = router;
