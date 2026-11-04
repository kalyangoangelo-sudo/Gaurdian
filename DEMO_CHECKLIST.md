# GuardianLink — Demo Checklist

**Date:** 2026-11-04

---

## Pre-Demo Setup

- [ ] Start Express server: `cd server && npm start`
- [ ] Start WireMock stub: `node wiremock/mock-server.js`
- [ ] Verify health: `curl http://localhost:3001/health` → `{"status":"ok"}`
- [ ] Open web app: `http://localhost:3001/app/` in browser
- [ ] Set mobile app `API_BASE_URL` to server LAN IP if showing mobile
- [ ] Have synthetic report text ready (see below)

### Demo Accounts
| Role | Username | Password |
|---|---|---|
| Parent | `parent` | `Parent123!` |
| Child | `child` | `Child123!` |
| Caseworker | `caseworker` | `Caseworker123!` |
| Teacher | `teacher` | `Teacher123!` |

---

## Demo Script (3 minutes)

### Scene 1: Child Report (30s)
1. Open web app at `/app/`
2. Tap **Report Harm** (persistent red button)
3. Select **Bullying** picture card
4. Type: "Someone keeps sending me mean messages saying I'm ugly"
5. Tap **Send Report**
6. Modal shows caseRef + recovery code — copy both
7. Say: "All data persists in SQLite. The report is saved."

### Scene 2: AI Assessment (20s)
1. Open `/app/counselor` in new tab
2. Login: `caseworker` / `Caseworker123!`
3. Case queue loads — point out CRITICAL grooming case with AI flag
4. Say: "AI classifies each report. Critical indicators are never downgraded."

### Scene 3: Counselor Review (40s)
1. Click the grooming case
2. Show AI panel: CRITICAL, requiresHumanReview: true
3. Tap **Set Priority** → CRITICAL
4. Tap **Add Note** → "High-risk case. Referring to Child Helpline."
5. Tap **Send Response** → select "Report received" → send
6. Say: "Responses are pre-approved templates, not AI-generated advice."

### Scene 4: Simulated Referral (30s)
1. Tap **Refer Case** → select "Childline Uganda 116"
2. WireMock returns acknowledgment (SIMULATED label)
3. Tap **Change Status** → "Referred"
4. Show audit trail (7 entries)

### Scene 5: Child Status Check (20s)
1. Go to child portal
2. Tap **Check Case Status**
3. Enter caseRef + recovery code from Scene 1
4. Shows: status, category, and counselor's response
5. Say: "Child sees the response but never sees notes, AI data, or other cases."

### Scene 6: Privacy Test (20s)
1. Open `/app/parent` — login as parent
2. Point out: no "View Cases" anywhere
3. Say: "Parents cannot access confidential reports. Role-based middleware enforces this."

### Scene 7: Restart Survival (20s)
1. Stop the server (Ctrl+C)
2. Restart: `npm start`
3. Refresh counselor dashboard — case still there
4. Say: "All data persists in SQLite. Nothing is lost on restart."

---

## Synthetic Report Texts

**Standard (English):**
> "Someone keeps sending me mean messages saying I'm ugly and nobody likes me"

**High-risk (Grooming):**
> "An adult online keeps telling me to keep our chats secret. He sends me gifts."

**Luganda:**
> "Omulala avuda ku mutimbagano yamba asinga obudde njja kukubonera"

---

## Post-Demo Verification

- [ ] Run: `cd server && npm test` → 173 tests pass
- [ ] Run: `node restart-test.js` → 34/34 pass
- [ ] Check: `npm audit` in server → 0 high severity
- [ ] Verify: Web app builds: `cd web && npm run build`

---

## What's Real vs Simulated

| Feature | Status |
|---|---|
| Anonymous reporting | REAL — stored in SQLite, survives restart |
| AI triage | REAL — rule-based classifier with confidence scoring |
| Counselor review | REAL — assess, note, status, response |
| Referral to Child Helpline 116 | SIMULATED — WireMock stub, clearly labeled |
| Payment processing | SIMULATED — no real payment processor |
| Data persistence | REAL — SQLite WAL mode, transactions |
| Role-based access control | REAL — enforced on all protected routes |
| PII tokenization | REAL — AES-256-CBC encryption |
| Evidence SHA-256 | REAL — hash computed and verified |
| FCM push notifications | PARTIAL — token storage works, server-side push for access requests only |
