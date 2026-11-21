const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getIo } = require('../sockets/incidentSocket');

const router = express.Router();

// GET /api/bulletins — public read with optional filtering
router.get('/', async (req, res) => {
  const { ward, category, search, urgent } = req.query;
  try {
    const filters = ["status = 'published'", 'is_demo = false', '(starts_at IS NULL OR starts_at <= NOW())', '(expires_at IS NULL OR expires_at > NOW())'];
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      filters.push(`category = $${params.length}`);
    }

    if (ward && ward !== 'All' && ward !== 'All Bulawayo Wards') {
      params.push(ward);
      filters.push(`(target_ward = $${params.length} OR target_ward = 'All Bulawayo Wards' OR target_ward IS NULL)`);
    }

    if (urgent === 'true') {
      params.push(true);
      filters.push(`is_urgent = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      filters.push(`(LOWER(title) LIKE $${params.length} OR LOWER(body) LIKE $${params.length})`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM bulletins WHERE ${filters.join(' AND ')} ORDER BY is_urgent DESC, created_at DESC LIMIT 50`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('GET bulletins:', err.message);
    res.status(503).json({ error: 'Bulletins are temporarily unavailable' });
  }
});

// GET /api/bulletins/feed — Unified feed aggregating Council Bulletins, Push Broadcasts & WhatsApp Channels
router.get('/feed', async (req, res) => {
  const { ward, category, search } = req.query;

  try {
    const feedItems = [];

    // 1. Fetch Bulletins
    try {
      const { rows: bulletins } = await pool.query(
        `SELECT * FROM bulletins WHERE status = 'published' AND is_demo = false
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC LIMIT 30`
      );
      for (const b of bulletins) {
        feedItems.push({
          id: b.id,
          source_type: 'council',
          source_name: 'City of Bulawayo Council',
          source_badge: 'Official Council',
          title: b.title,
          body: b.body,
          category: b.category || 'Notice',
          target_ward: b.target_ward || 'All Bulawayo Wards',
          is_urgent: b.is_urgent === true,
          created_at: b.created_at,
          action_url: null,
          action_label: null,
        });
      }
    } catch (err) {
      console.error('GET bulletin feed:', err.message);
      return res.status(503).json({ error: 'Bulletins are temporarily unavailable' });
    }

    // Apply filtering
    let filtered = feedItems;

    if (category && category !== 'All') {
      filtered = filtered.filter(item =>
        item.category.toLowerCase() === category.toLowerCase() ||
        (category === 'Council' && item.source_type === 'council') ||
        (category === 'Channels' && (item.source_type === 'channel' || item.source_type === 'broadcast')) ||
        (category === 'Ward' && item.source_type === 'ward')
      );
    }

    if (ward && ward !== 'All' && ward !== 'All Bulawayo Wards') {
      filtered = filtered.filter(item =>
        item.target_ward === ward || item.target_ward === 'All Bulawayo Wards' || !item.target_ward
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.source_name.toLowerCase().includes(q)
      );
    }

    // Sort: Urgent first, then newest timestamp
    filtered.sort((a, b) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json({ feed: filtered });
  } catch (err) {
    console.error('GET /bulletins/feed:', err.message);
    res.status(500).json({ error: 'Failed to fetch bulletin feed' });
  }
});

// POST /api/bulletins — authenticated dispatchers only
router.post('/', authenticate, async (req, res) => {
  const { title, body, category, target_ward, is_urgent, source_name, source_url, starts_at, expires_at } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const VALID_ROLES = ['Dispatcher', 'Communications', 'Administrator'];
  if (!VALID_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Only dispatchers can create bulletins' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO bulletins (title, body, category, target_ward, is_urgent, status, source_name, source_url, starts_at, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title.trim(),
        body.trim(),
        category || 'Notice',
        target_ward || 'All Bulawayo Wards',
        is_urgent === true || is_urgent === 'true',
        source_name || 'BCC staff submission',
        source_url || null,
        starts_at || null,
        expires_at || null,
        req.user.id,
      ]
    );

    const bulletin = rows[0];

    // Broadcast via Socket.io to all connected admin and mobile clients
    const io = getIo();
    if (io) {
      io.to('admin').emit('bulletin:draft', bulletin);
    }

    res.status(201).json(bulletin);
  } catch (err) {
    console.error('POST bulletins:', err.message);
    res.status(500).json({ error: 'Failed to create bulletin' });
  }
});

router.post('/:id/publish', authenticate, async (req, res) => {
  if (!['Communications', 'Administrator'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Only communications staff can publish notices' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE bulletins SET status = 'published', approved_by = $1,
         published_by = $1, published_at = NOW()
       WHERE id = $2 AND created_by IS NOT NULL AND created_by <> $1
         AND status IN ('draft', 'review') AND is_demo = false
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Draft notice not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /bulletins/:id/publish:', err.message);
    res.status(500).json({ error: 'Failed to publish notice' });
  }
});

// Scraped content enters the staff review process and is never published automatically.
router.post('/sync', authenticate, async (_req, res) => {
  if (!['Communications', 'Administrator'].includes(_req.user?.role)) {
    return res.status(403).json({ error: 'Only communications staff can import notice drafts' });
  }
  try {
    const { syncCouncilBulletins } = require('../services/councilScraperService');
    const synced = await syncCouncilBulletins();
    res.json({ message: 'Council sync completed successfully', count: synced.length, items: synced });
  } catch (err) {
    console.error('POST /bulletins/sync:', err.message);
    res.status(500).json({ error: 'Failed to sync council notices' });
  }
});

module.exports = router;
