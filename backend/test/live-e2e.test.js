/**
 * BCC SmartConnect — Non-Destructive Live End-to-End Verification Suite
 *
 * Exercises the running backend API (default http://localhost:3000) across:
 *   1. Health & database readiness
 *   2. User Registration, Login, Guest Auth, and RBAC security
 *   3. GIS Fault & Emergency Reporting (GPS validation, PostGIS storage, 150m deduplication, photo upload)
 *   4. Real-time Socket.IO dispatch alerts (authorized vs unauthorized)
 *   5. Incident Tracking & Lifecycle (New -> Assigned -> InProgress -> Resolved)
 *
 * Safe to run during a live presentation: cleans up only the temporary test
 * user and test incidents it creates, leaving all other data untouched.
 *
 * Run with: npm run test:live
 */
require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const { io: ioClient } = require('socket.io-client');
const pool = require('../src/config/db');

const BASE = process.env.API_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const STAFF_EMAIL = process.env.TEST_STAFF_EMAIL || 'dispatcher@bcc.gov.zw';
const STAFF_PASSWORD = process.env.TEST_STAFF_PASSWORD || 'BccDispatch@2026';

const runId = Date.now();
const tempEmail = `demo_test_${runId}@test.bcc.gov.zw`;
const createdIncidentIds = [];
const createdUserIds = [];

