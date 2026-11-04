/**
 * auth.js
 *
 * Express middleware that verifies a Bearer JWT on protected routes.
 * Attaches the decoded payload to req.user on success.
 *
 * Security:
 *  - Explicitly requires HS256 algorithm to prevent "alg: none" attacks
 *  - Rejects tokens with missing required claims
 */

const jwt = require('jsonwebtoken');

const JWT_ALGORITHM = 'HS256';

/**
 * Express middleware – verifies Authorization: Bearer <token>
 * On success sets req.user = { id, username, role }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],  // Prevent 'alg: none' and RS256 confusion attacks
    });

    // Require essential claims
    if (!payload.id || !payload.role) {
      return res.status(401).json({ error: 'Invalid token claims.' });
    }

    req.user = { id: payload.id, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    // Do not leak JWT details in the response
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware factory – checks that req.user.role matches the required role.
 * Must be used after requireAuth so that req.user is already populated.
 *
 * @param {string|string[]} role  The required role(s) ('parent' | 'child' | 'caseworker' | 'teacher')
 * @returns {Function} Express middleware
 */
function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role];
  return function (req, res, next) {
    if (!req.user) {
      // Defensive: requireAuth was not called first
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: `This action requires the '${allowed.join("' or '")}' role.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
