# GuardianLink — Stage 1 Audit & Gap Analysis

**Date:** Stage 1 gap analysis
**Project:** GuardianLink (formerly GuardianLink Lite)
**Auditor:** Automated build agent (Stage 1)

---

## 1. Inventory of What Currently Exists

### Server routes (8 files in `server/src/routes/`)
`auth.js`, `events.js`, `heartbeat.js`, `pairing.js`, `policy.js`, `removal.js`, `requests.js`, `safesignal.js`

### Mobile screens (14 files in `mobile/src/screens/`)
`ChildDashboard.tsx`, `ChildProtectionStatusScreen.tsx`, `ChildRemovalRequestScreen.tsx`,
`ChildRequestAccessScreen.tsx`, `ChildSafeSignalScreen.tsx`, `LoginScreen.tsx`,
`ParentAccessRequestsScreen.tsx`, `ParentContentRestrictionsScreen.tsx`, `ParentDashboard.tsx`,
`ParentDeviceSecurityScreen.tsx`, `ParentManageChildScreen.tsx`, `ParentRemovalRequestsScreen.tsx`,
`ParentSafeSignalReviewScreen.tsx`, `SplashScreen.tsx`

### Mobile services (9 files in `mobile/src/services/`)
`filterEngine.ts`, `filterEngine.testcases.ts`, `firebase.ts`, `firebaseAuth.ts`,
`firebaseRequests.ts`, `heartbeatService.ts`, `notifications.ts`, `safeSignalTriage.ts`,
`safetyClassifier.ts`

---

## 2. Gap Analysis — Features Stages 2–10

> **Priority key:** P1 = Must have (core safety/compliance) · P2 = High value (differentiator) · P3 = Supporting (polish, ops)

