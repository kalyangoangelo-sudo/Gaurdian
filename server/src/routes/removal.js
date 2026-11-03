/**
 * routes/removal.js
 *
 * POST /removal-request               – child requests GuardianLink removal
 * GET  /removal-requests/:parentId    – parent lists removal requests for their children
 * PUT  /removal-request/:id/decide    – parent approves or rejects a removal request
 */

'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Creates the removal router with injected stores and Socket.IO instance.
 *
 * @param {Map}    removalStore   id → removal request
 * @param {Map}    relationships  childId → parentId
 * @param {object} io             Socket.IO server instance (may be null in tests)
 */
function createRemovalRouter(removalStore, relationships, io) {

  // ── POST /removal-request ─────────────────────────────────────────────────
  // Child submits a request to have GuardianLink removed from their device.
  router.post('/removal-request', requireAuth, requireRole('child'), (req, res) => {
    const childId = req.user.id;
    const { reason } = req.body;

    const removalRequest = {
      id: uuidv4(),
      childId,
      reason: typeof reason === 'string' ? reason.trim() : '',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      decidedAt: null,
    };

    removalStore.set(removalRequest.id, removalRequest);

    return res.status(201).json({ id: removalRequest.id, message: 'Removal request submitted.' });
  });

  // ── GET /removal-requests/:parentId ──────────────────────────────────────
  // Parent retrieves all pending and decided removal requests for their children.
  router.get('/removal-requests/:parentId', requireAuth, requireRole('parent'), (req, res) => {
    const { parentId } = req.params;
    const { id } = req.user;

    if (id !== parentId) {
      return res.status(403).json({ error: 'You can only view requests for your own children.' });
    }

    const childIds = new Set();
    for (const [childId, pid] of relationships.entries()) {
      if (pid === id) childIds.add(childId);
    }

    const result = [];
    for (const req_ of removalStore.values()) {
      if (childIds.has(req_.childId)) {
        result.push(req_);
      }
    }

    result.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    return res.status(200).json({ requests: result });
  });

  // ── PUT /removal-request/:id/decide ──────────────────────────────────────
  // Parent approves or rejects a removal request.
  router.put('/removal-request/:id/decide', requireAuth, requireRole('parent'), (req, res) => {
    const { id: requestId } = req.params;
    const { id: parentId } = req.user;
    const { decision } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'Decision must be "approved" or "rejected".' });
    }

    const removalRequest = removalStore.get(requestId);
    if (!removalRequest) {
      return res.status(404).json({ error: 'Removal request not found.' });
    }

    if (relationships.get(removalRequest.childId) !== parentId) {
      return res.status(403).json({ error: 'You are not the linked parent for this child.' });
    }

    removalRequest.status = decision;
    removalRequest.decidedAt = new Date().toISOString();
    removalStore.set(requestId, removalRequest);

    // Notify the child via Socket.IO
    if (io) {
      io.to(`user:${removalRequest.childId}`).emit('removal:decided', removalRequest);
    }

    return res.status(200).json({ request: removalRequest });
  });

  return router;
}

module.exports = { createRemovalRouter };
