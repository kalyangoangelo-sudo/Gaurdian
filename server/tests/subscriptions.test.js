/**
 * tests/subscriptions.test.js
 *
 * Tests for subscription administration.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-subs-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { createSubscriptionsRouter, PLANS } = require('../src/routes/subscriptions');
const { createSubscriptionsStore, createOrganizationsStore, createDemoRequestsStore, seedUsers } = require('../src/store');
const { createCasesRouter } = require('../src/routes/cases');
const { createCasesStore } = require('../src/store');
const { createOrganizationsRouter } = require('../src/routes/organizations');

async function buildApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const SUBSCRIPTIONS = createSubscriptionsStore();
  const ORGS = createOrganizationsStore();
  const DEMO_REQUESTS = createDemoRequestsStore();
  const CASES = createCasesStore();

  app.use('/subscriptions', createSubscriptionsRouter(SUBSCRIPTIONS, ORGS));
  app.use('/organizations', createOrganizationsRouter(ORGS, DEMO_REQUESTS));
  app.use('/cases', createCasesRouter(CASES, users, null));

  return { app, SUBSCRIPTIONS, ORGS };
}

async function getCaseworkerToken(app) {
  const res = await request(app)
    .post('/cases/auth/caseworker/login')
    .send({ username: 'caseworker', password: 'Caseworker123!' });
  return res.body.token;
}

describe('Subscriptions — GET /subscriptions/:orgId', () => {
  it('returns free plan for existing org without subscription', async () => {
    const { app, ORGS } = await buildApp();

    // Register an org
    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'free', contactEmail: 'test@test.com' });

    const res = await request(app).get('/subscriptions/' + regRes.body.id);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    expect(res.body.status).toBe('active');
  });

  it('returns 404 for non-existent org', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/subscriptions/nonexistent-org');
    expect(res.status).toBe(404);
  });
});

describe('Subscriptions — POST /subscriptions', () => {
  it('creates a subscription for an org', async () => {
    const { app } = await buildApp();

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'school-starter', contactEmail: 'test@test.com' });

    const res = await request(app)
      .post('/subscriptions')
      .send({ orgId: regRes.body.id, plan: 'school-starter' });

    expect(res.status).toBe(201);
    expect(res.body.plan).toBe('school-starter');
    expect(res.body.status).toBe('trial');
  });

  it('returns 400 for invalid plan', async () => {
    const { app } = await buildApp();

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'free' });

    const res = await request(app)
      .post('/subscriptions')
      .send({ orgId: regRes.body.id, plan: 'invalid-plan' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent org', async () => {
    const { app } = await buildApp();
    const res = await request(app)
      .post('/subscriptions')
      .send({ orgId: 'nonexistent', plan: 'free' });

    expect(res.status).toBe(404);
  });
});

describe('Subscriptions — PUT /subscriptions/:orgId/plan', () => {
  it('caseworker can change plan', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'free' });

    const res = await request(app)
      .put('/subscriptions/' + regRes.body.id + '/plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'family' });

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('family');
    expect(res.body.previousPlan).toBe('free');
  });

  it('rejects non-caseworker from changing plan', async () => {
    const { app } = await buildApp();

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'free' });

    const res = await request(app)
      .put('/subscriptions/' + regRes.body.id + '/plan')
      .send({ plan: 'family' });

    expect(res.status).toBe(401);
  });
});

describe('Subscriptions — billing (simulated)', () => {
  it('creates a simulated billing record', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'school-starter' });

    await request(app)
      .post('/subscriptions')
      .send({ orgId: regRes.body.id, plan: 'school-starter' });

    const res = await request(app)
      .post('/subscriptions/' + regRes.body.id + '/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, method: 'mtn_mobile_money' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SIMULATED');
    expect(res.body.method).toBe('mtn_mobile_money');
  });

  it('returns billing history', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'school-starter' });

    await request(app)
      .post('/subscriptions')
      .send({ orgId: regRes.body.id, plan: 'school-starter' });

    await request(app)
      .post('/subscriptions/' + regRes.body.id + '/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000 });

    const res = await request(app)
      .get('/subscriptions/' + regRes.body.id + '/billing')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].status).toBe('SIMULATED');
  });

  it('rejects billing for free plan', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'free' });

    const res = await request(app)
      .post('/subscriptions/' + regRes.body.id + '/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
  });
});

describe('Subscriptions — entitlements', () => {
  it('returns free features for free plan', async () => {
    const { app } = await buildApp();

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test Org', type: 'school', plan: 'free' });

    const res = await request(app).get('/subscriptions/' + regRes.body.id + '/entitlements');

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    expect(res.body.features).toContain('anonymous_reporting');
    expect(res.body.essentialFeaturesAlwaysFree).toBe(true);
  });

  it('returns premium features for school-starter plan', async () => {
    const { app } = await buildApp();

    const regRes = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'school-starter' });

    const res = await request(app).get('/subscriptions/' + regRes.body.id + '/entitlements');

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('school-starter');
    expect(res.body.features).toContain('lesson_assignments');
  });
});