| # | Feature | Stage | Current Status | Required Changes | Priority |
|---|---|---|---|---|---|
| 1 | **Confidential reporting** — child submits anonymous/confidential report separate from SafeSignal | 2 | ❌ NOT IMPLEMENTED | New screen `ChildConfidentialReportScreen.tsx`; new route `server/src/routes/confidential.js` (`POST /confidential`); store entry in `store.js`; parent review UI addition | P1 |
| 2 | **Caseworker role & routes** — dedicated caseworker account type with own dashboard and report access | 2 | ❌ NOT IMPLEMENTED | New role `caseworker` in JWT payload; new route file `server/src/routes/caseworker.js` (`GET /caseworker/reports`, `PUT /caseworker/reports/:id/action`); `requireRole('caseworker')` middleware; `CaseworkerDashboardScreen.tsx` | P1 |
| 3 | **Evidence routes** — upload and retrieve evidence attachments linked to a report | 3 | ❌ NOT IMPLEMENTED | New route `server/src/routes/evidence.js` (`POST /evidence`, `GET /evidence/:reportId`); multer or base64 handling; evidence store in `store.js`; `EvidenceUploadScreen.tsx` | P1 |
| 4 | **Evidence integrity** — hash-based tamper detection for uploaded evidence | 3 | ❌ NOT IMPLEMENTED | SHA-256 hash computed server-side on ingest; hash stored alongside evidence record; `GET /evidence/:id/verify` endpoint; service `evidenceIntegrity.ts` in mobile services | P1 |
| 5 | **Organisation (org) routes** — multi-tenant school/org registration and child assignment | 4 | ❌ NOT IMPLEMENTED | New route file `server/src/routes/orgs.js` (`POST /orgs`, `GET /orgs/:id`, `POST /orgs/:id/members`); org store in `store.js`; `OrgDashboardScreen.tsx` | P2 |
| 6 | **Teacher role** — teacher account type linked to an org, can view flagged content for their class | 4 | ❌ NOT IMPLEMENTED | New role `teacher` in JWT; `requireRole('teacher')` guard; `TeacherDashboardScreen.tsx`; `GET /teacher/flags` route in `caseworker.js` or new `teacher.js` | P2 |
| 7 | **AI classifier** — ML/heuristic text classifier replacing or augmenting rule-based `safetyClassifier.ts` | 5 | 🟠 PARTIALLY IMPLEMENTED — rule-based classifier exists (`safetyClassifier.ts`, 18 rules G001–G010, B001–B005, T001–T004); no probabilistic/ML layer | Add probability scores and confidence levels to classifier output; new service `aiClassifier.ts`; wire into `safeSignalTriage.ts`; server-side classifier endpoint `POST /classify` in new `server/src/routes/classify.js` | P2 |
| 8 | **Tokenizer / NLP preprocessing** — tokenize and stem input before classification | 5 | ❌ NOT IMPLEMENTED | New service `tokenizer.ts` in `mobile/src/services/`; integrate into `aiClassifier.ts` pipeline | P2 |
| 9 | **Referral simulation** — simulate referral of a report to an external agency (NCMEC, law enforcement) | 6 | ❌ NOT IMPLEMENTED | New route `server/src/routes/referral.js` (`POST /referral`, `GET /referral/:reportId/status`); referral store; `ReferralStatusScreen.tsx`; simulated status transitions (PENDING → SENT → ACKNOWLEDGED) | P1 |
| 10 | **Localization (i18n)** — multi-language support across all screens | 7 | ❌ NOT IMPLEMENTED | Add `i18next` + `react-i18next`; locale files under `mobile/src/locales/` (en, es minimum); wrap all user-facing strings; locale selector in settings | P2 |
| 11 | **ChildSafetyResourcesScreen** — new screen listing emergency contacts, helplines, and safety tips | 8 | ❌ NOT IMPLEMENTED | New screen `ChildSafetyResourcesScreen.tsx`; static data + locale support; accessible from child tab bar | P1 |
| 12 | **ParentReportsScreen** — consolidated view of all reports (SafeSignal + confidential + referral) | 8 | ❌ NOT IMPLEMENTED | New screen `ParentReportsScreen.tsx`; aggregated API call; filter/sort by type and status | P2 |
| 13 | **OrgDashboardScreen** — org-admin view showing member children, flagged counts, and referral summary | 8 | ❌ NOT IMPLEMENTED | New screen `OrgDashboardScreen.tsx`; requires org routes (item 5) | P2 |
| 14 | **TeacherDashboardScreen** — teacher view of flagged content for their assigned class | 8 | ❌ NOT IMPLEMENTED | New screen `TeacherDashboardScreen.tsx`; requires teacher role (item 6) | P2 |
| 15 | **CaseworkerDashboardScreen** — caseworker view of assigned reports and action history | 8 | ❌ NOT IMPLEMENTED | New screen `CaseworkerDashboardScreen.tsx`; requires caseworker routes (item 2) | P1 |
| 16 | **EvidenceUploadScreen** — child/parent attaches images or text evidence to a report | 8 | ❌ NOT IMPLEMENTED | New screen `EvidenceUploadScreen.tsx`; requires evidence routes (item 3) | P1 |
| 17 | **ReferralStatusScreen** — child/parent tracks referral progress | 8 | ❌ NOT IMPLEMENTED | New screen `ReferralStatusScreen.tsx`; requires referral routes (item 9) | P1 |
| 18 | **Commercialization layer** — subscription tiers, feature gating, and billing hooks | 9 | ❌ NOT IMPLEMENTED | New route `server/src/routes/subscription.js` (`GET /subscription`, `POST /subscription/upgrade`); feature-flag service `featureFlags.ts`; paywall UI component; integration point for Stripe or RevenueCat | P3 |
| 19 | **Time-limited access approvals** — approved URL access expires after a configurable duration | 2 | ❌ NOT IMPLEMENTED (noted in FEATURE_STATUS #24) | Add `expiresAt` field to requests store; background job or check-on-read expiry in `requests.js`; UI shows expiry timer in `ParentAccessRequestsScreen` | P2 |
| 20 | **External agency referral (real)** — live POST to NCMEC CyberTipline or equivalent | 10 | ❌ NOT IMPLEMENTED | New service `agencyReferral.ts`; server-side proxy route `POST /referral/submit-external`; requires API credentials (out of scope for demo — simulate only) | P3 |
| 21 | **FCM server-side push** — server sends FCM push on SafeSignal, referral update, and decision events | 2 | 🟠 PARTIALLY IMPLEMENTED — client registers FCM token and stores it in Firestore (`notifications.ts`); server emits Socket.IO only; no `admin.messaging().send()` calls | Add `firebase-admin` messaging calls in `safesignal.js`, `requests.js`, `referral.js` on relevant events | P2 |
| 22 | **Persistence layer** — data survives server restart | 2 | ❌ NOT IMPLEMENTED — all stores are in-memory Maps | Add `better-sqlite3` or JSON-file persistence adapter; wrap store read/writes; migration on startup | P2 |
| 23 | **HTTPS / TLS in development** — encrypted transport | 9 | ❌ NOT IMPLEMENTED | Add `mkcert` self-signed cert setup to README; update `server.js` to support `HTTPS_CERT` / `HTTPS_KEY` env vars | P3 |
| 24 | **Deployment documentation** — guide to deploy server to a cloud host | 10 | ❌ NOT IMPLEMENTED | New `DEPLOYMENT.md` covering Railway / Render / Fly.io; environment variable checklist; CORS hardening notes | P3 |
| 25 | **API documentation** — full route reference for integrators | 10 | ❌ NOT IMPLEMENTED | New `API_REFERENCE.md` or OpenAPI `openapi.yaml`; document all existing + new routes with request/response schemas | P3 |
| 26 | **Caseworker assignment workflow** — admin assigns report to specific caseworker | 6 | ❌ NOT IMPLEMENTED | `POST /caseworker/assign` route; assignment store field; notification to caseworker via Socket.IO + FCM | P2 |
| 27 | **Audit log** — immutable log of all actions taken on a report | 6 | ❌ NOT IMPLEMENTED | New `auditLog.js` store + route `GET /audit/:reportId`; append-only log entries with actor, action, timestamp | P2 |
| 28 | **Multi-child support per parent** — parent manages more than one child profile | 2 | 🟠 PARTIALLY IMPLEMENTED — pairing supports dynamic codes; `RELATIONSHIPS` is a Map but UI/filtering assumes one child | Extend `ParentManageChildScreen` to list all paired children; filter requests/signals by selected child | P2 |
| 29 | **Child safety resources route** — server-side endpoint for localizable resource content | 7 | ❌ NOT IMPLEMENTED | `GET /resources` route returning hotlines and tips by locale; new `server/src/routes/resources.js` | P2 |
| 30 | **Android Device Admin / uninstall protection** — OS-level enforcement | 10 | ❌ NOT IMPLEMENTED | Requires native Android module (Device Policy Controller); out of scope for Expo managed workflow without bare ejection; document limitation | P3 |

---

## 3. New Routes Needed

Routes that do not yet exist in `server/src/routes/`:

| Route file | Methods | Purpose |
|---|---|---|
| `confidential.js` | POST /confidential, GET /confidential/:parentId | Confidential child reports |
| `caseworker.js` | GET /caseworker/reports, PUT /caseworker/reports/:id/action, POST /caseworker/assign | Caseworker report management and assignment |
| `evidence.js` | POST /evidence, GET /evidence/:reportId, GET /evidence/:id/verify | Evidence upload and integrity check |
| `orgs.js` | POST /orgs, GET /orgs/:id, POST /orgs/:id/members | Organisation multi-tenancy |
| `teacher.js` | GET /teacher/flags, GET /teacher/children | Teacher class-level view |
| `referral.js` | POST /referral, GET /referral/:reportId/status, POST /referral/submit-external | Referral simulation and (future) live submission |
| `classify.js` | POST /classify | Server-side AI/heuristic classification endpoint |
| `subscription.js` | GET /subscription, POST /subscription/upgrade | Commercialization feature gating |
| `resources.js` | GET /resources | Localizable safety resource content |
| `audit.js` | GET /audit/:reportId | Immutable audit log per report |

**Total new route files needed: 10**

---

## 4. New Screens Needed

Screens that do not yet exist in `mobile/src/screens/`:

| Screen file | Role | Purpose |
|---|---|---|
| `ChildConfidentialReportScreen.tsx` | child | Submit a confidential report |
| `ChildSafetyResourcesScreen.tsx` | child | Emergency contacts and safety tips |
| `EvidenceUploadScreen.tsx` | child/parent | Attach image or text evidence to a report |
| `ReferralStatusScreen.tsx` | child/parent | Track referral progress |
| `ParentReportsScreen.tsx` | parent | Consolidated all-reports view |
| `CaseworkerDashboardScreen.tsx` | caseworker | Assigned reports and action history |
| `TeacherDashboardScreen.tsx` | teacher | Flagged content for assigned class |
| `OrgDashboardScreen.tsx` | org-admin | Org-level child and flag summary |

**Total new screens needed: 8** (7 net-new roles/purposes + 1 consolidated parent view)

> Note: 14 screens currently exist. The 7 required by the original brief's "7 new screens" map to: ChildConfidentialReportScreen, ChildSafetyResourcesScreen, EvidenceUploadScreen, ReferralStatusScreen, ParentReportsScreen, CaseworkerDashboardScreen, TeacherDashboardScreen.

---

## 5. New Services Needed

Service files that do not yet exist in `mobile/src/services/`:

| Service file | Purpose |
|---|---|
| `aiClassifier.ts` | Probabilistic/ML-augmented classification layer on top of rule-based `safetyClassifier.ts` |
| `tokenizer.ts` | NLP preprocessing — tokenize, lowercase, stem input before classification |
| `evidenceIntegrity.ts` | Client-side SHA-256 hash computation before upload; verify against server hash |
| `featureFlags.ts` | Subscription-tier feature gating |
| `i18n.ts` | i18next initialization and locale loading |
| `referralService.ts` | API calls for referral submission and status polling |
| `agencyReferral.ts` | (Server-side, in `server/src/services/`) Proxy to external agency API |

**Total new service files needed: 7** (6 mobile + 1 server-side)

---

## 6. New Documentation Needed

| Document | Location | Purpose |
|---|---|---|
| `DEPLOYMENT.md` | project root | Cloud deployment guide (Railway/Render/Fly.io), env vars, CORS hardening |
| `API_REFERENCE.md` or `openapi.yaml` | project root | Full route reference with request/response schemas |
| `COMMERCIALIZATION.md` | project root | Subscription tier definitions, feature gating map, billing integration points |
| `LOCALIZATION.md` | project root | i18n setup guide, supported locales, contribution instructions |
| Updated `README.md` | project root | Reflect GuardianLink name (not GuardianLink Lite), all new roles and features |

---

## 7. Summary Counts

| Category | Count |
|---|---|
| **Missing features** (not implemented or partial) | **30** |
| **New server route files needed** | **10** |
| **New screens needed** | **8** |
| **New service files needed** | **7** |
| **New documentation files needed** | **5** |

---

## 8. Technology Stack (unchanged from Stage A)

| Item | Version |
|---|---|
| Expo SDK | 57.0.0 (`expo ~57.0.29`) |
| React Native | 0.86.3 |
| React | 19.2.3 |
| TypeScript | ~5.8.3 |
| expo-router | ~57.0.27 |
| Node.js (server) | 18+ |
| Express | backend framework |
| Socket.IO | real-time events |
| JWT (`jsonwebtoken`) | 24 h expiry |
| bcryptjs | password hashing (10 rounds) |
| Firebase project | guardian-link-6de8a |

---

## 9. Git Branch Status

- `v1-backup` — snapshot at Stage A start
- `main` — active development branch

---

*Generated by Stage 1 audit agent.*
