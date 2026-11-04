# GuardianLink — Test Results

Generated: 2026-11-04 (Stage 10+ — Track 5 remaining features)

## Automated Tests

### Server tests
- **9 test suites, 138 tests, all passing**
  - `api.test.js` — Auth, login, rate limiting, pairing, requests, heartbeat
  - `stage-b.test.js` — Pairing, policy, events, SafeSignal, removal, heartbeat
  - `cases.test.js` — Caseworker login, case list, detail, assess, note, status, refer, audit
  - `reports.test.js` — Anonymous report, check-status, authenticated, teacher-assisted
  - `evidence.test.js` — Upload, list, verify SHA-256
  - `stage10.test.js` — Response endpoint, AI classifier, WireMock referral, static serving, E2E
  - `curiosity.test.js` — Question submission, auto-response, serious flagging, caseworker review, categorize
  - `lessons.test.js` — Lesson list/detail, Luganda support, quiz scoring, teacher assignment, lesson creation, progress tracking
  - `subscriptions.test.js` — Plan management, billing (simulated), entitlements, plan changes

### AI Evaluation
- **80 synthetic reports** (English, Luganda, code-mixed)
- Category accuracy: 91.3%
- Priority accuracy: 85.0%
- Combined accuracy: 82.5%
- **CRITICAL false negatives: 0** (no serious incidents missed)
- STANDARD false positives: 1
- Latency: 0.13ms median, 2.1ms P95
- Performance by language: English 77.8%, Luganda 90.0%, Mixed 86.7%

## New Features Implemented in This Phase

| Feature | Backend | Frontend | Tests |
|---|---|---|---|
| Curiosity Corner | ✅ POST /curiosity/ask, GET /:id, GET /pending, PUT /:id/respond, categorize | ✅ PWA connected to backend | 10 tests |
| Learning Library | ✅ GET/POST/PUT /lessons, quiz submit, progress, assignments | ✅ PWA loads from backend, quiz scoring, portal lesson management | 10 tests |
| Teacher Dashboard | ✅ Teacher role routes (assignments, progress) | ✅ Portal with teacher login, lesson assignment, assignment list | Included in lessons tests |
| Voice Reporting | N/A (client-side Web Speech API) | ✅ PWA push-to-talk, editable transcription, text fallback | N/A (browser-dependent) |
| Subscription Admin | ✅ GET/POST/PUT /subscriptions, billing, entitlements | ✅ Portal org registration, plan change, billing | 12 tests |
| FCM Push | ✅ Requests route sends safe push notifications | N/A (server-side) | Existing tests pass |
| Offline Lessons | N/A | ✅ PWA service worker caches /lessons for offline reading | N/A |
| Referral Integration | ✅ Configurable partner registry with minimal data disclosure | ✅ Portal referral with partner labels | Existing tests pass |
| Language Architecture | ✅ PWA i18n extensible dictionary | ✅ EN/LG with extensible structure | N/A |

## Manual Verification Checklist

| Check | Result | Notes |
|---|---|---|
| Anonymous report creates caseRef+recoverySecret | ✓ | Verified by api.test.js + stage10.test.js |
| recoverySecret NOT stored in plaintext | ✓ | Hashed with bcrypt before persistence |
| Parent cannot access /cases | ✓ | Role-guard tested in cases.test.js |
| Child cannot access /cases | ✓ | Role-guard tested in cases.test.js |
| Teacher cannot GET cases | ✓ | Role-guard tested in cases.test.js |
| Teacher can assign lessons | ✓ | Verified in lessons.test.js |
| Teacher cannot access confidential reports | ✓ | Role-guard enforced on /cases |
| Curiosity Corner detects serious concerns | ✓ | Verified in curiosity.test.js |
| Curiosity Corner auto-responds to common questions | ✓ | Verified in curiosity.test.js |
| Curiosity Corner does not expose question text publicly | ✓ | GET /:id does not return question field |
| Lessons support Luganda | ✓ | Verified in lessons.test.js |
| Quiz scoring works | ✓ | Verified in lessons.test.js |
| Free plan never restricts reporting | ✓ | Essential features always free |
| Billing is simulated | ✓ | All billing records marked SIMULATED |
| FCM push only sends safe notifications | ✓ | Only access request notifications, never confidential reports |
| Referral partners use minimal data disclosure | ✓ | Each partner has a dataFields whitelist |
| Voice reporting requires explicit action | ✓ | Push-to-talk, no automatic recording |
| Voice reporting shows editable transcript | ✓ | Transcript placed in text field for editing |
| Offline lessons cached by service worker | ✓ | /lessons GET requests cached for offline access |
| Confidential reports never cached | ✓ | /reports, /cases, /curiosity excluded from cache |
