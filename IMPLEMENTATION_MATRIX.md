# GuardianLink — Integration, Upgrade & Implementation Matrix

**Date:** 2026-11-04
**Auditor:** Kiro build agent (Stage 10 — Track 5 upgrade)
**Scope:** Full codebase audit against the UCC Testbed Hackathon 2026 Track 5 specification.

---

## 1. Existing Codebase Summary

### Root Flutter project (`guardian/`)

Empty scaffold only. `lib/main.dart` is empty, `pubspec.yaml` is the default template with no application dependencies. No GuardianLink functionality exists here.

### GuardianLinkLite project (`GuardianLinkLite/`)

The actual implementation. Two sub-projects:

| Component | Stack | Status |
|---|---|---|
| `server/` | Node.js 18+, Express 4, Socket.IO 4, JWT, bcryptjs, multer | 76/76 tests passing |
| `mobile/` | Expo SDK 57, React Native 0.86, expo-router, TypeScript | 22 screens, compiles clean |

**Server features (working):**
- JWT authentication with 4 roles (parent, child, caseworker, teacher)
- bcrypt password hashing (10 rounds)
- Anonymous public reporting → caseRef + recoverySecret (bcrypt-hashed)
- AI classifier (rule-based keyword scoring → CRITICAL/HIGH/STANDARD)
- PII tokenizer (email/phone/name replacement + AES-256-CBC encrypted token map)
- Case management (list, detail, assess, note, status, refer, audit trail)
- Evidence upload with SHA-256 integrity verification
- Simulated referral service (in-process, not WireMock)
- Organization registration + demo request
- Rate limiting (login + API)
- Socket.IO real-time events
- Firebase Admin SDK wired (FCM token storage only; no server-side push)

**Mobile app features (working):**
- Role-based login (parent, child, teacher, caseworker)
- Parent-child pairing (6-digit code, 30-min expiry)
- Content filtering engine (allowlist/blocklist/keyword/unicode normalization)
- SafeSignal reporting (child → parent, with triage)
- Access request workflow (child requests URL, parent approves/denies)
- Device heartbeat monitoring
- Removal request workflow
- Public reporting screen (no auth, category picker, caseRef + secret modal)
- Case status checking (recoverySecret lookup, bilingual)
- Caseworker dashboard + case detail (assess, note, status, refer, audit)
- Evidence screen (upload + verify)
- Teacher-assisted report screen
- Commercial landing page (4 pricing tiers, demo request form)
- English + Luganda localization (partial — reporting screens only)
- Firebase Auth (optional, Express JWT is primary)

---

## 2. Implementation Matrix

