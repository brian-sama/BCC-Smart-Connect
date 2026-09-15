const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getIo } = require('../sockets/incidentSocket');

const router = express.Router();

const VALID_STATUSES = ['Available', 'On Site', 'Dispatched', 'Off Duty'];

// GET /api/teams — public read (for admin portal and mobile)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM field_teams ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET teams:', err.message);
    res.status(500).json({ error: 'Failed to fetch field teams' });
  }
});

// PATCH /api/teams/:id — update team status/assignment (authenticated dispatchers only)
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, active_ticket } = req.body;

  const VALID_ROLES = ['Dispatcher', 'Communications', 'Administrator'];
  if (!VALID_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Only dispatchers can update field teams' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (active_ticket !== undefined) {
      fields.push(`active_ticket = $${idx++}`);
      values.push(active_ticket || null);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE field_teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Field team not found' });
    }

    const team = rows[0];

    // Broadcast team update via Socket.io
    const io = getIo();
    if (io) {
      io.to('admin').emit('team:update', team);
    }

    res.json(team);
  } catch (err) {
    console.error('PATCH teams/:id:', err.message);
    res.status(500).json({ error: 'Failed to update field team' });
  }
});

module.exports = router;
