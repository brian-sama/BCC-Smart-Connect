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

const app    = express();
const server = http.createServer(app);

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

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Serve uploaded fault evidence statically
app.use('/uploads', express.static(uploadsDir));

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

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Global error handler — catches anything passed to next(err)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`BCC SmartConnect API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
