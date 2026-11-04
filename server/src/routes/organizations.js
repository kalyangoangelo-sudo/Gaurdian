/**
 * routes/organizations.js
 *
 * Organization registration and demo-request handling.
 *
 * Routes:
 *   POST /organizations/register           – register a new org
 *   GET  /organizations/:id/subscription   – subscription info
 *   POST /organizations/demo-request       – anonymous demo request
 *   POST /organizations/:id/demo-request   – org-linked demo request
 */

'use strict';

const express = require('express');
const crypto = require('crypto');

const VALID_TYPES = ['school', 'ngo', 'government', 'private', 'other'];
const VALID_PLANS = ['free', 'basic', 'professional', 'enterprise'];

function createOrganizationsRouter(ORGS, DEMO_REQUESTS) {
  const router = express.Router();

  // ── POST /organizations/register ──────────────────────────────────────────
  router.post('/register', (req, res) => {
    const { name, type, plan, contactEmail } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required.' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: `plan must be one of: ${VALID_PLANS.join(', ')}` });
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const org = {
      id,
      name: name.trim(),
      type,
      plan,
      contactEmail: contactEmail || null,
      status: 'pending',
      createdAt: now,
    };

    ORGS.set(id, org);

    return res.status(201).json({
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
    });
  });

  // ── POST /organizations/demo-request  (MUST be before /:id/demo-request) ──
  router.post('/demo-request', (req, res) => {
    const { contactName, email, orgName, message } = req.body;

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    DEMO_REQUESTS.set(id, {
      id,
      orgId: null,
      contactName: contactName || null,
      email: email || null,
      orgName: orgName || null,
      message: message || null,
      createdAt: now,
    });

    return res.status(201).json({
      id,
      message: 'Demo request received. We will contact you within 24 hours.',
    });
  });

  // ── GET /organizations/:id/subscription ───────────────────────────────────
  router.get('/:id/subscription', (req, res) => {
    const org = ORGS.get(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    return res.status(200).json({
      id: org.id,
      name: org.name,
      plan: org.plan,
      status: org.status,
    });
  });

  // ── POST /organizations/:id/demo-request ──────────────────────────────────
  router.post('/:id/demo-request', (req, res) => {
    const org = ORGS.get(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const { contactName, email, message } = req.body;

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    DEMO_REQUESTS.set(id, {
      id,
      orgId: req.params.id,
      contactName: contactName || null,
      email: email || null,
      message: message || null,
      createdAt: now,
    });

    return res.status(201).json({
      id,
      message: 'Demo request received. We will contact you within 24 hours.',
    });
  });

  return router;
}

module.exports = { createOrganizationsRouter };