| # | Feature | Existing status | Required upgrade | Priority | Files affected | Verification |
|---|---|---|---|---|---|---|
| 1 | Existing family app functionality | WORKING | Preserve intact — do not break | P0 | `mobile/`, `server/` | 76 server tests pass; mobile compiles |
| 2 | Public child reporting portal (PWA) | MISSING | Build lightweight standalone PWA (HTML/CSS/JS) connecting to existing Express API | P0 | New `pwa/` directory | PWA loads in browser; report submits to API |
| 3 | Persistent Report Harm button | MISSING | Add persistent floating button on every child-facing PWA screen | P0 | `pwa/` | Button visible on all PWA screens |
| 4 | Picture-based reporting | MISSING | Large illustrated category cards (bullying, threats, etc.) for no-typing submission | P0 | `pwa/`, `server/src/routes/reports.js` | Child submits via picture selection only |
| 5 | Typed reporting | WORKING (mobile) | Port to PWA — short text input | P0 | `pwa/` | Typed report submits successfully |
| 6 | Copy-and-paste reporting | PARTIAL (SafeSignal only) | Add paste field to PWA reporting with XSS-safe handling | P0 | `pwa/` | Pasted text submits without script execution |
| 7 | Voice reporting | MISSING | Push-to-talk Web Speech API; show transcription for confirmation; no audio retention | P2 | `pwa/` | Voice input transcribes and submits |
| 8 | Anonymous case submission | WORKING (server + mobile) | Wire PWA to existing `POST /reports/anonymous` | P0 | `pwa/` | PWA submits anonymously, gets caseRef + secret |
| 9 | Secure case recovery | WORKING (server + mobile) | Port case status screen to PWA | P0 | `pwa/` | PWA checks status with caseRef + recoverySecret |
| 10 | AI-assisted triage | WORKING (rule-based) | Enhance classifier with confidence scoring; add Hugging Face ready architecture | P0 | `server/src/services/aiClassifier.js` | Classifier returns category + urgency + confidence |
| 11 | Deterministic safety escalation | WORKING | Preserve; add explicit critical-safety indicators that override AI scores | P0 | `server/src/services/aiClassifier.js` | Critical indicators never downgraded |
| 12 | Caseworker dashboard (web) | WORKING (mobile only) | Build web professional portal dashboard | P0 | New `portal/` directory | Web dashboard lists cases, supports assess/note/status/refer |
| 13 | Reviewed response workflow | PARTIAL | Add response template selection + approved child-facing response delivery | P0 | `server/src/routes/cases.js`, `pwa/`, `portal/` | Caseworker sends approved response; child sees it |
| 14 | Simulated referral (WireMock) | SIMULATED (in-process) | Replace in-process simulation with WireMock stub; label as simulated | P0 | New `wiremock/` directory, `server/src/services/referralService.js` | WireMock returns acknowledgment; labeled SIMULATED |
| 15 | Case-status checking | WORKING | Port to PWA; ensure limited status info only | P0 | `pwa/` | Child checks status in PWA |
| 16 | Parent/teacher confidentiality | WORKING (server) | Verify and demonstrate in PWA context | P0 | `portal/`, `pwa/` | Parent/teacher cannot access cases |
| 17 | End-to-end testing | PARTIAL | Add E2E test for PWA → server → portal flow | P0 | `server/tests/` | E2E test passes |
| 18 | English/Luganda localization | PARTIAL (mobile only) | Add Luganda to PWA and portal; extend server categories | P1 | `pwa/`, `portal/`, `server/` | Language toggle works in PWA + portal |
| 19 | Code-mixed language assessment | MISSING | Add Luganda keywords to AI classifier; test code-mixed reports | P1 | `server/src/services/aiClassifier.js` | Luganda + English mixed report classified |
| 20 | Synthetic AI evaluation dataset | MISSING | Create 60-100 synthetic reports with labels; measure accuracy/precision/recall/F1 | P1 | New `server/tests/ai-evaluation/` | Evaluation script runs and reports metrics |
| 21 | Low-bandwidth optimization | MISSING | PWA uses minimal assets, compressed responses, no heavy frameworks | P1 | `pwa/` | PWA loads under 50KB initial |
| 22 | Real-time queue updates | WORKING (Socket.IO) | Add SSE or polling fallback for PWA; Socket.IO for portal | P1 | `pwa/`, `portal/` | Portal updates when new case arrives |
| 23 | Safe-contact preferences | WORKING (server) | Surface in PWA reporting UI | P1 | `pwa/` | Child can set safe-to-contact preference |
| 24 | Institutional commercialization demo | WORKING (mobile) | Add to PWA/portal landing; plan comparison, org registration | P1 | `pwa/`, `portal/` | Commercial page shows 4 plans |
| 25 | Copy-and-paste XSS safety | PARTIAL | Sanitize pasted text before display; escape HTML | P1 | `pwa/`, `server/src/utils/validate.js` | Malicious script tags are neutralized |
| 26 | Voice reporting | MISSING | See #7 | P2 | — | — |
| 27 | Curiosity Corner | MISSING | Child Q&A with reviewed response templates; route serious questions to reporting | P2 | `pwa/`, `server/src/routes/` | Child asks question; gets reviewed answer |
| 28 | Sample learning content | MISSING | Small set of lessons with Report Harm button on each | P2 | `pwa/`, `server/` | Lessons display with safety button |
| 29 | Teacher educational dashboard | MISSING | Lesson assignment view for teachers | P2 | `portal/` | Teacher can assign lessons |
| 30 | Advanced privacy tokenization | WORKING | Preserve; document architecture for future | P2 | `server/src/services/tokenizer.js` | Tokenization verified |
| 31 | Evidence integrity demonstration | WORKING | Preserve; label as future for Track 5 | P2 | `server/src/routes/evidence.js` | SHA-256 verified |
| 32 | Subscription administration | PARTIAL | Add plan management UI in portal | P2 | `portal/`, `server/` | Admin can view/update org plans |
| 33 | Time-limited access approvals | NOT IMPLEMENTED | Add `expiresAt` to access requests | P1 | `server/src/routes/requests.js`, `mobile/` | Approved access expires after duration |
| 34 | Server-side FCM push | NOT IMPLEMENTED | Add `admin.messaging().send()` calls | P2 | `server/src/routes/` | Push notification delivered |
| 35 | Feature gating/paywall | NOT IMPLEMENTED | Add subscription middleware enforcement | P2 | `server/src/middleware/subscription.js` | Premium features gated by plan |
| 36 | OS-level uninstall protection | NOT IMPLEMENTED | Document as limitation; do not claim capability | FUTURE | Docs | Clearly labeled as not supported |

---

## 3. Architecture Decision

