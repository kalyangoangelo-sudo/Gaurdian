# GuardianLink Lite — Feature Status

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

## 1. Authentication & Accounts

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | **JWT authentication** (login → signed token, 24 h expiry) | ✅ WORKING AND TESTED | `POST /login` issues JWT; `api.test.js` covers login, bad-creds, rate-limit |
| 2 | **bcrypt password hashing** (10 rounds) | ✅ WORKING AND TESTED | All passwords stored as bcrypt hashes in the in-memory user store |
| 3 | **Role-based routing** (child → child dashboard, parent → parent dashboard) | ✅ WORKING AND TESTED | `AuthContext` reads `role` from JWT payload; `expo-router` guards enforce it |
| 4 | **Server-side role authorization** (parent cannot act as child, and vice versa) | ✅ WORKING AND TESTED | `requireRole()` middleware enforced on every protected route |
| 5 | **Firebase Email/Password Auth** | 🟠 PARTIALLY IMPLEMENTED | SDK wired (`firebaseAuth.ts`); demo accounts exist in Firebase project; primary demo flow uses Express JWT, not Firebase Auth directly |

---

## 2. Pairing

| # | Feature | Status | Notes |
|---|---|---|---|
| 6 | **Dynamic parent-child pairing via one-time 6-digit code** | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `POST /pair/generate` (parent) + `POST /pair/confirm` (child); code expires in 30 min; in-memory only — pair lost on server restart |
| 7 | **Pairing code UI (parent generates, child enters)** | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentManageChildScreen` displays code; `ChildDashboard` has entry UI; end-to-end path works on LAN |

---

## 3. Content Filtering

| # | Feature | Status | Notes |
|---|---|---|---|
| 8 | **Domain allowlist** (trusted educational domains — e.g. khanacademy.org, wikipedia.org) | ✅ WORKING AND TESTED | `filterEngine.ts` ALLOWLIST rule; `filterEngine.testcases.ts` covers it |
| 9 | **Domain blocklist** (known harmful domains) | ✅ WORKING AND TESTED | `filterEngine.ts` BLOCKLIST_DOMAIN rule with category mapping |
| 10 | **Keyword filtering** (adult, violence, drugs, gambling) with word-boundary matching | ✅ WORKING AND TESTED | 4 keyword rule groups; `matchesPhrase` uses word-boundary regex; test cases confirm |
| 11 | **Unicode normalization & diacritic stripping** (obfuscation defence) | ✅ WORKING AND TESTED | `normalize()` in `filterEngine.ts` — NFC → NFD → strip U+0300–U+036F |
| 12 | **Educational exception downgrade** ("breast cancer" → REVIEW instead of BLOCK) | ✅ WORKING AND TESTED | `EDUCATIONAL_EXCEPTION_PHRASES` list; test case in `filterEngine.testcases.ts` |
| 13 | **Policy-level custom blocked keywords** (parent configures, child gets blocked) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `PUT /policy/:childId` persists keywords; `filterContent(input, policy)` applies them; policy survives until server restart |
| 14 | **Content Restrictions UI** (parent adds/removes keywords, trusted domains) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentContentRestrictionsScreen` — saves to server via API |

---

## 4. SafeSignal (Child Safety Reporting)

