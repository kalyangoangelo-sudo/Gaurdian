/**
 * routes/heartbeat.js
 *
 * POST /heartbeat              – child device sends a heartbeat
 * GET  /device-status/:childId – parent checks a child's device status
 */

'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// A device is considered OFFLINE if its last heartbeat was more than 5 minutes ago.
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Creates the heartbeat router with injected stores.
 *
 * @param {Map} heartbeatStore  childId → { deviceId, timestamp, policyVersion }
 * @param {Map} relationships   childId → parentId
 */
function createHeartbeatRouter(heartbeatStore, relationships) {

  // ── POST /heartbeat ───────────────────────────────────────────────────────
  // Child device registers a heartbeat to signal it is online and active.
  router.post('/heartbeat', requireAuth, requireRole('child'), (req, res) => {
    const childId = req.user.id;
    const { deviceId, policyVersion } = req.body;

    heartbeatStore.set(childId, {
      deviceId: typeof deviceId === 'string' ? deviceId.trim() : '',
      timestamp: new Date().toISOString(),
      policyVersion: policyVersion !== undefined ? policyVersion : null,
    });

    return res.status(200).json({ received: true });
  });

  // ── GET /device-status/:childId ───────────────────────────────────────────
  // Authenticated parent checks a paired child's device status.
  router.get('/device-status/:childId', requireAuth, requireRole('parent'), (req, res) => {
    const { childId } = req.params;
    const { id: parentId } = req.user;

    if (relationships.get(childId) !== parentId) {
      return res.status(403).json({ error: 'You are not the linked parent for this child.' });
    }

    const entry = heartbeatStore.get(childId);

    if (!entry) {
      return res.status(200).json({ status: 'UNVERIFIED' });
    }

    const ageMs = Date.now() - new Date(entry.timestamp).getTime();
    if (ageMs > OFFLINE_THRESHOLD_MS) {
      return res.status(200).json({ status: 'OFFLINE', lastSeen: entry.timestamp });
    }

    return res.status(200).json({ status: 'VERIFIED', lastSeen: entry.timestamp, ...entry });
  });

  return router;
}

module.exports = { createHeartbeatRouter };
