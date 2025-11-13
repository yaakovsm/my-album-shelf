const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./config/logger');
const db = require('./config/database');
const kafka = require('./config/kafka');

const authRoutes = require('./routes/auth');
const albumsRoutes = require('./routes/albums');

const app = express();
const PORT = process.env.PORT || 3001;

// Security + body
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic rate-limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Simple request log
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
      ua: req.get('User-Agent') || 'unknown',
      ip: req.ip,
    });
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumsRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Errors
app.use((err, req, res, next) => {
  logger.error('Unhandled', { message: err.message, stack: err.stack });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// start
(async () => {
  // Kafka
  try {
    await kafka.connect();
  } catch (e) {
    logger.warn('Kafka connect failed (continuing without Kafka)', { error: e.message });
  }

  // DB
  const dbOk = await db.ping().catch(() => false);
  if (!dbOk) logger.warn('DB not reachable; API will operate without DB');

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Node.js server is running on port ${PORT}`);
  });
})();

// graceful shutdown
process.on('SIGINT', async () => {
  await kafka.disconnect().catch(() => {});
  await db.end().catch(() => {});
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await kafka.disconnect().catch(() => {});
  await db.end().catch(() => {});
  process.exit(0);
});