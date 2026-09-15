const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { broadcastNotification } = require('../services/fcm');

const router = express.Router();

// POST /api/notifications — Communications or Administrator sends a broadcast
router.post(
  '/',
  authenticate,
  requireRole('Communications', 'Administrator'),
  async (req, res) => {
    const { title, body, target_type = 'All', target_zone } = req.body;

    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    if (title.length > 100) return res.status(400).json({ error: 'title must be ≤ 100 characters' });
    if (body.length > 500)  return res.status(400).json({ error: 'body must be ≤ 500 characters' });
    if (!['All', 'Zone'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type must be All or Zone' });
    }
    if (target_type === 'Zone' && !target_zone) {
      return res.status(400).json({ error: 'target_zone GeoJSON polygon required when target_type is Zone' });
    }

    try {
      // Collect FCM tokens for the target audience
      let tokenRows;
      if (target_type === 'All') {
        ({ rows: tokenRows } = await pool.query(
          "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL AND is_active = true AND role = 'Resident'"
        ));
      } else {
        ({ rows: tokenRows } = await pool.query(
          `SELECT DISTINCT u.fcm_token
           FROM users u
           JOIN incidents i ON i.reporter_id = u.id
           WHERE u.fcm_token IS NOT NULL
             AND u.is_active = true
             AND ST_Within(i.location::geometry, ST_GeomFromGeoJSON($1))`,
          [JSON.stringify(target_zone)]
        ));
      }

      const fcmTokens = tokenRows.map(r => r.fcm_token);
      const zoneGeo = target_type === 'Zone' ? JSON.stringify(target_zone) : null;

      const { rows } = await pool.query(
        `INSERT INTO notifications (title, body, target_type, target_zone, sent_by, recipient_count)
         VALUES (
           $1, $2, $3,
           CASE WHEN $4::text IS NOT NULL THEN ST_GeomFromGeoJSON($4)::geography ELSE NULL END,
           $5, $6
         )
         RETURNING id, title, body, target_type, sent_at, recipient_count`,
        [title, body, target_type, zoneGeo, req.user.id, fcmTokens.length]
      );

      // Fire FCM broadcast asynchronously — don't block the response
      if (fcmTokens.length > 0) {
        broadcastNotification(fcmTokens, title, body).catch(console.error);
      }

      res.status(201).json({ notification: rows[0] });
    } catch (err) {
      console.error('POST /notifications:', err.message);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
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
