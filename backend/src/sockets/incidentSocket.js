const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

let _io = null;

function initSocket(httpServer) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  _io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const clean = origin.trim().replace(/\/+$/, '');
        if (
          allowed.includes('*') ||
          allowed.includes(clean) ||
          /^https:\/\/([a-z0-9-]+--)?bccsmartconnect\.netlify\.app$/i.test(clean) ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clean)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST'],
    },
  });

  _io.use(async (socket, next) => {
    const room = socket.handshake.query.room || socket.handshake.auth?.room;
    if (room === 'admin') {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow unauthenticated fallback only in local development if explicitly enabled
        if (process.env.NODE_ENV === 'development') {
          socket.data.user = { role: 'Dispatcher', name: 'Dev Dispatcher' };
          return next();
        }
        return next(new Error('Authentication required for admin socket room'));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { rows } = await pool.query(
          'SELECT role, is_active FROM users WHERE id = $1',
          [decoded.id]
        );
        if (!rows.length || !rows[0].is_active) return next(new Error('Account is inactive'));
        decoded.role = rows[0].role;
        if (!['Dispatcher', 'Communications', 'Administrator'].includes(decoded.role)) {
          return next(new Error('Forbidden: Insufficient privileges'));
        }
        socket.data.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Invalid socket authentication token'));
      }
    } else {
      next();
    }
  });

  _io.on('connection', (socket) => {
    const room = socket.handshake.query.room || socket.handshake.auth?.room;
    if (room === 'admin') {
      socket.join('admin');
      console.log(`[Socket] Admin joined room: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return _io;
}

function getIo() {
  return _io;
}

module.exports = { initSocket, getIo };
