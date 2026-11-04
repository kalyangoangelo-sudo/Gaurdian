/**
 * db/database.js
 *
 * GuardianLink persistent database layer using Node.js built-in node:sqlite
 * (available since Node v22.5, stable in Node v24).
 *
 * WHY node:sqlite instead of sql.js or better-sqlite3:
 *  - Zero dependencies: bundled with Node v24+, no npm install, no native build.
 *  - Writes directly to disk on every transaction via WAL mode — crash-safe.
 *  - sql.js keeps everything in memory and snapshots to disk periodically;
 *    a crash between snapshots loses data and snapshot writes on Windows are
 *    not atomic without explicit journaling.
 *  - better-sqlite3 needs native compilation, which failed on Node v24 here.
 *  - node:sqlite uses the same SQLite3 C library as better-sqlite3, giving
 *    identical durability semantics (WAL, fsync, atomic rename of WAL frames).
 *
 * File location: DB_PATH env var (default: ./data/guardianlink.db)
 *
 * Schema persistence: All tables are created with CREATE TABLE IF NOT EXISTS,
 * so the schema is safely applied on every startup.
 *
 * All read/write helpers use prepared statements — no string interpolation.
 *
 * Stores persisted:
 *   cases, audit_trail, case_notes, referrals, lessons, quiz_results,
 *   lesson_assignments, organizations, subscriptions, demo_requests,
 *   curiosity_questions
 *
 * Stores intentionally NOT persisted (ephemeral — reset on restart):
 *   users (seeded from code), relationships, pairing_codes, requests,
 *   safe_signals, heartbeats, policies, removals, events
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'guardianlink.db');

let db = null;

/**
 * Open (or create) the database and run migrations.
 * Synchronous — call once at server startup before mounting routes.
 *
 * @param {string} [dbPath] Override the database path (useful in tests).
 * @returns {DatabaseSync}
 */
function initDb(dbPath) {
  const target = dbPath || DB_PATH;

  // Ensure the data directory exists
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(target);

  // WAL mode: faster concurrent reads, crash-safe writes.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');   // Safe + fast. FULL is safer but slower.
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');    // Wait up to 5 s on lock contention.

  _applySchema();

  if (target !== ':memory:') {
    console.log(`[DB] SQLite database ready at ${target}`);
  }

  return db;
}

/** Return the open database handle (throws if not initialized). */
function getDb() {
  if (!db) throw new Error('[DB] Database not initialized. Call initDb() first.');
  return db;
}

/** Close the database connection cleanly. */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a callback inside a SQLite transaction.
 * If the callback throws, the transaction is rolled back.
 * If it succeeds, the transaction is committed.
 *
 * @param {Function} fn — Receives the db handle. Do all writes inside.
 * @returns The return value of fn.
 * @throws If fn throws, the original error is re-thrown after rollback.
 */
