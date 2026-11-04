/**
 * routes/cases.js
 *
 * Case management for caseworkers.
 *
 * Routes:
 *   POST /auth/caseworker/login   – caseworker authentication
 *   GET  /cases                   – list all cases
 *   GET  /cases/:id               – full case detail
 *   PUT  /cases/:id/assess        – set human priority
 *   PUT  /cases/:id/note          – append an internal note
 *   PUT  /cases/:id/status        – update case status
 *   POST /cases/:id/refer         – simulated referral
 *   GET  /cases/:id/audit         – audit trail
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'STANDARD'];

const VALID_STATUSES = [
  'Submitted',
  'Awaiting Assessment',
  'Under Review',
  'Action Required',
  'Referred',
  'Follow-up Pending',
  'Resolved',
  'Closed',
];

const SIMULATED_SERVICES = [
  'Uganda Police Child Protection Unit',
  'UNICEF Uganda',
  'Save the Children Uganda',
  'Ministry of Gender Uganda',
  'Childline Uganda 116',
];

function createCasesRouter(CASES, USERS, io) {
  const router = express.Router();

  // ── Caseworker login ───────────────────────────────────────────────────────
  // POST /auth/caseworker/login
  router.post('/auth/caseworker/login', async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required.' });
      }

      // Find a caseworker by username
      let found = null;
      for (const user of USERS.values()) {
        if (user.role === 'caseworker' && user.username === username.trim()) {
          found = user;
          break;
        }
      }

      const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12345';
      const hash = found ? found.hash : dummyHash;
      const match = await bcrypt.compare(password, hash);

      if (!found || !match) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const token = jwt.sign(
        { id: found.id, username: found.username, role: found.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({ token, role: 'caseworker' });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /cases ─────────────────────────────────────────────────────────────
  router.get('/', requireAuth, requireRole('caseworker'), (req, res) => {
    const list = Array.from(CASES.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((c) => ({
        id: c.id,
        caseRef: c.caseRef,
        category: c.category,
        status: c.status,
        priority: c.priority,
        humanPriority: c.humanPriority,
        aiResult: c.aiResult
          ? {
              suggestedPriority: c.aiResult.suggestedPriority || null,
              requiresHumanReview: c.aiResult.requiresHumanReview || false,
              summary: c.aiResult.summary || null,
            }
          : null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        submittedByRole: c.submittedByRole,
        anonymous: c.anonymous,
      }));

    return res.status(200).json(list);
  });

  // ── GET /cases/:id ─────────────────────────────────────────────────────────
  router.get('/:id', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });
    return res.status(200).json({
      ...c,
      hasTokenizedData: !!c.encryptedTokenMap,
    });
  });

  // ── PUT /cases/:id/assess ──────────────────────────────────────────────────
  router.put('/:id/assess', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    const { humanPriority } = req.body;
    if (!VALID_PRIORITIES.includes(humanPriority)) {
      return res.status(400).json({ error: `humanPriority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const now = new Date().toISOString();
    c.humanPriority = humanPriority;
    c.updatedAt = now;
    c.auditTrail.push({ action: 'assessed', by: req.user.id, humanPriority, at: now });

    return res.status(200).json({ id: c.id, caseRef: c.caseRef, humanPriority: c.humanPriority });
  });

  // ── PUT /cases/:id/note ────────────────────────────────────────────────────
  router.put('/:id/note', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    const { note } = req.body;
    if (!note || typeof note !== 'string' || note.trim() === '') {
      return res.status(400).json({ error: 'note is required.' });
    }

    const now = new Date().toISOString();
    c.notes.push({ text: note.trim(), by: req.user.id, at: now });
    c.updatedAt = now;
    c.auditTrail.push({ action: 'note_added', by: req.user.id, at: now });

    return res.status(200).json({ id: c.id, noteCount: c.notes.length });
  });

  // ── PUT /cases/:id/status ──────────────────────────────────────────────────
  router.put('/:id/status', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const now = new Date().toISOString();
    c.status = status;
    c.updatedAt = now;
    c.auditTrail.push({ action: 'status_changed', by: req.user.id, status, at: now });

    return res.status(200).json({ id: c.id, caseRef: c.caseRef, status: c.status });
  });

  // ── POST /cases/:id/refer ──────────────────────────────────────────────────
  router.post('/:id/refer', requireAuth, requireRole('caseworker'), async (req, res, next) => {
    try {
      const c = CASES.get(req.params.id);
      if (!c) return res.status(404).json({ error: 'Case not found.' });

      const { service } = req.body;
      if (!SIMULATED_SERVICES.includes(service)) {
        return res.status(400).json({
          error: `service must be one of: ${SIMULATED_SERVICES.join(', ')}`,
        });
      }

      // Simulated 200ms delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      const referralId = 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const now = new Date().toISOString();
      const referral = {
        referralId,
        service,
        status: 'SIMULATED',
        acknowledgment: 'SIMULATED — no actual referral was made',
        referredAt: now,
        referredBy: req.user.id,
      };

      c.referrals.push(referral);
      c.updatedAt = now;
      c.auditTrail.push({ action: 'referred', by: req.user.id, service, referralId, at: now });

      return res.status(200).json(referral);
    } catch (err) {
      next(err);
    }
  });

  // ── GET /cases/:id/audit ───────────────────────────────────────────────────
  router.get('/:id/audit', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });
    return res.status(200).json(c.auditTrail);
  });

  return router;
}

module.exports = { createCasesRouter };
