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
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth, requireRole } = require('../middleware/auth');
const { makeReferral } = require('../services/referralService');

const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'STANDARD'];

const VALID_STATUSES = [
  'Submitted', 'Awaiting Assessment', 'Under Review', 'Action Required',
  'Referred', 'Follow-up Pending', 'Resolved', 'Closed',
];

// DB persistence layer (optional — degrades gracefully if not initialized)
let db = null;
try { db = require('../db/database'); } catch (_) {}
function _db() { try { db && db.getDb(); return db; } catch (_) { return null; } }

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
        { expiresIn: '24h', algorithm: 'HS256' }
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

    // ── Write to SQLite FIRST (transactional) ────────────────────────────────
    const _d = _db();
    if (_d) {
      try {
        _d.runInTransaction(() => {
          _d.updateCaseField(c.id, 'human_priority', humanPriority);
          _d.appendAuditEntry(c.id, 'assessed', req.user.id, { humanPriority });
        });
      } catch (dbErr) {
        return res.status(500).json({ error: 'Failed to save assessment. Please try again.' });
      }
    }

    // DB succeeded (or not available) — update in-memory cache
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

    // ── Write to SQLite FIRST (transactional) ────────────────────────────────
    const _d = _db();
    if (_d) {
      try {
        _d.runInTransaction(() => {
          _d.addNote(c.id, note.trim(), req.user.id);
          _d.appendAuditEntry(c.id, 'note_added', req.user.id, null);
        });
      } catch (dbErr) {
        return res.status(500).json({ error: 'Failed to save note. Please try again.' });
      }
    }

    // DB succeeded — update in-memory cache
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

    // ── Write to SQLite FIRST (transactional) ────────────────────────────────
    const _d = _db();
    if (_d) {
      try {
        _d.runInTransaction(() => {
          _d.updateCaseField(c.id, 'status', status);
          _d.appendAuditEntry(c.id, 'status_changed', req.user.id, { status });
        });
      } catch (dbErr) {
        return res.status(500).json({ error: 'Failed to update status. Please try again.' });
      }
    }

    // DB succeeded — update in-memory cache
    c.status = status;
    c.updatedAt = now;
    c.auditTrail.push({ action: 'status_changed', by: req.user.id, status, at: now });

    return res.status(200).json({ id: c.id, caseRef: c.caseRef, status: c.status });
  });

  // ── POST /cases/:id/refer ──────────────────────────────────────────────────
  router.post('/:id/refer', requireAuth, requireRole('caseworker'), async (req, res, next) => {
    try {
      const caseObj = CASES.get(req.params.id);
      if (!caseObj) return res.status(404).json({ error: 'Case not found.' });

      const referral = await makeReferral(caseObj.id, req.body.service);

      // ── Write to SQLite FIRST (transactional) ──────────────────────────────
      const _d = _db();
      if (_d) {
        try {
          _d.runInTransaction(() => {
            _d.addReferral(caseObj.id, {
              ...referral, id: require('crypto').randomUUID(),
            });
            _d.appendAuditEntry(caseObj.id, 'referred', req.user.username, {
              service: referral.service, referralId: referral.referralId,
            });
          });
        } catch (dbErr) {
          return res.status(500).json({ error: 'Failed to record referral. Please try again.' });
        }
      }

      // DB succeeded — update in-memory cache
      caseObj.referrals.push(referral);
      caseObj.auditTrail.push({
        action: 'referred', by: req.user.username,
        service: referral.service, referralId: referral.referralId,
        at: new Date().toISOString(),
      });

      return res.status(200).json(referral);
    } catch (err) {
      next(err);
    }
  });

  // ── PUT /cases/:id/response ────────────────────────────────────────────────
  // Caseworker sends a pre-approved response template to the child.
  // The response is stored on the case and returned via check-status.
  router.put('/:id/response', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    const { response, responseTemplate } = req.body;
    if (!response || typeof response !== 'string' || response.trim() === '') {
      return res.status(400).json({ error: 'response is required.' });
    }

    const now = new Date().toISOString();

    // ── Write to SQLite FIRST (transactional) ────────────────────────────────
    const _d = _db();
    if (_d) {
      try {
        _d.runInTransaction(() => {
          _d.updateCaseField(c.id, 'child_response', response.trim());
          _d.updateCaseField(c.id, 'response_template', responseTemplate || null);
          _d.updateCaseField(c.id, 'response_sent_by', req.user.id);
          _d.updateCaseField(c.id, 'response_sent_at', now);
          _d.appendAuditEntry(c.id, 'response_sent', req.user.id,
            { responseTemplate: responseTemplate || null });
        });
      } catch (dbErr) {
        return res.status(500).json({ error: 'Failed to send response. Please try again.' });
      }
    }

    // DB succeeded — update in-memory cache
    c.childResponse = response.trim();
    c.responseTemplate = responseTemplate || null;
    c.responseSentBy = req.user.id;
    c.responseSentAt = now;
    c.updatedAt = now;
    c.auditTrail.push({ action: 'response_sent', by: req.user.id, responseTemplate: responseTemplate || null, at: now });

    return res.status(200).json({ id: c.id, caseRef: c.caseRef, responseSent: true });
  });

  // ── GET /cases/:id/audit ───────────────────────────────────────────────────
  router.get('/:id/audit', requireAuth, requireRole('caseworker'), (req, res) => {
    const c = CASES.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    // Merge in-memory audit trail with DB records (DB is authoritative after restart)
    const _d = _db();
    if (_d) {
      try {
        const dbAudit = _d.getAuditTrail(c.id);
        if (dbAudit && dbAudit.length > c.auditTrail.length) {
          return res.status(200).json(dbAudit);
        }
      } catch (_) {}
    }
    return res.status(200).json(c.auditTrail);
  });

  return router;
}

module.exports = { createCasesRouter };
