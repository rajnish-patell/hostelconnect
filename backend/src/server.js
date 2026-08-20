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

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Ensure database is initialized before handling any API request
app.use('/api/', ensureDbReady);

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ success: true, message: 'Hostel Video Call API is running', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/recharge', rechargeRoutes);

// Frontend SPA static files & fallback
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

// Start server (only in standalone/Node mode, not in Vercel serverless)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 Hostel Video Call Backend running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Health: http://localhost:${config.port}/health`);
    initDatabase().catch((err) => console.warn('Startup DB init:', err.message));
  });
} else {
  // Vercel serverless: kick off DB init eagerly on cold start
  initDatabase().catch((err) => console.warn('Serverless DB init:', err.message));
}

module.exports = app;
