/**
 * routes/policy.js
 *
 * GET /policy/:childId  – retrieve the child's policy (parent or child)
 * PUT /policy/:childId  – update the child's policy (linked parent only)
 */

'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/** Default policy returned when no explicit policy has been set. */
const DEFAULT_POLICY = {
  contentCategories: [],
  blockedKeywords: [],
  trustedDomains: [],
  updatedAt: null,
};

/**
 * Creates the policy router with injected stores.
 *
 * @param {Map} policiesStore  childId → policy object
 * @param {Map} relationships  childId → parentId
 */
function createPolicyRouter(policiesStore, relationships) {

  // ── GET /policy/:childId ──────────────────────────────────────────────────
  // Accessible by the paired parent or the child themselves.
  router.get('/:childId', requireAuth, (req, res) => {
    const { childId } = req.params;
    const { id, role } = req.user;

    if (role === 'child' && id !== childId) {
      return res.status(403).json({ error: 'Children can only view their own policy.' });
    }

    if (role === 'parent' && relationships.get(childId) !== id) {
      return res.status(403).json({ error: 'You are not the linked parent for this child.' });
    }

    const policy = policiesStore.get(childId) || { ...DEFAULT_POLICY };
    return res.status(200).json({ policy });
  });

  // ── PUT /policy/:childId ──────────────────────────────────────────────────
  // Only the paired parent may update the policy.
  router.put('/:childId', requireAuth, (req, res) => {
    const { childId } = req.params;
    const { id, role } = req.user;

    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parent accounts can update policies.' });
    }

    if (relationships.get(childId) !== id) {
      return res.status(403).json({ error: 'You are not the linked parent for this child.' });
    }

    const { contentCategories, blockedKeywords, trustedDomains } = req.body;

    const policy = {
      contentCategories: Array.isArray(contentCategories) ? contentCategories : [],
      blockedKeywords: Array.isArray(blockedKeywords) ? blockedKeywords : [],
      trustedDomains: Array.isArray(trustedDomains) ? trustedDomains : [],
      updatedAt: new Date().toISOString(),
    };

    policiesStore.set(childId, policy);
    return res.status(200).json({ policy });
  });

  return router;
}

module.exports = { createPolicyRouter };
