/**
 * stage-b.test.js
 *
 * Stage B automated tests for GuardianLink Lite backend extensions.
 *
 * Covers:
 *  - POST /pair/generate  (parent ok, child gets 403)
 *  - POST /pair/confirm   (valid code, expired code, wrong code)
 *  - GET  /policy/:childId
 *  - PUT  /policy/:childId
 *  - POST /events
 *  - GET  /events/:parentId
 *  - POST /safesignal
 *  - GET  /safesignal/:parentId
 *  - PUT  /safesignal/:id/acknowledge
 *  - POST /removal-request
 *  - GET  /removal-requests/:parentId
 *  - PUT  /removal-request/:id/decide
 *  - POST /heartbeat
 *  - GET  /device-status/:childId  (VERIFIED, OFFLINE, UNVERIFIED)
 *
 * Run with:  npm test  (from the server/ directory)
 */

'use strict';

process.env.JWT_SECRET = 'test_secret_for_jest_do_not_use_in_production';
process.env.PORT = '0';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a fresh Express app wired with all Stage B routes for each test run.
 * Stores are fresh Maps so tests are isolated.
 */
async function buildStageBApp() {
  const {
    seedUsers,
    createRequestsStore,
    createPairingStore,
    createPoliciesStore,
    createEventsStore,
    createSafeSignalStore,
    createRemovalStore,
    createHeartbeatStore,
  } = require('../src/store');

  const { createAuthRouter } = require('../src/routes/auth');
  const { createRequestsRouter } = require('../src/routes/requests');
  const { createPairingRouter } = require('../src/routes/pairing');
  const { createPolicyRouter } = require('../src/routes/policy');
  const { createEventsRouter } = require('../src/routes/events');
  const { createSafeSignalRouter } = require('../src/routes/safesignal');
  const { createRemovalRouter } = require('../src/routes/removal');
  const { createHeartbeatRouter } = require('../src/routes/heartbeat');

  const express = require('express');

  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();

  // Fresh mutable relationships map so pairing tests can modify it
  const relationships = new Map([['child-1', 'parent-1']]);

  const requests = createRequestsStore();
  const pairing = createPairingStore();
  const policies = createPoliciesStore();
  const events = createEventsStore();
  const safeSignals = createSafeSignalStore();
  const removals = createRemovalStore();
  const heartbeats = createHeartbeatStore();

  app.use('/login', createAuthRouter(users));
  app.use('/requests', createRequestsRouter(requests, relationships, null));
  app.use('/pair', createPairingRouter(pairing, relationships));
  app.use('/policy', createPolicyRouter(policies, relationships));
  app.use('/events', createEventsRouter(events, relationships));
  app.use('/safesignal', createSafeSignalRouter(safeSignals, relationships, null));
  app.use('/removal-request', createRemovalRouter(removals, relationships, null));
  app.use('/removal-requests', createRemovalRouter(removals, relationships, null));
  app.use('/heartbeat', createHeartbeatRouter(heartbeats, relationships));
  app.use('/device-status', createHeartbeatRouter(heartbeats, relationships));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
  });

  return { app, users, relationships, pairing, policies, events, safeSignals, removals, heartbeats };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Stage B – GuardianLink Lite extended API', () => {
  let app;
  let parentToken;
  let childToken;
  let pairing;
  let heartbeats;

  beforeAll(async () => {
    ({ app, pairing, heartbeats } = await buildStageBApp());

    const parentRes = await request(app)
      .post('/login')
      .send({ username: 'parent', password: 'Parent123!' });
    parentToken = parentRes.body.token;

    const childRes = await request(app)
      .post('/login')
      .send({ username: 'child', password: 'Child123!' });
    childToken = childRes.body.token;
  }, 30000);

  // ── Pairing ───────────────────────────────────────────────────────────────

  describe('POST /pair/generate', () => {
    test('parent can generate a pairing code', async () => {
      const res = await request(app)
        .post('/pair/generate')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toMatch(/^\d{6}$/);
      expect(typeof res.body.expiresAt).toBe('number');
      expect(res.body.expiresAt).toBeGreaterThan(Date.now());
    });

    test('child cannot generate a pairing code (403)', async () => {
      const res = await request(app)
        .post('/pair/generate')
        .set('Authorization', `Bearer ${childToken}`);

      expect(res.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
      const res = await request(app).post('/pair/generate');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /pair/confirm', () => {
    test('child confirms a valid code and becomes paired', async () => {
      // Generate a code as parent first
      const genRes = await request(app)
        .post('/pair/generate')
        .set('Authorization', `Bearer ${parentToken}`);
      const { code } = genRes.body;

      // Mint a fresh child-2 JWT that is not yet paired, then confirm
      const child2Token = jwt.sign(
        { id: 'child-2', username: 'child2', role: 'child' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/pair/confirm')
        .set('Authorization', `Bearer ${child2Token}`)
        .send({ code });

      expect(res.status).toBe(200);
      expect(res.body.parentId).toBe('parent-1');
      expect(res.body.message).toBe('Paired successfully.');
    });

    test('wrong code returns 400', async () => {
      const res = await request(app)
        .post('/pair/confirm')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ code: '000000' });

      expect(res.status).toBe(400);
    });

    test('expired code returns 400', async () => {
      // Manually insert an already-expired code into the store
      pairing.set('999999', { parentId: 'parent-1', expiresAt: Date.now() - 1000 });

      const res = await request(app)
        .post('/pair/confirm')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ code: '999999' });

      expect(res.status).toBe(400);
    });

    test('parent cannot confirm a code (403)', async () => {
      const genRes = await request(app)
        .post('/pair/generate')
        .set('Authorization', `Bearer ${parentToken}`);

      const res = await request(app)
        .post('/pair/confirm')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ code: genRes.body.code });

      expect(res.status).toBe(403);
    });
  });

  // ── Policy ────────────────────────────────────────────────────────────────

  describe('GET /policy/:childId', () => {
    test('parent can read their child\'s policy (returns default when unset)', async () => {
      const res = await request(app)
        .get('/policy/child-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.policy).toBeDefined();
      expect(Array.isArray(res.body.policy.contentCategories)).toBe(true);
    });

    test('child can read their own policy', async () => {
      const res = await request(app)
        .get('/policy/child-1')
        .set('Authorization', `Bearer ${childToken}`);

      expect(res.status).toBe(200);
      expect(res.body.policy).toBeDefined();
    });
  });

  describe('PUT /policy/:childId', () => {
    test('parent can update their child\'s policy', async () => {
      const res = await request(app)
        .put('/policy/child-1')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          contentCategories: ['adult', 'violence'],
          blockedKeywords: ['badword'],
          trustedDomains: ['education.com'],
        });

      expect(res.status).toBe(200);
      expect(res.body.policy.contentCategories).toContain('adult');
      expect(res.body.policy.blockedKeywords).toContain('badword');
      expect(res.body.policy.trustedDomains).toContain('education.com');
      expect(res.body.policy.updatedAt).toBeDefined();
    });

    test('child cannot update a policy (403)', async () => {
      const res = await request(app)
        .put('/policy/child-1')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ contentCategories: ['adult'] });

      expect(res.status).toBe(403);
    });
  });

  // ── Events ────────────────────────────────────────────────────────────────

  describe('POST /events', () => {
    test('child can record a safety event', async () => {
      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ type: 'blocked_url', detail: 'https://bad.example.com' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.message).toBeDefined();
    });

    test('parent cannot record an event (403)', async () => {
      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ type: 'blocked_url', detail: 'x' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /events/:parentId', () => {
    beforeAll(async () => {
      // Ensure at least one event exists
      await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ type: 'test_event', detail: 'setup' });
    });

    test('parent can retrieve events for their children', async () => {
      const res = await request(app)
        .get('/events/parent-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    test('child cannot access parent event list (403)', async () => {
      const res = await request(app)
        .get('/events/parent-1')
        .set('Authorization', `Bearer ${childToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── SafeSignal ────────────────────────────────────────────────────────────

  describe('POST /safesignal', () => {
    test('child can submit a safety report', async () => {
      const res = await request(app)
        .post('/safesignal')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ category: 'cyberbullying', description: 'Someone is bullying me.' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.message).toBeDefined();
    });

    test('parent cannot submit a safety report (403)', async () => {
      const res = await request(app)
        .post('/safesignal')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ category: 'cyberbullying', description: 'x' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /safesignal/:parentId', () => {
    test('parent can retrieve safety reports for their children', async () => {
      const res = await request(app)
        .get('/safesignal/parent-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });
  });

  describe('PUT /safesignal/:id/acknowledge', () => {
    let reportId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/safesignal')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ category: 'inappropriate_content', description: 'Saw bad content.' });
      reportId = createRes.body.id;
    });

    test('parent can acknowledge a report', async () => {
      const res = await request(app)
        .put(`/safesignal/${reportId}/acknowledge`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ action: 'Talked to child about online safety.' });

      expect(res.status).toBe(200);
      expect(res.body.report.status).toBe('acknowledged');
      expect(res.body.report.acknowledgedAt).toBeDefined();
      expect(res.body.report.action).toBe('Talked to child about online safety.');
    });

    test('acknowledging non-existent report returns 404', async () => {
      const res = await request(app)
        .put('/safesignal/00000000-0000-0000-0000-000000000000/acknowledge')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ action: 'N/A' });

      expect(res.status).toBe(404);
    });
  });

  // ── Removal ───────────────────────────────────────────────────────────────

  describe('POST /removal-request', () => {
    test('child can submit a removal request', async () => {
      const res = await request(app)
        .post('/removal-request/removal-request')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ reason: 'I no longer need it.' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.message).toBeDefined();
    });

    test('parent cannot submit a removal request (403)', async () => {
      const res = await request(app)
        .post('/removal-request/removal-request')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ reason: 'x' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /removal-requests/:parentId', () => {
    test('parent can list removal requests for their children', async () => {
      const res = await request(app)
        .get('/removal-requests/removal-requests/parent-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.requests)).toBe(true);
    });
  });

  describe('PUT /removal-request/:id/decide', () => {
    let removalId;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/removal-request/removal-request')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ reason: 'Test decide.' });
      removalId = createRes.body.id;
    });

    test('parent can approve a removal request', async () => {
      const res = await request(app)
        .put(`/removal-request/removal-request/${removalId}/decide`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('approved');
      expect(res.body.request.decidedAt).toBeDefined();
    });

    test('invalid decision value returns 400', async () => {
      // Create a new request to decide on
      const createRes = await request(app)
        .post('/removal-request/removal-request')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ reason: 'Another request.' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/removal-request/removal-request/${id}/decide`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ decision: 'maybe' });

      expect(res.status).toBe(400);
    });
  });

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  describe('POST /heartbeat', () => {
    test('child can send a heartbeat', async () => {
      const res = await request(app)
        .post('/heartbeat/heartbeat')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ deviceId: 'device-abc', policyVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    test('parent cannot send a heartbeat (403)', async () => {
      const res = await request(app)
        .post('/heartbeat/heartbeat')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ deviceId: 'device-abc' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /device-status/:childId', () => {
    test('returns VERIFIED when heartbeat is recent', async () => {
      // Send a fresh heartbeat first
      await request(app)
        .post('/heartbeat/heartbeat')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ deviceId: 'device-abc', policyVersion: 1 });

      const res = await request(app)
        .get('/device-status/device-status/child-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('VERIFIED');
    });

    test('returns OFFLINE when last heartbeat is older than 5 minutes', async () => {
      // Manually backdating the heartbeat store entry
      heartbeats.set('child-1', {
        deviceId: 'device-abc',
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        policyVersion: 1,
      });

      const res = await request(app)
        .get('/device-status/device-status/child-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OFFLINE');
    });

    test('returns UNVERIFIED when no heartbeat has been received', async () => {
      // Temporarily clear the heartbeat for child-1 to get UNVERIFIED.
      // Since the OFFLINE test already set an old timestamp, we delete it.
      heartbeats.delete('child-1');

      const res = await request(app)
        .get('/device-status/device-status/child-1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNVERIFIED');
    });
  });
});
