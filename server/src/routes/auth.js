/**
 * routes/auth.js
 *
 * POST /login  – authenticates a user and returns a signed JWT.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

/**
 * Creates the login route handler using the injected users store.
 * Using dependency injection keeps the route testable without a global store.
 *
 * @param {Map} users  The in-memory users Map
 */
function createAuthRouter(users) {
  /**
   * POST /login
   *
   * Body: { username: string, password: string }
   *
   * Success 200: { token: string, user: { id, username, role } }
   * Error  400: missing fields
   * Error  401: wrong credentials
   */
  router.post('/', async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Username is required.' });
      }
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Password is required.' });
      }

      // Find user by username (O(n) is fine for two demo accounts)
      let foundUser = null;
      for (const user of users.values()) {
        if (user.username === username.trim()) {
          foundUser = user;
          break;
        }
      }

      // Use a constant-time comparison to avoid timing attacks
      // We always run bcrypt.compare even when the user is not found
      const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12345'; // invalid but same length
      const hash = foundUser ? foundUser.hash : dummyHash;
      const match = await bcrypt.compare(password, hash);

      if (!foundUser || !match) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const token = jwt.sign(
        { id: foundUser.id, username: foundUser.username, role: foundUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h', algorithm: 'HS256' }
      );

      return res.status(200).json({
        token,
        user: {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createAuthRouter };
