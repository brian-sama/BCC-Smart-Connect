const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let _io = null;

function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || process.env.ADMIN_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  _io.use((socket, next) => {
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
