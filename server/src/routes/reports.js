/**
 * routes/reports.js
 *
 * SafeReport – public and authenticated incident reporting.
 *
 * Routes:
 *   POST /reports/anonymous          – anonymous report, no auth
 *   POST /reports/authenticated      – child-auth report
 *   GET  /reports/status/:caseRef    – status lookup via recovery secret
 *   POST /reports/check-status       – same as above, body-based (RN-friendly)
 *   POST /reports/assisted           – teacher-assisted report
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_CATEGORIES = [
  'Cyberbullying',
  'Online Harassment',
  'Grooming',
  'Threats',
  'Sextortion',
  'Impersonation',
  'Privacy Violation',
  'Exploitation',
  'Harmful Content',
  'Other',
];

function generateCaseRef() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateRecoverySecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Shared case-creation logic.
 */
async function createCase(CASES, { category, description, safeToContact, anonymous, childId, submittedByRole, recoverySecretHash }) {
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const caseRef = generateCaseRef();
  const now = new Date().toISOString();

  const newCase = {
    id,
    caseRef,
    category,
    description,
    safeToContact: Boolean(safeToContact),
    anonymous,
    childId,
    status: 'Submitted',
    aiResult: null,
    priority: 'STANDARD',
    humanPriority: null,
    notes: [],
    referrals: [],
    auditTrail: [{ action: 'created', by: anonymous ? 'anonymous' : (childId || submittedByRole), at: now }],
    createdAt: now,
    updatedAt: now,
    recoverySecretHash,
    submittedByRole,
  };

  CASES.set(id, newCase);
  return newCase;
}

/** Find a case by its caseRef string */
function findByCaseRef(CASES, caseRef) {
  for (const c of CASES.values()) {
    if (c.caseRef === caseRef) return c;
  }
  return null;
}

function createReportsRouter(CASES, RELATIONSHIPS, io) {
  const router = express.Router();

  // Per-router rate limiter instance so test apps don't share window state
  const publicReportLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
    // Use a store keyed to this router instance to avoid cross-test bleed
    skip: () => process.env.NODE_ENV === 'test',
  });

  // POST /reports/anonymous
  router.post('/anonymous', publicReportLimiter, async (req, res, next) => {
    try {
      const { category, description, safeToContact } = req.body;

      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'description is required.' });
      }

      const recoverySecret = generateRecoverySecret();
      const recoverySecretHash = await bcrypt.hash(recoverySecret, 10);

      const newCase = await createCase(CASES, {
        category,
        description: description.trim(),
        safeToContact,
        anonymous: true,
        childId: null,
        submittedByRole: 'anonymous',
        recoverySecretHash,
      });

      return res.status(201).json({ caseRef: newCase.caseRef, recoverySecret });
    } catch (err) {
      next(err);
    }
  });

  // POST /reports/authenticated  (child only)
  router.post('/authenticated', requireAuth, requireRole('child'), async (req, res, next) => {
    try {
      const { category, description, safeToContact } = req.body;

      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'description is required.' });
      }

      const recoverySecret = generateRecoverySecret();
      const recoverySecretHash = await bcrypt.hash(recoverySecret, 10);

      const newCase = await createCase(CASES, {
        category,
        description: description.trim(),
        safeToContact,
        anonymous: false,
        childId: req.user.id,
        submittedByRole: 'child',
        recoverySecretHash,
      });

      return res.status(201).json({ caseRef: newCase.caseRef, recoverySecret });
    } catch (err) {
      next(err);
    }
  });

  // GET /reports/status/:caseRef  – body must contain recoverySecret
  router.get('/status/:caseRef', publicReportLimiter, async (req, res, next) => {
    try {
      const { caseRef } = req.params;
      const { recoverySecret } = req.body;

      const found = findByCaseRef(CASES, caseRef);
      if (!found || !recoverySecret) {
        return res.status(401).json({ error: 'Invalid case reference or recovery secret.' });
      }

      const match = await bcrypt.compare(recoverySecret, found.recoverySecretHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid case reference or recovery secret.' });
      }

      return res.status(200).json({
        caseRef: found.caseRef,
        status: found.status,
        category: found.category,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /reports/check-status  – RN-friendly body-based variant
  router.post('/check-status', publicReportLimiter, async (req, res, next) => {
    try {
      const { caseRef, recoverySecret } = req.body;

      const found = findByCaseRef(CASES, caseRef);
      if (!found || !recoverySecret) {
        return res.status(401).json({ error: 'Invalid case reference or recovery secret.' });
      }

      const match = await bcrypt.compare(recoverySecret, found.recoverySecretHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid case reference or recovery secret.' });
      }

      return res.status(200).json({
        caseRef: found.caseRef,
        status: found.status,
        category: found.category,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /reports/assisted  (teacher only)
  router.post('/assisted', requireAuth, requireRole('teacher'), async (req, res, next) => {
    try {
      const { category, description, safeToContact } = req.body;

      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: 'description is required.' });
      }

      const recoverySecret = generateRecoverySecret();
      const recoverySecretHash = await bcrypt.hash(recoverySecret, 10);

      const newCase = await createCase(CASES, {
        category,
        description: description.trim(),
        safeToContact,
        anonymous: false,
        childId: null,
        submittedByRole: 'teacher',
        recoverySecretHash,
      });

      return res.status(201).json({ caseRef: newCase.caseRef, recoverySecret });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createReportsRouter };
