/**
 * store.js
 *
 * In-memory data store using plain JavaScript Maps.
 *
 * ⚠️  Restarting the server clears all requests and resets demo accounts
 *     to their default seeded state. This is intentional for the hackathon MVP.
 *     No persistent storage is used.
 */

const bcrypt = require('bcryptjs');

// ─── Users ───────────────────────────────────────────────────────────────────
//
// Schema:
//   id       : string  – stable unique ID
//   username : string
//   hash     : string  – bcrypt hash of password (NEVER store plaintext)
//   role     : 'parent' | 'child'

const SALT_ROUNDS = 10;

/**
 * Seed the users Map with the two demo accounts.
 * Passwords are hashed at startup, not hardcoded as plaintext.
 *
 * ⚠️  DEVELOPMENT ONLY – do not use these credentials in production.
 */
async function seedUsers() {
  const users = new Map();

  const parentHash = await bcrypt.hash('Parent123!', SALT_ROUNDS);
  users.set('parent-1', {
    id: 'parent-1',
    username: 'parent',
    hash: parentHash,
    role: 'parent',
  });

  const childHash = await bcrypt.hash('Child123!', SALT_ROUNDS);
  users.set('child-1', {
    id: 'child-1',
    username: 'child',
    email: 'child@guardian.app',
    hash: childHash,
    role: 'child',
  });

  const caseworkerHash = await bcrypt.hash('Caseworker123!', SALT_ROUNDS);
  users.set('caseworker-1', {
    id: 'caseworker-1',
    username: 'caseworker',
    email: 'caseworker@guardian.app',
    hash: caseworkerHash,
    role: 'caseworker',
  });

  const teacherHash = await bcrypt.hash('Teacher123!', SALT_ROUNDS);
  users.set('teacher-1', {
    id: 'teacher-1',
    username: 'teacher',
    email: 'teacher@guardian.app',
    hash: teacherHash,
    role: 'teacher',
  });

  return users;
}

// ─── Parent-Child Relationships ───────────────────────────────────────────────
//
// Maps childId → parentId.
// For the MVP only one fixed pair is defined.
// This map is the authoritative source – never trust client-supplied parent IDs.

const RELATIONSHIPS = new Map([
  ['child-1', 'parent-1'],
]);

// ─── Requests ─────────────────────────────────────────────────────────────────
//
// Schema:
//   id              : string  – UUID generated on the server
//   childId         : string
//   parentId        : string
//   url             : string  – validated HTTP/HTTPS URL
//   status          : 'pending' | 'approved' | 'denied'
//   createdAt       : string  – ISO 8601
//   decidedAt       : string | null – ISO 8601 or null
//
// This Map is initialised as empty; a fresh Map is returned each call to
// allow tests to reset state easily.

function createRequestsStore() {
  return new Map();
}

// ─── Pairing Store ────────────────────────────────────────────────────────────
//
// Maps code (6-digit string) → { parentId, expiresAt (epoch ms) }

function createPairingStore() {
  return new Map();
}

// ─── Policies Store ───────────────────────────────────────────────────────────
//
// Maps childId → { contentCategories, blockedKeywords, trustedDomains, updatedAt }

function createPoliciesStore() {
  return new Map();
}

// ─── Events Store ─────────────────────────────────────────────────────────────
//
// Maps id → { id, childId, type, detail, timestamp }

function createEventsStore() {
  return new Map();
}

// ─── SafeSignal Store ─────────────────────────────────────────────────────────
//
// Maps id → { id, childId, category, description, status, submittedAt,
//             acknowledgedAt, action }

function createSafeSignalStore() {
  return new Map();
}

// ─── Removal Store ────────────────────────────────────────────────────────────
//
// Maps id → { id, childId, reason, status, requestedAt, decidedAt }

function createRemovalStore() {
  return new Map();
}

// ─── Heartbeat Store ──────────────────────────────────────────────────────────
//
// Maps childId → { deviceId, timestamp, policyVersion }

function createHeartbeatStore() {
  return new Map();
}

// ─── Cases Store ──────────────────────────────────────────────────────────────
//
// Maps id → full case object (see SafeReport schema)

function createCasesStore() {
  return new Map();
}

// ─── Evidence Store ───────────────────────────────────────────────────────────
//
// Maps id → { id, caseId, filename, mimetype, size, sha256, data (base64), uploadedAt }

function createEvidenceStore() {
  return new Map();
}

// ─── Organizations Store ──────────────────────────────────────────────────────
//
// Maps id → { id, name, type, plan, status, createdAt }

function createOrganizationsStore() {
  return new Map();
}

// ─── Demo Requests Store ──────────────────────────────────────────────────────
//
// Maps id → { id, orgId, contactName, email, createdAt }

function createDemoRequestsStore() {
  return new Map();
}

// ─── Curiosity Corner Store ──────────────────────────────────────
//
// Maps id → { id, question, category, status: 'pending'|'reviewed'|'answered',
//             approvedResponse, reviewedBy, reviewedAt, createdAt,
//             isSeriousFlag, questionRef }

function createCuriosityStore() {
  return new Map();
}

// ─── Lessons Store ───────────────────────────────────────────────
//
// Maps id → { id, title, titleLg, description, descriptionLg, content, contentLg,
//             ageBand: '6-9'|'10-13'|'all', category, videoUrl, createdAt,
//             createdBy, order }

function createLessonsStore() {
  return new Map();
}

// ─── Quiz Results Store ──────────────────────────────────────────
//
// Maps id → { id, childId, lessonId, score, totalQuestions, passed, completedAt }

function createQuizResultsStore() {
  return new Map();
}

// ─── Lesson Assignments Store ────────────────────────────────────
//
// Maps id → { id, teacherId, lessonId, classId, assignedAt, dueDate }

function createLessonAssignmentsStore() {
  return new Map();
}

// ─── Subscriptions Store ─────────────────────────────────────────
//
// Maps orgId → { id, orgId, plan, status: 'active'|'trial'|'past_due'|'cancelled',
//                startDate, currentPeriodEnd, billingHistory[] }

function createSubscriptionsStore() {
  return new Map();
}

module.exports = {
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
};
