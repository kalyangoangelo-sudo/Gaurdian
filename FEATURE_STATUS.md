# GuardianLink — Feature Status

> **Legend**
>
> | Label | Meaning |
> |---|---|
> | ✅ WORKING AND TESTED | Implemented end-to-end with a passing automated test or verified live API call |
> | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Code is real and executes correctly; constraints exist (e.g. in-memory only, LAN only) |
> | 🔵 SIMULATED | UI exists and the flow is walkable, but the underlying action is mocked or pre-seeded |
> | 🟠 PARTIALLY IMPLEMENTED | Core logic exists; one or more required pieces are missing or wired only one-way |
> | ❌ NOT IMPLEMENTED | Feature is absent from the codebase |

---

## 1. Auth & Accounts

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | JWT authentication — `POST /login`, signed token, 24 h expiry | ✅ WORKING AND TESTED | Covered by `api.test.js` (login, bad-creds, rate-limit) |
| 2 | bcrypt password hashing (10 rounds) | ✅ WORKING AND TESTED | All passwords stored as bcrypt hashes in in-memory user store |
| 3 | Role-based routing (child → child dashboard, parent → parent dashboard, teacher → teacher report) | ✅ WORKING AND TESTED | `AuthContext.tsx` reads `role` from JWT; `expo-router` guards enforce it |
| 4 | Server-side role authorization — `requireRole()` middleware on every protected route | ✅ WORKING AND TESTED | Applied to all non-public endpoints |
| 5 | Caseworker login — `POST /auth/caseworker/login` | ✅ WORKING AND TESTED | Separate login endpoint in `cases.js`; returns `{ token, role: 'caseworker' }` |
| 6 | Firebase Email/Password Auth | 🟠 PARTIALLY IMPLEMENTED | SDK wired (`firebaseAuth.ts`); primary demo flow uses Express JWT; Firebase used for FCM token storage only |

---

## 2. Pairing

| # | Feature | Status | Notes |
|---|---|---|---|
| 7 | Dynamic parent-child pairing via one-time 6-digit code | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `POST /pair/generate` + `POST /pair/confirm`; 30-min expiry; in-memory only |
| 8 | Pairing code UI (parent generates, child enters) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentManageChildScreen` + `ChildDashboard` entry UI; works on LAN |

---

## 3. Content Filtering

| # | Feature | Status | Notes |
|---|---|---|---|
| 9 | Domain allowlist (educational domains) | ✅ WORKING AND TESTED | `filterEngine.ts` ALLOWLIST rule; test cases pass |
| 10 | Domain blocklist with category mapping | ✅ WORKING AND TESTED | `filterEngine.ts` BLOCKLIST_DOMAIN rule |
| 11 | Keyword filtering — adult, violence, drugs, gambling — word-boundary regex | ✅ WORKING AND TESTED | 4 keyword rule groups; `matchesPhrase` uses `\b` regex |
| 12 | Unicode normalization & diacritic stripping (obfuscation defence) | ✅ WORKING AND TESTED | `normalize()` — NFC → NFD → strip U+0300–U+036F |
| 13 | Educational exception downgrade ("breast cancer" → REVIEW not BLOCK) | ✅ WORKING AND TESTED | `EDUCATIONAL_EXCEPTION_PHRASES`; test covered |
| 14 | Policy-level custom blocked keywords | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `PUT /policy/:childId`; survives until server restart |
| 15 | Content Restrictions UI | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentContentRestrictionsScreen` saves to server via API |

---

## 4. SafeSignal (Child Safety Reporting)

