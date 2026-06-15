const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String },
    userName: { type: String },
    type: { type: String, enum: ['bug', 'suggestion', 'other'], required: true },
    description: { type: String, required: true },
    url: { type: String },
    userAgent: { type: String },
    screenSize: { type: String },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

// Indexes for query performance in Admin Dashboard
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
