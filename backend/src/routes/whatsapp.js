const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public channel records are exposed only after an authorized verification action.

// Ensure table exists if DB is connected
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_channels (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                VARCHAR(200) NOT NULL,
        category            VARCHAR(50) NOT NULL DEFAULT 'WardGroup',
        ward                VARCHAR(100),
        description         TEXT,
        invite_url          VARCHAR(500) NOT NULL,
        phone_number        VARCHAR(50),
        is_official         BOOLEAN NOT NULL DEFAULT false,
        member_count_approx VARCHAR(50) DEFAULT 'Active',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    // Ignore if offline
  }
}
ensureTable();

// GET /api/whatsapp/channels — List official channels, ward groups, and support helplines
router.get('/channels', async (req, res) => {
  const { category, ward, search } = req.query;

  try {
    let query = "SELECT * FROM whatsapp_channels WHERE is_official = true AND last_verified_at > NOW() - INTERVAL '180 days'";
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (ward) {
      params.push(`%${ward}%`);
      query += ` AND (ward ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length} OR ward ILIKE $${params.length})`;
    }

    query += ' ORDER BY is_official DESC, category ASC, name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET whatsapp_channels:', err.message);
    res.status(503).json({ error: 'Verified contact channels are temporarily unavailable' });
  }
});

// POST /api/whatsapp/channels — Add new channel (Dispatchers / Admins only)
router.post('/channels', authenticate, async (req, res) => {
  const { name, category, ward, description, invite_url, phone_number, member_count_approx } = req.body;

  if (!name || !invite_url) {
    return res.status(400).json({ error: 'name and invite_url are required' });
  }

  const VALID_ROLES = ['Dispatcher', 'Communications', 'Administrator'];
  if (!VALID_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO whatsapp_channels (name, category, ward, description, invite_url, phone_number, is_official, member_count_approx)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)
       RETURNING *`,
      [
        name.trim(),
        category || 'WardGroup',
        ward || 'All Bulawayo Wards',
        description || '',
        invite_url.trim(),
        phone_number || null,
        member_count_approx || 'Active'
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /whatsapp/channels error:', err.message);
    res.status(500).json({ error: 'Failed to create WhatsApp channel record' });
  }
});


router.patch('/channels/:id/verify', authenticate, async (req, res) => {
  if (req.user?.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only an administrator can verify a contact channel' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE whatsapp_channels SET last_verified_at = NOW(), verified_by = $1, is_official = true
       WHERE id = $2 RETURNING id, name, last_verified_at, verified_by`,
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Channel not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /whatsapp/channels/:id/verify:', err.message);
    res.status(500).json({ error: 'Could not verify contact channel' });
  }
});

// Format a message for manual sharing; this endpoint does not send or publish it.
router.post('/format-broadcast', (req, res) => {
  const { title, body, target_ward, category } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  const formattedMessage = [
    `BCC SmartConnect notice (manually shared; not an official dispatch)`,
    title.trim(),
    category || 'Municipal notice',
    target_ward || '',
    body.trim(),
  ].filter(Boolean).join(String.fromCharCode(10, 10));
  const encoded = encodeURIComponent(formattedMessage);
  res.json({
    formattedMessage,
    shareUrl: `https://api.whatsapp.com/send?text=${encoded}`,
    webShareUrl: `https://web.whatsapp.com/send?text=${encoded}`,
  });
});

// GET /api/whatsapp/support-link — Get pre-filled Helpdesk chat link
router.get('/support-link', (req, res) => {
  const { ref, type, address, purpose } = req.query;

  if (purpose === 'meter_reading' && !process.env.WHATSAPP_METER_READINGS_PHONE) {
    return res.status(503).json({ error: 'This contact channel is not configured' });
  }
  if (purpose !== 'meter_reading' && !process.env.WHATSAPP_CUSTOMER_SERVICE_PHONE) {
    return res.status(503).json({ error: 'This contact channel is not configured' });
  }
  if (purpose === 'meter_reading') {
    const text = 'Hello City of Bulawayo,\n\nI am submitting my monthly water meter reading.\nAccount No: \nAddress: \nMeter Reading: ';
    return res.json({
      phoneNumber: process.env.WHATSAPP_METER_READINGS_PHONE,
      whatsappUrl: `https://wa.me/${process.env.WHATSAPP_METER_READINGS_PHONE}?text=${encodeURIComponent(text)}`,
      text
    });
  }

  let text = 'Hello City of Bulawayo Customer Care,\n\nI would like to make an enquiry regarding municipal services.';
  if (ref) {
    text = `Hello City of Bulawayo Customer Care,\n\nI am inquiring about Report Ref: *${ref}*\nType: *${type || 'Municipal Incident'}*\nLocation: *${address || 'Bulawayo'}*\n\nPlease provide an update on resolution status.`;
  }

  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${process.env.WHATSAPP_CUSTOMER_SERVICE_PHONE}?text=${encoded}`;

  res.json({
    phoneNumber: process.env.WHATSAPP_CUSTOMER_SERVICE_PHONE,
    whatsappUrl: url,
    text
  });
});

module.exports = router;
