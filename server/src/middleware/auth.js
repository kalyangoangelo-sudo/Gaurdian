/**
 * auth.js
 *
 * Express middleware that verifies a Bearer JWT on protected routes.
 * Attaches the decoded payload to req.user on success.
 */

const jwt = require('jsonwebtoken');

/**
 * Express middleware – verifies Authorization: Bearer <token>
 * On success sets req.user = { id, username, role }
 *
 * 401 if Authorization header is missing.
 * 401 if the token is invalid or expired (treated as unauthenticated).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
