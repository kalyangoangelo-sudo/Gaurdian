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
    hash: childHash,
    role: 'child',
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

module.exports = { seedUsers, RELATIONSHIPS, createRequestsStore };
