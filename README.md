# GuardianLink

**An Intelligent Child Online Safety, Reporting, Response and Referral Platform**

GuardianLink is a multi-role mobile application — one codebase, five distinct experiences — combining real content filtering, a rule-based safety classifier, live parent-child communication over Socket.IO, confidential incident reporting with AI triage, case management for professional caseworkers, and an institutional teacher reporting interface.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or later |
| npm | 9 or later |
| Expo CLI | `npm install -g expo-cli` (or use `npx expo`) |
| Android Studio | API 31+ device or emulator for native builds |
| EAS CLI (optional) | `npm install -g eas-cli` — required for cloud APK builds |
| `google-services.json` | Place at `mobile/google-services.json` — see [FIREBASE_SETUP.md](FIREBASE_SETUP.md) |

---

## Server Setup

```bash
cd server
cp .env.example .env        # set JWT_SECRET (required) and PORT (default 3001)
npm install
npm start                   # server listens on http://0.0.0.0:3001
```

Health check: `GET http://localhost:3001/health` → `{ "status": "ok" }`

---

## Mobile Setup

### 1. Configure the server URL

Edit `mobile/src/config/api.ts` and set `API_BASE_URL` to the LAN IP of your development machine:

```ts
// mobile/src/config/api.ts
export const API_BASE_URL = 'http://192.168.x.x:3001';   // your machine's LAN IP
```

For an Android emulator use `http://10.0.2.2:3001`.

### 2. Install and launch

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or press `a` to open on an Android emulator.

### 3. Firebase (optional for core demo)

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:

1. Create / reuse the `guardian-link-6de8a` Firebase project.
2. Enable **Email/Password** authentication.
3. Download `google-services.json` and place it at `mobile/google-services.json`.
4. (Optional) Configure Firestore rules and FCM.

All core features work on the Express JWT path without Firebase. Firebase is required only for FCM push notifications and Firestore token persistence.

---

## Demo Accounts

| Role | Username (Express) | Email (Firebase) | Password | Notes |
|---|---|---|---|---|
| Parent | `parent` | kalyangoangelo@gmail.com | `Parent123!` | Access to all parent screens |
| Child | `child` | kalyango.200@gmail.com | `Child123!` | Access to all child screens |
| Caseworker | `caseworker` | — | `Caseworker123!` | Login via `POST /auth/caseworker/login` or `CaseworkerLoginScreen` |
| Teacher | `teacher` | — | `Teacher123!` | Routed to `TeacherAssistedReportScreen` on login |
| Firebase auth | — | Any Firebase-registered email | Firebase password | Used when `firebaseAuth.ts` path is active |

---

## Running Tests

### Backend (Jest + Supertest)

```bash
cd server
npm test
```

Covers: login, JWT validation, `requireRole()` guards, request submission, parent decisions, duplicate-decision 409, rate limiting, pairing, policy, SafeSignal submit/retrieve/acknowledge, heartbeat, removal, confidential reports, caseworker auth, evidence upload, organization registration.

### Mobile TypeScript check

```bash
cd mobile
npm run ts-check
```

---

## Build APK

### Cloud build (EAS)

```bash
cd mobile
npx eas login
npx eas build --platform android --profile development
```

Download the `.apk` from the EAS dashboard after the build completes.

### Local build (Android Studio required)

```bash
cd mobile
npx expo prebuild --clean
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## API Routes

### Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/login` | Public | Express JWT login (parent, child, teacher) |
| POST | `/auth/caseworker/login` | Public | Caseworker login |

### Confidential Reporting

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/reports/anonymous` | Public | Submit anonymous report; returns `caseRef` + `recoverySecret` |
| POST | `/reports/authenticated` | child | Submit authenticated child report |
| POST | `/reports/assisted` | teacher | Teacher-assisted institutional report |
| GET | `/reports/status/:caseRef` | Public | Check case status by `caseRef` (recoverySecret in body) |
| POST | `/reports/check-status` | Public | Same as above, body-based (React Native-friendly) |

### Case Management (caseworker only)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/cases` | caseworker | List all cases sorted by date |
| GET | `/cases/:id` | caseworker | Full case detail |
| PUT | `/cases/:id/assess` | caseworker | Set human priority (CRITICAL / HIGH / STANDARD) |
| PUT | `/cases/:id/note` | caseworker | Append internal note |
| PUT | `/cases/:id/status` | caseworker | Update case status |
| POST | `/cases/:id/refer` | caseworker | Simulated referral to external agency |
| GET | `/cases/:id/audit` | caseworker | Immutable audit trail |

