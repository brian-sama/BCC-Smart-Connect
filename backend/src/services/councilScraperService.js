const pool = require('../config/db');

const COUNCIL_BASE_URL = 'https://citybyo.co.zw';
const NEWS_URL = `${COUNCIL_BASE_URL}/Community/NewsAndNotices`;
const WATER_URL = `${COUNCIL_BASE_URL}/Services/WaterSituationUpdate`;

/**
 * Parses anchor tags and text from raw HTML using regex without external dependencies
 */
function extractLinks(html) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    let text = match[2].replace(/<[^>]*>?/gm, '').trim();

    if (rawHref.includes('/Notices/') || rawHref.includes('/Community/')) {
      if (text.length > 3 && !text.includes('Action') && !text.includes('Something else')) {
        const fullUrl = rawHref.startsWith('http') ? rawHref : `${COUNCIL_BASE_URL}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
        links.push({ title: text, url: fullUrl });
      }
    }
  }

  return links;
}

/**
 * Determine bulletin category from headline keywords
 */
function categorizeHeadline(title) {
  const t = title.toLowerCase();
  if (t.includes('water') || t.includes('shedding') || t.includes('dam') || t.includes('reservoir') || t.includes('inflow')) {
    return 'Water Cut';
  }
  if (t.includes('road') || t.includes('traffic') || t.includes('pothole') || t.includes('closure')) {
    return 'Roads';
  }
  if (t.includes('health') || t.includes('cholera') || t.includes('clinic') || t.includes('disease')) {
    return 'Health';
  }
  return 'Notice';
}

/**
 * Determine urgency from headline keywords
 */
function isUrgentHeadline(title) {
  const t = title.toLowerCase();
  return (
    t.includes('urgent') ||
    t.includes('emergency') ||
    t.includes('shutdown') ||
    t.includes('cholera') ||
    t.includes('immediate') ||
    t.includes('rationing')
  );
}

/**
 * Ingest live news, notices and water situation updates from citybyo.co.zw
 */
async function syncCouncilBulletins() {
  const syncedItems = [];
  try {
    const urls = [NEWS_URL, WATER_URL];
    const extracted = [];

    for (const targetUrl of urls) {
      try {
        const res = await fetch(targetUrl, {
          headers: { 'User-Agent': 'BCC-SmartConnect-Sync/1.0 (+https://citybyo.co.zw)' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const html = await res.text();
          const items = extractLinks(html);
          extracted.push(...items);
        }
      } catch (fetchErr) {
        console.warn(`Could not reach ${targetUrl}:`, fetchErr.message);
      }
    }

    // Deduplicate within the fetched batch
    const unique = [];
    const seen = new Set();
    for (const item of extracted) {
      if (!seen.has(item.title.toLowerCase())) {
        seen.add(item.title.toLowerCase());
        unique.push(item);
      }
    }

    for (const item of unique) {
      const category = categorizeHeadline(item.title);
      const isUrgent = isUrgentHeadline(item.title);
      const body = `Official publication from the City of Bulawayo municipal portal. View the complete council document and circular details at: ${item.url}`;

      try {
        // Check if existing
        const existing = await pool.query('SELECT id FROM bulletins WHERE LOWER(title) = $1', [item.title.toLowerCase()]);
        if (existing.rows.length === 0) {
          const { rows } = await pool.query(
            `INSERT INTO bulletins (title, body, category, target_ward, is_urgent)
             VALUES ($1, $2, $3, 'All Bulawayo Wards', $4)
             RETURNING *`,
            [item.title, body, category, isUrgent]
          );
          if (rows.length) {
            syncedItems.push(rows[0]);
          }
        }
      } catch (dbErr) {
        // Continue with remaining items
      }
    }

    if (syncedItems.length > 0) {
      console.log(`✓ Council Sync: Ingested ${syncedItems.length} new bulletins from citybyo.co.zw`);
    }
  } catch (err) {
    console.error('syncCouncilBulletins error:', err.message);
  }

  return syncedItems;
}

module.exports = {
  syncCouncilBulletins,
};