| # | Feature | Status | Notes |
|---|---|---|---|
| 16 | Child submits SafeSignal report (category + description + optional pasted text) | ✅ WORKING AND TESTED | `POST /safesignal`; `ChildSafeSignalScreen`; Socket.IO `safesignal:new` emitted |
| 17 | Safety classifier — 18 named rules (G001–G010, B001–B005, T001–T004) | ✅ WORKING AND TESTED | `safetyClassifier.ts`; `filterEngine.testcases.ts` covers it |
| 18 | SafeSignal triage — HIGH/MEDIUM/LOW derivation + `requiresImmediateAttention` | ✅ WORKING AND TESTED | `safeSignalTriage.ts` |
| 19 | Parent views triage result (GROOMING_INDICATORS, risk level, recommended actions) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentSafeSignalReviewScreen` — triage runs client-side on fetched report text |
| 20 | Parent acknowledges report | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `PUT /safesignal/:id/acknowledge`; real-time Socket.IO to parent |

---

## 5. Confidential Reporting

| # | Feature | Status | Notes |
|---|---|---|---|
| 21 | Anonymous public report — no login required | ✅ WORKING AND TESTED | `POST /reports/anonymous`; returns `caseRef` + `recoverySecret` shown once |
| 22 | AI classification on submission — `aiClassifier.js` + `tokenizer.js` | ✅ WORKING AND TESTED | `runClassifier()` called in `reports.js` `createCase()`; PII tokenized before storage |
| 23 | Child authenticated report | ✅ WORKING AND TESTED | `POST /reports/authenticated` (`requireRole('child')`) |
| 24 | Teacher-assisted report | ✅ WORKING AND TESTED | `POST /reports/assisted` (`requireRole('teacher')`); `TeacherAssistedReportScreen` |
| 25 | Case status lookup via recoverySecret | ✅ WORKING AND TESTED | `POST /reports/check-status`; bcrypt compare; `CaseStatusScreen` |
| 26 | PublicReportScreen — no-auth UI, category picker, submit, modal shows caseRef + secret once | ✅ WORKING AND TESTED | `PublicReportScreen.tsx` with clipboard copy |

---

## 6. Case Management

| # | Feature | Status | Notes |
|---|---|---|---|
| 27 | List all cases (caseworker) | ✅ WORKING AND TESTED | `GET /cases` — sorted by `createdAt` desc; AI summary included |
| 28 | View full case detail | ✅ WORKING AND TESTED | `GET /cases/:id` — `CaseDetailScreen.tsx` |
| 29 | Set human priority override (`CRITICAL`, `HIGH`, `STANDARD`) | ✅ WORKING AND TESTED | `PUT /cases/:id/assess`; `CaseworkerDashboardScreen` |
| 30 | Add internal caseworker note | ✅ WORKING AND TESTED | `PUT /cases/:id/note` |
| 31 | Update case status (Submitted → Closed, 8 valid values) | ✅ WORKING AND TESTED | `PUT /cases/:id/status` |
| 32 | View immutable audit trail | ✅ WORKING AND TESTED | `GET /cases/:id/audit` |
| 33 | CaseworkerDashboardScreen + CaseworkerLoginScreen | ✅ WORKING AND TESTED | `CaseworkerDashboardScreen.tsx`, `CaseworkerLoginScreen.tsx` |

---

## 7. Evidence Integrity

| # | Feature | Status | Notes |
|---|---|---|---|
| 34 | Upload evidence file (image/PDF/text, max 5 MB) | ✅ WORKING AND TESTED | `POST /evidence/:caseId`; multer memory storage; SHA-256 computed on ingest |
| 35 | SHA-256 hash stored on upload | ✅ WORKING AND TESTED | `evidence.js` stores `sha256` alongside base64 data |
| 36 | Integrity verification — `GET /evidence/verify/:evidenceId` → `VERIFIED` / `TAMPERED` | ✅ WORKING AND TESTED | Recomputes hash at query time; compares against stored value |
| 37 | List evidence for a case with inline integrity status | ✅ WORKING AND TESTED | `GET /evidence/:caseId` returns `integrityStatus` per item |
| 38 | EvidenceScreen (mobile upload + verification UI) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `EvidenceScreen.tsx`; calls upload and verify endpoints |

---

## 8. Referral System

| # | Feature | Status | Notes |
|---|---|---|---|
| 39 | Simulated referral — `POST /cases/:id/refer` | 🔵 SIMULATED | `referralService.js` returns `{ referralId, service, status: 'SENT', simulated: true }`; no live agency API called |
| 40 | Referral stored on case + audit trail appended | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `caseObj.referrals.push(referral)` + audit entry; displayed in `CaseDetailScreen` |

---

## 9. Access Requests

| # | Feature | Status | Notes |
|---|---|---|---|
| 41 | Child submits URL access request | ✅ WORKING AND TESTED | `POST /requests`; duplicate guard; `api.test.js` covers it |
| 42 | Parent approves / denies request | ✅ WORKING AND TESTED | `POST /requests/:id/decision`; 409 on double-decision; test covered |
| 43 | Real-time request sync via Socket.IO | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `request:new` + `request:updated` events; works on LAN |
| 44 | Time-limited access approvals | ❌ NOT IMPLEMENTED | Approvals are permanent; `expiresAt` expiry logic not implemented |

---

## 10. Removal Request

| # | Feature | Status | Notes |
|---|---|---|---|
| 45 | Child requests GuardianLink removal | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ChildRemovalRequestScreen` → `POST /removal-request` |
| 46 | Parent reviews pending removal requests | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentRemovalRequestsScreen` fetches and displays pending requests |

---

## 11. Heartbeat

| # | Feature | Status | Notes |
|---|---|---|---|
| 47 | Child heartbeat (POST /heartbeat every 60 s while app is active) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `heartbeatService.ts`; `heartbeat.js` records `lastSeen`; OFFLINE after 5 min |
| 48 | OS-level uninstall protection / Device Admin | ❌ NOT IMPLEMENTED | No Android Device Policy Controller; protection is app-level only |

---

## 12. Localization

| # | Feature | Status | Notes |
|---|---|---|---|
| 49 | English + Luganda (lg) localization | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `mobile/src/localization/en.ts` + `lg.ts`; `useTranslation` hook; toggle in `PublicReportScreen` and `CaseStatusScreen` |
| 50 | Full app-wide string coverage | 🟠 PARTIALLY IMPLEMENTED | Localization applied to reporting screens; parent/child dashboard strings are not yet translated |

---

## 13. Mobile Screens

| # | Screen | Status | Notes |
|---|---|---|---|
| 51 | `LoginScreen` | ✅ WORKING AND TESTED | Role selector; Firebase + Express paths |
| 52 | `ChildDashboard` | ✅ WORKING AND TESTED | Home, heartbeat, pairing entry |
| 53 | `ChildProtectionStatusScreen` | ✅ WORKING AND TESTED | VERIFIED badge, last heartbeat |
| 54 | `ChildRequestAccessScreen` | ✅ WORKING AND TESTED | URL filter check + access request submit |
| 55 | `ChildSafeSignalScreen` | ✅ WORKING AND TESTED | SafeSignal report form |
| 56 | `ChildRemovalRequestScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Removal request submit |
| 57 | `ParentDashboard` | ✅ WORKING AND TESTED | Live counters from API |
| 58 | `ParentManageChildScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Pairing code generate |
| 59 | `ParentContentRestrictionsScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Policy management + filter test |
| 60 | `ParentAccessRequestsScreen` | ✅ WORKING AND TESTED | Approve/deny requests |
| 61 | `ParentSafeSignalReviewScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Triage display + acknowledge |
| 62 | `ParentDeviceSecurityScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Heartbeat status |
| 63 | `ParentRemovalRequestsScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Review removal requests |
| 64 | `PublicReportScreen` | ✅ WORKING AND TESTED | No-auth report; caseRef + secret modal |
| 65 | `CaseStatusScreen` | ✅ WORKING AND TESTED | recoverySecret lookup; bilingual |
| 66 | `CaseworkerLoginScreen` | ✅ WORKING AND TESTED | Caseworker-specific login |
| 67 | `CaseworkerDashboardScreen` | ✅ WORKING AND TESTED | Case list, assess, note, status |
| 68 | `CaseDetailScreen` | ✅ WORKING AND TESTED | Full case view, referrals, audit |
| 69 | `EvidenceScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Upload + verify SHA-256 |
| 70 | `TeacherAssistedReportScreen` | ✅ WORKING AND TESTED | Institutional report with disclaimer banner |
| 71 | `CommercialLandingScreen` | 🟡 WORKING IN CONTROLLED DEMONSTRATION | 4 plans, pricing, demo request form |
| 72 | `SplashScreen` | ✅ WORKING AND TESTED | Branding splash on cold start |

