const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

function signTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access, refresh };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, phone, password } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'first_name, last_name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, role`,
      [first_name.trim(), last_name.trim(), email.toLowerCase(), phone || null, password_hash]
    );
    res.status(201).json({ user: rows[0], ...signTokens(rows[0]) });
  } catch (err) {
    console.error('register:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, email, role, password_hash FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { password_hash, ...safe } = user;
    res.json({ user: safe, ...signTokens(user) });
  } catch (err) {
    console.error('login:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/guest — continue without account
router.post('/guest', async (req, res) => {
  const guestUser = {
    id: `guest-${Date.now()}`,
    email: null,
    first_name: 'Guest',
    last_name: 'Citizen',
    role: 'Resident',
    is_guest: true,
  };
  const token = jwt.sign(
    { id: guestUser.id, role: 'Resident', is_guest: true },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ user: guestUser, access: token, refresh: null });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'refresh token required' });
  try {
    const decoded = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Account not found' });
    res.json(signTokens(rows[0]));
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// PATCH /api/auth/fcm-token — mobile app registers its FCM token after login
router.patch('/fcm-token', authenticate, async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) return res.status(400).json({ error: 'fcm_token required' });
  await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, req.user.id]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ user: rows[0] });
});

// ─── Superadmin-only staff provisioning ──────────────────────────────────────
const STAFF_ROLES = ['Dispatcher', 'Communications', 'Administrator'];

// GET /api/auth/staff — list BCC staff accounts (Superadmin / Administrator only)
router.get('/staff', authenticate, requireRole('Administrator'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, is_active, created_at
       FROM users
       WHERE role = ANY($1::user_role[])
       ORDER BY created_at DESC`,
      [STAFF_ROLES]
    );
    res.json({ staff: rows });
  } catch (err) {
    console.error('GET /auth/staff:', err.message);
    res.status(500).json({ error: 'Failed to load staff accounts' });
  }
});

// POST /api/auth/staff — create a BCC staff account (Superadmin / Administrator only)
router.post('/staff', authenticate, requireRole('Administrator'), async (req, res) => {
  const { first_name, last_name, email, phone, password, role = 'Dispatcher' } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'first_name, last_name, email, and password are required' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${STAFF_ROLES.join(', ')}` });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  try {
    const normalized = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rows.length) return res.status(409).json({ error: 'An account with that email/username already exists' });

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, first_name, last_name, email, phone, role, created_at`,
      [first_name.trim(), last_name.trim(), normalized, phone || null, password_hash, role]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('POST /auth/staff:', err.message);
    res.status(500).json({ error: 'Failed to create staff account' });
  }
});

module.exports = router;
