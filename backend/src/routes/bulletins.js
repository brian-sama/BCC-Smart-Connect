const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getIo } = require('../sockets/incidentSocket');

const router = express.Router();

// Fallback seed bulletins in case database table is empty
const DEFAULT_BULLETINS = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    title: 'Criterion Water Treatment Plant Maintenance',
    body: 'Scheduled 48-hour citywide water rationing shutdown to carry out critical valve repairs at Criterion Waterworks. Eastern and Western high-density suburbs are advised to store drinking water.',
    category: 'Water Cut',
    target_ward: 'All Bulawayo Wards',
    is_urgent: true,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    title: 'Emergency Road Resurfacing — Luveve Road Corridor',
    body: 'BCC Roads Department has commenced urgent pothole patching and asphalt overlay along Luveve Road between Old Khami Rd and Renkini Bus Terminus. Expect traffic diversions.',
    category: 'Roads',
    target_ward: 'Ward 14',
    is_urgent: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    title: 'Cholera & Waterborne Disease Prevention Guidelines',
    body: 'City Health Department urges all residents to boil municipal water for drinking or use WaterGuard tablets available free at all Bulawayo municipal polyclinics.',
    category: 'Health',
    target_ward: 'All Bulawayo Wards',
    is_urgent: true,
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    title: 'Ward 28 Community Clean-Up & Storm Drain Clearing Campaign',
    body: 'Cowdray Park Residents Association in partnership with BCC Health Inspectorate will conduct a community drainage clearing exercise this Saturday starting at 08:00 AM.',
    category: 'Notice',
    target_ward: 'Ward 28',
    is_urgent: false,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// GET /api/bulletins — public read with optional filtering
router.get('/', async (req, res) => {
  const { ward, category, search, urgent } = req.query;
  try {
    const filters = [];
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

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM bulletins ${where} ORDER BY is_urgent DESC, created_at DESC LIMIT 50`,
      params
    );

    if (!rows.length && !filters.length) {
      return res.json(DEFAULT_BULLETINS);
    }

    res.json(rows.length ? rows : DEFAULT_BULLETINS);
  } catch (err) {
    console.error('GET bulletins:', err.message);
    res.json(DEFAULT_BULLETINS);
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
        'SELECT * FROM bulletins ORDER BY created_at DESC LIMIT 30'
      );
      const bList = bulletins.length ? bulletins : DEFAULT_BULLETINS;

      for (const b of bList) {
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
    } catch (_) {
      for (const b of DEFAULT_BULLETINS) {
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
    }

    // 2. Fetch Notifications Broadcasts
    try {
      const { rows: notifs } = await pool.query(
        'SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 20'
      );
      for (const n of notifs) {
        feedItems.push({
          id: n.id,
          source_type: 'broadcast',
          source_name: 'BCC Civic Broadcast',
          source_badge: 'Public Broadcast',
          title: n.title,
          body: n.body,
          category: 'Alert',
          target_ward: n.target_type === 'Zone' ? 'Targeted Zone' : 'All Bulawayo Wards',
          is_urgent: true,
          created_at: n.sent_at,
          action_url: null,
          action_label: null,
        });
      }
    } catch (_) {}

    // 3. Fetch Verified WhatsApp Channels / Highlights
    try {
      const { rows: channels } = await pool.query(
        'SELECT * FROM whatsapp_channels ORDER BY is_official DESC LIMIT 15'
      );
      for (const c of channels) {
        const isChannel = c.category === 'Channel';
        const isWard = c.category === 'WardGroup';
        feedItems.push({
          id: c.id,
          source_type: isChannel ? 'channel' : (isWard ? 'ward' : 'support'),
          source_name: c.name,
          source_badge: isChannel ? 'Official WhatsApp Channel' : (isWard ? 'Ward Community Group' : 'BCC Help Desk'),
          title: c.name,
          body: c.description || 'Join for real-time civic alerts, neighborhood updates, and direct BCC support.',
          category: isChannel ? 'Channel' : (isWard ? 'Ward' : 'Support'),
          target_ward: c.ward || 'All Bulawayo Wards',
          is_urgent: false,
          created_at: c.created_at || new Date().toISOString(),
          action_url: c.invite_url || (c.phone_number ? `https://wa.me/${c.phone_number.replace(/[^0-9]/g, '')}` : null),
          action_label: isChannel ? 'Follow Channel' : (isWard ? 'Join Ward Group' : 'Contact on WhatsApp'),
        });
      }
    } catch (_) {}

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

    // Broadcast via Socket.io to all connected admin and mobile clients
    const io = getIo();
    if (io) {
      io.to('admin').emit('bulletin:new', bulletin);
      io.emit('bulletin:broadcast', bulletin);
    }

    res.status(201).json(bulletin);
  } catch (err) {
    console.error('POST bulletins:', err.message);
    res.status(500).json({ error: 'Failed to create bulletin' });
  }
});

// POST /api/bulletins/sync — Ingest latest notices and water updates from citybyo.co.zw
router.post('/sync', async (_req, res) => {
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
