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

module.exports = { requireAuth };
