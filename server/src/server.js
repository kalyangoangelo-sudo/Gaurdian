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

// Warn if the placeholder dev secret is still set in production
if (
  process.env.NODE_ENV === 'production' &&
  process.env.JWT_SECRET.includes('replace_before_going_to_production')
) {
  console.error('[GuardianLink] FATAL: Default development JWT_SECRET detected in production. Refusing to start.');
  process.exit(1);
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
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
  createCasesStore,
  createEvidenceStore,
  createOrganizationsStore,
  createDemoRequestsStore,
  createCuriosityStore,
  createLessonsStore,
  createQuizResultsStore,
  createLessonAssignmentsStore,
  createSubscriptionsStore,
} = require('./store');
const { createAuthRouter } = require('./routes/auth');
const { createRequestsRouter } = require('./routes/requests');
const { createPairingRouter } = require('./routes/pairing');
const { createPolicyRouter } = require('./routes/policy');
const { createEventsRouter } = require('./routes/events');
const { createSafeSignalRouter } = require('./routes/safesignal');
const { createRemovalRouter } = require('./routes/removal');
const { createHeartbeatRouter } = require('./routes/heartbeat');
const { createReportsRouter } = require('./routes/reports');
const { createCasesRouter } = require('./routes/cases');
const { createEvidenceRouter } = require('./routes/evidence');
const { createOrganizationsRouter } = require('./routes/organizations');
const { createCuriosityRouter } = require('./routes/curiosity');
const { createLessonsRouter } = require('./routes/lessons');
const { createSubscriptionsRouter } = require('./routes/subscriptions');

