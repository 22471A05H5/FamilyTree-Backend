    // Simple coupon demo: COUPON10=10% off, COUPON50=50% off
    if (typeof coupon === 'string' && coupon.trim()) {
      const code = coupon.trim().toUpperCase();
      if (code === 'COUPON10') amount = Math.max(50, Math.floor(amount * 0.9));
      if (code === 'COUPON50') amount = Math.max(50, Math.floor(amount * 0.5));
    }
const express = require('express');
const Stripe = require('stripe');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

router.post('/create-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Payments are not configured' });
    let { amount, method, currency = 'inr', coupon } = req.body || {};
    if (!amount || !method) return res.status(400).json({ message: 'amount and method are required' });

    const allowed = ['card', 'netbanking'];
    if (!allowed.includes(method)) return res.status(400).json({ message: 'Unsupported payment method' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: [method],
      metadata: { userId: req.user.id, method },
    });

    // store pending payment
    await Payment.create({
      userId: req.user.id,
      amount,
      currency,
      method,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to create payment intent' });
  }
});

router.post('/verify-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Payments are not configured' });
    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId) return res.status(400).json({ message: 'paymentIntentId is required' });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi) return res.status(404).json({ message: 'PaymentIntent not found' });

    const status = pi.status === 'succeeded' ? 'succeeded' : (pi.status === 'requires_payment_method' || pi.status === 'canceled' ? 'failed' : 'pending');
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status },
      { new: true }
    );

    // If succeeded, mark user as paid
    let updatedUser = null;
    if (status === 'succeeded') {
      updatedUser = await User.findByIdAndUpdate(req.user.id, { isPaid: true }, { new: true }).select('-password');
    }

    res.json({ payment, user: updatedUser });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Verification failed' });
  }
});

module.exports = router;

// History for current user
router.get('/my', auth, async (req, res) => {
  try {
    const items = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch payments' });
  }
});