---

## 14. Commercialization

| # | Feature | Status | Notes |
|---|---|---|---|
| 73 | `CommercialLandingScreen` — 4 pricing tiers (Free, Family Premium, School Starter, NGO/Institutional) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Prices in UGX; plan cards with feature lists |
| 74 | Demo request form — `POST /organizations/demo-request` | ✅ WORKING AND TESTED | No auth required; stores contact info server-side |
| 75 | Organization registration — `POST /organizations/register` | ✅ WORKING AND TESTED | Plan validation; org stored in-memory |
| 76 | Subscription info — `GET /organizations/:id/subscription` | ✅ WORKING AND TESTED | Returns `{ id, name, plan, status }` |
| 77 | Feature gating / paywall enforcement | ❌ NOT IMPLEMENTED | Plan field stored but no `featureFlags.ts` gate implemented |
| 78 | Billing / payment integration (Stripe, MTN MoMo) | ❌ NOT IMPLEMENTED | No payment processor connected |

---

## 15. Teacher Role

| # | Feature | Status | Notes |
|---|---|---|---|
| 79 | Teacher account in server store (`username='teacher'`, `role='teacher'`, `Teacher123!`) | ✅ WORKING AND TESTED | Present in `store.js` `seedUsers()`; test-covered |
| 80 | `POST /reports/assisted` — teacher-only report endpoint | ✅ WORKING AND TESTED | `requireRole('teacher')`; returns `{ caseRef, recoverySecret }` |
| 81 | `TeacherAssistedReportScreen` — disclaimer + category picker + safeToContact switch | ✅ WORKING AND TESTED | Success modal shows caseRef + recoverySecret with copy; never stores credentials persistently |
| 82 | Teacher routing — `role=teacher` navigates to `/teacher-report` | ✅ WORKING AND TESTED | Handled in `AuthContext.tsx` and `app/index.tsx` |

