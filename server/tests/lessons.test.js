/**
 * tests/lessons.test.js
 *
 * Tests for Learning Library backend.
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-lessons-xyz';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { createLessonsRouter } = require('../src/routes/lessons');
const { createLessonsStore, createQuizResultsStore, createLessonAssignmentsStore, seedUsers } = require('../src/store');
const { createCasesRouter } = require('../src/routes/cases');
const { createCasesStore } = require('../src/store');

async function buildApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const LESSONS = createLessonsStore();
  const QUIZ_RESULTS = createQuizResultsStore();
  const ASSIGNMENTS = createLessonAssignmentsStore();
  const CASES = createCasesStore();

  app.use('/lessons', createLessonsRouter(LESSONS, QUIZ_RESULTS, ASSIGNMENTS, null));
  app.use('/cases', createCasesRouter(CASES, users, null));

  return { app, LESSONS, QUIZ_RESULTS, ASSIGNMENTS };
}

async function getChildToken(app) {
  const res = await request(app)
    .post('/cases/auth/caseworker/login')
    .send({ username: 'child', password: 'Child123!' });
  // This won't work because it's caseworker login endpoint
  // Let's use the regular login instead
  const loginRes = await request(app)
    .post('/login')
    .send({ username: 'child', password: 'Child123!' });

  // Actually, we need auth router too
  return loginRes.body.token;
}

async function getTeacherToken(app) {
  // Login as teacher via the cases router (which has auth/caseworker/login)
  // Actually teachers login via /login
  const loginRes = await request(app)
    .post('/login')
    .send({ username: 'teacher', password: 'Teacher123!' });
  return loginRes.body.token;
}

async function getFullApp() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  const users = await seedUsers();
  const LESSONS = createLessonsStore();
  const QUIZ_RESULTS = createQuizResultsStore();
  const ASSIGNMENTS = createLessonAssignmentsStore();
  const CASES = createCasesStore();

  const { createAuthRouter } = require('../src/routes/auth');
  app.use('/login', createAuthRouter(users));
  app.use('/lessons', createLessonsRouter(LESSONS, QUIZ_RESULTS, ASSIGNMENTS, null));
  app.use('/cases', createCasesRouter(CASES, users, null));

  return { app, LESSONS, QUIZ_RESULTS, ASSIGNMENTS };
}

describe('Learning Library — GET /lessons', () => {
  it('returns seeded lessons', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('hasQuiz');
  });

  it('supports Luganda language', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons?lang=lg');

    expect(res.status).toBe(200);
    // Should return Luganda titles if available
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('filters by age band', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons?ageBand=10-13');

    expect(res.status).toBe(200);
    res.body.forEach(l => {
      expect(['10-13', 'all']).toContain(l.ageBand);
    });
  });
});

describe('Learning Library — GET /lessons/:id', () => {
  it('returns lesson content', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons/lesson-bullying');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('content');
    expect(res.body).toHaveProperty('quiz');
    expect(res.body.quiz.length).toBeGreaterThan(0);
  });

  it('returns 404 for non-existent lesson', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns Luganda content when requested', async () => {
    const { app } = await buildApp();
    const res = await request(app).get('/lessons/lesson-privacy?lang=lg');

    expect(res.status).toBe(200);
    expect(res.body.title).toBeTruthy();
  });
});

describe('Learning Library — quiz submission', () => {
  it('scores a quiz correctly', async () => {
    const { app } = await getFullApp();
    const childToken = await getChildToken(app);

    const res = await request(app)
      .post('/lessons/lesson-bullying/quiz/submit')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ answers: [1, 1] }); // Both correct

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(2);
    expect(res.body.totalQuestions).toBe(2);
    expect(res.body.passed).toBe(true);
  });

  it('marks quiz as failed with wrong answers', async () => {
    const { app } = await getFullApp();
    const childToken = await getChildToken(app);

    const res = await request(app)
      .post('/lessons/lesson-bullying/quiz/submit')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ answers: [0, 0] }); // Both wrong

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.passed).toBe(false);
  });

  it('rejects unauthenticated quiz submission', async () => {
    const { app } = await getFullApp();

    const res = await request(app)
      .post('/lessons/lesson-bullying/quiz/submit')
      .send({ answers: [1, 1] });

    expect(res.status).toBe(401);
  });
});

describe('Learning Library — teacher assignment', () => {
  it('teacher can assign a lesson', async () => {
    const { app } = await getFullApp();
    const teacherToken = await getTeacherToken(app);

    const res = await request(app)
      .post('/lessons/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ lessonId: 'lesson-privacy', classId: 'class-5a' });

    expect(res.status).toBe(201);
    expect(res.body.assigned).toBe(true);
  });

  it('rejects non-teacher from assigning lessons', async () => {
    const { app } = await getFullApp();
    const childToken = await getChildToken(app);

    const res = await request(app)
      .post('/lessons/assign')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ lessonId: 'lesson-privacy' });

    expect(res.status).toBe(403);
  });

  it('teacher can view own assignments', async () => {
    const { app, ASSIGNMENTS } = await getFullApp();
    const teacherToken = await getTeacherToken(app);

    // Assign a lesson first
    await request(app)
      .post('/lessons/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ lessonId: 'lesson-help', classId: 'class-5b' });

    // Get teacher ID from token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(teacherToken);

    const res = await request(app)
      .get('/lessons/assignments/' + decoded.id)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('lessonTitle');
  });
});

describe('Learning Library — lesson creation', () => {
  it('teacher can create a lesson', async () => {
    const { app } = await getFullApp();
    const teacherToken = await getTeacherToken(app);

    const res = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Safe social media use',
        content: 'Here are tips for staying safe on social media...',
        ageBand: '10-13',
        category: 'safety',
        quiz: [{ question: 'Should you share your location on social media?', options: ['Yes always', 'No, be careful'], correctAnswer: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

describe('Learning Library — progress tracking', () => {
  it('parent can view child progress', async () => {
    const { app } = await getFullApp();
    const childToken = await getChildToken(app);

    // Submit a quiz first
    await request(app)
      .post('/lessons/lesson-bullying/quiz/submit')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ answers: [1, 1] });

    // Login as parent
    const parentLoginRes = await request(app)
      .post('/login')
      .send({ username: 'parent', password: 'Parent123!' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(childToken);

    const res = await request(app)
      .get('/lessons/progress/' + decoded.id)
      .set('Authorization', `Bearer ${parentLoginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('score');
    expect(res.body[0]).toHaveProperty('passed');
  });
});
