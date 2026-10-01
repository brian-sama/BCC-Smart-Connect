const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const OFFICIAL_CHANNEL_URL = process.env.WHATSAPP_OFFICIAL_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbA48WT1iUxQRxulvU41';
const CUSTOMER_SERVICE_PHONE = process.env.WHATSAPP_CUSTOMER_SERVICE_PHONE || '263784136505';
const METER_READINGS_PHONE = process.env.WHATSAPP_METER_READINGS_PHONE || '263713347319';

// Fallback seed data with official BCC contacts
const DEFAULT_CHANNELS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'City of Bulawayo Official WhatsApp Channel',
    category: 'Channel',
    ward: 'All Bulawayo Wards',
    description: 'Follow the official verified City of Bulawayo WhatsApp Channel for daily water shedding updates, civic notices, emergency alerts, and exchange rates.',
    invite_url: OFFICIAL_CHANNEL_URL,
    phone_number: null,
    is_official: true,
    member_count_approx: 'Official Channel',
    created_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'BCC Customer Service & Enquiries',
    category: 'Support',
    ward: 'All Bulawayo Wards',
    description: 'Main City of Bulawayo customer care line (0784 136 505) for public inquiries, fault reporting, service updates, and citizen feedback.',
    invite_url: `https://wa.me/${CUSTOMER_SERVICE_PHONE}?text=Hello%20City%20of%20Bulawayo%20Customer%20Care,%20I%20would%20like%20to%20make%20an%20enquiry.`,
    phone_number: '+263 78 413 6505',
    is_official: true,
    member_count_approx: 'Main Customer Line',
    created_at: new Date().toISOString()
  },
  {
    id: '22222222-3333-4444-5555-666666666666',
    name: 'BCC Monthly Water Meter Readings',
    category: 'MeterReading',
    ward: 'All Bulawayo Wards',
    description: 'Official WhatsApp number (0713 347 319) dedicated for Bulawayo residents to submit monthly water meter readings and billing photos.',
    invite_url: `https://wa.me/${METER_READINGS_PHONE}?text=Hello%20City%20of%20Bulawayo,%20I%20am%20submitting%20my%20monthly%20water%20meter%20reading.%0AAccount%20No:%20%0AAddress:%20%0AMeter%20Reading:%20`,
    phone_number: '+263 71 334 7319',
    is_official: true,
    member_count_approx: 'Water Readings Desk',
    created_at: new Date().toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ward 1 - Bulawayo Central & Suburbs',
    category: 'WardGroup',
    ward: 'Ward 1',
    description: 'Community communication group for CBD, Suburbs, Kumalo, and Ascot residents and business owners.',
    invite_url: 'https://chat.whatsapp.com/BCCWard01CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '1,020 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Ward 3 - Kumalo, Suburbs & Parklands',
    category: 'WardGroup',
    ward: 'Ward 3',
    description: 'Residents group for Ward 3 infrastructure tracking, road maintenance updates, and neighborhood watch.',
    invite_url: 'https://chat.whatsapp.com/BCCWard03CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '880 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Ward 4 - Bradfield, Hillside & Famona',
    category: 'WardGroup',
    ward: 'Ward 4',
    description: 'Community group for Bradfield, Hillside, Famona, Morningside, and Greenhill residents.',
    invite_url: 'https://chat.whatsapp.com/BCCWard04CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '1,250 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Ward 7 - Makokoba & Mzilikazi',
    category: 'WardGroup',
    ward: 'Ward 7',
    description: 'Official Ward 7 community updates, sewer repair schedules, and council clinic notices.',
    invite_url: 'https://chat.whatsapp.com/BCCWard07CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '950 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'Ward 14 - Luveve & Gwabalanda',
    category: 'WardGroup',
    ward: 'Ward 14',
    description: 'Civic group for Luveve and Gwabalanda residents coordinating water distribution and road maintenance.',
    invite_url: 'https://chat.whatsapp.com/BCCWard14CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '1,100 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    name: 'Ward 20 - Nkulumane 1 to 5',
    category: 'WardGroup',
    ward: 'Ward 20',
    description: 'Nkulumane community liaison group for service delivery, refuse collection schedules, and civic alerts.',
    invite_url: 'https://chat.whatsapp.com/BCCWard20CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '1,340 Members',
    created_at: new Date().toISOString()
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Ward 28 - Cowdray Park',
    category: 'WardGroup',
    ward: 'Ward 28',
    description: 'Cowdray Park municipal updates group for sewer works, road gravelling, and water kiosk schedules.',
    invite_url: 'https://chat.whatsapp.com/BCCWard28CommunityGroup',
    phone_number: null,
    is_official: true,
    member_count_approx: '1,800 Members',
    created_at: new Date().toISOString()
  }
];

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
        is_official         BOOLEAN NOT NULL DEFAULT true,
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
    let query = 'SELECT * FROM whatsapp_channels WHERE 1=1';
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
    if (rows.length === 0 && !category && !ward && !search) {
      return res.json(DEFAULT_CHANNELS);
    }
    res.json(rows.length > 0 ? rows : DEFAULT_CHANNELS);
  } catch (err) {
    console.warn('DB whatsapp_channels fetch fallback:', err.message);
    let filtered = [...DEFAULT_CHANNELS];
    if (category && category !== 'All') filtered = filtered.filter(c => c.category.toLowerCase() === category.toLowerCase());
    if (ward) filtered = filtered.filter(c => c.ward?.toLowerCase().includes(ward.toLowerCase()) || c.name.toLowerCase().includes(ward.toLowerCase()));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.ward?.toLowerCase().includes(q));
    }
    res.json(filtered);
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
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
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

