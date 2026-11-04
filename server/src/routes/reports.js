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
const { runClassifier } = require('../services/aiClassifier');
const { tokenize } = require('../services/tokenizer');

// Import DB functions conditionally so tests that don't call initDb()
// still work with the in-memory store alone.
let db = null;
try {
  db = require('../db/database');
} catch (_) { /* DB not available in isolated test contexts */ }

function _dbAvailable() {
  try { db && db.getDb(); return true; } catch (_) { return false; }
}

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
 * Tokenizes PII in description and runs AI classification.
 */
async function createCase(CASES, { category, description, safeToContact, anonymous, childId, submittedByRole, recoverySecretHash }) {
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const caseRef = generateCaseRef();
  const now = new Date().toISOString();

  // Tokenize PII
  const { tokenized, encryptedTokenMap } = tokenize(description);

  // AI classification
  const aiResult = runClassifier({ description, category });

  const newCase = {
    id,
    caseRef,
    category,
    description: tokenized,
    encryptedTokenMap,
    safeToContact: Boolean(safeToContact),
    anonymous,
    childId,
    status: 'Submitted',
    aiResult,
    priority: aiResult.suggestedPriority === 'CRITICAL' ? 'CRITICAL' : 'STANDARD',
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

  // ── Persist to SQLite — DB is authoritative ────────────────────────────────
  // Write to SQLite FIRST. If the DB write fails, throw an error so the
  // route handler returns 500 — the child must NOT receive a false success
  // for a report that wasn't actually saved.
  // In test mode (DB not available), the in-memory Map is the only store.
  if (_dbAvailable()) {
    try {
      db.runInTransaction(() => {
        db.insertCase(newCase);
        db.appendAuditEntry(id, 'created',
          anonymous ? 'anonymous' : (childId || submittedByRole), null);
      });
      // DB write succeeded — in-memory Map already set above as cache
    } catch (dbErr) {
      // DB write FAILED — remove from in-memory Map so we don't return
      // a false success. The route handler's catch block will return 500.
      CASES.delete(id);
      throw new Error('Failed to save report: database error. Please try again.');
    }
  }

  return newCase;
}

/** Find a case by its caseRef string — checks in-memory first, then DB */
function findByCaseRef(CASES, caseRef) {
  // In-memory first (fastest path)
  for (const c of CASES.values()) {
    if (c.caseRef === caseRef) return c;
  }
  // DB fallback (after server restart)
  if (_dbAvailable()) {
    try {
      const row = db.getCaseByCaseRef(caseRef);
      if (row) {
        // Re-hydrate into the in-memory store so subsequent lookups are fast
        CASES.set(row.id, row);
        return row;
      }
    } catch (_) {}
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

  // Tighter rate limit for recovery secret lookups — brute-force protection
  const statusLimiter = rateLimit({
    windowMs: 5 * 60_000, // 5-minute window
    max: 10,              // 10 attempts per IP per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many status-check attempts. Please wait before trying again.' },
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
      if (description.length > 5000) {
        return res.status(400).json({ error: 'description must be 5000 characters or fewer.' });
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
      if (description.length > 5000) {
        return res.status(400).json({ error: 'description must be 5000 characters or fewer.' });
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
  router.get('/status/:caseRef', statusLimiter, async (req, res, next) => {
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
        response: found.childResponse || null,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /reports/check-status  – RN-friendly body-based variant
  router.post('/check-status', statusLimiter, async (req, res, next) => {
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
        response: found.childResponse || null,
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
