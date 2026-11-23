/**
 * BCC SmartConnect — Fast Unit Tests (no database required)
 * Tests JWT authentication middleware and Role-Based Access Control (RBAC).
 *
 * Run with: npm run test:unit
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'unit_test_jwt_secret_123456';
process.env.JWT_SECRET = TEST_SECRET;

// Stub database lookup so unit tests run completely offline in milliseconds
const pool = require('../src/config/db');
pool.query = async (_sql, [id]) => {
  if (id === 'u-dispatcher') {
    return { rows: [{ id: 'u-dispatcher', email: 'dispatcher@bcc.gov.zw', role: 'Dispatcher', first_name: 'Control', last_name: 'Dispatcher', is_active: true, is_guest: false }] };
  }
  return { rows: [] };
};

const { authenticate, optionalAuth } = require('../src/middleware/auth');
const { requireRole } = require('../src/middleware/rbac');

function mockRes() {
  return {
    code: 200,
    body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

test.describe('Unit: JWT Authentication & RBAC Middleware', () => {
  test('UT01: Valid JWT attaches verified active user to req.user', async () => {
    const token = jwt.sign({ id: 'u-dispatcher', email: 'dispatcher@bcc.gov.zw', role: 'Dispatcher' }, TEST_SECRET, { expiresIn: '15m' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    await authenticate(req, mockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'Dispatcher');
  });

  test('UT02: Missing Authorization header is rejected with 401', async () => {
    const res = mockRes();
    await authenticate({ headers: {} }, res, () => assert.fail('next() should not run'));
    assert.equal(res.code, 401);
  });

  test('UT03: Expired JWT is rejected with 401', async () => {
    const token = jwt.sign({ id: 'u-dispatcher', role: 'Dispatcher', exp: Math.floor(Date.now() / 1000) - 60 }, TEST_SECRET);
    const res = mockRes();
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('next() should not run'));
    assert.equal(res.code, 401);
  });

  test('UT04: JWT signed with wrong secret is rejected with 401', async () => {
    const token = jwt.sign({ id: 'u-dispatcher', role: 'Administrator' }, 'forged-secret');
    const res = mockRes();
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('next() should not run'));
    assert.equal(res.code, 401);
  });

  test('UT05: requireRole allows permitted staff role through', () => {
    let nextCalled = false;
    requireRole('Dispatcher', 'Administrator')({ user: { role: 'Dispatcher' } }, mockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  test('UT06: requireRole blocks Resident from staff-only routes with 403', () => {
    const res = mockRes();
    requireRole('Dispatcher', 'Administrator')({ user: { role: 'Resident' } }, res, () => assert.fail('next() should not run'));
    assert.equal(res.code, 403);
  });

  test('UT07: optionalAuth allows anonymous citizens without failing', async () => {
    const req = { headers: {} };
    let nextCalled = false;
    await optionalAuth(req, mockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user, undefined);
  });
});