async function http(method, url, { body, token, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !raw) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${url}`, { method, headers: h, body: payload });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

function confirmedLocation(lat, lng, source = 'gps') {
  return {
    lat,
    lng,
    location_source: source,
    location_confirmed: true,
    location_captured_at: new Date().toISOString(),
    ...(source === 'gps' ? { location_accuracy_m: 12.5 } : {}),
  };
}

function tinyJpeg() {
  const buf = Buffer.alloc(1024, 0);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
  return buf;
}

let residentToken;
let dispatcherToken;
let faultIncident;

test.after(async () => {
  try {
    if (createdIncidentIds.length) {
      await pool.query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [createdIncidentIds]);
    }
    if (createdUserIds.length) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  } finally {
    await pool.end();
  }
});

test.describe('1. System Health & Readiness', () => {
  test('E2E-01: API liveness and database schema readiness return 200', async () => {
    const live = await http('GET', '/health/live');
    const ready = await http('GET', '/health/ready');
    assert.equal(live.status, 200);
    assert.equal(ready.status, 200);
    assert.equal(ready.json.status, 'ready');
  });
});

test.describe('2. User Registration, Authentication & RBAC', () => {
  test('E2E-02: Resident registration validates password length and creates account', async () => {
    const tooShort = await http('POST', '/api/auth/register', {
      body: { first_name: 'Demo', last_name: 'Citizen', email: tempEmail, password: 'short' },
    });
    assert.equal(tooShort.status, 400);

    const ok = await http('POST', '/api/auth/register', {
      body: { first_name: 'Demo', last_name: 'Citizen', email: tempEmail, phone: '0772123456', password: 'Password@2026' },
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.equal(ok.json.user.role, 'Resident');
    assert.ok(ok.json.access && ok.json.refresh);
    residentToken = ok.json.access;
    createdUserIds.push(ok.json.user.id);

    const duplicate = await http('POST', '/api/auth/register', {
      body: { first_name: 'Demo', last_name: 'Citizen', email: tempEmail.toUpperCase(), password: 'Password@2026' },
    });
    assert.equal(duplicate.status, 409);
  });

  test('E2E-03: Resident login, Guest session, and Staff login succeed', async () => {
    const badLogin = await http('POST', '/api/auth/login', {
      body: { email: tempEmail, password: 'WrongPassword!' },
    });
    assert.equal(badLogin.status, 401);

    const guest = await http('POST', '/api/auth/guest');
    assert.equal(guest.status, 200);
    assert.equal(guest.json.user.is_guest, true);

    const staff = await http('POST', '/api/auth/login', {
      body: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    assert.equal(staff.status, 200, JSON.stringify(staff.json));
    assert.equal(staff.json.user.role, 'Dispatcher');
    dispatcherToken = staff.json.access;
  });

  test('E2E-04: RBAC protects staff incident list from anonymous users and Residents', async () => {
    const anon = await http('GET', '/api/incidents');
    const asResident = await http('GET', '/api/incidents', { token: residentToken });
    const asStaff = await http('GET', '/api/incidents', { token: dispatcherToken });
    assert.equal(anon.status, 401);
    assert.equal(asResident.status, 403);
    assert.equal(asStaff.status, 200);
    assert.ok(Array.isArray(asStaff.json));
  });
});

test.describe('3. GIS Fault & Emergency Reporting', () => {
  test('E2E-05: Unconfirmed or out-of-range GIS coordinates are rejected', async () => {
    const noLocation = await http('POST', '/api/incidents', {
      token: residentToken,
      body: { incident_type: 'WaterLeak', description: 'Pipe burst without GPS' },
    });
    assert.equal(noLocation.status, 400);

    const badCoords = await http('POST', '/api/incidents', {
      token: residentToken,
      body: { incident_type: 'WaterLeak', description: 'Invalid coordinates', ...confirmedLocation(-95, 28.58) },
    });
    assert.equal(badCoords.status, 400);
  });

  test('E2E-06: Confirmed GPS fault report stores PostGIS point & generates reference number', async () => {
    const res = await http('POST', '/api/incidents', {
      token: residentToken,
      body: {
        incident_type: 'WaterLeak',
        description: 'Burst main water pipe near Nkulumane Shopping Centre',
        address: 'Nkulumane, Bulawayo',
        phone: '0772123456',
        ...confirmedLocation(-20.1983, 28.5291, 'gps'),
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    faultIncident = res.json.incident;
    createdIncidentIds.push(faultIncident.id);
    assert.match(faultIncident.reference_number, /^BCC-\d{8}-[A-F0-9]{16}$/);

    const geo = await pool.query(
      'SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM incidents WHERE id = $1',
      [faultIncident.id]
    );
    assert.ok(Math.abs(geo.rows[0].lat - -20.1983) < 1e-6);
    assert.ok(Math.abs(geo.rows[0].lng - 28.5291) < 1e-6);
  });

  test('E2E-07: Spatial clustering flags duplicate fault within 150m', async () => {
    const near = await http('POST', '/api/incidents', {
      token: residentToken,
      body: {
        incident_type: 'WaterLeak',
        description: 'Second report of the same burst pipe ~55m away',
        address: 'Nkulumane, Bulawayo',
        ...confirmedLocation(-20.1978, 28.5291, 'gps'),
      },
    });
    assert.equal(near.status, 201, JSON.stringify(near.json));
    createdIncidentIds.push(near.json.incident.id);
    assert.equal(near.json.incident.duplicate_detected, true);
    assert.equal(near.json.incident.primary_cluster_reference, faultIncident.reference_number);
  });

  test('E2E-08: Emergency report (Fire) is flagged is_emergency=true and pushed via Socket.IO', async () => {
    const socket = ioClient(BASE, {
      transports: ['websocket'],
      auth: { token: dispatcherToken },
      query: { room: 'admin' },
    });
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    const received = new Promise((resolve) => socket.on('incident:new', resolve));

    const res = await http('POST', '/api/incidents', {
      token: residentToken,
      body: {
        incident_type: 'Fire',
        description: 'Structural fire reported near Famona industrial area',
        address: 'Famona, Bulawayo',
        ...confirmedLocation(-20.1680, 28.5830, 'manual_pin'),
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    createdIncidentIds.push(res.json.incident.id);
    assert.equal(res.json.incident.is_emergency, true);

    const evt = await Promise.race([
      received,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Socket event timeout')), 5000)),
    ]);
    socket.close();
    assert.equal(evt.reference_number, res.json.incident.reference_number);
  });

  test('E2E-09: Photo evidence upload accepts valid JPEG and rejects non-image PDF', async () => {
    const validForm = new FormData();
    validForm.append('file', new Blob([tinyJpeg()], { type: 'image/jpeg' }), 'leak.jpg');
    const ok = await http('POST', `/api/incidents/${faultIncident.id}/media`, {
      body: validForm,
      raw: true,
      token: residentToken,
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));

    const pdfForm = new FormData();
    pdfForm.append('file', new Blob([Buffer.from('%PDF-1.4')], { type: 'application/pdf' }), 'doc.pdf');
    const rejected = await http('POST', `/api/incidents/${faultIncident.id}/media`, {
      body: pdfForm,
      raw: true,
      token: dispatcherToken,
    });
    assert.equal(rejected.status, 415);
  });
});

test.describe('4. Incident Tracking & Dispatch Lifecycle', () => {
  test('E2E-10: Dispatcher transitions New -> Assigned -> InProgress -> Resolved and Resident tracks timeline', async () => {
    // Resident cannot change status
    const denied = await http('PATCH', `/api/incidents/${faultIncident.id}`, {
      token: residentToken,
      body: { status: 'Resolved' },
    });
    assert.equal(denied.status, 403);

    // Invalid transition (New -> Resolved skipping Assigned/InProgress) is blocked with 409 Conflict
    const invalidStep = await http('PATCH', `/api/incidents/${faultIncident.id}`, {
      token: dispatcherToken,
      body: { status: 'Resolved' },
    });
    assert.equal(invalidStep.status, 409);

    // Valid lifecycle transitions
    for (const body of [
      { status: 'Assigned', assigned_to_name: 'Water & Sewer Unit 1', department: 'Engineering Services' },
      { status: 'InProgress' },
      { status: 'Resolved', resolution_notes: 'Burst pipe isolated and repaired.' },
    ]) {
      const step = await http('PATCH', `/api/incidents/${faultIncident.id}`, { token: dispatcherToken, body });
      assert.equal(step.status, 200, JSON.stringify(step.json));
    }

    // Public tracking endpoint returns full timeline without exposing reporter_phone
    const track = await http('GET', `/api/incidents/track/${faultIncident.reference_number.toLowerCase()}`);
    assert.equal(track.status, 200);
    assert.equal(track.json.incident.status, 'Resolved');
    assert.equal(track.json.incident.reporter_phone, undefined);
    assert.deepEqual(
      track.json.incident.timeline.map((e) => e.status),
      ['New', 'Assigned', 'InProgress', 'Resolved']
    );
  });
});
