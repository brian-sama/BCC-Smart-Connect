const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function resolveUser(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.is_guest === true && decoded.role === 'Resident' && String(decoded.id).startsWith('guest-')) {
    return decoded;
  }
  const { rows } = await pool.query(
    'SELECT id, email, role, first_name, last_name, is_active, is_guest FROM users WHERE id = $1',
    [decoded.id]
  );
  if (!rows.length || !rows[0].is_active) return null;
  return { ...decoded, ...rows[0] };
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    req.user = await resolveUser(header.slice(7));
    if (!req.user) return res.status(401).json({ error: 'Account is inactive or unavailable' });
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Does not reject anonymous requests, but never trusts stale role claims.
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = await resolveUser(header.slice(7)) || undefined; } catch {}
  }
  next();
}

module.exports = { authenticate, optionalAuth };
