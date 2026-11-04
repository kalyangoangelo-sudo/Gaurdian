/**
 * routes/lessons.js
 *
 * Learning Library — educational content, quizzes, assignments, progress.
 *
 * Routes:
 *   GET  /lessons                – Public, list lessons (with age/category filter)
 *   GET  /lessons/:id             – Public, get lesson detail
 *   POST /lessons                 – Teacher/admin, create lesson
 *   PUT  /lessons/:id             – Teacher/admin, update lesson
 *   POST /lessons/:id/quiz/submit – Authenticated, submit quiz results
 *   GET  /lessons/progress/:childId – Parent/teacher, view child progress
 *   POST /lessons/assign          – Teacher, assign lesson to class
 *   GET  /lessons/assignments/:teacherId – Teacher, list own assignments
 *
 * Educational analytics NEVER expose confidential incident reports.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');

// ─── Sample lessons (seeded at startup) ───────────────────────────
const SAMPLE_LESSONS = [
  {
    id: 'lesson-bullying',
    title: 'What is cyberbullying?',
    titleLg: 'Kiki ekibulunta ku mutimbagano?',
    description: 'Learn what cyberbullying is and how to handle it.',
    descriptionLg: 'Yiga kiki ekibulunta ku mutimbagano n' +
      'okukikwatako.',
    content: 'Cyberbullying is when someone uses the internet to hurt, scare, or embarrass another person. This includes sending mean messages, spreading lies, or sharing embarrassing photos.\n\nWhat to do:\n1. Do not reply to the bully.\n2. Save the messages as evidence.\n3. Tell a trusted adult.\n4. Use the Report Harm button.\n5. Block the person if possible.\n\nRemember: what is happening is not your fault. You are not alone.',
    contentLg: 'Okubulunta ku mutimbagano kye kki? Kye kki ekintu omulala weyambisa ku mutimbagano okukosa, okutisa, oba okuswaza omulala. Mwalimu: okutuma obubaka obubi, okusaasaanya ebigambo, oba okwabula bifaananyi.\n\nKiki okole:\n1. Totadda ku mulala abulunta.\n2. Kungaanya obubaka ng' +
      'amanyisa.\n3. Tegereza omutwate omukulu.\n4. Kozesa kaboozi ka Report Harm.\n5. Ggirira omuntu singa obusobola.',
    ageBand: 'all',
    category: 'safety',
    order: 1,
    quiz: [
      { question: 'What should you do if someone sends you mean messages?', options: ['Reply angrily', 'Save the messages and tell an adult', 'Delete everything and say nothing'], correctAnswer: 1 },
      { question: 'Cyberbullying is your fault.', options: ['True', 'False'], correctAnswer: 1 },
    ],
  },
  {
    id: 'lesson-privacy',
    title: 'Keeping your information private',
    titleLg: 'Okukuuma amawulire go',
    description: 'Learn how to protect your personal information online.',
    descriptionLg: 'Yiga okukuulaama amawulire go ku mutimbagano.',
    content: 'Your personal information includes your full name, home address, phone number, school name, and photos. Never share these with strangers online.\n\nTips:\n1. Use a nickname, not your real name, on social media.\n2. Do not share your location.\n3. Use strong passwords and never share them.\n4. Check your privacy settings regularly.\n5. Be careful what photos you share.\n\nIf someone asks for your personal information and it makes you uncomfortable, tap Report Harm.',
    contentLg: 'Amawulire go mulimu: linnya lyo, addullesi yo, namba ya ssimu, ssomero, n' +
      'ebifaananyi. Bita biweebayo ku mutimbagano ku bantu abatomanyi.\n\n1. Kozesa linya eryatalinaamu linnya lyo.',
    ageBand: 'all',
    category: 'safety',
    order: 2,
    quiz: [
      { question: 'What information should you NOT share with strangers online?', options: ['Your favorite color', 'Your home address', 'Your favorite game'], correctAnswer: 1 },
      { question: 'You should use your real full name on social media.', options: ['True', 'False'], correctAnswer: 1 },
    ],
  },
  {
    id: 'lesson-friends',
    title: 'Online friends and strangers',
    titleLg: 'Bemmmwe n' + 'abageni ku mutimbagano',
    description: 'Learn how to stay safe when meeting people online.',
    descriptionLg: 'Yiga okubeera omulamu ng' + 'olabiriza n' + 'abantu ku mutimbagano.',
    content: 'Not everyone online is who they say they are. Some people pretend to be children when they are actually adults.\n\nWarning signs:\n1. Someone who wants to meet in person after talking for a short time.\n2. Someone who asks for personal information or photos.\n3. Someone who tells you to keep secrets from your parents.\n4. Someone who sends gifts or money.\n5. Someone who makes you feel uncomfortable.\n\nIf any of this happens, tell a trusted adult and use the Report Harm button. Real friends respect your boundaries.',
    contentLg: 'Tebuli omulala ku mutimbagano ye y' + 'agamba. Abamu balina obuntu obubi.',
    ageBand: 'all',
    category: 'safety',
    order: 3,
    quiz: [
      { question: 'What is a warning sign of a dangerous online friend?', options: ['They like the same games as you', 'They ask you to keep secrets from your parents', 'They live in the same country'], correctAnswer: 1 },
      { question: 'If someone sends you gifts and asks to meet, you should tell a trusted adult.', options: ['True', 'False'], correctAnswer: 0 },
    ],
  },
  {
    id: 'lesson-boundaries',
    title: 'Digital boundaries',
    titleLg: 'Ensalosso za dijitalo',
    description: 'Learn about your rights online and how to set boundaries.',
    descriptionLg: 'Yiga eddembe lyo ku mutimbagano n' +
      'okuteekawo ensalosso.',
    content: 'Digital boundaries are rules you set for how people can treat you online. You have the right to:\n\n1. Say no to anything that makes you uncomfortable.\n2. Block or ignore anyone who bothers you.\n3. Not share photos or information you do not want to share.\n4. Take breaks from your phone.\n5. Ask a trusted adult for help.\n\nIf someone crosses your boundaries, tap Report Harm. You deserve respect.',
    contentLg: 'Ensalosso za dijitalo z' + 'ensalo ze z' + 'oteekawo ku ngeri abantu gye bakukolamu ku mutimbagano.',
    ageBand: '10-13',
    category: 'safety',
    order: 4,
    quiz: [
      { question: 'You have the right to say no to anything that makes you uncomfortable online.', options: ['True', 'False'], correctAnswer: 0 },
      { question: 'If someone keeps messaging you after you said stop, you should:', options: ['Keep replying', 'Block them and report', 'Do nothing'], correctAnswer: 1 },
    ],
  },
  {
    id: 'lesson-help',
    title: 'How to get help',
    titleLg: 'N' + 'atwala okufuna obuyambi',
    description: 'Learn what to do when something bad happens online.',
    descriptionLg: 'Yiga kiki ekikolebwa singa ekintu ekibi kibawo ku mutimbagano.',
    content: 'If something bad happens online, you can:\n\n1. Tell a trusted adult right away — a parent, teacher, or counselor.\n2. Use the Report Harm button to report it confidentially.\n3. Call 116 (Child Helpline) for free, confidential support.\n4. Call 999 (Police) if you are in immediate danger.\n\nRemember: what happened is not your fault. You are not alone. Help is available. You did the right thing by telling someone.',
    contentLg: 'Singa ekintu ekibi kibawo ku mutimbagano, osobola:',
    ageBand: 'all',
    category: 'safety',
    order: 5,
    quiz: [
      { question: 'What number do you call for the Child Helpline?', options: ['999', '116', '911'], correctAnswer: 1 },
      { question: 'If something bad happens online, it is your fault.', options: ['True', 'False'], correctAnswer: 1 },
    ],
  },
];

function createLessonsRouter(LESSONS, QUIZ_RESULTS, ASSIGNMENTS, io) {
  const router = express.Router();

  // Seed sample lessons on first access
  if (LESSONS.size === 0) {
    SAMPLE_LESSONS.forEach(l => LESSONS.set(l.id, l));
  }

  // ── GET /lessons ──────────────────────────────────────────────────────────
  router.get('/', (req, res) => {
    const { ageBand, category, lang } = req.query;

    let list = Array.from(LESSONS.values()).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (ageBand) {
      list = list.filter(l => l.ageBand === ageBand || l.ageBand === 'all');
    }
    if (category) {
      list = list.filter(l => l.category === category);
    }

    return res.status(200).json(list.map(l => {
      const title = lang === 'lg' && l.titleLg ? l.titleLg : l.title;
      const description = lang === 'lg' && l.descriptionLg ? l.descriptionLg : l.description;
      return {
        id: l.id,
        title,
        description,
        ageBand: l.ageBand,
        category: l.category,
        order: l.order,
        hasQuiz: !!(l.quiz && l.quiz.length > 0),
      };
    }));
  });

  // ── GET /lessons/:id ──────────────────────────────────────────────────────
  router.get('/:id', (req, res) => {
    const lesson = LESSONS.get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const { lang } = req.query;

    return res.status(200).json({
      id: lesson.id,
      title: lang === 'lg' && lesson.titleLg ? lesson.titleLg : lesson.title,
      description: lang === 'lg' && lesson.descriptionLg ? lesson.descriptionLg : lesson.description,
      content: lang === 'lg' && lesson.contentLg ? lesson.contentLg : lesson.content,
      ageBand: lesson.ageBand,
      category: lesson.category,
      quiz: lesson.quiz || null,
    });
  });

  // ── POST /lessons ──────────────────────────────────────────────────────────
  router.post('/', requireAuth, requireRole(['teacher', 'caseworker']), (req, res) => {
    const { title, titleLg, description, descriptionLg, content, contentLg, ageBand, category, quiz } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const id = 'lesson-' + crypto.randomBytes(4).toString('hex');
    const now = new Date().toISOString();

    const lesson = {
      id,
      title: title.trim(),
      titleLg: titleLg || null,
      description: description || '',
      descriptionLg: descriptionLg || null,
      content: content.trim(),
      contentLg: contentLg || null,
      ageBand: ageBand || 'all',
      category: category || 'safety',
      order: LESSONS.size + 1,
      quiz: quiz || null,
      createdBy: req.user.id,
      createdAt: now,
    };

    LESSONS.set(id, lesson);
    return res.status(201).json({ id, title: lesson.title });
  });

  // ── PUT /lessons/:id ────────────────────────────────────────────────────────
  router.put('/:id', requireAuth, requireRole(['teacher', 'caseworker']), (req, res) => {
    const lesson = LESSONS.get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const { title, titleLg, description, content, contentLg, ageBand, category, quiz } = req.body;
    if (title) lesson.title = title.trim();
    if (titleLg) lesson.titleLg = titleLg;
    if (description) lesson.description = description;
    if (content) lesson.content = content.trim();
    if (contentLg) lesson.contentLg = contentLg;
    if (ageBand) lesson.ageBand = ageBand;
    if (category) lesson.category = category;
    if (quiz !== undefined) lesson.quiz = quiz;

    return res.status(200).json({ id: lesson.id, updated: true });
  });

  // ── POST /lessons/:id/quiz/submit ─────────────────────────────────────────
  // Requires authentication — quiz results are tied to child account
  router.post('/:id/quiz/submit', requireAuth, requireRole('child'), (req, res) => {
    const lesson = LESSONS.get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    if (!lesson.quiz || lesson.quiz.length === 0) {
      return res.status(400).json({ error: 'This lesson has no quiz.' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array.' });
    }

    // Score the quiz
    let score = 0;
    const results = lesson.quiz.map((q, i) => {
      const userAnswer = answers[i];
      const correct = userAnswer === q.correctAnswer;
      if (correct) score++;
      return { questionIndex: i, userAnswer, correct };
    });

    const passed = score >= Math.ceil(lesson.quiz.length * 0.6); // 60% pass
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const result = {
      id,
      childId: req.user.id,
      lessonId: lesson.id,
      score,
      totalQuestions: lesson.quiz.length,
      passed,
      results,
      completedAt: now,
    };

    QUIZ_RESULTS.set(id, result);
    return res.status(200).json({ score, totalQuestions: lesson.quiz.length, passed, results });
  });

  // ── GET /lessons/progress/:childId ──────────────────────────────────────────
  // Parent or teacher — view a child's quiz completion
  router.get('/progress/:childId', requireAuth, requireRole(['parent', 'teacher']), (req, res) => {
    const childId = req.params.childId;
    const results = Array.from(QUIZ_RESULTS.values())
      .filter(r => r.childId === childId)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    return res.status(200).json(results.map(r => ({
      lessonId: r.lessonId,
      score: r.score,
      totalQuestions: r.totalQuestions,
      passed: r.passed,
      completedAt: r.completedAt,
    })));
  });

  // ── POST /lessons/assign ────────────────────────────────────────────────────
  // Teacher only — assign a lesson to a class/student
  router.post('/assign', requireAuth, requireRole('teacher'), (req, res) => {
    const { lessonId, classId, dueDate } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required.' });
    }

    const lesson = LESSONS.get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const assignment = {
      id,
      teacherId: req.user.id,
      lessonId,
      classId: classId || null,
      dueDate: dueDate || null,
      assignedAt: now,
    };

    ASSIGNMENTS.set(id, assignment);
    return res.status(201).json({ id, lessonId, assigned: true });
  });

  // ── GET /lessons/assignments/:teacherId ──────────────────────────────────────
  // Teacher — list own assignments
  router.get('/assignments/:teacherId', requireAuth, requireRole('teacher'), (req, res) => {
    // Only show the requesting teacher's assignments (or caseworker can see all)
    if (req.user.role === 'teacher' && req.params.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own assignments.' });
    }

    const list = Array.from(ASSIGNMENTS.values())
      .filter(a => a.teacherId === req.params.teacherId)
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
      .map(a => ({
        id: a.id,
        lessonId: a.lessonId,
        lessonTitle: LESSONS.get(a.lessonId)?.title || 'Unknown',
        classId: a.classId,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
      }));

    return res.status(200).json(list);
  });

  return router;
}

module.exports = { createLessonsRouter, SAMPLE_LESSONS };
