/**
 * tests/curiosity.test.js
 *
 * Tests for Curiosity Corner backend.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-curiosity-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { createCuriosityRouter, RESPONSE_TEMPLATES } = require('../src/routes/curiosity');
const { createCuriosityStore } = require('../src/store');
const { seedUsers } = require('../src/store');
const { createCasesRouter } = require('../src/routes/cases');
const { createCasesStore } = require('../src/store');

async function buildApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const CURIOSITY = createCuriosityStore();
  const CASES = createCasesStore();

  app.use('/curiosity', createCuriosityRouter(CURIOSITY, null));
  app.use('/cases', createCasesRouter(CASES, users, null));

  return { app, CURIOSITY };
}

async function getCaseworkerToken(app) {
  const res = await request(app)
    .post('/cases/auth/caseworker/login')
    .send({ username: 'caseworker', password: 'Caseworker123!' });
  return res.body.token;
}

describe('Curiosity Corner — POST /curiosity/ask', () => {
  it('returns questionRef and auto-response for general questions', async () => {
    const { app } = await buildApp();
    const res = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'What is cyberbullying and what can I do?' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('questionRef');
    expect(res.body).toHaveProperty('response');
    expect(res.body.responseSource).toBe('template');
    expect(res.body.status).toBe('answered');
  });

  it('flags serious questions and suggests reporting', async () => {
    const { app } = await buildApp();
    const res = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'Someone said they will kill me if I tell anyone' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('flagged');
    expect(res.body.isSeriousFlag || res.body.warning).toBeTruthy();
    expect(res.body.suggestedAction).toBe('report');
  });

  it('returns 400 when question is missing', async () => {
    const { app } = await buildApp();
    const res = await request(app)
      .post('/curiosity/ask')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when question is too long', async () => {
    const { app } = await buildApp();
    const res = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'x'.repeat(501) });

    expect(res.status).toBe(400);
  });
});

describe('Curiosity Corner — GET /curiosity/:id', () => {
  it('returns status and approved response', async () => {
    const { app, CURIOSITY } = await buildApp();

    const askRes = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'How do I keep my information private?' });

    const statusRes = await request(app)
      .get('/curiosity/' + askRes.body.id);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toHaveProperty('questionRef');
    expect(statusRes.body).toHaveProperty('response');
  });

  it('returns 404 for non-existent question', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/curiosity/nonexistent');
    expect(res.status).toBe(404);
  });

  it('does NOT expose the original question text', async () => {
    const { app } = await buildApp();

    const askRes = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'Tell me about online friends' });

    const statusRes = await request(app)
      .get('/curiosity/' + askRes.body.id);

    expect(statusRes.body).not.toHaveProperty('question');
  });
});

describe('Curiosity Corner — caseworker review', () => {
  it('lists pending questions for caseworker', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    // Submit a flagged question
    await request(app)
      .post('/curiosity/ask')
      .send({ question: 'Someone threatened to hurt me with a weapon' });

    const res = await request(app)
      .get('/curiosity/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('question');
    expect(res.body[0]).toHaveProperty('isSeriousFlag', true);
  });

  it('rejects parent from viewing pending questions', async () => {
    const { app } = await buildApp();

    // Try with no auth
    const res = await request(app)
      .get('/curiosity/pending');

    expect(res.status).toBe(401);
  });

  it('caseworker can approve a response', async () => {
    const { app, CURIOSITY } = await buildApp();
    const token = await getCaseworkerToken(app);

    // Submit a flagged question
    const askRes = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'Someone wants to send me gifts and meet me' });

    const res = await request(app)
      .put('/curiosity/' + askRes.body.id + '/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ response: 'Please tell a trusted adult about this person. Tap Report Harm to get help.', templateKey: 'friends' });

    expect(res.status).toBe(200);
    expect(res.body.responseSent).toBe(true);
  });

  it('caseworker can categorize a question', async () => {
    const { app } = await buildApp();
    const token = await getCaseworkerToken(app);

    const askRes = await request(app)
      .post('/curiosity/ask')
      .send({ question: 'How do I set boundaries?' });

    const res = await request(app)
      .put('/curiosity/' + askRes.body.id + '/categorize')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'boundaries' });

    expect(res.status).toBe(200);
    expect(res.body.category).toBe('boundaries');
  });
});
