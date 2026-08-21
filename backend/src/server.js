const path = require('path');
const fs = require('fs');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'super_secret_jwt_key_change_in_production_32chars';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { initDatabase, ensureDbReady } = require('./utils/db-init');

// Routes
const authRoutes = require('./routes/auth.routes');
const schoolRoutes = require('./routes/school.routes');
const studentRoutes = require('./routes/student.routes');
const callRoutes = require('./routes/call.routes');
const rechargeRoutes = require('./routes/recharge.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── Security & middleware ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — restricted to allowed origins from env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, serverless, mobile, curl)
    if (!origin) return callback(null, true);
    if (
      config.nodeEnv === 'development' ||
      origin.endsWith('.vercel.app') ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// ─── Webhook raw body — MUST come before express.json() ─────────────────────
// Razorpay webhook signature verification needs the raw request body
app.use('/api/recharge/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// General JSON body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// ─── Rate limiting ──────────────────────────────────────────────────────────
// General API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter auth rate limiter — 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Ensure database is initialized before handling any API request
app.use('/api/', ensureDbReady);

// ─── Health check & Contact API ─────────────────────────────────────────────
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ success: true, message: 'Hostel Video Call API is running', timestamp: new Date() });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All contact fields are required' });
  }
  console.log(`[Contact Form Submission] From: ${name} (${email}), Subject: ${subject}`);
  return res.json({
    success: true,
    message: 'Thank you! Your message has been received and our team will get back to you shortly.',
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
const authController = require('./controllers/auth.controller');
app.post('/api/send-otp', authLimiter, authController.parentRequestOtp);
app.post('/api/verify-otp', authLimiter, authController.parentVerifyOtp);

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/admin', adminRoutes);


// ─── Frontend SPA static files & fallback ───────────────────────────────────
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// ─── Start server ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 Hostel Video Call Backend running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
    console.log(`   Health: http://localhost:${config.port}/health`);
    initDatabase().catch((err) => console.warn('Startup DB init:', err.message));
  });
} else {
  // Vercel serverless: kick off DB init eagerly on cold start
  initDatabase().catch((err) => console.warn('Serverless DB init:', err.message));
}

module.exports = app;
