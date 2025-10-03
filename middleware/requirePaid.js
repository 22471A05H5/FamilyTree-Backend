const User = require('../models/User');

async function requirePaid(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('isPaid');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!user.isPaid) return res.status(402).json({ message: 'Payment required' });
    next();
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = requirePaid;
