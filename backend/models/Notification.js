const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['booking_created', 'booking_confirmed', 'booking_completed', 'booking_cancelled', 'review_created', 'feedback_created'],
    },
    link: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