const PORT = parseInt(process.env.PORT || '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Trust first proxy in production (needed for rate limiter behind nginx/load balancer)
if (!isDev) {
  app.set('trust proxy', 1);
}

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS (prod),
// and a restrictive Content-Security-Policy.
// Static assets served at /pwa, /portal, /app need script-src 'self' only.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind uses inline styles
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],   // Allow WebSocket connections
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isDev ? null : [],
        frameAncestors: ["'none'"],
      },
    },
    // Only enable HSTS in production behind HTTPS
    hsts: isDev ? false : { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Read approved origins from CORS_ORIGIN env var (comma-separated list).
// Falls back to localhost only in development.
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : (isDev ? ['http://localhost:5173', 'http://localhost:3001'] : []);

app.use(
  cors({
    origin: isDev && ALLOWED_ORIGINS.length === 0
      ? true  // Allow all origins only in dev if no explicit list set
      : (origin, callback) => {
          // Allow requests with no origin (same-origin, server-to-server)
          if (!origin) return callback(null, true);
          if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
          callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
        },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ─── No-Cache for API responses ───────────────────────────────────────────────
// Prevents sensitive API responses from being cached in proxies/browsers.
// Static assets (/app, /pwa, /portal) are not affected — served before this.
app.use('/reports', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.use('/cases', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.use('/curiosity', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

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
  cors: {
    origin: isDev ? true : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
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
const CASES = createCasesStore();
const EVIDENCE = createEvidenceStore();
const ORGS = createOrganizationsStore();
const DEMO_REQUESTS = createDemoRequestsStore();
const CURIOSITY = createCuriosityStore();
const LESSONS = createLessonsStore();
const QUIZ_RESULTS = createQuizResultsStore();
const LESSON_ASSIGNMENTS = createLessonAssignmentsStore();
const SUBSCRIPTIONS = createSubscriptionsStore();

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check – no auth required
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Static File Serving (PWA + Portal + React App) ──────────────────────────
// Serve the child portal PWA at /pwa and the professional portal at /portal.
// These connect to the same API without CORS issues.
app.use('/pwa', express.static(path.join(__dirname, '../../pwa')));
app.use('/portal', express.static(path.join(__dirname, '../../portal')));

// Serve the React web application at /app (SPA with client-side routing)
const webDist = path.join(__dirname, '../../web/dist');
app.use('/app', express.static(webDist));
// SPA fallback: any /app/* route serves index.html (React Router handles routing)
app.get('/app/*', (req, res, next) => {
  // Don't intercept API-like routes
  if (req.path.includes('/assets/') || req.path.includes('/manifest.json') || req.path.includes('/sw.js')) {
    return next();
  }
  res.sendFile(path.join(webDist, 'index.html'));
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
  const reportsRouter = createReportsRouter(CASES, RELATIONSHIPS, io);
  const casesRouter = createCasesRouter(CASES, USERS, io);
  const evidenceRouter = createEvidenceRouter(EVIDENCE, CASES);
  const organizationsRouter = createOrganizationsRouter(ORGS, DEMO_REQUESTS);
  const curiosityRouter = createCuriosityRouter(CURIOSITY, io);
  const lessonsRouter = createLessonsRouter(LESSONS, QUIZ_RESULTS, LESSON_ASSIGNMENTS, io);
  const subscriptionsRouter = createSubscriptionsRouter(SUBSCRIPTIONS, ORGS);

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
  app.use('/reports', apiLimiter, reportsRouter);
  app.use('/cases', apiLimiter, casesRouter);
  app.use('/evidence', apiLimiter, evidenceRouter);
  app.use('/organizations', apiLimiter, organizationsRouter);
  app.use('/curiosity', apiLimiter, curiosityRouter);
  app.use('/lessons', apiLimiter, lessonsRouter);
  app.use('/subscriptions', apiLimiter, subscriptionsRouter);
  // Caseworker login is mounted under cases router at /auth/caseworker/login
  app.use('/', apiLimiter, casesRouter);
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
  // ── Initialize persistent SQLite database ─────────────────────────────────
  try {
    const { initDb } = require('./db/database');
    initDb();
    console.log('[DB] Persistent SQLite database initialized.');

    // ── Hydrate in-memory CASES store from SQLite ───────────────────────────
    // This ensures cases submitted before a restart are still visible in the
    // caseworker queue after the server restarts.
    try {
      const dbModule = require('./db/database');
      const allCases = dbModule.listCases();
      if (allCases.length > 0) {
        for (const c of allCases) {
          // Load notes, referrals, and audit trail from DB
          c.notes = dbModule.getNotes(c.id);
          c.referrals = dbModule.getReferrals(c.id);
          c.auditTrail = dbModule.getAuditTrail(c.id);
          CASES.set(c.id, c);
        }
        console.log(`[DB] Hydrated ${allCases.length} cases from SQLite into memory.`);
      }
    } catch (hydrateErr) {
      console.warn('[DB] Case hydration failed:', hydrateErr.message);
    }
  } catch (dbErr) {
    console.warn('[DB] SQLite initialization failed — running with in-memory store only.', dbErr.message);
  }

  USERS = await seedUsers();
  mountRoutes();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n[GuardianLink] Server running on port ${PORT}`);
    console.log(`  Health:    GET  http://localhost:${PORT}/health`);
    console.log(`  Login:     POST http://localhost:${PORT}/login`);
    console.log(`  Child PWA:      http://localhost:${PORT}/pwa/index.html`);
    console.log(`  Pro Portal:     http://localhost:${PORT}/portal/index.html`);
    console.log(`  Web App:        http://localhost:${PORT}/app/`);
    if (isDev) {
      console.log('\n  ⚠️  Development mode – demo accounts active:');
      console.log('     Parent:     username=parent      password=Parent123!');
      console.log('     Child:      username=child       password=Child123!');
      console.log('     Caseworker: username=caseworker   password=Caseworker123!');
      console.log('     Teacher:    username=teacher      password=Teacher123!');
      console.log('\n  ⚠️  WireMock stub: run "node wiremock/mock-server.js" for referral simulation');
      console.log('  These credentials are for development only. NEVER use in production.\n');
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
  getCases: () => CASES,
  getEvidence: () => EVIDENCE,
  getOrgs: () => ORGS,
  getDemoRequests: () => DEMO_REQUESTS,
  getCuriosity: () => CURIOSITY,
  getLessons: () => LESSONS,
  getQuizResults: () => QUIZ_RESULTS,
  getLessonAssignments: () => LESSON_ASSIGNMENTS,
  getSubscriptions: () => SUBSCRIPTIONS,
};
