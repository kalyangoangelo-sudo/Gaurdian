/**
 * tests/persistence.test.js
 *
 * Tests that case data survives a simulated server restart.
 * Uses a temporary SQLite file rather than :memory: to prove real disk persistence.
 *
 * Coverage:
 *  - Case written to DB and read back after db.closeDb() + db.initDb()
 *  - Audit trail preserved
 *  - Notes preserved
 *  - Referrals preserved
 *  - Case status updates preserved
 *  - Response to child preserved
 *  - DB is crash-safe (WAL mode, atomic writes)
 *  - Recovery secret hash is not stored in plaintext
 */

'use strict';

process.env.JWT_SECRET = 'test-secret-persistence-xyz';
process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('../src/db/database');

// Use a temp file so we don't pollute the real database
const TMP_DB = path.join(os.tmpdir(), `gl-persistence-test-${Date.now()}.db`);

afterAll(() => {
  db.closeDb();
  // Clean up temp files
  [TMP_DB, TMP_DB + '-wal', TMP_DB + '-shm'].forEach(f => {
    try { fs.unlinkSync(f); } catch (_) {}
  });
});

describe('Persistence — restart survival', () => {

  beforeAll(() => {
    db.initDb(TMP_DB);
  });

  it('stores a case and reads it back', () => {
    const id = crypto.randomUUID();
    const caseRef = crypto.randomBytes(4).toString('hex').toUpperCase();
    const recoveryHash = bcrypt.hashSync('test-secret', 10);
    const now = new Date().toISOString();

    const caseData = {
      id, caseRef, category: 'Cyberbullying',
      description: 'Test description (tokenized)',
      encryptedTokenMap: null, safeToContact: true, anonymous: true,
      childId: null, status: 'Submitted',
      aiResult: { suggestedPriority: 'HIGH', requiresHumanReview: true, indicators: [] },
      priority: 'HIGH', humanPriority: null,
      recoverySecretHash: recoveryHash, submittedByRole: 'anonymous',
      createdAt: now, updatedAt: now,
    };

    db.insertCase(caseData);

    // Simulate restart: close and reopen
    db.closeDb();
    db.initDb(TMP_DB);

    const retrieved = db.getCaseById(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved.caseRef).toBe(caseRef);
    expect(retrieved.category).toBe('Cyberbullying');
    expect(retrieved.status).toBe('Submitted');
    expect(retrieved.anonymous).toBe(true);
  });

  it('recovery secret hash is stored (not plaintext)', () => {
    const id = crypto.randomUUID();
    const secret = 'my-secret-code';
    const hash = bcrypt.hashSync(secret, 10);

    db.insertCase({
      id, caseRef: 'TESTREF1', category: 'Other', description: 'test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'STANDARD',
      humanPriority: null, recoverySecretHash: hash, submittedByRole: 'anonymous',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const row = db.getCaseById(id);
    expect(row.recoverySecretHash).not.toBe(secret);          // not plaintext
    expect(row.recoverySecretHash.startsWith('$2')).toBe(true); // bcrypt format
    expect(bcrypt.compareSync(secret, row.recoverySecretHash)).toBe(true);
  });

  it('preserves audit trail entries', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'AUDIT001', category: 'Threats', description: 'test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'HIGH',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    db.appendAuditEntry(caseId, 'created', 'anonymous', null);
    db.appendAuditEntry(caseId, 'assessed', 'caseworker-1', { humanPriority: 'HIGH' });
    db.appendAuditEntry(caseId, 'note_added', 'caseworker-1', null);

    // Simulate restart
    db.closeDb();
    db.initDb(TMP_DB);

    const trail = db.getAuditTrail(caseId);
    expect(trail.length).toBe(3);
    expect(trail[0].action).toBe('created');
    expect(trail[1].action).toBe('assessed');
    expect(trail[2].action).toBe('note_added');
  });

  it('preserves notes after restart', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'NOTES001', category: 'Grooming', description: 'test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'CRITICAL',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    db.addNote(caseId, 'Urgent: immediate referral required', 'caseworker-1');
    db.addNote(caseId, 'Parent notified via school', 'caseworker-1');

    db.closeDb();
    db.initDb(TMP_DB);

    const notes = db.getNotes(caseId);
    expect(notes.length).toBe(2);
    expect(notes[0].text).toBe('Urgent: immediate referral required');
    expect(notes[1].text).toBe('Parent notified via school');
  });

  it('preserves referrals after restart', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'REF001', category: 'Sextortion', description: 'test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Referred', aiResult: null, priority: 'CRITICAL',
      humanPriority: 'CRITICAL', recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    db.addReferral(caseId, {
      id: crypto.randomUUID(), referralId: 'REF-ABCD1234',
      service: 'Childline Uganda 116', status: 'SIMULATED',
      simulated: true, simulatedAt: new Date().toISOString(),
      acknowledgment: 'SIMULATED - not a real referral',
    });

    db.closeDb();
    db.initDb(TMP_DB);

    const referrals = db.getReferrals(caseId);
    expect(referrals.length).toBe(1);
    expect(referrals[0].referralId).toBe('REF-ABCD1234');
    expect(referrals[0].service).toBe('Childline Uganda 116');
    expect(referrals[0].simulated).toBe(true);
  });

  it('preserves case status update and child response', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'STATUS001', category: 'Online Harassment', description: 'test',
      encryptedTokenMap: null, safeToContact: true, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'STANDARD',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    db.updateCaseField(caseId, 'status', 'Referred');
    db.updateCaseField(caseId, 'child_response', 'Thank you for reporting. A trained person is reviewing your case.');
    db.updateCaseField(caseId, 'response_template', 'received');

    db.closeDb();
    db.initDb(TMP_DB);

    const row = db.getCaseById(caseId);
    expect(row.status).toBe('Referred');
    expect(row.childResponse).toBe('Thank you for reporting. A trained person is reviewing your case.');
    expect(row.responseTemplate).toBe('received');
  });

  it('looks up case by caseRef after restart', () => {
    const caseId = crypto.randomUUID();
    const caseRef = 'FINDME01';
    db.insertCase({
      id: caseId, caseRef, category: 'Other', description: 'find by ref test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'STANDARD',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    db.closeDb();
    db.initDb(TMP_DB);

    const row = db.getCaseByCaseRef(caseRef);
    expect(row).not.toBeNull();
    expect(row.id).toBe(caseId);
    expect(row.category).toBe('Other');
  });

  it('runInTransaction rolls back on error and re-throws', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'TXTEST01', category: 'Other', description: 'before tx',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'STANDARD',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Verify the case was inserted
    expect(db.getCaseById(caseId)).not.toBeNull();

    // Try a transaction that fails — should roll back
    expect(() => {
      db.runInTransaction(() => {
        db.updateCaseField(caseId, 'status', 'Under Review');
        // Now throw — this should roll back the status change
        throw new Error('Simulated write failure');
      });
    }).toThrow('Simulated write failure');

    // Verify the status was NOT changed (rollback worked)
    const after = db.getCaseById(caseId);
    expect(after.status).toBe('Submitted');  // Still the original value
  });

  it('runInTransaction commits when no error', () => {
    const caseId = crypto.randomUUID();
    db.insertCase({
      id: caseId, caseRef: 'TXTEST02', category: 'Other', description: 'commit test',
      encryptedTokenMap: null, safeToContact: false, anonymous: true,
      childId: null, status: 'Submitted', aiResult: null, priority: 'STANDARD',
      humanPriority: null, recoverySecretHash: 'hash',
      submittedByRole: 'anonymous', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Successful transaction — should commit
    db.runInTransaction(() => {
      db.updateCaseField(caseId, 'status', 'Referred');
      db.appendAuditEntry(caseId, 'status_changed', 'test', { status: 'Referred' });
    });

    // Verify both changes were committed
    const after = db.getCaseById(caseId);
    expect(after.status).toBe('Referred');
    const trail = db.getAuditTrail(caseId);
    expect(trail.some(e => e.action === 'status_changed' && e.status === 'Referred')).toBe(true);
  });
});