### Three experiences, one backend

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GuardianLink Express Backend                      │
│                   (existing server/ — enhanced)                       │
│                                                                        │
│  /reports/*    /cases/*    /evidence/*    /organizations/*           │
│  /login        /safesignal  /requests      /pair                      │
│                                                                        │
│  Services: aiClassifier · tokenizer · referralService (→ WireMock)   │
└────────────┬──────────────────┬───────────────────┬─────────────────┘
             │                  │                    │
   ┌─────────▼──────┐  ┌───────▼────────┐  ┌────────▼──────────┐
   │  Child Portal   │  │  Family App     │  │  Professional    │
   │  (PWA — new)    │  │  (Expo — keep)  │  │  Portal (web)    │
   │                 │  │                 │  │  (new)            │
   │  - Report Harm  │  │  - Parent/child │  │  - Caseworker    │
   │  - Picture reps  │  │  - Pairing      │  │    dashboard     │
   │  - Case status   │  │  - Filtering    │  │  - Case mgmt     │
   │  - Curiosity     │  │  - Access reqs  │  │  - Referral      │
   │  - Learning      │  │  - SafeSignal   │  │  - Audit trail   │
   │  - EN/Luganda    │  │  - Heartbeat    │  │  - Admin         │
   └─────────────────┘  └────────────────┘  └──────────────────┘
```

### Technology choices for new components

| Component | Technology | Rationale |
|---|---|---|
| Child Portal (PWA) | Vanilla HTML/CSS/JS, no framework | Lowest possible bundle size; works on any browser; low-data friendly; no build step |
| Professional Portal | Vanilla HTML/CSS/JS | Same rationale; standalone; connects to same API |
| WireMock referral stub | WireMock standalone JAR or Node.js mock server | Simulates Child Helpline 116; clearly labeled SIMULATED |
| AI evaluation | Node.js script + JSON dataset | Runs against existing classifier; reports metrics |

---

## 4. Conflict Resolution

| Conflict | Resolution |
|---|---|
| Flutter vs PWA | Root Flutter project is empty scaffold — no functionality to preserve. Real app is Expo/React Native in `GuardianLinkLite/mobile/`. Keep Expo app as Family Application. Build PWA as standalone web app for child portal. |
| Parental monitoring vs privacy | Existing SafeSignal → parent flow stays in Family App. PWA reporting is fully independent — no parent access. Server `requireRole` middleware already enforces this. |
| Evidence uploads | Track 5 excludes image collection. Existing evidence routes (SHA-256) preserved for future. PWA does not include evidence upload in core flow. |
| AI responses | Existing rule-based classifier preserved. Enhanced with confidence scoring and Luganda keywords. No unrestricted AI-generated advice. Response templates are pre-approved. |
| Anonymous case codes | Already implemented correctly — 8-char caseRef + 64-char hex recoverySecret (bcrypt-hashed). Not a 4-digit code. |
| Offline reporting | PWA optimized for low-bandwidth online. No offline report storage. Server confirms receipt before showing success. |
| Commercialization | Free child reporting preserved. Organization/commercialization routes already exist. PWA + portal include commercial landing. |

---

## 5. Execution Plan (Priority Order)

### Phase 1 — P0 Core (must work)

1. Build PWA child portal (`pwa/`)
   - Report Harm button (persistent)
   - Picture-based reporting (illustrated categories)
   - Typed reporting
   - Copy-and-paste reporting (XSS-safe)
   - Anonymous submission → caseRef + recoverySecret
   - Case status checking
   - EN/Luganda toggle
   - Low-data design

2. Enhance server for PWA
   - Add picture-category mapping to reports route
   - Add response template endpoint
   - Enhance AI classifier (confidence scoring, Luganda keywords)
   - Add child-facing response delivery

3. Build Professional Portal (`portal/`)
   - Caseworker login
   - Case queue (urgency-sorted)
   - Case detail (redacted)
   - Assess, note, status, refer
   - Response template selection
   - Audit trail view

4. WireMock referral stub (`wiremock/`)
   - Mock Child Helpline 116 endpoint
   - Returns acknowledgment
   - Server referral service calls WireMock instead of in-process

5. End-to-end test
   - PWA submit → server receive → AI classify → portal review → response → referral → status check

### Phase 2 — P1 Differentiators

6. Full Luganda localization in PWA + portal
7. Luganda AI classifier keywords + code-mixed testing
8. Synthetic AI evaluation dataset (60-100 reports)
9. Low-bandwidth optimization verification
10. Real-time queue updates (SSE/polling)
11. Time-limited access approvals
12. XSS sanitization hardening
13. Commercial demo in PWA + portal

### Phase 3 — P2 If time allows

14. Voice reporting (Web Speech API)
15. Curiosity Corner
16. Sample learning content
17. Teacher educational dashboard
18. Subscription administration UI
19. Server-side FCM push
20. Feature gating enforcement

### Phase 4 — Documentation

21. Update README
22. Architecture diagram (updated)
23. API documentation
24. Role/permission matrix
25. Feature implementation matrix (this document, kept current)
26. AI model + evaluation documentation
27. Safeguarding protocol
28. Privacy and data retention policy
29. Demo script (updated)
30. Presentation plan
