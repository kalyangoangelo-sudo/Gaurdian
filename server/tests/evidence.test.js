/**
 * tests/evidence.test.js
 *
 * Tests for evidence upload, verification, and organization endpoints.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-for-evidence-tests-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createEvidenceRouter } = require('../src/routes/evidence');
const { createOrganizationsRouter } = require('../src/routes/organizations');
const { createEvidenceStore, createCasesStore, createOrganizationsStore, createDemoRequestsStore } = require('../src/store');

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const caseworkerToken = makeToken({ id: 'caseworker-1', username: 'caseworker', role: 'caseworker' });
const childToken = makeToken({ id: 'child-1', username: 'child', role: 'child' });

function buildEvidenceApp() {
  const app = express();
  app.use(express.json());

  const EVIDENCE = createEvidenceStore();
  const CASES = createCasesStore();

  app.use('/evidence', createEvidenceRouter(EVIDENCE, CASES));

  return { app, EVIDENCE, CASES };
}

function buildOrgApp() {
  const app = express();
  app.use(express.json());

  const ORGS = createOrganizationsStore();
  const DEMO_REQUESTS = createDemoRequestsStore();

  app.use('/organizations', createOrganizationsRouter(ORGS, DEMO_REQUESTS));

  return { app, ORGS, DEMO_REQUESTS };
}

describe('POST /evidence/:caseId', () => {
  it('returns sha256 and metadata for uploaded file', async () => {
    const { app } = buildEvidenceApp();

    const res = await request(app)
      .post('/evidence/case-001')
      .set('Authorization', `Bearer ${childToken}`)
      .attach('file', Buffer.from('hello world'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('caseId', 'case-001');
    expect(res.body).toHaveProperty('filename', 'test.txt');
    expect(res.body).toHaveProperty('size');
    expect(res.body).toHaveProperty('sha256');
    expect(res.body).toHaveProperty('uploadedAt');
    // Verify sha256 is a hex string of correct length
    expect(res.body.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns 400 for disallowed mime type', async () => {
    const { app } = buildEvidenceApp();

    const res = await request(app)
      .post('/evidence/case-001')
      .set('Authorization', `Bearer ${childToken}`)
      .attach('file', Buffer.from('<html>'), { filename: 'test.html', contentType: 'text/html' });

    expect(res.status).toBe(400);
  });

  it('returns 401 with no token', async () => {
    const { app } = buildEvidenceApp();

    const res = await request(app)
      .post('/evidence/case-001')
      .attach('file', Buffer.from('data'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(401);
  });
});

describe('GET /evidence/verify/:evidenceId', () => {
  it('returns VERIFIED for an unmodified file', async () => {
    const { app, EVIDENCE } = buildEvidenceApp();

    // Upload first
    const uploadRes = await request(app)
      .post('/evidence/case-002')
      .set('Authorization', `Bearer ${childToken}`)
      .attach('file', Buffer.from('integrity test'), { filename: 'integrity.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const { id } = uploadRes.body;

    // Verify
    const verifyRes = await request(app)
      .get(`/evidence/verify/${id}`)
      .set('Authorization', `Bearer ${caseworkerToken}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('status', 'VERIFIED');
    expect(verifyRes.body).toHaveProperty('storedHash');
    expect(verifyRes.body).toHaveProperty('currentHash');
    expect(verifyRes.body.storedHash).toBe(verifyRes.body.currentHash);
    expect(verifyRes.body).toHaveProperty('filename', 'integrity.txt');
  });

  it('returns TAMPERED when stored data is modified', async () => {
    const { app, EVIDENCE } = buildEvidenceApp();

    const uploadRes = await request(app)
      .post('/evidence/case-003')
      .set('Authorization', `Bearer ${childToken}`)
      .attach('file', Buffer.from('original content'), { filename: 'tamper.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const { id } = uploadRes.body;

    // Tamper with stored data
    const ev = EVIDENCE.get(id);
    ev.data = Buffer.from('tampered content').toString('base64');

    const verifyRes = await request(app)
      .get(`/evidence/verify/${id}`)
      .set('Authorization', `Bearer ${caseworkerToken}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('status', 'TAMPERED');
  });
});

describe('POST /organizations/register', () => {
  it('returns id and org details on valid registration', async () => {
    const { app } = buildOrgApp();

    const res = await request(app)
      .post('/organizations/register')
      .send({ name: 'Test School', type: 'school', plan: 'basic', contactEmail: 'admin@testschool.org' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Test School');
    expect(res.body).toHaveProperty('type', 'school');
    expect(res.body).toHaveProperty('plan', 'basic');
    expect(res.body).toHaveProperty('status', 'pending');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('returns 400 for invalid type', async () => {
    const { app } = buildOrgApp();
    const res = await request(app)
      .post('/organizations/register')
      .send({ name: 'Bad Org', type: 'university', plan: 'basic' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid plan', async () => {
    const { app } = buildOrgApp();
    const res = await request(app)
      .post('/organizations/register')
      .send({ name: 'Bad Org', type: 'school', plan: 'ultra' });
    expect(res.status).toBe(400);
  });
});

describe('POST /organizations/demo-request', () => {
  it('returns message and id', async () => {
    const { app } = buildOrgApp();

    const res = await request(app)
      .post('/organizations/demo-request')
      .send({ contactName: 'Alice', email: 'alice@example.com', orgName: 'Alice School' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('message', 'Demo request received. We will contact you within 24 hours.');
  });
});