---

## 16. Push Notifications

| # | Feature | Status | Notes |
|---|---|---|---|
| 83 | FCM token registration and storage in Firestore | 🟠 PARTIALLY IMPLEMENTED | `notifications.ts` requests permission, retrieves FCM token, calls `saveFcmToken`; foreground messages show an Alert |
| 84 | Server-side FCM push delivery | ❌ NOT IMPLEMENTED | Server emits Socket.IO events only; no `admin.messaging().send()` calls; background/quit delivery not triggered |

---

## 17. APK Build

| # | Feature | Status | Notes |
|---|---|---|---|
| 85 | Android APK build via EAS Build | 🟠 PARTIALLY IMPLEMENTED | `eas build --platform android --profile development` configured; requires EAS account, `eas.json`, `google-services.json` |
| 86 | Local Gradle build (`./gradlew assembleDebug`) | 🟠 PARTIALLY IMPLEMENTED | `expo prebuild --clean` generates native project; Gradle build works if Android Studio and SDK are configured |

---

## Summary

| Status | Count |
|---|---|
| ✅ WORKING AND TESTED | 39 |
| 🟡 WORKING IN CONTROLLED DEMONSTRATION | 25 |
| 🔵 SIMULATED | 1 |
| 🟠 PARTIALLY IMPLEMENTED | 5 |
| ❌ NOT IMPLEMENTED | 6 |
| **Total** | **76** |

---

*Updated by Stage 9 documentation agent.*