// POST /api/whatsapp/format-broadcast — Generate formatted WhatsApp text and 1-click share URL
router.post('/format-broadcast', (req, res) => {
  const { title, body, target_ward, category, is_urgent } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const urgentTag = is_urgent ? '🚨 *CRITICAL ADVISORY*' : '📢 *PUBLIC NOTICE*';
  const scopeTag = target_ward && target_ward !== 'All Bulawayo Wards' ? `📍 *Area:* ${target_ward}` : '📍 *Area:* City of Bulawayo (All Wards)';
  const categoryTag = category ? `📂 *Category:* ${category}` : '📂 *Category:* Municipal Bulletin';
  const dateTag = `🕒 *Issued:* ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

  const formattedMessage = [
    `🏛️ *CITY OF BULAWAYO — SMARTCONNECT*`,
    urgentTag,
    `━━━━━━━━━━━━━━━━━━`,
    `📌 *${title.trim()}*`,
    scopeTag,
    categoryTag,
    dateTag,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `${body.trim()}`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📢 Follow Official Channel: ${OFFICIAL_CHANNEL_URL}`,
    `💬 Customer Care WhatsApp: https://wa.me/${CUSTOMER_SERVICE_PHONE}`,
    `💧 Submit Water Meter Readings: https://wa.me/${METER_READINGS_PHONE}`
  ].join('\n');

  const encoded = encodeURIComponent(formattedMessage);
  const shareUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  const webShareUrl = `https://web.whatsapp.com/send?text=${encoded}`;

  res.json({
    formattedMessage,
    shareUrl,
    webShareUrl
  });
});

// GET /api/whatsapp/support-link — Get pre-filled Helpdesk chat link
router.get('/support-link', (req, res) => {
  const { ref, type, address, purpose } = req.query;

  if (purpose === 'meter_reading') {
    const text = 'Hello City of Bulawayo,\n\nI am submitting my monthly water meter reading.\nAccount No: \nAddress: \nMeter Reading: ';
    return res.json({
      phoneNumber: '+263 71 334 7319',
      whatsappUrl: `https://wa.me/${METER_READINGS_PHONE}?text=${encodeURIComponent(text)}`,
      text
    });
  }

  let text = 'Hello City of Bulawayo Customer Care,\n\nI would like to make an enquiry regarding municipal services.';
  if (ref) {
    text = `Hello City of Bulawayo Customer Care,\n\nI am inquiring about Report Ref: *${ref}*\nType: *${type || 'Municipal Incident'}*\nLocation: *${address || 'Bulawayo'}*\n\nPlease provide an update on resolution status.`;
  }

  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${CUSTOMER_SERVICE_PHONE}?text=${encoded}`;

  res.json({
    phoneNumber: '+263 78 413 6505',
    whatsappUrl: url,
    text
  });
});

module.exports = router;
