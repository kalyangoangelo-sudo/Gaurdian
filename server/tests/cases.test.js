/**
 * tests/cases.test.js
 *
 * Tests for case management endpoints.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-for-cases-tests-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createCasesRouter } = require('../src/routes/cases');
const { createReportsRouter } = require('../src/routes/reports');
const { createCasesStore } = require('../src/store');

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const parentToken = makeToken({ id: 'parent-1', username: 'parent', role: 'parent' });
const childToken = makeToken({ id: 'child-1', username: 'child', role: 'child' });
const caseworkerToken = makeToken({ id: 'caseworker-1', username: 'caseworker', role: 'caseworker' });

function buildApp() {
  const app = express();
  app.use(express.json());

  const CASES = createCasesStore();
  const RELATIONSHIPS = new Map([['child-1', 'parent-1']]);

  // Seed USERS map with caseworker for login test
  const USERS = new Map([
    ['caseworker-1', {
      id: 'caseworker-1',
      username: 'caseworker',
      email: 'caseworker@guardian.app',
      hash: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      role: 'caseworker',
    }],
  ]);

  app.use('/reports', createReportsRouter(CASES, RELATIONSHIPS, null));
  app.use('/cases', createCasesRouter(CASES, USERS, null));
  app.use('/', createCasesRouter(CASES, USERS, null));

  return { app, CASES };
}

async function submitCase(app) {
  const res = await request(app)
    .post('/reports/anonymous')
    .send({ category: 'Threats', description: 'Test threat report', safeToContact: false });
  return res.body;
}

describe('GET /cases', () => {
  it('returns 403 with parent JWT', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get('/cases')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 with child JWT', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get('/cases')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with caseworker JWT', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get('/cases')
      .set('Authorization', `Bearer ${caseworkerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 with no token', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/cases');
    expect(res.status).toBe(401);
  });
});

describe('PUT /cases/:id/assess', () => {
  it('updates humanPriority', async () => {
    const { app, CASES } = buildApp();

    // Submit a case to get an ID
    await submitCase(app);
    const caseId = Array.from(CASES.keys())[0];

    const res = await request(app)
      .put(`/cases/${caseId}/assess`)
      .set('Authorization', `Bearer ${caseworkerToken}`)
      .send({ humanPriority: 'HIGH' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('humanPriority', 'HIGH');

    // Verify stored
    expect(CASES.get(caseId).humanPriority).toBe('HIGH');
  });

  it('returns 400 for invalid priority', async () => {
    const { app, CASES } = buildApp();
    await submitCase(app);
    const caseId = Array.from(CASES.keys())[0];

    const res = await request(app)
      .put(`/cases/${caseId}/assess`)
      .set('Authorization', `Bearer ${caseworkerToken}`)
      .send({ humanPriority: 'SUPER_URGENT' });

    expect(res.status).toBe(400);
  });
});
