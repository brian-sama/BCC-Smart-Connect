const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getIo } = require('../sockets/incidentSocket');

const router = express.Router();

// GET /api/bulletins — public read
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM bulletins ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET bulletins:', err.message);
    res.status(500).json({ error: 'Failed to fetch bulletins' });
  }
});

// POST /api/bulletins — authenticated dispatchers only
router.post('/', authenticate, async (req, res) => {
  const { title, body, category, target_ward, is_urgent } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const VALID_ROLES = ['Dispatcher', 'Communications', 'Administrator'];
  if (!VALID_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Only dispatchers can create bulletins' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO bulletins (title, body, category, target_ward, is_urgent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        title.trim(),
        body.trim(),
        category || 'Notice',
        target_ward || 'All Bulawayo Wards',
        is_urgent === true || is_urgent === 'true',
      ]
    );

    const bulletin = rows[0];

    // Broadcast via Socket.io to all connected admin clients
    const io = getIo();
    if (io) {
      io.to('admin').emit('bulletin:new', bulletin);
    }

    res.status(201).json(bulletin);
  } catch (err) {
    console.error('POST bulletins:', err.message);
    res.status(500).json({ error: 'Failed to create bulletin' });
  }
});

module.exports = router;
