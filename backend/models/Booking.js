const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    service: { type: String, required: true },
    notes: { type: String },
    phone: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true, default: 30 },
    completionOtp: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'shop'],
    },
    cancelReason: {
      type: String,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ barberId: 1 });
bookingSchema.index({ salonId: 1 });
bookingSchema.index({ date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