### Evidence

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/evidence/:caseId` | Any authenticated | Upload evidence file (max 5 MB; JPEG, PNG, GIF, PDF, TXT) |
| GET | `/evidence/:caseId` | caseworker | List evidence for a case with integrity status |
| GET | `/evidence/verify/:evidenceId` | caseworker | Verify SHA-256 integrity — `VERIFIED` or `TAMPERED` |

### SafeSignal

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/safesignal` | child | Submit SafeSignal report |
| GET | `/safesignal/:parentId` | parent | List SafeSignal reports for parent |
| PUT | `/safesignal/:id/acknowledge` | parent | Acknowledge report |

### Access Requests

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/requests` | child | Submit URL access request |
| GET | `/requests` | parent | List pending requests |
| POST | `/requests/:id/decision` | parent | Approve or deny request |

### Pairing

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/pair/generate` | parent | Generate one-time 6-digit pairing code (30-min expiry) |
| POST | `/pair/confirm` | child | Confirm pairing with code |

### Policy

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/policy/:childId` | parent | Get content policy for child |
| PUT | `/policy/:childId` | parent | Update content policy |

### Heartbeat

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/heartbeat` | child | Record device heartbeat |
| GET | `/device-status/:childId` | parent | Get device last-seen and status |

### Removal Requests

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/removal-request` | child | Submit GuardianLink removal request |
| GET | `/removal-requests` | parent | List pending removal requests |

### Organizations / Commercial

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/organizations/register` | Public | Register a new organization |
| GET | `/organizations/:id/subscription` | Public | Get subscription plan info |
| POST | `/organizations/demo-request` | Public | Submit anonymous demo request |
| POST | `/organizations/:id/demo-request` | Public | Submit org-linked demo request |

### Misc

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Server health check |

---

## Feature Status

See [FEATURE_STATUS.md](FEATURE_STATUS.md) — 76 features labelled across 17 categories.

| Status | Count |
|---|---|
| ✅ WORKING AND TESTED | 39 |
| 🟡 WORKING IN CONTROLLED DEMONSTRATION | 25 |
| 🔵 SIMULATED | 1 |
| 🟠 PARTIALLY IMPLEMENTED | 5 |
| ❌ NOT IMPLEMENTED | 6 |

---

## Other Documentation

| Document | Purpose |
|---|---|
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | 6 guided demo scenarios for presentations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, data model, role matrix, tech rationale |
| [BUSINESS_MODEL.md](BUSINESS_MODEL.md) | Target customers, pricing tiers, revenue model, social impact |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Firebase project configuration and google-services.json setup |
| [GUARDIANLINK_AUDIT.md](GUARDIANLINK_AUDIT.md) | Stage 1 gap analysis and feature inventory |

---

## Project Structure

```
GuardianLinkLite/
├── ARCHITECTURE.md
├── BUSINESS_MODEL.md
├── DEMO_SCRIPT.md
├── FEATURE_STATUS.md
├── FIREBASE_SETUP.md
├── GUARDIANLINK_AUDIT.md
├── README.md
├── server/
│   ├── src/
│   │   ├── server.js                Express + Socket.IO entry point
│   │   ├── store.js                 In-memory Maps + seedUsers()
│   │   ├── firebase-admin.js        Firebase Admin SDK (optional)
│   │   ├── middleware/auth.js        requireAuth / requireRole()
│   │   ├── routes/
│   │   │   ├── auth.js              POST /login
│   │   │   ├── cases.js             Case management + caseworker login
│   │   │   ├── evidence.js          Evidence upload + integrity
│   │   │   ├── events.js            Event log
│   │   │   ├── heartbeat.js         Device heartbeat
│   │   │   ├── organizations.js     Org registration + demo requests
│   │   │   ├── pairing.js           Parent-child pairing
│   │   │   ├── policy.js            Content policy
│   │   │   ├── removal.js           Removal requests
│   │   │   ├── reports.js           Confidential reporting
│   │   │   ├── requests.js          URL access requests
│   │   │   └── safesignal.js        SafeSignal reports
│   │   └── services/
│   │       ├── aiClassifier.js      AI classification layer
│   │       ├── referralService.js   Simulated referral
│   │       └── tokenizer.js         PII tokenization
│   └── tests/api.test.js
└── mobile/
    ├── app/
    │   ├── (parent)/                Parent tab group
    │   ├── (child)/                 Child tab group
    │   ├── login.tsx
    │   └── index.tsx
    └── src/
        ├── screens/                 22 screen components
        ├── services/                filterEngine, safetyClassifier,
        │                            safeSignalTriage, heartbeatService,
        │                            firebase*, notifications
        ├── localization/            en.ts, lg.ts, useTranslation.ts
        ├── context/AuthContext.tsx
        ├── components/
        ├── styles/theme.ts
        └── types/index.ts
```

---

*GuardianLink — Stage 9 documentation.*
