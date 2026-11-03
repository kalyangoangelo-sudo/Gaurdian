# GUARDIANLINK AUDIT — Stage A

**Date:** Stage A foundation audit  
**Project:** GuardianLink Lite → GuardianLink 2.0  
**Auditor:** Automated build agent

---

## 1. Technology Stack

| Item | Version |
|---|---|
| Expo SDK | 57.0.0 (package: `expo ~57.0.29`) |
| React Native | 0.86.3 |
| React | 19.2.3 |
| TypeScript | ~5.8.3 |
| expo-router | ~57.0.27 (file-based routing) |
| Node.js (server) | 18+ required |
| Express | server backend |
| Socket.IO | real-time events |
| JWT | `jsonwebtoken` — 24 h expiry |
| bcryptjs | password hashing (10 rounds) |
| Firebase project | guardian-link-6de8a |

---

## 2. Full Directory Structure

```
GuardianLinkLite/
├── FIREBASE_SETUP.md       Firebase provisioning guide
├── firebase-quickstart.md  Quick-start Firebase reference
├── README.md               Project overview and demo walkthrough
├── agents/
│   └── tasks/              (created by Stage A — agent task files live here)
│
├── server/
│   ├── src/
│   │   ├── server.js           Express + Socket.IO entry point
│   │   ├── store.js            In-memory Maps: users, requests, relationships
│   │   ├── firebase-admin.js   Firebase Admin SDK init (optional)
│   │   ├── middleware/
│   │   │   └── auth.js         JWT requireAuth middleware
│   │   ├── routes/
│   │   │   ├── auth.js         POST /login
│   │   │   └── requests.js     GET/POST /requests, POST /requests/:id/decision
│   │   └── utils/
│   │       └── validate.js     URL + decision validation helpers
│   ├── tests/
│   │   └── api.test.js         Jest integration tests (full API coverage)
│   ├── .env.example
│   └── package.json
│
└── mobile/
    ├── app.json                Expo config (SDK 57, Firebase plugins, notifications)
    ├── app/                    expo-router file-based screens
    │   ├── _layout.tsx         Root layout — wraps everything in AuthProvider
    │   ├── index.tsx           Redirect to /login
    │   ├── login.tsx           Login route
    │   ├── child.tsx           Child dashboard route (guarded)
    │   └── parent.tsx          Parent dashboard route (guarded)
    ├── src/
    │   ├── config.ts           SERVER_URL config (must be set to LAN IP)
    │   ├── context/
    │   │   └── AuthContext.tsx JWT auth state + login/logout actions
    │   ├── hooks/
    │   │   ├── useSocket.ts    Socket.IO lifecycle hook
    │   │   └── useRequests.ts  Request list with real-time updates
    │   ├── screens/
    │   │   ├── LoginScreen.tsx
    │   │   ├── ChildDashboard.tsx
    │   │   └── ParentDashboard.tsx
    │   ├── services/
    │   │   ├── api.ts          HTTP client (login, fetch/submit requests, decide)
    │   │   ├── firebase.ts     Firebase app init
    │   │   ├── firebaseAuth.ts Firebase Auth helpers
    │   │   ├── firebaseRequests.ts Firestore request helpers
    │   │   └── notifications.ts    Expo Notifications helpers
    │   ├── components/
    │   │   ├── AppHeader.tsx
    │   │   ├── ConnectionBadge.tsx
    │   │   ├── PrimaryButton.tsx
    │   │   ├── RequestCard.tsx
    │   │   └── StatusBadge.tsx
    │   ├── styles/
    │   │   └── theme.ts        Design tokens (colors, spacing, typography)
    │   └── types/
    │       └── index.ts        Shared TypeScript types
    └── package.json
```

---

## 3. Server Architecture

### Express + Socket.IO (Node.js)

- **Port:** 3001 (configurable via `PORT` env var)
- **In-memory store:** Plain JavaScript `Map` objects — resets on restart
- **Auth approach:** Username/password → bcrypt verify → JWT issued (24 h)
- **Rate limiting:** Login: 20 req/15 min; API: 100 req/min
- **CORS:** Open (`*`) in development — must be locked down in production

### Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /login | None | Issue JWT for username+password |
| GET | /requests | JWT | Child: own requests; Parent: all linked requests |
| POST | /requests | JWT (child only) | Submit new URL access request |
| POST | /requests/:id/decision | JWT (parent only) | Approve or deny pending request |
| GET | /health | None | Liveness probe |

### Middleware

- `requireAuth` — verifies JWT, attaches `req.user` (`{id, username, role}`)
- Authorization is server-side only; client role claims are never trusted

### Real-time

- Socket.IO rooms: `user:<userId>`
- Events emitted: `request:new`, `request:updated`

---

## 4. Mobile Architecture

### Expo SDK 57 / React Native 0.86.3 / expo-router

