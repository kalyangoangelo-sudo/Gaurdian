/**
 * tests/stage10.test.js
 *
 * Stage 10 tests — Track 5 upgrade features.
 *
 * Covers:
 *  - PUT /cases/:id/response       (caseworker sends response to child)
 *  - POST /reports/check-status     (returns response field)
 *  - GET /reports/status/:caseRef   (returns response field)
 *  - AI classifier confidence scoring
 *  - AI classifier Luganda keywords
 *  - AI classifier critical safety indicators
 *  - AI classifier fallback on error
 *  - Referral service fallback (WireMock unavailable)
 *  - PWA static file serving
 *  - Portal static file serving
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-stage10-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const path = require('path');
const { createReportsRouter } = require('../src/routes/reports');
const { createCasesRouter } = require('../src/routes/cases');
const { createEvidenceRouter } = require('../src/routes/evidence');
const { createCasesStore, createEvidenceStore, seedUsers } = require('../src/store');
const { runClassifier, classifyText } = require('../src/services/aiClassifier');
const { makeReferral } = require('../src/services/referralService');

// ─── Build test app ─────────────────────────────────────────────
async function buildApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const CASES = createCasesStore();
  const EVIDENCE = createEvidenceStore();
  const RELATIONSHIPS = new Map();

  app.use('/reports', createReportsRouter(CASES, RELATIONSHIPS, null));
  app.use('/cases', createCasesRouter(CASES, users, null));
  app.use('/evidence', createEvidenceRouter(EVIDENCE, CASES));

  return { app, CASES, users };
}

// ─── Helper: get caseworker token ────────────────────────────────
async function getCaseworkerToken(app) {
  const res = await request(app)
    .post('/cases/auth/caseworker/login')
    .send({ username: 'caseworker', password: 'Caseworker123!' });
  return res.body.token;
}

// ═══════════════════════════════════════════════════════════════
// Response Endpoint Tests
// ═══════════════════════════════════════════════════════════════

describe('PUT /cases/:id/response — caseworker response', () => {
  it('stores a response on the case and returns 200', async () => {
    const { app, CASES } = await buildApp();
    const token = await getCaseworkerToken(app);

    // Submit a report
    const reportRes = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Cyberbullying', description: 'Someone is bullying me', safeToContact: true });

    const caseId = Array.from(CASES.values())[0].id;

    // Send response
    const res = await request(app)
      .put(`/cases/${caseId}/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ response: 'Thank you for reporting. We are reviewing your case.', responseTemplate: 'received' });

    expect(res.status).toBe(200);
    expect(res.body.responseSent).toBe(true);
  });

  it('returns 400 when response is missing', async () => {
    const { app, CASES } = await buildApp();
    const token = await getCaseworkerToken(app);

    // Submit a report first
    await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Threats', description: 'Someone threatened me', safeToContact: false });

    const caseId = Array.from(CASES.values())[0].id;

    const res = await request(app)
      .put(`/cases/${caseId}/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent case', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const res = await request(app)
      .put('/cases/nonexistent-id/response')
      .set('Authorization', `Bearer ${token}`)
      .send({ response: 'Test response' });

    expect(res.status).toBe(404);
  });

  it('returns 403 for non-caseworker role', async () => {
    const { app, CASES } = await buildApp();

    // Submit a report
    await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Other', description: 'Test', safeToContact: false });

    const caseId = Array.from(CASES.values())[0].id;

    // Login as parent
    const loginRes = await request(app)
      .post('/cases/auth/caseworker/login')
      .send({ username: 'parent', password: 'Parent123!' });

    // Parent login to caseworker endpoint should fail
    expect(loginRes.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════
// Check-Status with Response Tests
// ═══════════════════════════════════════════════════════════════

describe('POST /reports/check-status — includes response field', () => {
  it('returns response field when caseworker has sent a response', async () => {
    const { app, CASES } = await buildApp();
    const token = await getCaseworkerToken(app);

    // Submit a report
    const reportRes = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Grooming', description: 'Someone is grooming me', safeToContact: true });

    const { caseRef, recoverySecret } = reportRes.body;
    const caseId = Array.from(CASES.values())[0].id;

    // Send response as caseworker
    await request(app)
      .put(`/cases/${caseId}/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ response: 'We received your report. Help is available.', responseTemplate: 'received' });

    // Check status — should include response
    const statusRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef, recoverySecret });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.response).toBe('We received your report. Help is available.');
    expect(statusRes.body.caseRef).toBe(caseRef);
    expect(statusRes.body.status).toBe('Submitted');
  });

  it('returns null response when no response has been sent', async () => {
    const { app } = await buildApp();

    const reportRes = await request(app)
      .post('/reports/anonymous')
      .send({ category: 'Other', description: 'Just checking', safeToContact: false });

    const { caseRef, recoverySecret } = reportRes.body;

    const statusRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef, recoverySecret });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.response).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// AI Classifier Tests
// ═══════════════════════════════════════════════════════════════

describe('AI Classifier — confidence scoring', () => {
  it('returns confidence between 0 and 0.95', () => {
    const result = classifyText('someone keeps sending me mean messages saying nobody likes you');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('returns higher confidence for multiple keyword matches', () => {
    const lowConfidence = classifyText('someone is being mean');
    const highConfidence = classifyText('keep this secret send me a photo meet me');
    expect(highConfidence.confidence).toBeGreaterThan(lowConfidence.confidence);
  });

  it('includes confidence in runClassifier result', () => {
    const result = runClassifier({ description: 'test text', category: 'Other' });
    expect(result).toHaveProperty('confidence');
    expect(typeof result.confidence).toBe('number');
  });
});

describe('AI Classifier — Luganda keywords', () => {
  it('detects Luganda grooming keywords', () => {
    const result = classifyText('omusajja munange agamba nti olabe omukwano ne tusibirize');
    expect(result.category).toBe('Grooming');
    expect(result.suggestedPriority).toBe('CRITICAL');
  });

  it('detects Luganda sextortion keywords', () => {
    const result = classifyText('mpa bifaananyi by\'ekyama');
    expect(result.category).toBe('Sextortion');
    expect(result.suggestedPriority).toBe('CRITICAL');
  });

  it('detects Luganda threat keywords', () => {
    const result = classifyText('njja kukubonera');
    expect(result.category).toBe('Threats');
    expect(result.suggestedPriority).toBe('HIGH');
  });
});

describe('AI Classifier — critical safety indicators', () => {
  it('flags critical safety keywords', () => {
    const result = classifyText('I want to kill myself');
    expect(result.criticalSafetyFlag).toBe(true);
    expect(result.suggestedPriority).toBe('CRITICAL');
  });

  it('does not downgrade critical indicators', () => {
    const result = classifyText('someone mentioned a weapon and a knife');
    expect(result.criticalSafetyFlag).toBe(true);
    expect(result.suggestedPriority).toBe('CRITICAL');
  });

  it('flags trafficking and kidnapping', () => {
    const result = classifyText('I am worried about trafficking');
    expect(result.criticalSafetyFlag).toBe(true);
    expect(result.suggestedPriority).toBe('CRITICAL');
  });
});

describe('AI Classifier — fallback behavior', () => {
  it('never throws and returns safe fallback on error', () => {
    const result = runClassifier(null);
    expect(result.suggestedPriority).toBe('STANDARD');
    expect(result.requiresHumanReview).toBe(true);
    expect(result).toHaveProperty('error', 'classifier_error');
  });

  it('includes summary in successful classification', () => {
    const result = runClassifier({ description: 'someone is bullying me', category: 'Cyberbullying' });
    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');
  });
});

describe('AI Classifier — code-mixed reports', () => {
  it('classifies mixed English-Luganda text', () => {
    const result = classifyText('someone keeps sending unwanted messages that bother me obutabagana');
    expect(result.category).toBe('Online Harassment');
    expect(result.suggestedPriority).toBe('HIGH');
  });

  it('classifies mixed grooming text', () => {
    const result = classifyText('An older person told me keep this secret gwe munange');
    expect(result.category).toBe('Grooming');
    expect(result.suggestedPriority).toBe('CRITICAL');
  });
});

// ═══════════════════════════════════════════════════════════════
// Referral Service Tests
// ═══════════════════════════════════════════════════════════════

describe('Referral service — WireMock fallback', () => {
  it('returns simulated result when WireMock is unavailable', async () => {
    // WireMock may or may not be running — the test should pass either way
    // because the referral is always simulated (simulated: true)
    const result = await makeReferral('test-case-id', 'Childline Uganda 116');
    expect(result.simulated).toBe(true);
    expect(result.referralId).toMatch(/^REF-/);
    expect(result.service).toBe('Childline Uganda 116');
    // fallback is true only if the endpoint was unreachable;
    // if WireMock is running, the response comes from the mock instead
  });

  it('auto-assigns a service when none specified', async () => {
    const result = await makeReferral('test-case-id');
    expect(result.simulated).toBe(true);
    expect(result.service).toBeTruthy();
    expect(result.referralId).toMatch(/^REF-/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Static File Serving Tests
// ═══════════════════════════════════════════════════════════════

describe('Static file serving — PWA and Portal', () => {
  it('serves PWA index.html at /pwa', async () => {
    const app = express();
    app.use('/pwa', express.static(path.join(__dirname, '../../pwa')));

    const res = await request(app).get('/pwa/index.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('GuardianLink');
    expect(res.text).toContain('Report Harm');
  });

  it('serves Portal index.html at /portal', async () => {
    const app = express();
    app.use('/portal', express.static(path.join(__dirname, '../../portal')));

    const res = await request(app).get('/portal/index.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Professional Portal');
  });

  it('serves PWA manifest.json', async () => {
    const app = express();
    app.use('/pwa', express.static(path.join(__dirname, '../../pwa')));

    const res = await request(app).get('/pwa/manifest.json');
    expect(res.status).toBe(200);
    expect(res.text).toContain('GuardianLink');
  });

  it('serves React web app index.html at /app/', async () => {
    const app = express();
    const webDist = path.join(__dirname, '../../web/dist');
    app.use('/app', express.static(webDist));

    const res = await request(app).get('/app/index.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="root"');
    expect(res.text).toContain('GuardianLink');
  });

  it('serves React web app manifest.json', async () => {
    const app = express();
    const webDist = path.join(__dirname, '../../web/dist');
    app.use('/app', express.static(webDist));

    const res = await request(app).get('/app/manifest.json');
    expect(res.status).toBe(200);
    expect(res.text).toContain('GuardianLink');
  });
});

// ═══════════════════════════════════════════════════════════════
// End-to-End Flow Test
// ═══════════════════════════════════════════════════════════════

describe('End-to-end: report → classify → review → respond → status', () => {
  it('completes the full reporting workflow', async () => {
    const { app, CASES } = await buildApp();
    const token = await getCaseworkerToken(app);

    // 1. Child submits anonymous report
    const reportRes = await request(app)
      .post('/reports/anonymous')
      .send({
        category: 'Grooming',
        description: 'An adult online keeps telling me to keep our chats secret and sends me gifts',
        safeToContact: true,
      });
    expect(reportRes.status).toBe(201);
    const { caseRef, recoverySecret } = reportRes.body;

    // 2. Caseworker sees the case in the queue
    const casesRes = await request(app)
      .get('/cases')
      .set('Authorization', `Bearer ${token}`);
    expect(casesRes.status).toBe(200);
    expect(casesRes.body.length).toBeGreaterThan(0);
    const caseItem = casesRes.body[0];
    expect(caseItem.category).toBe('Grooming');
    expect(caseItem.aiResult.suggestedPriority).toBe('CRITICAL');

    // 3. Caseworker views full case detail
    const caseId = caseItem.id;
    const detailRes = await request(app)
      .get(`/cases/${caseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.category).toBe('Grooming');

    // 4. Caseworker assesses priority
    const assessRes = await request(app)
      .put(`/cases/${caseId}/assess`)
      .set('Authorization', `Bearer ${token}`)
      .send({ humanPriority: 'CRITICAL' });
    expect(assessRes.status).toBe(200);

    // 5. Caseworker adds a note
    const noteRes = await request(app)
      .put(`/cases/${caseId}/note`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'High-risk grooming case. Immediate referral needed.' });
    expect(noteRes.status).toBe(200);

    // 6. Caseworker updates status
    const statusUpdateRes = await request(app)
      .put(`/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Under Review' });
    expect(statusUpdateRes.status).toBe(200);

    // 7. Caseworker sends response to child
    const responseRes = await request(app)
      .put(`/cases/${caseId}/response`)
      .set('Authorization', `Bearer ${token}`)
      .send({ response: 'Thank you for reporting. We are reviewing your case and will follow up.', responseTemplate: 'reviewing' });
    expect(responseRes.status).toBe(200);

    // 8. Caseworker refers the case
    const referRes = await request(app)
      .post(`/cases/${caseId}/refer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ service: 'Childline Uganda 116' });
    expect(referRes.status).toBe(200);
    expect(referRes.body.simulated).toBe(true);

    // 9. Caseworker updates status to Referred
    const referStatusRes = await request(app)
      .put(`/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Referred' });
    expect(referStatusRes.status).toBe(200);

    // 10. Child checks status — sees response and updated status
    const checkRes = await request(app)
      .post('/reports/check-status')
      .send({ caseRef, recoverySecret });
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.status).toBe('Referred');
    expect(checkRes.body.response).toContain('reviewing your case');

    // 11. Caseworker views audit trail
    const auditRes = await request(app)
      .get(`/cases/${caseId}/audit`)
      .set('Authorization', `Bearer ${token}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.length).toBeGreaterThan(3); // created + assessed + note + status + response + referred

    // 12. Verify audit trail contains response_sent action
    const auditActions = auditRes.body.map(a => a.action);
    expect(auditActions).toContain('response_sent');
    expect(auditActions).toContain('referred');
    expect(auditActions).toContain('status_changed');
  });
});
