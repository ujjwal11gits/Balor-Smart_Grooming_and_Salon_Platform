const dns = require('dns');
dns.setServers(['8.8.8.8']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Set secure HTTP headers
app.use(helmet());

// Restrict CORS in production (clean trailing slash if present)
let allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
if (allowedOrigin && allowedOrigin.endsWith('/')) {
  allowedOrigin = allowedOrigin.slice(0, -1);
}
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Rate limiting for auth routes to prevent abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/forgot-password-otp', authLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/salons', require('./routes/salons'));
app.use('/api/barbers', require('./routes/barbers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/waitlist', require('./routes/waitlist'));

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error ❌:', err);
    process.exit(1); // Exit process in production so host knows to restart
  });
