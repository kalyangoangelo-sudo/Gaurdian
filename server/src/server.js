/**
 * server.js
 *
 * GuardianLink Lite – Express + Socket.IO backend
 *
 * ⚠️  DEVELOPMENT-ONLY demo accounts are seeded at startup.
 *     Restarting the server clears all requests.
 *     Not suitable for production without significant hardening.
 *
 * Required environment variable:
 *   JWT_SECRET  – a long random secret string (see .env.example)
 *
 * Optional:
 *   PORT        – defaults to 3001
 *   NODE_ENV    – defaults to "development"
 */

'use strict';

// Load .env before anything else
require('dotenv').config();

// ─── Startup Validation ───────────────────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error(
    '\n[GuardianLink] FATAL: JWT_SECRET environment variable is missing or empty.\n' +
    'Copy server/.env.example to server/.env and set a strong secret.\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n'
  );
  process.exit(1);
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const {
  seedUsers,
  RELATIONSHIPS,
  createRequestsStore,
  createPairingStore,
  createPoliciesStore,
  createEventsStore,
  createSafeSignalStore,
  createRemovalStore,
  createHeartbeatStore,
} = require('./store');
const { createAuthRouter } = require('./routes/auth');
const { createRequestsRouter } = require('./routes/requests');
const { createPairingRouter } = require('./routes/pairing');
const { createPolicyRouter } = require('./routes/policy');
const { createEventsRouter } = require('./routes/events');
const { createSafeSignalRouter } = require('./routes/safesignal');
const { createRemovalRouter } = require('./routes/removal');
const { createHeartbeatRouter } = require('./routes/heartbeat');

const PORT = parseInt(process.env.PORT || '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Trust first proxy in production (needed for rate limiter behind nginx/load balancer)
if (!isDev) {
  app.set('trust proxy', 1);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow all origins in development. Tighten in production.
app.use(cors({ origin: '*' }));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

/**
 * Socket.IO authentication middleware.
 * Clients must send their JWT in the handshake auth object:
 *   socket = io(URL, { auth: { token: '<jwt>' } })
 */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required.'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = { id: payload.id, username: payload.username, role: payload.role };
    next();
  } catch {
    next(new Error('Invalid or expired token.'));
  }
});

io.on('connection', (socket) => {
  const { id, username, role } = socket.data.user;
  const room = `user:${id}`;

  socket.join(room);

  if (isDev) {
    console.log(`[Socket] ${username} (${role}) connected → room ${room}`);
  }

  socket.on('disconnect', (reason) => {
    if (isDev) {
      console.log(`[Socket] ${username} disconnected (${reason})`);
    }
  });
});

// ─── In-Memory Stores ─────────────────────────────────────────────────────────
// These are module-level so routes can share them.
// They are populated asynchronously in startServer().
let USERS = new Map();
const REQUESTS = createRequestsStore();
const PAIRING = createPairingStore();
const POLICIES = createPoliciesStore();
const EVENTS = createEventsStore();
const SAFE_SIGNALS = createSafeSignalStore();
const REMOVALS = createRemovalStore();
const HEARTBEATS = createHeartbeatStore();

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check – no auth required
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
// /login is created lazily after USERS is seeded; we store the router reference
// so tests can also call createRoutes() to get a fully wired app.
let authRouter;
let requestsRouter;

function mountRoutes() {
  authRouter = createAuthRouter(USERS);
  requestsRouter = createRequestsRouter(REQUESTS, RELATIONSHIPS, io);

  const pairingRouter = createPairingRouter(PAIRING, RELATIONSHIPS);
  const policyRouter = createPolicyRouter(POLICIES, RELATIONSHIPS);
  const eventsRouter = createEventsRouter(EVENTS, RELATIONSHIPS);
  const safeSignalRouter = createSafeSignalRouter(SAFE_SIGNALS, RELATIONSHIPS, io);
  const removalRouter = createRemovalRouter(REMOVALS, RELATIONSHIPS, io);
  const heartbeatRouter = createHeartbeatRouter(HEARTBEATS, RELATIONSHIPS);

  app.use('/login', loginLimiter, authRouter);
  app.use('/requests', apiLimiter, requestsRouter);
  app.use('/pair', apiLimiter, pairingRouter);
  app.use('/policy', apiLimiter, policyRouter);
  app.use('/events', apiLimiter, eventsRouter);
  app.use('/safesignal', apiLimiter, safeSignalRouter);
  app.use('/removal-request', apiLimiter, removalRouter);
  app.use('/removal-requests', apiLimiter, removalRouter);
  app.use('/heartbeat', apiLimiter, heartbeatRouter);
  app.use('/device-status', apiLimiter, heartbeatRouter);
}

// ─── Centralised Error Handler ────────────────────────────────────────────────
// Must have 4 parameters to be recognised as an error handler by Express.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Never log or return sensitive data
  if (isDev) {
    console.error('[Error]', err.message);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function startServer() {
  USERS = await seedUsers();
  mountRoutes();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n[GuardianLink Lite] Server running on port ${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/health`);
    console.log(`  Login:   POST http://localhost:${PORT}/login`);
    if (isDev) {
      console.log('\n  ⚠️  Development mode – demo accounts active:');
      console.log('     Parent:  username=parent  password=Parent123!');
      console.log('     Child:   username=child   password=Child123!');
      console.log('  These credentials are for development only.\n');
    }
  });
}

startServer().catch((err) => {
  console.error('[GuardianLink] Failed to start server:', err);
  process.exit(1);
});

// Export for testing
module.exports = {
  app,
  server,
  io,
  getUsers: () => USERS,
  getRequests: () => REQUESTS,
  getPairing: () => PAIRING,
  getPolicies: () => POLICIES,
  getEvents: () => EVENTS,
  getSafeSignals: () => SAFE_SIGNALS,
  getRemovals: () => REMOVALS,
  getHeartbeats: () => HEARTBEATS,
};
