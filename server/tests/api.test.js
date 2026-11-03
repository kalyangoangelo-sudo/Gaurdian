/**
 * api.test.js
 *
 * Automated backend tests for GuardianLink Lite.
 *
 * Covers:
 *  - Successful login (parent and child)
 *  - Failed login
 *  - Unauthorized access to protected endpoints
 *  - Child request creation (valid and invalid URL)
 *  - Parent receives request via REST (Socket.IO events are integration-tested manually)
 *  - Linked parent can approve a request
 *  - Linked parent can deny a request
 *  - Child cannot decide a request
 *  - Unlinked parent cannot decide a request
 *  - Duplicate decisions return 409
 *  - Users cannot list another user's private requests
 *
 * Run with:  npm test  (from the server/ directory)
 */

'use strict';

// ─── Test environment setup ───────────────────────────────────────────────────
// Set JWT_SECRET before requiring the app so the server does not crash.
process.env.JWT_SECRET = 'test_secret_for_jest_do_not_use_in_production';
process.env.PORT = '0'; // Use a random port so tests don't conflict

const request = require('supertest');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a fresh, fully-wired Express app for each test file run.
 * We re-require the modules directly so we get isolated store instances.
 */
async function buildTestApp() {
  // Fresh in-memory stores for every test file
  const { seedUsers, RELATIONSHIPS, createRequestsStore } = require('../src/store');
  const { createAuthRouter } = require('../src/routes/auth');
  const { createRequestsRouter } = require('../src/routes/requests');

  const express = require('express');
  const cors = require('cors');

  const testApp = express();
  testApp.use(cors());
  testApp.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const requests = createRequestsStore();

  // Mount routes without rate limiting for tests
  testApp.use('/login', createAuthRouter(users));
  testApp.use('/requests', createRequestsRouter(requests, RELATIONSHIPS, null /* no io */));

  // Error handler
  // eslint-disable-next-line no-unused-vars
  testApp.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
  });

  return { testApp, users, requests };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GuardianLink Lite API', () => {
  let testApp;
  let parentToken;
  let childToken;

  // Login once and cache tokens for all tests in this suite
  // Timeout is generous because bcrypt.hash (salt rounds=10) on a cold start
  // can take several seconds on slower machines.
  beforeAll(async () => {
    ({ testApp } = await buildTestApp());
    const parentLogin = await request(testApp)
      .post('/login')
      .send({ username: 'parent', password: 'Parent123!' });
    parentToken = parentLogin.body.token;

    const childLogin = await request(testApp)
      .post('/login')
      .send({ username: 'child', password: 'Child123!' });
    childToken = childLogin.body.token;
  }, 30000); // 30s – bcrypt seed can be slow on first run

  // ── Authentication ─────────────────────────────────────────────────────────

  describe('POST /login', () => {
    test('successful parent login returns 200 with token and user info', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ username: 'parent', password: 'Parent123!' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('parent');
      expect(res.body.user.role).toBe('parent');
      expect(res.body.user.id).toBe('parent-1');
      // Never return the password hash
      expect(res.body.user.hash).toBeUndefined();
    });

    test('successful child login returns 200 with token and user info', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ username: 'child', password: 'Child123!' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('child');
    });

    test('wrong password returns 401', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ username: 'parent', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      // Generic error – must not confirm whether the username exists or is wrong
      expect(res.body.error).not.toMatch(/^(username|password) (not found|incorrect)/i);
    });

    test('unknown username returns 401', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ username: 'nobody', password: 'Password123!' });

      expect(res.status).toBe(401);
    });

    test('missing password returns 400', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ username: 'parent' });

      expect(res.status).toBe(400);
    });

    test('missing username returns 400', async () => {
      const res = await request(testApp)
        .post('/login')
        .send({ password: 'Parent123!' });

      expect(res.status).toBe(400);
    });
  });

  // ── Authorization guard ────────────────────────────────────────────────────

  describe('Protected endpoints – no token', () => {
    test('GET /requests without token returns 401', async () => {
      const res = await request(testApp).get('/requests');
      expect(res.status).toBe(401);
    });

    test('POST /requests without token returns 401', async () => {
      const res = await request(testApp)
        .post('/requests')
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(401);
    });

    test('POST /requests with invalid token returns 401', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .send({ url: 'https://example.com' });
      expect(res.status).toBe(401);
    });
  });

  // ── Child: create request ──────────────────────────────────────────────────

  describe('POST /requests (child)', () => {
    test('child can create a valid HTTPS request', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(201);
      expect(res.body.request.id).toBeDefined();
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.url).toBe('https://example.com/');
      expect(res.body.request.childId).toBe('child-1');
      expect(res.body.request.parentId).toBe('parent-1');
    });

    test('child can create a valid HTTP request', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'http://example.com' });

      expect(res.status).toBe(201);
    });

    test('malformed URL is rejected with 400', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(400);
    });

    test('FTP URL is rejected with 400', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'ftp://files.example.com' });

      expect(res.status).toBe(400);
    });

    test('URL with embedded credentials is rejected with 400', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'https://user:pass@example.com' });

      expect(res.status).toBe(400);
    });

    test('empty URL is rejected with 400', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: '' });

      expect(res.status).toBe(400);
    });

    test('parent cannot create a request', async () => {
      const res = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(403);
    });
  });

  // ── Listing requests ───────────────────────────────────────────────────────

  describe('GET /requests', () => {
    test('child only sees their own requests', async () => {
      const res = await request(testApp)
        .get('/requests')
        .set('Authorization', `Bearer ${childToken}`);

      expect(res.status).toBe(200);
      for (const req_ of res.body.requests) {
        expect(req_.childId).toBe('child-1');
      }
    });

    test('parent only sees requests linked to them', async () => {
      const res = await request(testApp)
        .get('/requests')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      for (const req_ of res.body.requests) {
        expect(req_.parentId).toBe('parent-1');
      }
    });
  });

  // ── Parent: decide request ─────────────────────────────────────────────────

  describe('POST /requests/:id/decision', () => {
    let pendingRequestId;

    // Create a fresh pending request before each decision test
    beforeEach(async () => {
      const createRes = await request(testApp)
        .post('/requests')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ url: 'https://decision-test.example.com' });
      pendingRequestId = createRes.body.request.id;
    });

    test('linked parent can approve a request', async () => {
      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('approved');
      expect(res.body.request.decidedAt).toBeDefined();
    });

    test('linked parent can deny a request', async () => {
      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'denied' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('denied');
    });

    test('child cannot decide a request', async () => {
      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ decision: 'approved' });

      expect(res.status).toBe(403);
    });

    test('duplicate decision returns 409 conflict', async () => {
      // First decision – should succeed
      await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'approved' });

      // Second decision on the same request – must be rejected
      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'denied' });

      expect(res.status).toBe(409);
      expect(res.body.currentStatus).toBe('approved');
    });

    test('invalid decision value is rejected with 400', async () => {
      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'maybe' });

      expect(res.status).toBe(400);
    });

    test('decision on non-existent request returns 404', async () => {
      const res = await request(testApp)
        .post('/requests/00000000-0000-0000-0000-000000000000/decision')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'approved' });

      expect(res.status).toBe(404);
    });

    test('unlinked parent cannot decide another parent\'s request', async () => {
      // Build a second parent account inline for this test
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');

      const hash2 = await bcrypt.hash('OtherParent123!', 10);
      const fakeParent = {
        id: 'parent-2',
        username: 'parent2',
        hash: hash2,
        role: 'parent',
      };

      // Mint a valid JWT for the second parent directly
      const token2 = jwt.sign(
        { id: fakeParent.id, username: fakeParent.username, role: fakeParent.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(testApp)
        .post(`/requests/${pendingRequestId}/decision`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ decision: 'approved' });

      // parent-2 is NOT the linked parent for child-1's request → 403
      expect(res.status).toBe(403);
    });
  });
});
