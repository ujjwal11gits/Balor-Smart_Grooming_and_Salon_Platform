const router = require("express").Router();
// Notification model: stores user-targeted messages and read state.
const Notification = require("../models/Notification");

// `protect` middleware: requires a valid authenticated user on the request.
const { protect } = require("../middleware/auth");

/**
 * GET /api/notifications
 * Returns the authenticated user's notifications.
 * - Uses `protect` to ensure the requester is authenticated.
 * - Sorts so unread notifications appear first, then newest items, and
 *   limits the result to the most recent 30.
 */
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ read: 1, createdAt: -1 })
      .limit(30);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/notifications/read
 * Marks all unread notifications for the authenticated user as read.
 * - Uses `protect` to ensure the requester is authenticated.
 * - Performs a bulk `updateMany` setting `read: true` for that user.
 */
router.patch("/read", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true },
    );
    res.json({ message: "Marked all as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export the configured router so the main app can mount these endpoints
// (typically at `/api/notifications`).
module.exports = router;