- **Routing:** File-based via `expo-router`; screens under `app/`
- **Auth:** JWT stored via AuthContext; role-based guard redirects to correct dashboard
- **Real-time:** `useSocket` hook connects Socket.IO; `useRequests` listens for events
- **Screens (existing):** Login, ChildDashboard, ParentDashboard
- **Components:** AppHeader, ConnectionBadge, PrimaryButton, RequestCard, StatusBadge
- **Theme:** Centralized tokens in `theme.ts` — primary color `#1B2A4A` (dark navy)

---

## 5. Firebase Services Integrated

| Service | Status |
|---|---|
| Firebase project | guardian-link-6de8a |
| Firebase Auth (Email/Password) | Configured — `@react-native-firebase/auth ^21.14.0` present |
| Firestore | SDK present (`@react-native-firebase/firestore ^21.14.0`) |
| FCM Messaging | SDK present (`@react-native-firebase/messaging ^21.14.0`) |
| Expo Notifications | Configured in `app.json` plugins |
| google-services.json | Present in mobile root |

**Note:** Firebase Auth and Firestore are integrated at the mobile service layer (`firebaseAuth.ts`, `firebaseRequests.ts`) but the primary auth flow in the running demo uses the Express JWT server, not Firebase Auth directly. Firebase services are additive/parallel.

---

## 6. Demo Accounts

### Firebase (Email/Password)
| Email | Password | Role |
|---|---|---|
| kalyangoangelo@gmail.com | Parent123! | parent |
| kalyango.200@gmail.com | Child123! | child |

### Server In-Memory (username/password)
| Username | Password | Role |
|---|---|---|
| parent | Parent123! | parent |
| child | Child123! | child |

---

## 7. Working Features

- ✅ JWT authentication (login with username+password)
- ✅ Role-based routing (child → ChildDashboard, parent → ParentDashboard)
- ✅ Child submits URL access request
- ✅ Parent views pending requests in real time (Socket.IO)
- ✅ Parent approves / denies requests
- ✅ Child sees decision update in real time
- ✅ Server-side authorization (parent can only decide own child's requests)
- ✅ Duplicate-decision guard (409 on second decision)
- ✅ Rate limiting on login and API
- ✅ bcrypt password hashing
- ✅ Backend test suite (Jest, `api.test.js`)
- ✅ Firebase SDK dependencies installed and configured

---

## 8. Missing / Broken Features

- ❌ **No content filtering engine** — requests are recorded but no URL is ever blocked; there is no domain blocklist, keyword filter, or category classifier
- ❌ **No SafeSignal (child safety reporting)** — screen does not exist
- ❌ **No AI safety reports** — no classification, risk scoring, or explanations
- ❌ **No child protection/restriction settings** — parent cannot set age-appropriate policies
- ❌ **No device security / uninstall protection** — no Android Device Admin or accessibility service
- ❌ **Single hardcoded parent-child pair** — no registration, invitation, or dynamic pairing
- ❌ **No push notifications** — must be in foreground; no background/FCM delivery
- ❌ **No persistence** — all state lost on server restart
- ❌ **No safe browser or browsing demo** — ChildDashboard has URL input but no WebView or enforcement
- ❌ **No referral / reporting system** — no external agency referral workflow
- ❌ **No time-limited access approvals** — approved is permanent until re-requested
- ❌ **No multiple children per parent** — one-to-one only
- ❌ **Firebase Auth not wired to backend** — two parallel auth systems, no unified identity
- ❌ **HTTP only** — no HTTPS in development setup; no deployment guide

---

## 9. Recommended Approach for Stages B–I

### Architecture Decisions

1. **Keep the Express server** as the authoritative backend. Extend it with new routes rather than replacing it.
2. **Keep the in-memory store** for the hackathon demo but add a thin persistence layer using a JSON file or SQLite via `better-sqlite3` so data survives restarts.
3. **Keep expo-router** and add new screens under `app/` (e.g., `app/child/safesignal.tsx`, `app/parent/reports.tsx`).
4. **Unify auth** — use the Express JWT path as the single source of truth; wire Firebase Auth as a secondary notification channel only.
5. **Add a content filtering module** server-side (`src/services/filter.js`) with: domain blocklist, keyword rules, URL category classification (heuristic, no external API required for demo).

### Stage Priorities

| Stage | Feature | Effort |
|---|---|---|
| B | Content filter engine (server-side) | Medium |
| C | SafeSignal child safety reporting screen | Medium |
| D | Parent dashboard: restriction settings, child profiles | Medium |
| E | AI safety report summaries (heuristic + keyword risk scoring) | Low |
| F | Push notifications via FCM/Expo | Medium |
| G | Safe browser WebView demo screen | Low |
| H | Dynamic pairing (invitation code flow) | Medium |
| I | Persistence (SQLite/JSON), deployment hardening | Medium |

### Key Constraints
- All enforcement is **demonstrable** but not OS-level (no Device Admin for hackathon)
- Label all simulated/heuristic features clearly in the UI
- Emergency/removal request flow must always be accessible to the child

---

## 10. Git Branch Status

- `v1-backup` — snapshot of GuardianLink 1.0 at Stage A start
- `main` — active development branch (current)

---

*Generated by Stage A audit agent.*
