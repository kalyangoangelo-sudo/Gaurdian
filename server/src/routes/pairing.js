/**
 * routes/pairing.js
 *
 * POST /pair/generate  – parent generates a 6-digit pairing code
 * POST /pair/confirm   – child confirms the code to link to parent
 */

'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Creates the pairing router with injected stores.
 *
 * @param {Map} pairingStore   code → { parentId, expiresAt }
 * @param {Map} relationships  childId → parentId
 * @param {Map} users          id → user (unused here but kept for symmetry)
 */
function createPairingRouter(pairingStore, relationships) {

  // ── POST /pair/generate ───────────────────────────────────────────────────
  // Authenticated parent generates a one-time 6-digit pairing code valid for
  // 30 minutes.
  router.post('/generate', requireAuth, requireRole('parent'), (req, res) => {
    // Generate a zero-padded 6-digit numeric code
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    pairingStore.set(code, { parentId: req.user.id, expiresAt });

    return res.status(200).json({ code, expiresAt });
  });

  // ── POST /pair/confirm ────────────────────────────────────────────────────
  // Authenticated child submits the code to establish a parent-child link.
  router.post('/confirm', requireAuth, requireRole('child'), (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Pairing code is required.' });
    }

    const entry = pairingStore.get(code.trim());

    if (!entry) {
      return res.status(400).json({ error: 'Invalid or expired pairing code.' });
    }

    if (Date.now() > entry.expiresAt) {
      pairingStore.delete(code.trim());
      return res.status(400).json({ error: 'Invalid or expired pairing code.' });
    }

    const { parentId } = entry;
    relationships.set(req.user.id, parentId);
    pairingStore.delete(code.trim());

    return res.status(200).json({ parentId, message: 'Paired successfully.' });
  });

  return router;
}

module.exports = { createPairingRouter };
