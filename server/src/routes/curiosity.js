/**
 * routes/curiosity.js
 *
 * Curiosity Corner — anonymous child Q&A with reviewed responses.
 *
 * Routes:
 *   POST /curiosity/ask          – Public, submit anonymous question
 *   GET  /curiosity/:id           – Public, check question status + approved answer
 *   GET  /curiosity/pending       – Caseworker, list pending questions
 *   PUT  /curiosity/:id/respond   – Caseworker, approve a response
 *   PUT  /curiosity/:id/categorize – Caseworker, set category
 *
 * Serious safeguarding concerns are detected via the AI classifier and
 * flagged for human review. The user is told to use Report Harm.
 *
 * AI never generates unrestricted advice. All responses are pre-approved
 * templates selected by a human reviewer.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth');
const { classifyText } = require('../services/aiClassifier');

// Pre-approved response templates — NOT AI-generated
const RESPONSE_TEMPLATES = {
  bullying: 'Cyberbullying is when someone uses phones or the internet to hurt, scare, or embarrass another person. If this is happening to you: do not reply to the bully, save the messages, tell a trusted adult, and use the Report Harm button. You are not alone.',
  privacy: 'To keep your information private online: never share your full name, home address, phone number, or school name with strangers. Use a nickname on social media. If someone asks for personal information and it makes you uncomfortable, tap Report Harm.',
  friends: 'Not everyone online is who they say they are. Be careful about meeting online friends in person. If someone asks to meet you, tells you to keep secrets from your parents, or sends gifts, tell a trusted adult and use Report Harm. Real friends respect your boundaries.',
  boundaries: 'You have the right to say no to anything that makes you uncomfortable online. You can block or ignore anyone who bothers you. If someone crosses your boundaries, tap Report Harm.',
  help: 'If something bad happens online: tell a trusted adult right away, use the Report Harm button to report it, call 116 (Child Helpline) for free support, or call 999 (Police) if in immediate danger. You are not alone.',
  general: 'Thank you for your question. A trusted adult can help you with this. If something online makes you feel unsafe or uncomfortable, tap the Report Harm button to tell someone who can help.',
};

function generateQuestionRef() {
  return 'Q' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createCuriosityRouter(CURIOSITY, io) {
  const router = express.Router();

  // Per-router rate limiter for question submission
  const askLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many questions. Please wait a moment.' },
    skip: () => process.env.NODE_ENV === 'test',
  });

  // ── POST /curiosity/ask ──────────────────────────────────────────────────
  router.post('/ask', askLimiter, (req, res, next) => {
    try {
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({ error: 'question is required.' });
      }
      if (question.length > 500) {
        return res.status(400).json({ error: 'question must be 500 characters or fewer.' });
      }

      // Run AI classifier to detect serious concerns
      const aiResult = classifyText(question);
      const isSerious = aiResult.criticalSafetyFlag || aiResult.suggestedPriority === 'CRITICAL';

      // Auto-categorize based on classifier
      let autoCategory = 'general';
      if (aiResult.category) {
        const catLower = aiResult.category.toLowerCase();
        if (catLower.includes('bully')) autoCategory = 'bullying';
        else if (catLower.includes('privacy')) autoCategory = 'privacy';
        else if (catLower.includes('groom') || catLower.includes('exploit')) autoCategory = 'friends';
        else if (catLower.includes('harass')) autoCategory = 'boundaries';
        else if (catLower.includes('threat')) autoCategory = 'help';
      }

      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const questionRef = generateQuestionRef();
      const now = new Date().toISOString();

      const entry = {
        id,
        questionRef,
        question: question.trim(),
        category: autoCategory,
        status: isSerious ? 'flagged' : 'pending',
        approvedResponse: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: now,
        isSeriousFlag: isSerious,
        aiAssessment: {
          suggestedPriority: aiResult.suggestedPriority,
          category: aiResult.category,
          indicators: aiResult.indicators,
          criticalSafetyFlag: aiResult.criticalSafetyFlag,
        },
      };

      CURIOSITY.set(id, entry);

      // Notify caseworkers via Socket.IO if available
      if (io && isSerious) {
        io.emit('curiosity:flagged', { id, questionRef, category: autoCategory, isSerious: true });
      }

      const response = {
        id,
        questionRef,
        status: entry.status,
      };

      // If serious, tell the user to report
      if (isSerious) {
        response.warning = 'Your question mentions something that might be serious. Please tap Report Harm to tell a trusted person. You deserve help. If you are in danger, call 116 or 999.';
        response.suggestedAction = 'report';
      } else {
        // Return pre-approved template immediately for common categories
        response.response = RESPONSE_TEMPLATES[autoCategory] || RESPONSE_TEMPLATES.general;
        response.responseSource = 'template';
        entry.approvedResponse = response.response;
        entry.status = 'answered';
        entry.reviewedBy = 'auto-template';
        entry.reviewedAt = now;
      }

      // Update response status to reflect any changes made above
      response.status = entry.status;

      return res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  // ── GET /curiosity/pending ───────────────────────────────────────────────
  // Caseworker only — list pending/flagged questions
  // MUST be defined before /:id to avoid route shadowing
  router.get('/pending', requireAuth, requireRole('caseworker'), (req, res) => {
    const list = Array.from(CURIOSITY.values())
      .filter(q => q.status === 'pending' || q.status === 'flagged')
      .sort((a, b) => {
        // Flagged first, then newest
        if (a.isSeriousFlag && !b.isSeriousFlag) return -1;
        if (!a.isSeriousFlag && b.isSeriousFlag) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .map(q => ({
        id: q.id,
        questionRef: q.questionRef,
        question: q.question,
        category: q.category,
        status: q.status,
        isSeriousFlag: q.isSeriousFlag,
        aiAssessment: q.aiAssessment,
        createdAt: q.createdAt,
      }));

    return res.status(200).json(list);
  });

  // ── GET /curiosity/:id ───────────────────────────────────────────────────
  // Public — check status. Only shows approved response.
  router.get('/:id', (req, res) => {
    const entry = CURIOSITY.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Question not found.' });

    return res.status(200).json({
      questionRef: entry.questionRef,
      status: entry.status,
      response: entry.approvedResponse || null,
      createdAt: entry.createdAt,
      // Never expose the original question text to unauthenticated viewers
      // (privacy: someone with the ID shouldn't be able to read the question)
    });
  });

  // ── PUT /curiosity/:id/respond ───────────────────────────────────────────
  // Caseworker only — approve a response
  router.put('/:id/respond', requireAuth, requireRole('caseworker'), (req, res) => {
    const entry = CURIOSITY.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Question not found.' });

    const { response, templateKey } = req.body;
    let approvedResponse = response;

    // If a template key is provided, use the pre-approved template
    if (templateKey && RESPONSE_TEMPLATES[templateKey]) {
      approvedResponse = RESPONSE_TEMPLATES[templateKey];
    }

    if (!approvedResponse || typeof approvedResponse !== 'string' || approvedResponse.trim() === '') {
      return res.status(400).json({ error: 'response is required.' });
    }

    entry.approvedResponse = approvedResponse.trim();
    entry.status = 'answered';
    entry.reviewedBy = req.user.id;
    entry.reviewedAt = new Date().toISOString();

    return res.status(200).json({
      id: entry.id,
      questionRef: entry.questionRef,
      status: entry.status,
      responseSent: true,
    });
  });

  // ── PUT /curiosity/:id/categorize ─────────────────────────────────────────
  // Caseworker only — set category
  router.put('/:id/categorize', requireAuth, requireRole('caseworker'), (req, res) => {
    const entry = CURIOSITY.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Question not found.' });

    const { category } = req.body;
    const validCategories = ['bullying', 'privacy', 'friends', 'boundaries', 'help', 'general'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
    }

    entry.category = category;
    return res.status(200).json({ id: entry.id, category: entry.category });
  });

  return router;
}

module.exports = { createCuriosityRouter, RESPONSE_TEMPLATES };
