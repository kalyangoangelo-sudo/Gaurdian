'use strict';

/**
 * middleware/subscription.js
 *
 * Subscription tier enforcement middleware.
 *
 * Essential child reporting features are NEVER restricted by payment status.
 * This middleware only gates optional premium features (content filtering,
 * heartbeat, lesson assignments, etc.).
 *
 * Usage:
 *   router.post('/some-premium-feature',
 *     requireAuth,
 *     requireSubscription('family'),  // requires family plan or higher
 *     handler);
 *
 * The middleware reads the plan from the X-Org-Plan header (set by the
 * organization) or falls back to 'free'.
 *
 * For features that should ALWAYS be free (reporting, case status),
 * do NOT use this middleware at all.
 */

const TIERS = { free: 0, family: 1, 'school-starter': 2, institutional: 3 };

// Features that must NEVER be subscription-gated
const ALWAYS_FREE = new Set([
  'anonymous_reporting',
  'case_status',
  'safety_guidance',
  'bilingual',
  'curiosity_corner',
]);

function requireSubscription(plan) {
  return (req, res, next) => {
    // Get the plan from header or query param
    const p = req.headers['x-org-plan'] || req.query.plan || 'free';

    // Free features always pass
    if (ALWAYS_FREE.has(req.headers['x-feature'])) {
      return next();
    }

    if ((TIERS[p] ?? 0) < (TIERS[plan] ?? 0)) {
      return res.status(402).json({
        error: `This feature requires the '${plan}' plan or higher.`,
        requiredPlan: plan,
        currentPlan: p,
        note: 'Essential child reporting and safety features are always free.',
      });
    }
    next();
  };
}

/**
 * Check if a feature is entitlement-gated.
 * Returns true if the feature requires a specific plan.
 */
function isPremiumFeature(feature) {
  return !ALWAYS_FREE.has(feature);
}

module.exports = { requireSubscription, isPremiumFeature, TIERS, ALWAYS_FREE };