function runInTransaction(fn) {
  if (!db) throw new Error('[DB] Database not initialized. Call initDb() first.');
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ── Schema ─────────────────────────────────────────────────────────────────────

function _applySchema() {
  db.exec(`
    -- Confidential incident reports
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_ref TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      encrypted_token_map TEXT,
      safe_to_contact INTEGER NOT NULL DEFAULT 1,
      anonymous INTEGER NOT NULL DEFAULT 1,
      child_id TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      ai_result TEXT,
      priority TEXT NOT NULL DEFAULT 'STANDARD',
      human_priority TEXT,
      recovery_secret_hash TEXT NOT NULL,
      submitted_by_role TEXT,
      child_response TEXT,
      response_template TEXT,
      response_sent_by TEXT,
      response_sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Immutable append-only audit log
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT,
      metadata TEXT,
      at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Referral records
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      referral_id TEXT NOT NULL,
      service TEXT,
      status TEXT,
      simulated INTEGER NOT NULL DEFAULT 1,
      simulated_at TEXT,
      acknowledgment TEXT,
      fallback INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Internal caseworker notes (never shown to child)
    CREATE TABLE IF NOT EXISTS case_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      text TEXT NOT NULL,
      added_by TEXT,
      added_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Educational lessons
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_lg TEXT,
      description TEXT,
      description_lg TEXT,
      content TEXT NOT NULL,
      content_lg TEXT,
      age_band TEXT NOT NULL DEFAULT 'all',
      category TEXT NOT NULL DEFAULT 'safety',
      sort_order INTEGER NOT NULL DEFAULT 0,
      quiz TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Child quiz completions
    CREATE TABLE IF NOT EXISTS quiz_results (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      results TEXT,
      completed_at TEXT NOT NULL
    );

    -- Teacher lesson assignments
    CREATE TABLE IF NOT EXISTS lesson_assignments (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      class_id TEXT,
      due_date TEXT,
      assigned_at TEXT NOT NULL
    );

    -- Organizations
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      plan TEXT NOT NULL,
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    -- Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      org_id TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      current_period_end TEXT,
      billing_history TEXT,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );

    -- Demo requests
    CREATE TABLE IF NOT EXISTS demo_requests (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      contact_name TEXT,
      contact_email TEXT,
      org_name TEXT,
      message TEXT,
      created_at TEXT NOT NULL
    );

    -- Curiosity Corner questions
    CREATE TABLE IF NOT EXISTS curiosity_questions (
      id TEXT PRIMARY KEY,
      question_ref TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'pending',
      approved_response TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      is_serious_flag INTEGER NOT NULL DEFAULT 0,
      ai_assessment TEXT,
      created_at TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_cases_status    ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_priority  ON cases(priority);
    CREATE INDEX IF NOT EXISTS idx_cases_created   ON cases(created_at);
    CREATE INDEX IF NOT EXISTS idx_cases_ref       ON cases(case_ref);
    CREATE INDEX IF NOT EXISTS idx_audit_case      ON audit_trail(case_id);
    CREATE INDEX IF NOT EXISTS idx_notes_case      ON case_notes(case_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_case  ON referrals(case_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_child      ON quiz_results(child_id);
    CREATE INDEX IF NOT EXISTS idx_assign_teacher  ON lesson_assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_curiosity_status ON curiosity_questions(status);
  `);
}

// ── CASES ──────────────────────────────────────────────────────────────────────

function insertCase(c) {
  const stmt = db.prepare(`
    INSERT INTO cases
      (id, case_ref, category, description, encrypted_token_map, safe_to_contact,
       anonymous, child_id, status, ai_result, priority, human_priority,
       recovery_secret_hash, submitted_by_role, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    c.id, c.caseRef, c.category, c.description, c.encryptedTokenMap || null,
    c.safeToContact ? 1 : 0, c.anonymous ? 1 : 0, c.childId || null,
    c.status, c.aiResult ? JSON.stringify(c.aiResult) : null,
    c.priority, c.humanPriority || null,
    c.recoverySecretHash, c.submittedByRole || null,
    c.createdAt, c.updatedAt
  );
}

function updateCaseField(id, field, value) {
  const allowed = new Set([
    'status', 'human_priority', 'child_response', 'response_template',
    'response_sent_by', 'response_sent_at', 'updated_at',
  ]);
  if (!allowed.has(field)) throw new Error(`Field '${field}' not updatable`);
  db.prepare(`UPDATE cases SET ${field} = ?, updated_at = ? WHERE id = ?`)
    .run(value, new Date().toISOString(), id);
}

function getCaseById(id) {
  return _rowToCase(db.prepare('SELECT * FROM cases WHERE id = ?').get(id));
}

function getCaseByCaseRef(caseRef) {
  return _rowToCase(db.prepare('SELECT * FROM cases WHERE case_ref = ?').get(caseRef));
}

function listCases() {
  return db.prepare('SELECT * FROM cases ORDER BY created_at DESC').all().map(_rowToCase);
}

function _rowToCase(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseRef: row.case_ref,
    category: row.category,
    description: row.description,
    encryptedTokenMap: row.encrypted_token_map || null,
    safeToContact: !!row.safe_to_contact,
    anonymous: !!row.anonymous,
    childId: row.child_id || null,
    status: row.status,
    aiResult: row.ai_result ? JSON.parse(row.ai_result) : null,
    priority: row.priority,
    humanPriority: row.human_priority || null,
    recoverySecretHash: row.recovery_secret_hash,
    submittedByRole: row.submitted_by_role || null,
    childResponse: row.child_response || null,
    responseTemplate: row.response_template || null,
    responseSentBy: row.response_sent_by || null,
    responseSentAt: row.response_sent_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Notes, referrals, auditTrail are loaded on demand
    notes: [],
    referrals: [],
    auditTrail: [],
  };
}

// ── AUDIT TRAIL ────────────────────────────────────────────────────────────────

function appendAuditEntry(caseId, action, actor, metadata) {
  db.prepare(
    'INSERT INTO audit_trail (case_id, action, actor, metadata, at) VALUES (?, ?, ?, ?, ?)'
  ).run(caseId, action, actor || null, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
}

function getAuditTrail(caseId) {
  return db.prepare('SELECT * FROM audit_trail WHERE case_id = ? ORDER BY id ASC').all(caseId).map(row => {
    const meta = row.metadata ? JSON.parse(row.metadata) : {};
    return { action: row.action, by: row.actor || 'system', at: row.at, ...meta };
  });
}

// ── NOTES ──────────────────────────────────────────────────────────────────────

function addNote(caseId, text, addedBy) {
  db.prepare(
    'INSERT INTO case_notes (case_id, text, added_by, added_at) VALUES (?, ?, ?, ?)'
  ).run(caseId, text, addedBy || null, new Date().toISOString());
}

function getNotes(caseId) {
  return db.prepare('SELECT * FROM case_notes WHERE case_id = ? ORDER BY id ASC').all(caseId).map(r => ({
    text: r.text, by: r.added_by, at: r.added_at,
  }));
}

// ── REFERRALS ─────────────────────────────────────────────────────────────────

function addReferral(caseId, referral) {
  db.prepare(`
    INSERT INTO referrals (id, case_id, referral_id, service, status, simulated, simulated_at, acknowledgment, fallback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    referral.id || require('crypto').randomUUID(),
    caseId,
    referral.referralId,
    referral.service || null,
    referral.status || 'SIMULATED',
    referral.simulated ? 1 : 0,
    referral.simulatedAt || new Date().toISOString(),
    referral.acknowledgment || null,
    referral.fallback ? 1 : 0,
  );
}

function getReferrals(caseId) {
  return db.prepare('SELECT * FROM referrals WHERE case_id = ? ORDER BY rowid ASC').all(caseId).map(r => ({
    referralId: r.referral_id,
    service: r.service,
    status: r.status,
    simulated: !!r.simulated,
    simulatedAt: r.simulated_at,
    acknowledgment: r.acknowledgment,
    fallback: !!r.fallback,
  }));
}

// ── LESSONS ───────────────────────────────────────────────────────────────────

function upsertLesson(l) {
  db.prepare(`
    INSERT OR REPLACE INTO lessons
      (id, title, title_lg, description, description_lg, content, content_lg,
       age_band, category, sort_order, quiz, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    l.id, l.title, l.titleLg || null, l.description || '', l.descriptionLg || null,
    l.content, l.contentLg || null, l.ageBand || 'all', l.category || 'safety',
    l.order || 0, l.quiz ? JSON.stringify(l.quiz) : null,
    l.createdBy || null, l.createdAt || new Date().toISOString()
  );
}

function listLessons(ageBand, category) {
  let sql = 'SELECT * FROM lessons';
  const params = [];
  const conds = [];
  if (ageBand) { conds.push("(age_band = ? OR age_band = 'all')"); params.push(ageBand); }
  if (category) { conds.push('category = ?'); params.push(category); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY sort_order ASC';
  return db.prepare(sql).all(...params).map(_rowToLesson);
}

function getLessonById(id) {
  return _rowToLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
}

function _rowToLesson(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, titleLg: row.title_lg,
    description: row.description, descriptionLg: row.description_lg,
    content: row.content, contentLg: row.content_lg,
    ageBand: row.age_band, category: row.category, order: row.sort_order,
    quiz: row.quiz ? JSON.parse(row.quiz) : null,
    createdBy: row.created_by, createdAt: row.created_at,
  };
}

// ── QUIZ RESULTS ──────────────────────────────────────────────────────────────

function insertQuizResult(r) {
  db.prepare(`
    INSERT INTO quiz_results (id, child_id, lesson_id, score, total_questions, passed, results, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(r.id, r.childId, r.lessonId, r.score, r.totalQuestions, r.passed ? 1 : 0,
    r.results ? JSON.stringify(r.results) : null, r.completedAt);
}

function getChildProgress(childId) {
  return db.prepare('SELECT * FROM quiz_results WHERE child_id = ? ORDER BY completed_at DESC').all(childId).map(r => ({
    lessonId: r.lesson_id, score: r.score, totalQuestions: r.total_questions,
    passed: !!r.passed, completedAt: r.completed_at,
  }));
}

// ── LESSON ASSIGNMENTS ────────────────────────────────────────────────────────

function insertAssignment(a) {
  db.prepare(
    'INSERT INTO lesson_assignments (id, teacher_id, lesson_id, class_id, due_date, assigned_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(a.id, a.teacherId, a.lessonId, a.classId || null, a.dueDate || null, a.assignedAt);
}

function getAssignmentsByTeacher(teacherId) {
  return db.prepare('SELECT * FROM lesson_assignments WHERE teacher_id = ? ORDER BY assigned_at DESC').all(teacherId).map(r => ({
    id: r.id, teacherId: r.teacher_id, lessonId: r.lesson_id,
    classId: r.class_id, dueDate: r.due_date, assignedAt: r.assigned_at,
  }));
}

// ── ORGANIZATIONS ─────────────────────────────────────────────────────────────

function insertOrganization(o) {
  db.prepare(
    'INSERT INTO organizations (id, name, type, plan, contact_email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(o.id, o.name, o.type, o.plan, o.contactEmail || null, o.status || 'pending', o.createdAt);
}

function getOrganizationById(id) {
  const row = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  if (!row) return null;
  return { id: row.id, name: row.name, type: row.type, plan: row.plan,
    contactEmail: row.contact_email, status: row.status, createdAt: row.created_at };
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

function upsertSubscription(s) {
  db.prepare(`
    INSERT OR REPLACE INTO subscriptions (org_id, plan, status, start_date, current_period_end, billing_history)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(s.orgId, s.plan, s.status, s.startDate, s.currentPeriodEnd || null,
    s.billingHistory ? JSON.stringify(s.billingHistory) : null);
}

function getSubscription(orgId) {
  const row = db.prepare('SELECT * FROM subscriptions WHERE org_id = ?').get(orgId);
  if (!row) return null;
  return {
    orgId: row.org_id, plan: row.plan, status: row.status,
    startDate: row.start_date, currentPeriodEnd: row.current_period_end,
    billingHistory: row.billing_history ? JSON.parse(row.billing_history) : [],
  };
}

function updateSubscription(orgId, fields) {
  const sub = getSubscription(orgId);
  if (!sub) return;
  Object.assign(sub, fields);
  upsertSubscription(sub);
}

// ── DEMO REQUESTS ─────────────────────────────────────────────────────────────

function insertDemoRequest(d) {
  db.prepare(
    'INSERT INTO demo_requests (id, org_id, contact_name, contact_email, org_name, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(d.id, d.orgId || null, d.contactName || null, d.contactEmail || null,
    d.orgName || null, d.message || null, d.createdAt);
}

// ── CURIOSITY ─────────────────────────────────────────────────────────────────

function insertCuriosityQuestion(q) {
  db.prepare(`
    INSERT INTO curiosity_questions
      (id, question_ref, question, category, status, approved_response,
       reviewed_by, reviewed_at, is_serious_flag, ai_assessment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    q.id, q.questionRef, q.question, q.category, q.status,
    q.approvedResponse || null, q.reviewedBy || null, q.reviewedAt || null,
    q.isSeriousFlag ? 1 : 0,
    q.aiAssessment ? JSON.stringify(q.aiAssessment) : null, q.createdAt
  );
}

function updateCuriosityQuestion(id, fields) {
  const allowed = { status: true, approved_response: true, reviewed_by: true, reviewed_at: true, category: true };
  for (const [k, v] of Object.entries(fields)) {
    if (allowed[k]) db.prepare(`UPDATE curiosity_questions SET ${k} = ? WHERE id = ?`).run(v, id);
  }
}

function getCuriosityById(id) {
  return _rowToCuriosity(db.prepare('SELECT * FROM curiosity_questions WHERE id = ?').get(id));
}

function listPendingCuriosity() {
  return db.prepare("SELECT * FROM curiosity_questions WHERE status IN ('pending','flagged') ORDER BY is_serious_flag DESC, created_at DESC").all().map(_rowToCuriosity);
}

function _rowToCuriosity(row) {
  if (!row) return null;
  return {
    id: row.id, questionRef: row.question_ref, question: row.question,
    category: row.category, status: row.status,
    approvedResponse: row.approved_response || null,
    reviewedBy: row.reviewed_by || null, reviewedAt: row.reviewed_at || null,
    isSeriousFlag: !!row.is_serious_flag,
    aiAssessment: row.ai_assessment ? JSON.parse(row.ai_assessment) : null,
    createdAt: row.created_at,
  };
}

module.exports = {
  initDb, getDb, closeDb, runInTransaction,
  // Cases
  insertCase, updateCaseField, getCaseById, getCaseByCaseRef, listCases,
  // Audit
  appendAuditEntry, getAuditTrail,
  // Notes
  addNote, getNotes,
  // Referrals
  addReferral, getReferrals,
  // Lessons
  upsertLesson, listLessons, getLessonById,
  // Quiz
  insertQuizResult, getChildProgress,
  // Assignments
  insertAssignment, getAssignmentsByTeacher,
  // Orgs
  insertOrganization, getOrganizationById,
  // Subscriptions
  upsertSubscription, getSubscription, updateSubscription,
  // Demo requests
  insertDemoRequest,
  // Curiosity
  insertCuriosityQuestion, updateCuriosityQuestion, getCuriosityById, listPendingCuriosity,
};
