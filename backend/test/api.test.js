/**
 * BCC SmartConnect — automated test suite (unit, integration, system, security)
 *
 * Runs the real Express API as a child process against a throw-away
 * PostgreSQL + PostGIS database, then exercises it over HTTP and Socket.io.
 *
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/bcc_test \
 *   TEST_SCHEMA=readme   # or "neon" (supabase/schema.sql, as deployed)
 *   npm test
 *
 * WARNING: the target database is wiped (DROP SCHEMA public CASCADE).
 * Never point TEST_DATABASE_URL at a real database.
 *
 * Every test prints a TRACE line (id, result, timing) that Chapter 4 of the
 * project report is built from.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { io: ioClient } = require('socket.io-client');

const ROOT = path.join(__dirname, '..');
const DB_URL = process.env.TEST_DATABASE_URL;
const SCHEMA = process.env.TEST_SCHEMA || 'readme';
const PORT = Number(process.env.TEST_PORT || 3999);
const BASE = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = 'test_secret_for_local_runs_only_123456';
const JWT_REFRESH_SECRET = 'test_refresh_secret_for_local_runs_987';

if (!DB_URL) {
  console.error('Set TEST_DATABASE_URL to a disposable PostgreSQL+PostGIS database.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL });
let server;
const timings = [];

function trace(id, detail) {
  console.log(`TRACE ${id} | ${detail}`);
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const files = SCHEMA === 'neon'
    ? [path.join(ROOT, '../supabase/schema.sql')]
    : [path.join(ROOT, 'sql/schema.sql')];
  const migDir = path.join(ROOT, 'sql/migrations');
  for (const f of fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    files.push(path.join(migDir, f));
  }
  for (const f of files) {
    await pool.query(fs.readFileSync(f, 'utf8'));
  }
  // Start from an empty incident table so counts are deterministic
  await pool.query('TRUNCATE incidents CASCADE');
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['src/app.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        DATABASE_URL: DB_URL,
        JWT_SECRET,
        JWT_REFRESH_SECRET,
        NODE_ENV: 'test',
        ALLOWED_ORIGINS: 'http://localhost:5173',
        FIREBASE_SERVICE_ACCOUNT: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => reject(new Error('API did not start')), 15000);
    server.stdout.on('data', (d) => {
      if (String(d).includes('running on port')) { clearTimeout(timer); resolve(); }
    });
    server.stderr.on('data', (d) => process.stderr.write(`[api] ${d}`));
  });
}

async function http(method, url, { body, token, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !raw) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const t0 = performance.now();
  const res = await fetch(`${BASE}${url}`, { method, headers: h, body: payload });
  const ms = performance.now() - t0;
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json, ms };
}

async function registerUser(email, role = 'Resident') {
  const r = await http('POST', '/api/auth/register', {
    body: { first_name: 'Test', last_name: role, email, password: 'Password123', phone: '0772000000' },
  });
  assert.equal(r.status, 201, `register ${email}: ${JSON.stringify(r.json)}`);
  if (role !== 'Resident') {
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
  }
  const login = await http('POST', '/api/auth/login', { body: { email, password: 'Password123' } });
  assert.equal(login.status, 200);
  return { token: login.json.access, id: login.json.user.id };
}

function jpegOfSize(bytes) {
  const buf = Buffer.alloc(bytes, 0);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; // JPEG magic number
  return buf;
}

async function uploadPhoto(incidentId, buf, type = 'image/jpeg', name = 'evidence.jpg', token) {
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), name);
  return http('POST', `/api/incidents/${incidentId}/media`, { body: form, raw: true, token });
}

const incidentAt = (type, lat, lng, extra = {}) =>
  http('POST', '/api/incidents', { body: { incident_type: type, lat, lng, description: `${type} test`, address: 'Test address', ...extra } });

let dispatcher, comms, admin, resident;

test.before(async () => {
  await resetDatabase();
  await startServer();
  dispatcher = await registerUser('dispatcher@test.bcc', 'Dispatcher');
  comms = await registerUser('comms@test.bcc', 'Communications');
  admin = await registerUser('admin@test.bcc', 'Administrator');
  resident = await registerUser('resident@test.bcc', 'Resident');
});

test.after(async () => {
  if (server) server.kill();
  await pool.end();
  if (timings.length) {
    const sorted = [...timings].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
    trace('PERF', `submissions=${sorted.length} avg_ms=${avg.toFixed(1)} p95_ms=${p95.toFixed(1)} max_ms=${sorted[sorted.length - 1].toFixed(1)}`);
  }
});

// ═════════════════════════ UNIT TESTS (middleware in isolation) ══════════════
test.describe('Unit: authentication and RBAC middleware', () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const { authenticate, optionalAuth } = require('../src/middleware/auth');
  const { requireRole } = require('../src/middleware/rbac');

  function mockRes() {
    return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  }

  test('UT01 valid token attaches user to request', () => {
    const token = jwt.sign({ id: 'u1', role: 'Dispatcher' }, JWT_SECRET, { expiresIn: '15m' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let called = false;
    authenticate(req, mockRes(), () => { called = true; });
    assert.ok(called);
    assert.equal(req.user.role, 'Dispatcher');
    trace('UT01', 'PASS next() called, req.user.role=Dispatcher');
  });

  test('UT02 missing Authorization header is rejected with 401', () => {
    const res = mockRes();
    authenticate({ headers: {} }, res, () => assert.fail('next should not run'));
    assert.equal(res.code, 401);
    trace('UT02', `PASS status=${res.code}`);
  });

  test('UT03 expired token is rejected with 401', () => {
    const token = jwt.sign({ id: 'u1', role: 'Resident', exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET);
    const res = mockRes();
    authenticate({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('next should not run'));
    assert.equal(res.code, 401);
    trace('UT03', `PASS status=${res.code} error="${res.body.error}"`);
  });

  test('UT04 token signed with a different secret is rejected', () => {
    const token = jwt.sign({ id: 'u1', role: 'Administrator' }, 'attacker-secret');
    const res = mockRes();
    authenticate({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('next should not run'));
    assert.equal(res.code, 401);
    trace('UT04', `PASS status=${res.code}`);
  });

  test('UT05 requireRole lets a permitted role through', () => {
    let called = false;
    requireRole('Dispatcher', 'Administrator')({ user: { role: 'Dispatcher' } }, mockRes(), () => { called = true; });
    assert.ok(called);
    trace('UT05', 'PASS Dispatcher allowed');
  });

  test('UT06 requireRole blocks a Resident with 403', () => {
    const res = mockRes();
    requireRole('Dispatcher', 'Administrator')({ user: { role: 'Resident' } }, res, () => assert.fail('next should not run'));
    assert.equal(res.code, 403);
    trace('UT06', `PASS status=${res.code}`);
  });

  test('UT07 optionalAuth lets anonymous requests through without a user', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    let called = false;
    optionalAuth(req, mockRes(), () => { called = true; });
    assert.ok(called);
    assert.equal(req.user, undefined);
    trace('UT07', 'PASS anonymous request continues, req.user undefined');
  });
});

// ═════════════════════════ SYSTEM TESTS: accounts ════════════════════════════
test.describe('System: registration and login', () => {
  test('ST01 register with valid details returns 201 and tokens', async () => {
    const r = await http('POST', '/api/auth/register', {
      body: { first_name: 'John', last_name: 'Moyo', email: 'john.moyo@test.bcc', phone: '0772123456', password: 'Test@1234' },
    });
    assert.equal(r.status, 201);
    assert.ok(r.json.access && r.json.refresh);
    assert.equal(r.json.user.role, 'Resident');
    const hash = (await pool.query('SELECT password_hash FROM users WHERE email=$1', ['john.moyo@test.bcc'])).rows[0].password_hash;
    assert.match(hash, /^\$2[aby]\$12\$/); // bcrypt, cost factor 12 (NFR03)
    trace('ST01', `PASS status=201 role=Resident bcrypt_cost=12 ms=${r.ms.toFixed(1)}`);
  });

  test('ST02 duplicate email is rejected with 409', async () => {
    const r = await http('POST', '/api/auth/register', {
      body: { first_name: 'John', last_name: 'Moyo', email: 'JOHN.MOYO@test.bcc', password: 'Test@1234' },
    });
    assert.equal(r.status, 409);
    trace('ST02', `PASS status=409 error="${r.json.error}" (email match is case-insensitive)`);
  });

  test('ST03 password boundary: 7 characters rejected, 8 accepted', async () => {
    const short = await http('POST', '/api/auth/register', {
      body: { first_name: 'A', last_name: 'B', email: 'short@test.bcc', password: '1234567' },
    });
    const ok = await http('POST', '/api/auth/register', {
      body: { first_name: 'A', last_name: 'B', email: 'eight@test.bcc', password: '12345678' },
    });
    assert.equal(short.status, 400);
    assert.equal(ok.status, 201);
    trace('ST03', `PASS 7 chars -> ${short.status}, 8 chars -> ${ok.status}`);
  });

  test('ST04 staff login: wrong password 401, correct password 200', async () => {
    const bad = await http('POST', '/api/auth/login', { body: { email: 'dispatcher@test.bcc', password: 'wrong-pass' } });
    const good = await http('POST', '/api/auth/login', { body: { email: 'dispatcher@test.bcc', password: 'Password123' } });
    assert.equal(bad.status, 401);
    assert.equal(good.status, 200);
    assert.equal(good.json.user.role, 'Dispatcher');
    assert.equal(good.json.user.password_hash, undefined);
    trace('ST04', `PASS wrong=${bad.status} correct=${good.status} hash_not_returned=true`);
  });

  test('ST05 guest session can track but sees no personal history', async () => {
    const g = await http('POST', '/api/auth/guest');
    assert.equal(g.status, 200);
    const mine = await http('GET', '/api/incidents/my', { token: g.json.access });
    assert.equal(mine.status, 200);
    assert.deepEqual(mine.json.incidents, []);
    trace('ST05', 'PASS guest token issued; /incidents/my returns []');
  });
});

// ═════════════════════════ INTEGRATION: API + PostgreSQL/PostGIS ═════════════
let firstIncident;

test.describe('Integration: incident submission and spatial storage', () => {
  test('IT01 valid fault report is stored with a correct PostGIS point', async () => {
    const r = await incidentAt('SewerBurst', -20.1983, 28.5291, { phone: '0771234567' });
    timings.push(r.ms);
    assert.equal(r.status, 201);
    firstIncident = r.json.incident;
    assert.match(firstIncident.reference_number, /^BCC-\d{8}-[A-Z0-9]{5}$/);
    const geo = (await pool.query(
      'SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM incidents WHERE id=$1',
      [firstIncident.id],
    )).rows[0];
    assert.ok(Math.abs(geo.lat - -20.1983) < 1e-9 && Math.abs(geo.lng - 28.5291) < 1e-9);
    trace('IT01', `PASS status=201 ref=${firstIncident.reference_number} postgis=(${geo.lat}, ${geo.lng}) ms=${r.ms.toFixed(1)}`);
  });

  test('IT02 emergency types are flagged is_emergency and get a 15-minute SLA', async () => {
    const r = await incidentAt('Ambulance', -20.1542, 28.5412);
    timings.push(r.ms);
    assert.equal(r.status, 201);
    const row = (await pool.query('SELECT is_emergency FROM incidents WHERE id=$1', [r.json.incident.id])).rows[0];
    assert.equal(row.is_emergency, true);
    assert.equal(r.json.incident.sla_target_minutes, 15);
    trace('IT02', `PASS is_emergency=true sla_target_minutes=15 ms=${r.ms.toFixed(1)}`);
  });

  test('IT03 second report of the same fault within 150 m is flagged as a possible duplicate', async () => {
    // ~55 m north of IT01, same type
    const near = await incidentAt('SewerBurst', -20.1978, 28.5291);
    // ~1.1 km away, same type
    const far = await incidentAt('SewerBurst', -20.1883, 28.5291);
    timings.push(near.ms, far.ms);
    assert.equal(near.json.incident.duplicate_detected, true);
    assert.equal(near.json.incident.primary_cluster_reference, firstIncident.reference_number);
    assert.equal(far.json.incident.duplicate_detected, undefined);
    trace('IT03', `PASS near(~55m) duplicate_detected=true -> ${firstIncident.reference_number}; far(~1.1km) not flagged`);
  });

  test('IT04 new incidents are pushed in real time to an authenticated portal socket', async () => {
    const socket = ioClient(BASE, { transports: ['websocket'], auth: { token: dispatcher.token }, query: { room: 'admin' } });
    await new Promise((res, rej) => { socket.on('connect', res); socket.on('connect_error', rej); });
    const received = new Promise((res) => socket.on('incident:new', res));
    const t0 = performance.now();
    const r = await incidentAt('Fire', -20.16, 28.59);
    timings.push(r.ms);
    const evt = await Promise.race([received, new Promise((_, rej) => setTimeout(() => rej(new Error('no event')), 5000))]);
    const latency = performance.now() - t0;
    socket.close();
    assert.equal(evt.reference_number, r.json.incident.reference_number);
    trace('IT04', `PASS incident:new received by Dispatcher socket ${latency.toFixed(1)} ms after submission`);
  });

  test('IT05 portal socket without a token is refused', async () => {
    const socket = ioClient(BASE, { transports: ['websocket'], query: { room: 'admin' }, reconnection: false });
    const err = await new Promise((res) => {
      socket.on('connect', () => res(null));
      socket.on('connect_error', res);
    });
    socket.close();
    assert.ok(err, 'connection should be refused');
    trace('IT05', `PASS refused: "${err.message}"`);
  });

  test('IT06 Resident token cannot join the dispatcher socket room', async () => {
    const socket = ioClient(BASE, { transports: ['websocket'], auth: { token: resident.token }, query: { room: 'admin' }, reconnection: false });
    const err = await new Promise((res) => {
      socket.on('connect', () => res(null));
      socket.on('connect_error', res);
    });
    socket.close();
    assert.ok(err);
    trace('IT06', `PASS refused: "${err.message}"`);
  });
});

// ═════════════════════════ SYSTEM: validation of reports ═════════════════════
test.describe('System: report validation', () => {
  test('ST06 report without GPS coordinates is rejected', async () => {
    const r = await http('POST', '/api/incidents', { body: { incident_type: 'Ambulance', description: 'no gps' } });
    assert.equal(r.status, 400);
    trace('ST06', `PASS status=400 error="${r.json.error}"`);
  });

  test('ST07 unknown incident type is rejected', async () => {
    const r = await incidentAt('Earthquake', -20.15, 28.58);
    assert.equal(r.status, 400);
    trace('ST07', `PASS status=400`);
  });

  test('ST08 non-numeric coordinates are rejected', async () => {
    const r = await incidentAt('WaterLeak', 'abc', 28.58);
    assert.equal(r.status, 400);
    trace('ST08', `PASS status=400 error="${r.json.error}"`);
  });

  test('ST09 out-of-range coordinates are rejected (latitude -91, longitude 181)', async () => {
    const a = await incidentAt('WaterLeak', -91, 28.58);
    const b = await incidentAt('WaterLeak', -20.15, 181);
    trace('ST09', `${a.status === 400 && b.status === 400 ? 'PASS' : 'FAIL'} lat=-91 -> ${a.status}, lng=181 -> ${b.status}`);
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
  });

  test('ST10 a resident can track a report by reference number (case-insensitive)', async () => {
    const r = await http('GET', `/api/incidents/track/${firstIncident.reference_number.toLowerCase()}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.incident.reference_number, firstIncident.reference_number);
    assert.ok(Array.isArray(r.json.incident.timeline) && r.json.incident.timeline.length >= 1);
    assert.equal(r.json.incident.reporter_phone, undefined); // public view hides contact details
    const missing = await http('GET', '/api/incidents/track/BCC-00000000-XXXXX');
    assert.equal(missing.status, 404);
    trace('ST10', `PASS found with timeline(${r.json.incident.timeline.length}); reporter_phone hidden; unknown ref -> 404`);
  });
});

// ═════════════════════════ SECURITY: access to personal data ═════════════════
test.describe('Security: incident list contains reporter contact details', () => {
  test('SEC01 incident list is not available without signing in', async () => {
    const r = await http('GET', '/api/incidents');
    const leaked = Array.isArray(r.json) && r.json.some((i) => i.reporter_phone);
    trace('SEC01', `${r.status === 401 ? 'PASS' : 'FAIL'} anonymous GET /api/incidents -> ${r.status}${leaked ? ' (reporter phone numbers exposed)' : ''}`);
    assert.equal(r.status, 401);
  });

  test('SEC02 incident list is not available to a Resident account', async () => {
    const r = await http('GET', '/api/incidents', { token: resident.token });
    trace('SEC02', `${r.status === 403 ? 'PASS' : 'FAIL'} Resident GET /api/incidents -> ${r.status}`);
    assert.equal(r.status, 403);
  });

  test('SEC03 Dispatcher can list incidents with SLA fields', async () => {
    const r = await http('GET', '/api/incidents', { token: dispatcher.token });
    assert.equal(r.status, 200);
    assert.ok(r.json.length >= 5);
    assert.ok('sla_urgency' in r.json[0]);
    trace('SEC03', `PASS status=200 incidents=${r.json.length} sla_urgency present`);
  });

  test('SEC04 full incident detail is limited to BCC staff', async () => {
    const asResident = await http('GET', `/api/incidents/${firstIncident.id}`, { token: resident.token });
    const asDispatcher = await http('GET', `/api/incidents/${firstIncident.id}`, { token: dispatcher.token });
    trace('SEC04', `${asResident.status === 403 && asDispatcher.status === 200 ? 'PASS' : 'FAIL'} Resident -> ${asResident.status}, Dispatcher -> ${asDispatcher.status}`);
    assert.equal(asResident.status, 403);
    assert.equal(asDispatcher.status, 200);
  });
});

// ═════════════════════════ SYSTEM: photo evidence (FR10) ═════════════════════
test.describe('System: photo evidence upload', () => {
  let target;
  test.before(async () => {
    const r = await incidentAt('WaterLeak', -20.17, 28.6);
    timings.push(r.ms);
    target = r.json.incident;
  });

  test('ST11 a 2 MB JPEG is accepted and linked to the report', async () => {
    const r = await uploadPhoto(target.id, jpegOfSize(2 * 1024 * 1024));
    assert.equal(r.status, 201);
    const row = (await pool.query('SELECT photo_url FROM incidents WHERE id=$1', [target.id])).rows[0];
    assert.equal(row.photo_url, r.json.url);
    trace('ST11', `PASS status=201 photo_url=${r.json.url} ms=${r.ms.toFixed(1)}`);
  });

  test('ST12 a second anonymous upload cannot overwrite existing evidence', async () => {
    const r = await uploadPhoto(target.id, jpegOfSize(1024));
    trace('ST12', `${r.status === 403 ? 'PASS' : 'FAIL'} second anonymous upload -> ${r.status}`);
    assert.equal(r.status, 403);
  });

  test('ST13 photo of exactly 5 MB is accepted (boundary)', async () => {
    const inc = await incidentAt('RoadDamage', -20.175, 28.61);
    const r = await uploadPhoto(inc.json.incident.id, jpegOfSize(5 * 1024 * 1024));
    trace('ST13', `${r.status === 201 ? 'PASS' : 'FAIL'} 5,242,880 bytes -> ${r.status}`);
    assert.equal(r.status, 201);
  });

  test('ST14 photo larger than 5 MB is rejected with 413', async () => {
    const inc = await incidentAt('RoadDamage', -20.176, 28.62);
    const r = await uploadPhoto(inc.json.incident.id, jpegOfSize(5 * 1024 * 1024 + 1));
    trace('ST14', `${r.status === 413 ? 'PASS' : 'FAIL'} 5,242,881 bytes -> ${r.status}`);
    assert.equal(r.status, 413);
  });

  test('ST15 non-image file is rejected', async () => {
    const inc = await incidentAt('StreetLight', -20.177, 28.63);
    const r = await uploadPhoto(inc.json.incident.id, Buffer.from('%PDF-1.4'), 'application/pdf', 'doc.pdf');
    trace('ST15', `${r.status === 415 ? 'PASS' : 'FAIL'} application/pdf -> ${r.status}`);
    assert.equal(r.status, 415);
  });

  test('ST16 upload to a non-existent incident returns 404', async () => {
    const r = await uploadPhoto('00000000-0000-0000-0000-000000000000', jpegOfSize(1024));
    trace('ST16', `${r.status === 404 ? 'PASS' : 'FAIL'} unknown incident id -> ${r.status}`);
    assert.equal(r.status, 404);
  });
});

// ═════════════════════════ SYSTEM + INTEGRATION: incident workflow ═══════════
test.describe('System: dispatcher incident workflow', () => {
  test('ST17 a Resident cannot change an incident status', async () => {
    const r = await http('PATCH', `/api/incidents/${firstIncident.id}`, { token: resident.token, body: { status: 'Resolved' } });
    assert.equal(r.status, 403);
    trace('ST17', 'PASS status=403');
  });

  test('ST18 an invalid status value is rejected', async () => {
    const r = await http('PATCH', `/api/incidents/${firstIncident.id}`, { token: dispatcher.token, body: { status: 'EnRoute' } });
    assert.equal(r.status, 400);
    trace('ST18', `PASS status=400 error="${r.json.error}"`);
  });

  test('IT07 New -> Assigned -> InProgress -> Resolved updates the record and the timeline', async () => {
    const steps = [
      { status: 'Assigned', assigned_to_name: 'Sipho Mthethwa', department: 'Health Services' },
      { status: 'InProgress' },
      { status: 'Resolved', resolution_notes: 'Blockage cleared and manhole resealed.' },
    ];
    for (const body of steps) {
      const r = await http('PATCH', `/api/incidents/${firstIncident.id}`, { token: dispatcher.token, body });
      assert.equal(r.status, 200, JSON.stringify(r.json));
    }
    const row = (await pool.query('SELECT status, resolved_at, assigned_to_name FROM incidents WHERE id=$1', [firstIncident.id])).rows[0];
    const tl = (await pool.query('SELECT status FROM incident_timeline WHERE incident_id=$1 ORDER BY created_at', [firstIncident.id])).rows.map((x) => x.status);
    assert.equal(row.status, 'Resolved');
    assert.ok(row.resolved_at);
    assert.deepEqual(tl, ['New', 'Assigned', 'InProgress', 'Resolved']);
    trace('IT07', `PASS final=Resolved resolved_at set; timeline=${tl.join(' > ')}`);
  });

  test('IT08 adding notes without a status change is recorded in the timeline', async () => {
    const r = await http('PATCH', `/api/incidents/${firstIncident.id}`, { token: dispatcher.token, body: { resolution_notes: 'Resident confirmed fix by phone.' } });
    assert.equal(r.status, 200);
    const n = (await pool.query('SELECT COUNT(*)::int AS n FROM incident_timeline WHERE incident_id=$1', [firstIncident.id])).rows[0].n;
    trace('IT08', `${n === 5 ? 'PASS' : 'FAIL'} timeline entries after notes-only update = ${n} (expected 5)`);
    assert.equal(n, 5);
  });

  test('ST19 field team status can be updated by a dispatcher and is validated', async () => {
    const team = (await pool.query("INSERT INTO field_teams (name, role, department) VALUES ('Roads Gang 2','Asphalt','Engineering Services') RETURNING id")).rows[0];
    const ok = await http('PATCH', `/api/teams/${team.id}`, { token: dispatcher.token, body: { status: 'Dispatched', active_ticket: firstIncident.reference_number } });
    const bad = await http('PATCH', `/api/teams/${team.id}`, { token: dispatcher.token, body: { status: 'Sleeping' } });
    const anon = await http('PATCH', `/api/teams/${team.id}`, { body: { status: 'Available' } });
    assert.equal(ok.status, 200);
    assert.equal(bad.status, 400);
    assert.equal(anon.status, 401);
    trace('ST19', `PASS valid=${ok.status} invalid_status=${bad.status} anonymous=${anon.status}`);
  });
});

// ═════════════════════════ SYSTEM + INTEGRATION: communication ═══════════════
test.describe('System: bulletins and notifications', () => {
  test('ST20 Communications officer can publish a bulletin; Resident cannot', async () => {
    const ok = await http('POST', '/api/bulletins', { token: comms.token, body: { title: 'Water Outage', body: 'Criterion works maintenance 08:00-17:00.', category: 'Water Cut', target_ward: 'Ward 20', is_urgent: true } });
    const denied = await http('POST', '/api/bulletins', { token: resident.token, body: { title: 'x', body: 'y' } });
    assert.equal(ok.status, 201);
    assert.equal(denied.status, 403);
    const feed = await http('GET', '/api/bulletins?ward=Ward%2020');
    assert.ok(feed.json.some((b) => b.title === 'Water Outage'));
    trace('ST20', `PASS comms=${ok.status} resident=${denied.status}; bulletin visible in Ward 20 feed`);
  });

  test('ST21 notification title over 100 characters is rejected', async () => {
    const r = await http('POST', '/api/notifications', { token: comms.token, body: { title: 'x'.repeat(101), body: 'test' } });
    assert.equal(r.status, 400);
    trace('ST21', 'PASS status=400');
  });

  test('IT09 zone-targeted notification selects only residents who reported inside the polygon', async () => {
    // Two residents with device tokens: one reported inside Nkulumane polygon, one in the CBD
    const inside = await registerUser('inside@test.bcc');
    const outside = await registerUser('outside@test.bcc');
    await pool.query("UPDATE users SET fcm_token='tok-inside' WHERE id=$1", [inside.id]);
    await pool.query("UPDATE users SET fcm_token='tok-outside' WHERE id=$1", [outside.id]);
    await http('POST', '/api/incidents', { token: inside.token, body: { incident_type: 'WaterLeak', lat: -20.205, lng: 28.525, description: 'inside zone' } });
    await http('POST', '/api/incidents', { token: outside.token, body: { incident_type: 'WaterLeak', lat: -20.150, lng: 28.585, description: 'outside zone' } });
    const zone = { type: 'Polygon', coordinates: [[[28.50, -20.22], [28.55, -20.22], [28.55, -20.19], [28.50, -20.19], [28.50, -20.22]]] };
    const r = await http('POST', '/api/notifications', { token: comms.token, body: { title: 'Nkulumane water cut', body: 'Supply off 08:00-17:00', target_type: 'Zone', target_zone: zone } });
    trace('IT09', `${r.status === 201 && r.json?.notification?.recipient_count === 1 ? 'PASS' : 'FAIL'} status=${r.status} recipient_count=${r.json?.notification?.recipient_count ?? r.json?.error}`);
    assert.equal(r.status, 201);
    assert.equal(r.json.notification.recipient_count, 1);
  });

  test('ST22 Dispatcher cannot send push notifications (Communications/Administrator only)', async () => {
    const r = await http('POST', '/api/notifications', { token: dispatcher.token, body: { title: 't', body: 'b' } });
    assert.equal(r.status, 403);
    trace('ST22', 'PASS status=403');
  });

  test('ST23 WhatsApp ward channels are listed', async () => {
    const r = await http('GET', '/api/whatsapp/channels');
    assert.equal(r.status, 200);
    const list = Array.isArray(r.json) ? r.json : (r.json.channels || []);
    assert.ok(list.length >= 1);
    trace('ST23', `PASS channels=${list.length}`);
  });
});

// ═════════════════════════ PERFORMANCE (NFR01) ═══════════════════════════════
test.describe('Performance: report submission time', () => {
  test('PF01 20 sequential report submissions complete well within 3 seconds each', async () => {
    for (let i = 0; i < 20; i++) {
      const r = await incidentAt(i % 2 ? 'WaterLeak' : 'Ambulance', -20.10 - i * 0.002, 28.50 + i * 0.002);
      assert.equal(r.status, 201);
      timings.push(r.ms);
    }
    const worst = Math.max(...timings);
    trace('PF01', `${worst < 3000 ? 'PASS' : 'FAIL'} worst submission ${worst.toFixed(1)} ms over ${timings.length} submissions (localhost, see report for caveats)`);
    assert.ok(worst < 3000);
  });
});

// ═════════════════════════ SECURITY: abuse protection ════════════════════════
test.describe('Security: rate limiting', () => {
  test('SEC05 incident endpoints refuse requests beyond 60 per 10 minutes from one address', async () => {
    let first429 = null;
    for (let i = 0; i < 15 && first429 === null; i++) {
      const r = await http('GET', '/api/incidents/track/BCC-00000000-XXXXX');
      if (r.status === 429) first429 = r;
    }
    trace('SEC05', `${first429 ? 'PASS' : 'FAIL'} limiter returned ${first429 ? 429 : 'no 429'}${first429 ? ` "${first429.json.error}"` : ''}`);
    assert.ok(first429);
  });
});
