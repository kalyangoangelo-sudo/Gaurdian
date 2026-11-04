# Stage 2 SafeReport Backend – Security Review

**Verdict: APPROVED**  
**Commit:** `4b7e312` feat: Stage 2 SafeReport backend + case management + evidence  
**Reviewer:** Kiro automated review agent  

---

## Evidence Summary

### Check 1 – recoverySecret never stored in plaintext ✅
`generateRecoverySecret()` returns 32 random bytes as hex. `bcrypt.hash(recoverySecret, 10)` is called immediately; only the resulting `recoverySecretHash` is stored in the case object (`reports.js` createCase, line ~67). The plaintext secret appears only in the `201` response body and nowhere in the store.

### Check 2 – parent CANNOT GET /cases ✅
`GET /` in `cases.js` is guarded by `requireAuth, requireRole('caseworker')`. A parent token (role `'parent'`) is not in `['caseworker']`, producing HTTP 403. Covered by `cases.test.js` "returns 403 with parent JWT".

### Check 3 – child CANNOT GET /cases ✅
Same `requireRole('caseworker')` guard. Child token (role `'child'`) → HTTP 403. Covered by `cases.test.js` "returns 403 with child JWT".

### Check 4 – caseworker notes never in /reports/status response ✅
Both `GET /status/:caseRef` and `POST /check-status` return exactly `{ caseRef, status, category, createdAt, updatedAt }`. The `notes`, `auditTrail`, `description`, `childId`, and `recoverySecretHash` fields are absent. `reports.test.js` line 62 explicitly asserts `expect(statusRes.body).not.toHaveProperty('notes')`.

### Check 5 – rate limiting on public endpoints ✅
`POST /reports/anonymous`, `GET /reports/status/:caseRef`, and `POST /reports/check-status` each use `publicReportLimiter` (5 req/60 s, per-router instance). The skip guard `process.env.NODE_ENV === 'test'` is test-only. The `/auth/caseworker/login` route sits under the general `apiLimiter` (100 req/min) rather than the stricter `loginLimiter`; this is a noted design trade-off but is not a blocker given the requirement covers public reporting endpoints.

### Check 6 – SHA-256 on raw buffer bytes, not base64 string ✅
Upload (`evidence.js` line 74): `crypto.createHash('sha256').update(req.file.buffer).digest('hex')` — multer MemoryStorage places raw bytes in `req.file.buffer`.  
Verify (`evidence.js` lines 44–45): `crypto.createHash('sha256').update(Buffer.from(ev.data, 'base64'))` — `ev.data` is stored base64; `Buffer.from(..., 'base64')` reconstructs the original binary before hashing. Both sides hash the same raw bytes; the comparison is correct.

### Check 7 – all routes mounted in server.js ✅
`server.js` imports and mounts all four new routers:
- `/reports` → `reportsRouter`
- `/cases` → `casesRouter`
- `/evidence` → `evidenceRouter`
- `/organizations` → `organizationsRouter`
- `/` → `casesRouter` (second mount to expose `/auth/caseworker/login` at the root path)

### Check 8 – tests cover critical security paths ✅
| Test file | Paths covered |
|---|---|
| `cases.test.js` | parent→403, child→403, caseworker→200, no-token→401 on `GET /cases`; humanPriority update and validation |
| `reports.test.js` | anonymous report creation; check-status success, notes exclusion, wrong secret→401, unknown caseRef→401 |
| `evidence.test.js` | SHA-256 returned on upload; VERIFIED status; TAMPERED detection when stored data is mutated; mime-type rejection; no-token→401 |

---

## No Blockers
All eight required checks pass. No pre-existing issues introduced by this change are in scope.
