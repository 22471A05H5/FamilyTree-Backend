const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

// Load env BEFORE importing modules that rely on it
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const familyRoutes = require('./routes/family');
const billingRoutes = require('./routes/billing');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Temporary permissive CORS for debugging
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payment', paymentRoutes);

// DB then start server
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect DB:', err?.message || err);
    process.exit(1);
  });
