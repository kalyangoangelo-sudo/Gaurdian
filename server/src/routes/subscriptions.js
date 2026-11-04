/**
 * routes/subscriptions.js
 *
 * Subscription administration — plan management, billing records,
 * entitlement checks, simulated payment processing.
 *
 * Routes:
 *   GET  /subscriptions/:orgId            – Get subscription info
 *   POST /subscriptions                   – Create subscription (links to org)
 *   PUT  /subscriptions/:orgId/plan       – Change plan
 *   POST /subscriptions/:orgId/billing    – Add billing record (simulated)
 *   GET  /subscriptions/:orgId/billing    – Get billing history
 *   GET  /subscriptions/:orgId/entitlements – Check feature entitlements
 *
 * Essential child reporting is NEVER restricted by payment status.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');

// ─── Plan definitions ────────────────────────────────────────────
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'UGX',
    period: 'permanent',
    features: ['anonymous_reporting', 'case_status', 'safety_guidance', 'bilingual'],
  },
  family: {
    name: 'Family Premium',
    price: 10000,
    currency: 'UGX',
    period: 'month',
    features: ['safesignal', 'content_filtering', 'device_heartbeat', 'pairing', 'access_requests', 'priority_handling'],
  },
  'school-starter': {
    name: 'School Starter',
    price: 100000,
    currency: 'UGX',
    period: 'month',
    features: ['up_to_50_students', 'caseworker_access', 'teacher_assisted_reporting', 'school_dashboard', 'lesson_assignments'],
  },
  institutional: {
    name: 'NGO / Institutional',
    price: null, // Custom
    currency: 'UGX',
    period: 'custom',
    features: ['unlimited_profiles', 'custom_integrations', 'training_onboarding', 'dedicated_support', 'sla_guarantee'],
  },
};

function createSubscriptionsRouter(SUBSCRIPTIONS, ORGS) {
  const router = express.Router();

  // ── GET /subscriptions/:orgId ──────────────────────────────────────────────
  router.get('/:orgId', (req, res) => {
    const sub = SUBSCRIPTIONS.get(req.params.orgId);
    if (!sub) {
      // Check if org exists — if so, return default free plan
      const org = ORGS.get(req.params.orgId);
      if (org) {
        return res.status(200).json({
          orgId: org.id,
          orgName: org.name,
          plan: org.plan || 'free',
          planName: PLANS[org.plan || 'free']?.name || 'Free',
          status: 'active',
          period: PLANS[org.plan || 'free']?.period || 'permanent',
          price: PLANS[org.plan || 'free']?.price || 0,
        });
      }
      return res.status(404).json({ error: 'Subscription not found.' });
    }

    return res.status(200).json({
      orgId: sub.orgId,
      plan: sub.plan,
      planName: PLANS[sub.plan]?.name || sub.plan,
      status: sub.status,
      startDate: sub.startDate,
      currentPeriodEnd: sub.currentPeriodEnd,
      price: PLANS[sub.plan]?.price || 0,
      period: PLANS[sub.plan]?.period || 'month',
    });
  });

  // ── POST /subscriptions ──────────────────────────────────────────────────────
  // Create a subscription for an organization
  router.post('/', (req, res) => {
    const { orgId, plan } = req.body;

    if (!orgId) return res.status(400).json({ error: 'orgId is required.' });
    if (!PLANS[plan]) return res.status(400).json({ error: `plan must be one of: ${Object.keys(PLANS).join(', ')}` });

    const org = ORGS.get(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const now = new Date().toISOString();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      orgId,
      plan,
      status: plan === 'free' ? 'active' : 'trial',
      startDate: now,
      currentPeriodEnd: plan === 'free' ? null : periodEnd.toISOString(),
      billingHistory: [],
    };

    SUBSCRIPTIONS.set(orgId, sub);
    return res.status(201).json({
      orgId,
      plan,
      status: sub.status,
      startDate: sub.startDate,
      currentPeriodEnd: sub.currentPeriodEnd,
    });
  });

  // ── PUT /subscriptions/:orgId/plan ────────────────────────────────────────
  // Change plan — requires authentication (caseworker for admin)
  router.put('/:orgId/plan', requireAuth, requireRole('caseworker'), (req, res) => {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: `plan must be one of: ${Object.keys(PLANS).join(', ')}` });

    let sub = SUBSCRIPTIONS.get(req.params.orgId);
    if (!sub) {
      // Auto-create if org exists
      const org = ORGS.get(req.params.orgId);
      if (!org) return res.status(404).json({ error: 'Organization not found.' });

      sub = {
        id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
        orgId: req.params.orgId,
        plan: 'free',
        status: 'active',
        startDate: new Date().toISOString(),
        currentPeriodEnd: null,
        billingHistory: [],
      };
      SUBSCRIPTIONS.set(req.params.orgId, sub);
    }

    const oldPlan = sub.plan;
    sub.plan = plan;
    if (plan !== 'free') {
      sub.status = 'active';
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      sub.currentPeriodEnd = periodEnd.toISOString();
    } else {
      sub.status = 'active';
      sub.currentPeriodEnd = null;
    }

    sub.billingHistory.push({
      action: 'plan_change',
      from: oldPlan,
      to: plan,
      at: new Date().toISOString(),
      by: req.user.id,
    });

    return res.status(200).json({
      orgId: sub.orgId,
      plan: sub.plan,
      status: sub.status,
      previousPlan: oldPlan,
    });
  });

  // ── POST /subscriptions/:orgId/billing ────────────────────────────────────
  // Simulated payment — no real payment processor
  router.post('/:orgId/billing', requireAuth, requireRole('caseworker'), (req, res) => {
    let sub = SUBSCRIPTIONS.get(req.params.orgId);
    if (!sub) {
      // Check if org exists — free plan orgs don't need billing
      const org = ORGS.get(req.params.orgId);
      if (org && (org.plan === 'free' || !org.plan)) {
        return res.status(400).json({ error: 'No billing required for this plan.' });
      }
      if (!org) {
        return res.status(404).json({ error: 'Subscription not found.' });
      }
      // Org exists but no subscription record — treat as free
      return res.status(400).json({ error: 'No billing required for this plan.' });
    }

    const { amount, method, reference } = req.body;
    const plan = PLANS[sub.plan];

    if (!plan || plan.price === null || plan.price === 0) {
      return res.status(400).json({ error: 'No billing required for this plan.' });
    }

    const billingRecord = {
      id: 'BILL-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      amount: amount || plan.price,
      currency: plan.currency,
      method: method || 'simulated_mobile_money',
      reference: reference || 'SIM-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      status: 'SIMULATED',
      simulatedAt: new Date().toISOString(),
      note: '⚠️ SIMULATED — No real payment was processed. For demonstration only.',
    };

    sub.billingHistory.push(billingRecord);

    // Extend period
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    sub.currentPeriodEnd = periodEnd.toISOString();

    return res.status(200).json(billingRecord);
  });

  // ── GET /subscriptions/:orgId/billing ──────────────────────────────────────
  router.get('/:orgId/billing', requireAuth, requireRole('caseworker'), (req, res) => {
    const sub = SUBSCRIPTIONS.get(req.params.orgId);
    if (!sub) return res.status(200).json([]);

    return res.status(200).json(sub.billingHistory || []);
  });

  // ── GET /subscriptions/:orgId/entitlements ────────────────────────────────
  // Check what features an org is entitled to
  router.get('/:orgId/entitlements', (req, res) => {
    let sub = SUBSCRIPTIONS.get(req.params.orgId);
    let plan = 'free';

    if (sub) {
      plan = sub.plan;
    } else {
      const org = ORGS.get(req.params.orgId);
      if (org) plan = org.plan || 'free';
    }

    const features = PLANS[plan]?.features || PLANS.free.features;

    return res.status(200).json({
      orgId: req.params.orgId,
      plan,
      features,
      // Essential child reporting is always available regardless of plan
      essentialFeatures: ['anonymous_reporting', 'case_status', 'safety_guidance', 'bilingual'],
      essentialFeaturesAlwaysFree: true,
    });
  });

  return router;
}

module.exports = { createSubscriptionsRouter, PLANS };
