/**
 * routes/safesignal.js
 *
 * POST /safesignal              – child submits a safety concern
 * GET  /safesignal/:parentId    – parent views concerns for their paired children
 * PUT  /safesignal/:id/acknowledge – parent acknowledges and acts on a report
 */

'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Creates the SafeSignal router with injected stores and Socket.IO instance.
 *
 * @param {Map}    safeSignalStore  id → report
 * @param {Map}    relationships    childId → parentId
 * @param {object} io               Socket.IO server instance (may be null in tests)
 */
function createSafeSignalRouter(safeSignalStore, relationships, io) {

  // ── POST /safesignal ──────────────────────────────────────────────────────
  // Child submits a new safety concern report.
  router.post('/', requireAuth, requireRole('child'), (req, res) => {
    const childId = req.user.id;
    const { category, description } = req.body;

    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const parentId = relationships.get(childId);

    const report = {
      id: uuidv4(),
      childId,
      category: category.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      acknowledgedAt: null,
      action: null,
    };

    safeSignalStore.set(report.id, report);

    // Notify the linked parent if connected
    if (io && parentId) {
      io.to(`user:${parentId}`).emit('safesignal:new', report);
    }

    return res.status(201).json({ id: report.id, message: 'Safety report submitted.' });
  });

  // ── GET /safesignal/:parentId ─────────────────────────────────────────────
  // Authenticated parent retrieves all safety reports for their paired children.
  router.get('/:parentId', requireAuth, requireRole('parent'), (req, res) => {
    const { parentId } = req.params;
    const { id } = req.user;

    if (id !== parentId) {
      return res.status(403).json({ error: 'You can only view reports for your own children.' });
    }

    const childIds = new Set();
    for (const [childId, pid] of relationships.entries()) {
      if (pid === id) childIds.add(childId);
    }

    const result = [];
    for (const report of safeSignalStore.values()) {
      if (childIds.has(report.childId)) {
        result.push(report);
      }
    }

    result.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return res.status(200).json({ reports: result });
  });

  // ── PUT /safesignal/:id/acknowledge ───────────────────────────────────────
  // Parent acknowledges a report and records their action.
  router.put('/:id/acknowledge', requireAuth, requireRole('parent'), (req, res) => {
    const { id: reportId } = req.params;
    const { id: parentId } = req.user;
    const { action } = req.body;

    const report = safeSignalStore.get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    // Verify the parent is the linked parent for this child
    if (relationships.get(report.childId) !== parentId) {
      return res.status(403).json({ error: 'You are not the linked parent for this child.' });
    }

    report.status = 'acknowledged';
    report.acknowledgedAt = new Date().toISOString();
    report.action = typeof action === 'string' ? action.trim() : null;
    safeSignalStore.set(reportId, report);

    return res.status(200).json({ report });
  });

  return router;
}

module.exports = { createSafeSignalRouter };
