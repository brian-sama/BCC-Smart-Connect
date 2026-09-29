const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getIo } = require('../sockets/incidentSocket');
const { sendPushToToken } = require('../services/fcm');

const router = express.Router();

const VALID_TYPES    = ['Ambulance','Fire','Disaster','WaterLeak','SewerBurst','RoadDamage','StreetLight','Other'];
const VALID_STATUSES = ['New','Assigned','InProgress','Resolved','Closed'];

const STATUS_MESSAGES = {
  Assigned:   'Your report has been assigned to a BCC response team.',
  InProgress: 'A BCC team is now working on your reported incident.',
  Resolved:   'Your incident has been resolved. Thank you for helping keep Bulawayo safe.',
  Closed:     'Your report has been closed by BCC.',
};

// Multer storage setup for fault evidence photos
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are supported.'));
    }
  },
});

function generateReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BCC-${stamp}-${rand}`;
}

// ─── POST /api/incidents — anonymous OR authenticated submission ──────────────
router.post('/', optionalAuth, async (req, res) => {
  const { incident_type, lat, lng, description, address, phone, fcm_token } = req.body;

  if (!incident_type || lat == null || lng == null) {
    return res.status(400).json({ error: 'incident_type, lat, and lng are required' });
  }
  if (!VALID_TYPES.includes(incident_type)) {
    return res.status(400).json({ error: `incident_type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  try {
    const reference_number = generateReference();

    // Update reporter's FCM token if they're authenticated
    if (req.user?.id && fcm_token) {
      pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, req.user.id]).catch(() => {});
    }

    const { rows } = await pool.query(
      `INSERT INTO incidents
         (reference_number, reporter_id, reporter_name, reporter_phone,
          incident_type, description, address, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        reference_number,
        req.user?.id ?? null,
        req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || null : null,
        phone || null,
        incident_type,
        description || '',
        address || null,
        numLat,
        numLng,
      ]
    );

    const incident = rows[0];

    // Log initial timeline entry
    try {
      await pool.query(
        `INSERT INTO incident_timeline (incident_id, actor_name, actor_role, status, notes)
         VALUES ($1, $2, $3, 'New', 'Report filed by citizen.')`,
        [
          incident.id,
          req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Citizen' : (phone ? `Citizen (${phone})` : 'Anonymous Citizen'),
          req.user?.role ?? 'Resident',
        ]
      );
    } catch (_) {
      // Timeline insert failure is non-fatal
    }

    const io = getIo();
    if (io) io.to('admin').emit('incident:new', incident);

    res.status(201).json({ incident });
  } catch (err) {
    console.error('POST /incidents:', err.message);
    res.status(500).json({ error: 'Failed to submit incident' });
  }
});

// ─── GET /api/incidents — paginated list (open to Dispatcher+ but also supports no auth with fallback) ──
router.get('/', optionalAuth, async (req, res) => {
  const { status, type, page = 1, limit = 50, emergency } = req.query;
  const filters = [];
  const params  = [];

  if (status)    { params.push(status);     filters.push(`i.status = $${params.length}`); }
  if (type)      { params.push(type);       filters.push(`i.incident_type = $${params.length}`); }
  if (emergency) { params.push(true);       filters.push(`i.is_emergency = $${params.length}`); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.reference_number, i.incident_type, i.status,
              i.description, i.address, i.is_emergency, i.created_at, i.updated_at,
              i.lat, i.lng, i.department, i.assigned_to_name,
              i.reporter_name, i.reporter_phone, i.resolution_notes, i.resolved_at, i.photo_url
       FROM incidents i
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /incidents:', err.message);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// ─── GET /api/incidents/track/:reference — PUBLIC, no auth ───────────────────
router.get('/track/:reference', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, reference_number, incident_type, status, description, address,
              lat, lng, is_emergency, created_at, updated_at, resolved_at,
              resolution_notes, department, assigned_to_name, photo_url
       FROM incidents
       WHERE reference_number = $1`,
      [req.params.reference.toUpperCase()]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No incident found with that reference number.' });
    }

    const incident = rows[0];

    // Fetch timeline
    try {
      const timelineResult = await pool.query(
        `SELECT id, actor_name, actor_role, status, notes, created_at
         FROM incident_timeline
         WHERE incident_id = $1
         ORDER BY created_at ASC`,
        [incident.id]
      );
      incident.timeline = timelineResult.rows;
    } catch (_) {
      incident.timeline = [];
    }

    res.json({ incident });
  } catch (err) {
    console.error('GET /incidents/track/:reference:', err.message);
    res.status(500).json({ error: 'Failed to look up incident' });
  }
});