| # | Feature | Status | Notes |
|---|---|---|---|
| 15 | **Child submits SafeSignal report** (category + description + optional pasted text) | ✅ WORKING AND TESTED | `POST /safesignal`; `ChildSafeSignalScreen` wired to API; server emits `safesignal:new` via Socket.IO |
| 16 | **Safety classifier** (rule-based detection: grooming indicators, bullying, threats) | ✅ WORKING AND TESTED | `safetyClassifier.ts` — 18 named rules (G001–G010, B001–B005, T001–T004); uncertainty levels; tested in `filterEngine.testcases.ts` |
| 17 | **SafeSignal triage** (combines classifier + filter → risk level + recommended actions) | ✅ WORKING AND TESTED | `safeSignalTriage.ts` — HIGH/MEDIUM/LOW derivation with `requiresImmediateAttention` flag |
| 18 | **Parent views triage result** (GROOMING_INDICATORS label, risk level, recommended actions) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentSafeSignalReviewScreen` — fetches reports from `GET /safesignal/:parentId`; triage runs client-side on the text |
| 19 | **Parent acknowledges report** | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `PUT /safesignal/:id/acknowledge` — sets status, records action; real-time Socket.IO notification to parent |
| 20 | **Referral status / external agency referral** | ❌ NOT IMPLEMENTED | Referral workflow to external agencies (NCMEC, law enforcement) is absent from the codebase |

---

## 5. Access Requests

| # | Feature | Status | Notes |
|---|---|---|---|
| 21 | **Child submits URL access request** | ✅ WORKING AND TESTED | `POST /requests`; duplicate guard; `api.test.js` covers it |
| 22 | **Parent approves / denies request** | ✅ WORKING AND TESTED | `POST /requests/:id/decision`; server-side guard against double-decision (409); test covered |
| 23 | **Real-time request sync** (Socket.IO — child sees decision instantly) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | Socket.IO rooms `user:<id>`; `request:new` + `request:updated` events; works on LAN demo |
| 24 | **Time-limited access approvals** | ❌ NOT IMPLEMENTED | Approvals are permanent until re-requested; expiry logic not implemented |

---

## 6. Removal Request

| # | Feature | Status | Notes |
|---|---|---|---|
| 25 | **Child requests GuardianLink removal** | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ChildRemovalRequestScreen` → `POST /removal`; route exists in `server/src/routes/removal.js` |
| 26 | **Parent reviews pending removal request** | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `ParentRemovalRequestsScreen` fetches and displays pending removal requests |

---

## 7. Heartbeat & Device Security

| # | Feature | Status | Notes |
|---|---|---|---|
| 27 | **Child heartbeat** (POST /heartbeat every 60 s while app is active) | 🟡 WORKING IN CONTROLLED DEMONSTRATION | `heartbeatService.ts` — interval fires while app is in foreground/background; `server/src/routes/heartbeat.js` records last-seen; OFFLINE shown after 5 min of missed beats |
| 28 | **OS-level uninstall protection / Device Admin** | ❌ NOT IMPLEMENTED | No Android Device Policy Controller or Device Admin Receiver is implemented; protection is app-level only |

---

## 8. Push Notifications

| # | Feature | Status | Notes |
|---|---|---|---|
| 29 | **FCM push notifications** | 🟠 PARTIALLY IMPLEMENTED | `notifications.ts` requests permission, retrieves FCM token, and stores it in Firestore (`saveFcmToken`); foreground messages show an Alert; server does **not** send FCM messages — only Socket.IO events are emitted; background/quit delivery not triggered by the server |

---

## 9. Safe Browser

| # | Feature | Status | Notes |
|---|---|---|---|
| 30 | **In-app safe browser / WebView filtering demo** | 🔵 SIMULATED | `ParentContentRestrictionsScreen` and `ChildRequestAccessScreen` demonstrate the filter engine with typed URLs; no actual WebView rendering or OS-level browser interception is implemented |

---

## 10. Navigation & Role Selection

| # | Feature | Status | Notes |
|---|---|---|---|
| 31 | **Role-selection screen on first launch** | ✅ WORKING AND TESTED | `LoginScreen.tsx` presents role selector; `index.tsx` redirects to login for unauthenticated users |
| 32 | **Expo Router file-based navigation** (child and parent tab groups) | ✅ WORKING AND TESTED | `app/(child)/` and `app/(parent)/` groups with tab layouts; all screens reachable |

---

## 11. APK Build

| # | Feature | Status | Notes |
|---|---|---|---|
| 33 | **Android APK build** via EAS Build | 🟠 PARTIALLY IMPLEMENTED | `eas build --platform android --profile development` configured in `package.json`; requires EAS account, `eas.json`, and `google-services.json` in place |

---

## Summary

| Status | Count |
|---|---|
| ✅ WORKING AND TESTED | 12 |
| 🟡 WORKING IN CONTROLLED DEMONSTRATION | 12 |
| 🔵 SIMULATED | 1 |
| 🟠 PARTIALLY IMPLEMENTED | 3 |
| ❌ NOT IMPLEMENTED | 5 |
| **Total** | **33** |

> Features 1–30 map directly to the original brief. Features 31–33 cover navigation, role selection, and APK build which are implicit requirements from the architecture brief.

---

*Generated by Stage H documentation agent.*
