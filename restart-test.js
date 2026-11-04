/**
 * restart-test.js — Real server restart persistence test.
 *
 * 1. Starts the Express server.
 * 2. Submits a synthetic anonymous report.
 * 3. Caseworker logs in, assesses, notes, sends response, refers.
 * 4. Stops the server (kills the process).
 * 5. Restarts the server.
 * 6. Verifies the case still exists in the queue.
 * 7. Verifies recovery-secret validation still works.
 * 8. Verifies the counselor response survived.
 * 9. Verifies the referral record survived.
 * 10. Verifies the audit trail survived.
 *
 * Run: node restart-test.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, 'server');
const DB_PATH = path.join(SERVER_DIR, 'data', 'guardianlink.db');
const PORT = 3999; // Use a different port to avoid conflicts

let serverProcess = null;
const results = [];
function log(label, pass, detail) {
  const s = pass ? 'PASS' : 'FAIL';
  const line = `[${s}] ${label}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
}

function req(method, pathStr, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = {
      hostname: 'localhost',
      port: PORT,
      path: pathStr,
      method,
      headers,
    };

    const r = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, raw: b }); }
      });
    });
    r.on('error', reject);
    r.setTimeout(10000, () => { r.destroy(new Error('timeout')); });
    if (data) r.write(data);
    r.end();
  });
}

function startServer(isRestart = false) {
  return new Promise((resolve, reject) => {
    // Only delete DB on first start, NOT on restart
    if (!isRestart) {
      try { fs.unlinkSync(DB_PATH); } catch {}
      try { fs.unlinkSync(DB_PATH + '-wal'); } catch {}
      try { fs.unlinkSync(DB_PATH + '-shm'); } catch {}
    }

    serverProcess = spawn('node', ['src/server.js'], {
      cwd: SERVER_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        JWT_SECRET: 'restart-test-secret-xyz',
        PORT: String(PORT),
        NODE_ENV: 'development',
        DB_PATH: DB_PATH,
      },
    });

    serverProcess.stdout.on('data', (d) => {
      const txt = d.toString().trim();
      if (txt) console.log('[server]', txt);
      if (txt.includes('Server running')) {
        setTimeout(() => resolve(), 1000);
      }
    });
    serverProcess.stderr.on('data', (d) => {
      const txt = d.toString().trim();
      if (txt) console.error('[server stderr]', txt);
    });
    serverProcess.on('error', reject);
    serverProcess.on('exit', (code, sig) => {
      console.log(`[server exit] code=${code} sig=${sig}`);
    });

    // Fallback timeout — give server 8s to start
    setTimeout(() => resolve(), 8000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    const proc = serverProcess;  // Capture locally — prevents killing the restarted server
    if (!proc) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; if (serverProcess === proc) serverProcess = null; resolve(); } };
    proc.on('exit', finish);
    proc.kill('SIGTERM');
    setTimeout(() => {
      if (serverProcess === proc) { proc.kill('SIGKILL'); serverProcess = null; }
      finish();
    }, 5000);
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  GuardianLink — Real Server Restart Persistence Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passCount = 0, failCount = 0;
  const check = (label, pass, detail) => {
    log(label, pass, detail);
    if (pass) passCount++; else failCount++;
  };

  // ── Phase 1: Start server and create data ────────────────────────────────
  console.log('Phase 1: Starting server and creating synthetic data...');
  await startServer();
  await new Promise(r => setTimeout(r, 2000));

  // Submit anonymous report
  let r1;
  try {
    r1 = await req('POST', '/reports/anonymous', {
      category: 'Grooming',
      description: 'An adult online keeps telling me to keep our chats secret. He sends me gifts.',
      safeToContact: true,
    });
    check('Report submitted before restart', r1.status === 201 && r1.json.caseRef, `caseRef=${r1.json?.caseRef}`);
  } catch (e) {
    check('Report submitted before restart', false, e.message);
    console.log('\nFATAL: Cannot reach server. Aborting.');
    await stopServer();
    process.exit(1);
  }

  const caseRef = r1.json.caseRef;
  const recoverySecret = r1.json.recoverySecret;

  // Caseworker login
  let cwToken;
  try {
    const l = await req('POST', '/auth/caseworker/login', { username: 'caseworker', password: 'Caseworker123!' });
    cwToken = l.json.token;
    check('Caseworker login before restart', l.status === 200 && cwToken);
  } catch (e) { check('Caseworker login before restart', false, e.message); }

  // Find the case ID
  let caseId;
  try {
    const cases = await req('GET', '/cases', null, cwToken);
    const found = cases.json.find(c => c.caseRef === caseRef);
    caseId = found?.id;
    check('Case in queue before restart', !!caseId, `id=${caseId}`);
  } catch (e) { check('Case in queue before restart', false, e.message); }

  // Caseworker assesses
  try {
    const a = await req('PUT', `/cases/${caseId}/assess`, { humanPriority: 'CRITICAL' }, cwToken);
    check('Assess before restart', a.status === 200);
  } catch (e) { check('Assess before restart', false, e.message); }

  // Caseworker note
  try {
    const n = await req('PUT', `/cases/${caseId}/note`, { note: 'High-risk grooming case. Immediate referral needed.' }, cwToken);
    check('Note added before restart', n.status === 200);
  } catch (e) { check('Note added before restart', false, e.message); }

  // Caseworker sends response
  try {
    const rsp = await req('PUT', `/cases/${caseId}/response`, {
      response: 'Thank you for reporting. A trained person is reviewing your case.',
      responseTemplate: 'received',
    }, cwToken);
    check('Response sent before restart', rsp.status === 200);
  } catch (e) { check('Response sent before restart', false, e.message); }

  // Caseworker refers
  let referralId;
  try {
    const ref = await req('POST', `/cases/${caseId}/refer`, { service: 'Childline Uganda 116' }, cwToken);
    referralId = ref.json?.referralId;
    check('Referral created before restart', ref.status === 200 && referralId, `refId=${referralId}`);
  } catch (e) { check('Referral created before restart', false, e.message); }

  // Update status
  try {
    const s = await req('PUT', `/cases/${caseId}/status`, { status: 'Referred' }, cwToken);
    check('Status → Referred before restart', s.status === 200);
  } catch (e) { check('Status before restart', false, e.message); }

  // Verify child can check status before restart
  try {
    const cs = await req('POST', '/reports/check-status', { caseRef, recoverySecret });
    check('Child status check before restart', cs.status === 200 && cs.json.status === 'Referred',
      `status=${cs.json?.status} response="${cs.json?.response?.substring(0, 30)}..."`);
  } catch (e) { check('Child status check before restart', false, e.message); }

  console.log('\nPhase 2: Stopping server...');
  await stopServer();
  await new Promise(r => setTimeout(r, 2000));
  check('Server stopped', !serverProcess);

  console.log('\nPhase 3: Restarting server...');
  await startServer(true);  // true = isRestart, don't delete DB
  await new Promise(r => setTimeout(r, 2000));

  // Verify health
  try {
    const h = await req('GET', '/health');
    check('Server health after restart', h.status === 200 && h.json.status === 'ok');
  } catch (e) { check('Server health after restart', false, e.message); }

  console.log('\nPhase 4: Verifying data survived restart...');

  // Re-login as caseworker
  let cwToken2;
  try {
    const l = await req('POST', '/auth/caseworker/login', { username: 'caseworker', password: 'Caseworker123!' });
    cwToken2 = l.json.token;
    check('Caseworker login after restart', l.status === 200);
  } catch (e) { check('Caseworker login after restart', false, e.message); }

  // Case should be in queue (loaded from SQLite)
  let caseId2;
  try {
    const cases = await req('GET', '/cases', null, cwToken2);
    const found = cases.json.find(c => c.caseRef === caseRef);
    caseId2 = found?.id;
    check('Case in queue after restart', !!found, `caseRef=${caseRef}`);
    if (found) {
      check('Case status preserved after restart', found.status === 'Referred', `status=${found.status}`);
      check('Case humanPriority preserved', found.humanPriority === 'CRITICAL', `priority=${found.humanPriority}`);
      check('Case AI priority preserved', found.aiResult?.suggestedPriority === 'CRITICAL', `AI=${found.aiResult?.suggestedPriority}`);
    }
  } catch (e) { check('Case in queue after restart', false, e.message); }

  // Case detail should have notes, referral, response, audit
  if (caseId2) {
    try {
      const d = await req('GET', `/cases/${caseId2}`, null, cwToken2);
      check('Case detail loaded after restart', d.status === 200);
      if (d.status === 200) {
        check('Case description preserved', !!d.json.description, 'has description');
        check('Child response preserved after restart',
          d.json.childResponse === 'Thank you for reporting. A trained person is reviewing your case.',
          `response="${d.json.childResponse?.substring(0, 40)}..."`);
        check('Notes preserved after restart',
          d.json.notes?.length >= 1 && d.json.notes[0].text === 'High-risk grooming case. Immediate referral needed.',
          `notes=${d.json.notes?.length}`);
        check('Referral preserved after restart',
          d.json.referrals?.length >= 1 && d.json.referrals[0].referralId === referralId,
          `referrals=${d.json.referrals?.length}`);
        check('Case is anonymous after restart', d.json.anonymous === true);
        check('PII tokenization preserved', !!d.json.encryptedTokenMap, 'encryptedTokenMap present');
      }
    } catch (e) { check('Case detail after restart', false, e.message); }

    // Audit trail should have all 7 entries
    try {
      const a = await req('GET', `/cases/${caseId2}/audit`, null, cwToken2);
      check('Audit trail preserved after restart', a.status === 200 && a.json.length >= 6,
        `entries=${a.json?.length}`);
      if (a.status === 200) {
        const actions = a.json.map(e => e.action);
        check('Audit: created entry', actions.includes('created'));
        check('Audit: assessed entry', actions.includes('assessed'));
        check('Audit: note_added entry', actions.includes('note_added'));
        check('Audit: response_sent entry', actions.includes('response_sent'));
        check('Audit: referred entry', actions.includes('referred'));
        check('Audit: status_changed entry', actions.includes('status_changed'));
      }
    } catch (e) { check('Audit trail after restart', false, e.message); }
  }

  // Recovery secret validation should work after restart
  try {
    const cs = await req('POST', '/reports/check-status', { caseRef, recoverySecret });
    check('Recovery secret validation after restart', cs.status === 200, `status=${cs.status}`);
    if (cs.status === 200) {
      check('Status shows Referred after restart', cs.json.status === 'Referred');
      check('Response visible to child after restart',
        cs.json.response === 'Thank you for reporting. A trained person is reviewing your case.',
        `response="${cs.json.response?.substring(0, 40)}..."`);
    }
  } catch (e) { check('Recovery secret validation after restart', false, e.message); }

  // Wrong recovery secret should still be rejected
  try {
    const ws = await req('POST', '/reports/check-status', { caseRef, recoverySecret: 'wrong' });
    check('Wrong recovery secret rejected after restart', ws.status === 401);
  } catch (e) { check('Wrong secret rejected after restart', false, e.message); }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RESTART TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  PASS: ${passCount}  |  FAIL: ${failCount}  |  TOTAL: ${passCount + failCount}`);
  console.log(`  Result: ${failCount === 0 ? 'ALL PASS — persistence confirmed' : 'FAILURES DETECTED'}`);
  console.log('');

  // Write results to file
  fs.writeFileSync(path.join(__dirname, 'RESTART_TEST_RESULTS.txt'),
    results.join('\n') + `\n\nPASS: ${passCount}  |  FAIL: ${failCount}\n`);

  // Clean up
  await stopServer();

  // Clean up DB
  try { fs.unlinkSync(DB_PATH); } catch {}
  try { fs.unlinkSync(DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(DB_PATH + '-shm'); } catch {}

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL:', e);
  if (serverProcess) serverProcess.kill('SIGKILL');
  process.exit(1);
});
