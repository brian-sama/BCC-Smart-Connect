require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./sockets/incidentSocket');

const authRoutes         = require('./routes/auth');
const incidentRoutes     = require('./routes/incidents');
const notificationRoutes = require('./routes/notifications');
const bulletinRoutes     = require('./routes/bulletins');
const teamRoutes         = require('./routes/teams');
const whatsappRoutes     = require('./routes/whatsapp');

const app    = express();
const server = http.createServer(app);

// Trust the first reverse proxy (Caddy/Nginx/Render) so rate limiting sees real client IPs
app.set('trust proxy', 1);

initSocket(server);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173,http://localhost:3000' : ''))
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

// Evidence is not served as public static content. A private, authorized
// media delivery route/object store is required before production access.

// Rate limiters for public endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 min
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const incidentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 60 reports per 10 min
  message: { error: 'Rate limit exceeded for report submissions. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth',          authLimiter,     authRoutes);
app.use('/api/incidents',     incidentLimiter, incidentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bulletins',     bulletinRoutes);
app.use('/api/teams',         teamRoutes);
app.use('/api/whatsapp',      whatsappRoutes);

app.get('/health/live', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/health/ready', async (_req, res) => {
  try {
    const pool = require('./config/db');
    const ready = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = '006_bulletin_creator_review.sql'");
    if (!ready.rowCount) return res.status(503).json({ status: 'schema_not_ready' });
    res.json({ status: 'ready', ts: new Date().toISOString() });
  } catch (_) {
    res.status(503).json({ status: 'not_ready' });
  }
});
app.get('/health', (_req, res) => res.redirect(308, '/health/live'));

// Global error handler — catches anything passed to next(err)
app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`BCC SmartConnect API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
