const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // in smallest currency unit
    currency: { type: String, default: 'inr' },
    method: { type: String, enum: ['card', 'netbanking'], required: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
