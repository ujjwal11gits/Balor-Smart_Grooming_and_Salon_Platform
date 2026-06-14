const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    specializations: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    imageUrl: { type: String },
    bio: { type: String },
    workingSlots: {
      type: [String],
      default: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'],
    },
    unavailableDates: [{ type: Date }],
  },
  { timestamps: true }
);

barberSchema.index({ userId: 1 });
barberSchema.index({ salonId: 1 });

module.exports = mongoose.model('Barber', barberSchema);
