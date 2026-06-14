const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    registrationId: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String },
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '21:00' },
    services: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, default: 30 }
      }
    ],
    barbers: [
      {
        name: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
        specializations: [{ type: String }],
        rating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
        imageUrl: { type: String },
        bio: { type: String },
        workingSlots: { type: [String], default: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'] },
        unavailableDates: [{ type: Date }],
      }
    ],
  },
  { timestamps: true }
);

salonSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Salon', salonSchema);
