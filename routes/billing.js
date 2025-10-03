const express = require('express');
const Stripe = require('stripe');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY || '';

if (!stripeSecret) {
  // Do not crash, but warn – payments won't work until configured
  console.warn('STRIPE_SECRET_KEY is not set. Stripe payments are disabled.');
}

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// GET /api/billing/public-key - provide publishable key to frontend
router.get('/public-key', (req, res) => {
  return res.json({ publishableKey: stripePublishable || null });
});

// POST /api/billing/create-payment-intent - for embedded Elements checkout
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
    const { amount = 19900, currency = 'inr' } = req.body || {};
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.user.id },
      automatic_payment_methods: { enabled: true },
    });
    return res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (e) {
    console.error('Stripe PI error:', e);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// POST /api/billing/verify-intent - ensure intent is paid then mark user paid
router.post('/verify-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId) return res.status(400).json({ message: 'paymentIntentId required' });

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }
    const ownerId = intent.metadata?.userId;
    if (!ownerId || String(ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await User.updateOne({ _id: req.user.id }, { $set: { isPaid: true } });
    const updated = await User.findById(req.user.id).select('_id name email isPaid');
    return res.json({ id: updated._id, name: updated.name, email: updated.email, isPaid: updated.isPaid });
  } catch (e) {
    console.error('Stripe verify-intent error:', e);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// POST /api/billing/create-checkout-session
// Creates a one-time Checkout Session and returns the hosted URL
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });

    const { amount = 19900, currency = 'inr' } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Family Album Pro',
              description: 'Unlock uploads & family tree features',
            },
            unit_amount: amount, // e.g. 19900 = ₹199.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: req.user.id,
      },
      success_url: `${frontendUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/upgrade?canceled=1`,
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe session error:', e);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

// GET /api/billing/confirm?session_id=cs_...
// Confirms a completed payment and upgrades the user
router.get('/confirm', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe not configured' });
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ message: 'session_id required' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Validate paid status and ownership
    const isPaid = session.payment_status === 'paid';
    const ownerId = session.metadata?.userId;

    if (!isPaid) return res.status(400).json({ message: 'Payment not completed' });
    if (!ownerId || String(ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Mark user as paid
    await User.updateOne({ _id: req.user.id }, { $set: { isPaid: true } });

    const updated = await User.findById(req.user.id).select('_id name email isPaid');
    return res.json({ id: updated._id, name: updated.name, email: updated.email, isPaid: updated.isPaid });
  } catch (e) {
    console.error('Stripe confirm error:', e);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

module.exports = router;
