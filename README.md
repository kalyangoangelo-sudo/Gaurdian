# GuardianLink Lite

**An Intelligent Child Online Safety, Reporting, Response and Referral Platform**

GuardianLink Lite is a two-in-one mobile application — one codebase, two distinct experiences — for parents/guardians and the children they protect. It combines a real content filtering engine, a rule-based safety classifier, live parent-child communication over Socket.IO, and a child-initiated safety reporting system (SafeSignal) in a single demonstrable prototype.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   React Native (Expo SDK 57)                  │
│                        expo-router                            │
│                                                              │
│   ┌─────────────────────┐   ┌──────────────────────────┐    │
│   │     PARENT MODE      │   │       CHILD MODE          │    │
│   │  Dashboard           │   │  Home / Status            │    │
│   │  Manage Children     │   │  Request Access           │    │
│   │  Content Restrictions│   │  SafeSignal Report        │    │
│   │  Access Requests     │   │  Protection Status        │    │
│   │  SafeSignal Review   │   │  Removal Request          │    │
│   │  Device Security     │   │                           │    │
│   └──────────┬──────────┘   └────────────┬──────────────┘    │
│              │                            │                    │
│   ┌──────────▼────────────────────────────▼──────────────┐   │
│   │              Shared Services Layer (TypeScript)        │   │
│   │  filterEngine.ts  │  safetyClassifier.ts              │   │
│   │  safeSignalTriage.ts  │  heartbeatService.ts          │   │
│   │  AuthContext  │  useSocket  │  api.ts                 │   │
│   └──────────────────────────────┬────────────────────────┘   │
└─────────────────────────────────┼────────────────────────────┘
                                  │ HTTP + Socket.IO (LAN/local)
┌─────────────────────────────────▼────────────────────────────┐
│                  Express + Socket.IO (Node 18+)               │
│                      Port 3001                                │
│                                                              │
│  POST /login          POST /pair/generate                    │
│  GET  /requests       POST /pair/confirm                     │
│  POST /requests       GET|PUT /policy/:childId               │
│  POST /requests/:id/decision                                 │
│  POST /safesignal     GET /safesignal/:parentId              │
│  PUT  /safesignal/:id/acknowledge                            │
│  POST /heartbeat      POST /removal                          │
│                                                              │
│  In-memory store (Map) — no external database required       │
└──────────────────────────────────────┬───────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────┐
│                     Firebase (guardian-link-6de8a)            │
│  Auth (Email/Password)  │  Firestore  │  FCM Messaging        │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile framework | Expo / React Native | SDK 57 / RN 0.86.3 |
| Language | TypeScript | ~5.8.3 |
| Navigation | expo-router (file-based) | ~57.0.27 |
| Auth | JWT (`jsonwebtoken`) | 9.0.2 |
| Password hashing | bcryptjs | 2.4.3 |
| Real-time | Socket.IO client + server | 4.7.5 |
| Backend | Express | 4.18.3 |
| Firebase | `@react-native-firebase/*` | ^21.14.0 |
| Push notifications | FCM + expo-notifications | ^21.14.0 / ~57.0.23 |
| Local storage | AsyncStorage | 3.1.1 |
| Tests | Jest + Supertest | 29.7.0 / 7.0.0 |

---

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Expo CLI** — `npm install -g expo-cli` (or use `npx expo`)
- **Android Studio** with a physical device or emulator (API 31+) for native builds
- An **EAS account** (free tier) for APK builds: `npm install -g eas-cli`
- The `google-services.json` file placed at `mobile/google-services.json` (see [Firebase Setup](FIREBASE_SETUP.md))

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd guardian/GuardianLinkLite
```

### 2. Start the backend server

```bash
cd server
cp .env.example .env          # edit JWT_SECRET and PORT if needed
npm install
npm start                     # runs on http://0.0.0.0:3001
```

### 3. Configure the mobile app

Edit `mobile/src/config.ts` and set `SERVER_URL` to the LAN IP of your development machine:

```ts
// mobile/src/config.ts
export const SERVER_URL = 'http://192.168.x.x:3001';   // your machine's LAN IP
```

### 4. Install mobile dependencies and start

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or press `a` to launch on an Android emulator.

### 5. Firebase configuration

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:

1. Create / reuse the `guardian-link-6de8a` Firebase project.
2. Enable **Email/Password** authentication.
3. Download `google-services.json` and place it at `mobile/google-services.json`.
4. (Optional) Set up Firestore rules and FCM.

The app functions without Firebase for the core demo (JWT path). Firebase is required only for FCM push notifications and Firestore persistence.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Parent | kalyangoangelo@gmail.com | Parent123! |
| Child | kalyango.200@gmail.com | Child123! |

The same credentials work for both the Firebase Auth path and the Express in-memory store (username = email prefix: `parent` / `child`).

---

## Build APK

The development APK is built with EAS Build:

```bash
cd mobile
npx eas login                 # log in to your Expo account
npx eas build --platform android --profile development
```

This produces a `.apk` downloadable from the EAS dashboard. A local build (without EAS) requires Android Studio:

```bash
cd mobile
npx expo prebuild --clean
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

> **Note:** The EAS build requires `eas.json` in the `mobile/` directory with an `android.buildType: "apk"` development profile.

---

## Run Tests

### Backend (Jest + Supertest)

```bash
cd server
npm test
```

Covers: login, JWT validation, role guards, request submission, parent decisions, duplicate-decision 409, rate limiting, pairing, policy, SafeSignal submit/retrieve/acknowledge, heartbeat, and removal.

### Mobile TypeScript check

```bash
cd mobile
npm run ts-check
```

---

## Feature Status

See [FEATURE_STATUS.md](FEATURE_STATUS.md) for a full breakdown of all 33 features labelled as:

- ✅ WORKING AND TESTED
- 🟡 WORKING IN CONTROLLED DEMONSTRATION
- 🔵 SIMULATED
- 🟠 PARTIALLY IMPLEMENTED
- ❌ NOT IMPLEMENTED

---

## Project Structure

```
GuardianLinkLite/
├── FIREBASE_SETUP.md
├── FEATURE_STATUS.md
├── DEMO_SCRIPT.md
├── README.md
├── server/
│   ├── src/
│   │   ├── server.js            Express + Socket.IO entry point
│   │   ├── store.js             In-memory Maps
│   │   ├── firebase-admin.js    Firebase Admin SDK (optional)
│   │   ├── middleware/auth.js   JWT requireAuth / requireRole
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── requests.js
│   │   │   ├── pairing.js
│   │   │   ├── policy.js
│   │   │   ├── safesignal.js
│   │   │   ├── heartbeat.js
│   │   │   ├── removal.js
│   │   │   └── events.js
│   │   └── utils/validate.js
│   └── tests/api.test.js
└── mobile/
    ├── app/
    │   ├── (parent)/            Parent tab group
    │   │   ├── dashboard.tsx
    │   │   ├── children.tsx
    │   │   ├── requests.tsx
    │   │   ├── reports.tsx
    │   │   └── security.tsx
    │   ├── (child)/             Child tab group
    │   │   ├── home.tsx
    │   │   ├── protection.tsx
    │   │   ├── requests.tsx
    │   │   └── report.tsx
    │   ├── login.tsx
    │   └── index.tsx
    └── src/
        ├── screens/             Screen components
        ├── services/            filterEngine, safetyClassifier,
        │                        safeSignalTriage, heartbeatService,
        │                        firebase*, notifications
        ├── context/AuthContext.tsx
        ├── components/
        ├── styles/theme.ts
        └── types/index.ts
```

---

*GuardianLink Lite — Stage H documentation.*
