const router = require("express").Router();
const Review = require("../models/Review");
const Barber = require("../models/Barber");
const Booking = require("../models/Booking");
// Authentication middleware: `protect` ensures the request is authenticated,
// `requireRole("user")` restricts certain endpoints to users with role 'user'.
const { protect, requireRole } = require("../middleware/auth");

/**
 * POST /api/reviews
 * Creates a review for a completed booking.
 * - Validates the booking exists, belongs to the requester, is completed,
 *   and hasn't already been reviewed.
 * - Persists the `Review`, recalculates and updates the `Barber`'s rating,
 *   syncs the barber subdocument in the `Salon`, and notifies barber/shop owner.
 */
router.post("/", protect, requireRole("user"), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.userId) !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });
    
    if (booking.status !== "completed")
      return res
        .status(400)
        .json({ message: "Can only review completed bookings" });

    const existing = await Review.findOne({ bookingId });
    if (existing)
      return res.status(400).json({ message: "Already reviewed this booking" });

    // Create the review document linking user, barber and booking
    const review = await Review.create({
      userId: req.user.id,
      barberId: booking.barberId,
      bookingId,
      rating,
      comment,
    });

    // Recalculate barber rating: fetch all reviews, compute average,
    // update `rating` and `totalReviews` on the Barber document.
    const allReviews = await Review.find({ barberId: booking.barberId });
    const avg =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    const barber = await Barber.findByIdAndUpdate(
      booking.barberId,
      {
        rating: Math.round(avg * 10) / 10,
        totalReviews: allReviews.length,
      },
      { new: true },
    );

    // Sync to Salon subdocument: update or insert the barber snapshot inside
    // the Salon record so salon-level barber data stays consistent.
    const Salon = require("../models/Salon");
    const { upsertSalonBarber } = require("../utils/salonBarberSync");
    await upsertSalonBarber(Salon, barber);

    // Notify Barber & Shop Owner of the new review: create Notification
    // records for the barber user and the salon owner (if present).
    const Notification = require("../models/Notification");
    if (barber?.userId) {
      await Notification.create({
        userId: barber.userId,
        message: `You received a new ${rating}-star review from ${req.user.name}`,
        type: "review_created",
        link: "/barber/dashboard",
      }).catch(() => {});
    }

    const salon = await Salon.findById(booking.salonId);
    if (salon?.ownerId) {
      await Notification.create({
        userId: salon.ownerId,
        message: `${barber.name} received a new ${rating}-star review from ${req.user.name}`,
        type: "review_created",
        link: "/shop/dashboard",
      }).catch(() => {});
    }

    // Return the created review
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/reviews/barber/:barberId
 * Public endpoint returning all reviews for a barber.
 * - Finds reviews by `barberId`, populates the reviewer's `name` and `avatar`,
 *   sorts newest-first and returns the list.
 */
router.get("/barber/:barberId", async (req, res) => {
  try {
    const reviews = await Review.find({ barberId: req.params.barberId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
// Export the router so these routes can be mounted (e.g. at `/api/reviews`).
