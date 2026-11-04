/**
 * routes/requests.js
 *
 * GET  /requests            – list requests visible to the authenticated user
 * POST /requests            – child creates a new access request
 * POST /requests/:id/decision – parent approves or denies a pending request
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const { validateUrl, isValidDecision } = require('../utils/validate');
const { sendPushNotification, getUserFcmToken } = require('../firebase-admin');

const router = express.Router();

/**
 * Creates the requests router with injected stores and Socket.IO instance.
 *
 * @param {Map}    requests     In-memory requests Map
 * @param {Map}    RELATIONSHIPS childId → parentId Map
 * @param {object} io           Socket.IO server instance
 */
function createRequestsRouter(requests, RELATIONSHIPS, io) {

  // ── GET /requests ──────────────────────────────────────────────────────────
  // Returns requests visible to the caller:
  //   - Child: their own requests only
  //   - Parent: all requests where parentId matches their ID
  router.get('/', requireAuth, (req, res) => {
    const { id, role } = req.user;
    const result = [];

    for (const req_ of requests.values()) {
      if (role === 'child' && req_.childId === id) {
        result.push(req_);
      } else if (role === 'parent' && req_.parentId === id) {
        result.push(req_);
      }
    }

    // Sort newest-first for display
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ requests: result });
  });

  // ── POST /requests ─────────────────────────────────────────────────────────
  // Child submits a URL access request.
  router.post('/', requireAuth, (req, res) => {
    const { id: childId, role } = req.user;

    if (role !== 'child') {
      return res.status(403).json({ error: 'Only child accounts can create requests.' });
    }

    const parentId = RELATIONSHIPS.get(childId);
    if (!parentId) {
      return res.status(403).json({ error: 'No parent account is linked to this child account.' });
    }

    const { url } = req.body;
    const validation = validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    const normalized = validation.url.toString();

    const request = {
      id: uuidv4(),
      childId,
      parentId,
      url: normalized,
      status: 'pending',
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };

    requests.set(request.id, request);

    // Notify the parent via Socket.IO (fire-and-forget; client re-fetches on error)
    if (io) {
      io.to(`user:${parentId}`).emit('request:new', { request });
      // Also update the child's own list
      io.to(`user:${childId}`).emit('request:new', { request });
    }

    // Send FCM push notification to parent (safe — not confidential)
    // ⚠️ NEVER send confidential report information via push notifications.
    // This notification only tells the parent that their child requested website access.
    getUserFcmToken(parentId).then(fcmToken => {
      if (fcmToken) {
        sendPushNotification(fcmToken,
          'Website Access Request',
          'Your child has requested access to a website. Tap to review.',
          { type: 'access_request', requestId: request.id }
        );
      }
    }).catch(() => {}); // Fire-and-forget — never block on push

    return res.status(201).json({ request });
  });

  // ── POST /requests/:id/decision ────────────────────────────────────────────
  // Linked parent approves or denies a pending request.
  router.post('/:id/decision', requireAuth, (req, res) => {
    const { id: parentId, role } = req.user;

    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parent accounts can decide requests.' });
    }

    const requestId = req.params.id;
    const { decision } = req.body;

    if (!isValidDecision(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "denied".' });
    }

    const request = requests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    // Authorization: the authenticated parent must be the linked parent for this request.
    // Never trust a parentId from the client – derive it from the verified JWT.
    if (request.parentId !== parentId) {
      return res.status(403).json({ error: 'You are not authorized to decide this request.' });
    }

    // Idempotency / conflict guard: only one decision per request.
    if (request.status !== 'pending') {
      return res.status(409).json({
        error: `This request has already been ${request.status}.`,
        currentStatus: request.status,
      });
    }

    // Apply the decision
    request.status = decision;
    request.decidedAt = new Date().toISOString();
    requests.set(request.id, request);

    // Notify both parent and child
    if (io) {
      io.to(`user:${parentId}`).emit('request:updated', { request });
      io.to(`user:${request.childId}`).emit('request:updated', { request });
    }

    // Send FCM push notification to child (safe — not confidential)
    getUserFcmToken(request.childId).then(fcmToken => {
      if (fcmToken) {
        const title = decision === 'approved' ? 'Request Approved' : 'Request Denied';
        const body = decision === 'approved'
          ? 'Your parent approved your website access request.'
          : 'Your parent did not approve your website access request.';
        sendPushNotification(fcmToken, title, body,
          { type: 'request_decision', requestId: request.id, decision });
      }
    }).catch(() => {}); // Fire-and-forget — never block on push

    return res.status(200).json({ request });
  });

  return router;
}

module.exports = { createRequestsRouter };
