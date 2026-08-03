const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'barber', 'admin', 'shop'], default: 'user' },
    phone: { type: String },
    avatar: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    refreshToken: { type: String },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    favoriteBarbers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Barber' }],
    favoriteSalons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }],
  },
  { timestamps: true }
);

// Here we hash the password before saving the user document to the database. This ensures that the password is stored securely and not in plain text. 
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
