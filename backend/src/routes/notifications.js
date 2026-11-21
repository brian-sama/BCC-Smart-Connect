const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// POST /api/notifications — Communications or Administrator sends a broadcast
router.post(
  '/',
  authenticate,
  requireRole('Communications', 'Administrator'),
  (_req, res) => res.status(503).json({
    error: 'Notification delivery is disabled until device registration, provider receipts, and retry tracking are configured.',
  })
);

// GET /api/notifications — list of sent notifications
router.get(
  '/',
  authenticate,
  requireRole('Communications', 'Administrator'),
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT
           n.id, n.title, n.body, n.target_type, n.sent_at, n.recipient_count,
           u.first_name || ' ' || u.last_name AS sent_by_name
         FROM notifications n
         LEFT JOIN users u ON u.id = n.sent_by
         ORDER BY n.sent_at DESC
         LIMIT 100`
      );
      res.json({ notifications: rows });
    } catch (err) {
      console.error('GET /notifications:', err.message);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }
);

module.exports = router;
