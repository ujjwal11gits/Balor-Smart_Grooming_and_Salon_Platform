const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'notified'], default: 'pending' },
  },
  { timestamps: true }
);

waitlistSchema.index({ barberId: 1, date: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
