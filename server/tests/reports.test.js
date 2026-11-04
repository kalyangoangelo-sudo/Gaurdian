/**
 * tests/reports.test.js
 *
 * Tests for SafeReport endpoints.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-for-reports-tests-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { createReportsRouter } = require('../src/routes/reports');
const { createCasesStore } = require('../src/store');

// Build a minimal test app
function buildApp() {
  const app = express();
  app.use(express.json());

  const CASES = createCasesStore();
  const RELATIONSHIPS = new Map();

  app.use('/reports', createReportsRouter(CASES, RELATIONSHIPS, null));

  return { app, CASES };
}

describe('POST /reports/anonymous', () => {
  it('returns caseRef and recoverySecret on valid body', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Cyberbullying', description: 'Test description', safeToContact: false });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('caseRef');
    expect(res.body).toHaveProperty('recoverySecret');
    expect(typeof res.body.caseRef).toBe('string');
    expect(typeof res.body.recoverySecret).toBe('string');
  });

  it('returns 400 on invalid category', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'InvalidCategory', description: 'Test', safeToContact: false });

    expect(res.status).toBe(400);
  });

  it('returns 400 when description is missing', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Threats', safeToContact: false });

    expect(res.status).toBe(400);
  });
});

describe('POST /reports/check-status', () => {
  it('returns status with valid caseRef and recoverySecret', async () => {
    const { app } = buildApp();

    // First submit a report
    const submitRes = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Grooming', description: 'Details here', safeToContact: true });

    expect(submitRes.status).toBe(201);
    const { caseRef, recoverySecret } = submitRes.body;

    // Now check status
    const statusRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef, recoverySecret });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toHaveProperty('caseRef', caseRef);
    expect(statusRes.body).toHaveProperty('status', 'Submitted');
    expect(statusRes.body).toHaveProperty('category', 'Grooming');
    expect(statusRes.body).toHaveProperty('createdAt');
    expect(statusRes.body).toHaveProperty('updatedAt');
    // Must NOT expose notes
    expect(statusRes.body).not.toHaveProperty('notes');
  });

  it('returns 401 with wrong recoverySecret', async () => {
    const { app } = buildApp();

    const submitRes = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Threats', description: 'Some threat', safeToContact: false });

    const { caseRef } = submitRes.body;

    const statusRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef, recoverySecret: 'wrong-secret-that-wont-match-anything' });

    expect(statusRes.status).toBe(401);
  });

  it('returns 401 with unknown caseRef', async () => {
    const { app } = buildApp();

    const statusRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef: 'DEADBEEF', recoverySecret: 'any-secret' });

    expect(statusRes.status).toBe(401);
  });
});