// ─── GET /api/incidents/my — reporter's own submissions ─────────────────────
router.get('/my', optionalAuth, async (req, res) => {
  if (!req.user || req.user.is_guest) return res.json({ incidents: [] });
  try {
    const { rows } = await pool.query(
      `SELECT id, reference_number, incident_type, status, description, address,
              lat, lng, is_emergency, created_at, updated_at, resolved_at,
              resolution_notes, department, assigned_to_name, photo_url
       FROM incidents WHERE reporter_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ incidents: rows });
  } catch (err) {
    console.error('GET /incidents/my:', err.message);
    res.status(500).json({ error: 'Failed to fetch your incidents' });
  }
});

// ─── GET /api/incidents/:id — full incident detail (authenticated) ───────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, reference_number, incident_type, status, description, address,
              lat, lng, is_emergency, created_at, updated_at, resolved_at,
              resolution_notes, department, assigned_to_name, reporter_name,
              reporter_phone, photo_url
       FROM incidents
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Incident not found' });

    const incident = rows[0];

    // Fetch timeline
    try {
      const timelineResult = await pool.query(
        `SELECT id, actor_name, actor_role, status, notes, created_at
         FROM incident_timeline
         WHERE incident_id = $1
         ORDER BY created_at ASC`,
        [req.params.id]
      );
      incident.timeline = timelineResult.rows;
    } catch (_) {
      incident.timeline = [];
    }

    res.json({ incident });
  } catch (err) {
    console.error('GET /incidents/:id:', err.message);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// ─── PATCH /api/incidents/:id — update status, notes, assignment ─────────────
router.patch(
  '/:id',
  authenticate,
  requireRole('Dispatcher', 'Communications', 'Administrator'),
  async (req, res) => {
    const { status, resolution_notes, assigned_to_name, department } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
      const fields = ['updated_at = NOW()'];
      const values = [];
      let idx = 1;

      if (status) {
        fields.push(`status = $${idx++}`);
        values.push(status);
        if (status === 'Resolved') {
          fields.push(`resolved_at = NOW()`);
        }
      }
      if (resolution_notes !== undefined) {
        fields.push(`resolution_notes = $${idx++}`);
        values.push(resolution_notes);
      }
      if (assigned_to_name !== undefined) {
        fields.push(`assigned_to_name = $${idx++}`);
        values.push(assigned_to_name);
      }
      if (department !== undefined) {
        fields.push(`department = $${idx++}`);
        values.push(department);
      }

      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE incidents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Incident not found' });

      const incident = rows[0];

      // Log timeline
      if (status || resolution_notes) {
        try {
          await pool.query(
            `INSERT INTO incident_timeline (incident_id, actor_name, actor_role, status, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              req.params.id,
              `${req.user.first_name || 'Dispatcher'} ${req.user.last_name || ''}`.trim(),
              req.user.role,
              status || 'Updated',
              resolution_notes || `Status updated to ${status || 'modified'}.`,
            ]
          );
        } catch (_) {}
      }

      // Broadcast update to all connected admin clients
      const io = getIo();
      if (io) io.to('admin').emit('incident:update', incident);

      // Push notification to reporter
      if (status) {
        const msg = STATUS_MESSAGES[status];
        if (msg) {
          // Look up reporter's FCM token
          try {
            const reporterResult = await pool.query(
              'SELECT fcm_token FROM users WHERE id = $1',
              [incident.reporter_id]
            );
            const fcmToken = reporterResult.rows[0]?.fcm_token;
            if (fcmToken) {
              sendPushToToken(
                fcmToken,
                'BCC SmartConnect Update',
                msg,
                { reference: incident.reference_number, status }
              ).catch(console.error);
            }
          } catch (_) {}
        }
      }

      res.json(incident);
    } catch (err) {
      console.error('PATCH /incidents/:id:', err.message);
      res.status(500).json({ error: 'Failed to update incident' });
    }
  }
);

// ─── POST /api/incidents/:id/media — upload photo evidence ───────────────────
router.post('/:id/media', optionalAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No media file provided.' });
  }

  const incidentId = req.params.id;
  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    // Update photo_url on incident (store last uploaded photo URL directly)
    await pool.query(
      'UPDATE incidents SET photo_url = $1, updated_at = NOW() WHERE id = $2',
      [fileUrl, incidentId]
    );
    res.status(201).json({ url: fileUrl });
  } catch (err) {
    console.error('POST /incidents/:id/media:', err.message);
    res.status(500).json({ error: 'Failed to save media attachment.' });
  }
});

module.exports = router;
