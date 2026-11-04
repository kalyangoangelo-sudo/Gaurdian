'use strict';

const TIERS = { free: 0, family: 1, 'school-starter': 2, institutional: 3 };

function requireSubscription(plan) {
  return (req, res, next) => {
    const p = req.headers['x-org-plan'] || 'free';
    if ((TIERS[p] ?? 0) < (TIERS[plan] ?? 0)) {
      return res.status(402).json({
        error: `Requires '${plan}' plan`,
        requiredPlan: plan,
        currentPlan: p,
      });
    }
    next();
  };
}

module.exports = { requireSubscription };
