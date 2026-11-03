# GuardianLink Lite

A parental website-access request app built for a hackathon.

A child requests permission to visit a website. Their linked parent is notified in real time and can approve or deny the request. The child's screen updates automatically with the decision.

> ⚠️ **Scope**: GuardianLink Lite records and communicates access decisions. It does **not** block websites in Chrome, Safari, or any other browser. Device-wide enforcement is out of scope for this MVP.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) 9 or later
- [Expo Go](https://expo.dev/client) app installed on your phone (iOS or Android)
- Both your computer and phone on the **same Wi-Fi network**

---

## Step 1 – Start the backend server

```bash
cd GuardianLinkLite/server
npm install
npm start
```

You should see:

```
[GuardianLink Lite] Server running on port 3001
  Health:  http://localhost:3001/health
  Login:   POST http://localhost:3001/login
  ⚠️  Development mode – demo accounts active:
     Parent:  username=parent  password=Parent123!
     Child:   username=child   password=Child123!
```

**Verify the server is running:**

```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

---

## Step 2 – Find your computer's local IP address

The phone needs your computer's **LAN IP**, not `localhost`.

**Windows:**
```
ipconfig
```
Look for "IPv4 Address" under your Wi-Fi adapter, e.g. `192.168.1.42`.

**macOS:**
```
ifconfig en0 | grep "inet "
```

**Linux:**
```
ip addr show
```

---

## Step 3 – Configure the mobile app

Open this file in your editor:

```
GuardianLinkLite/mobile/src/config.ts
```

Change the `SERVER_URL` to your computer's IP:

```typescript
export const SERVER_URL = 'http://192.168.1.42:3001';
//                                   ↑ your actual IP
```

> **Android Emulator only:** use `http://10.0.2.2:3001`
> **iOS Simulator only:** use `http://localhost:3001`

---

## Step 4 – Start the mobile app

```bash
cd GuardianLinkLite/mobile
npm install
npm start
```

Expo will print a QR code. Scan it with:
- **iOS**: the Camera app
- **Android**: the Expo Go app

---

## Demo walkthrough

### Login as the child

1. Open the app on your phone (or a second device / simulator).
2. Log in with: **child / Child123!**
3. You land on the Child Dashboard.

### Login as the parent

1. Open the app on a second device or browser tab.
2. Log in with: **parent / Parent123!**
3. You land on the Parent Dashboard.

### Test the full flow

1. On the child device, type `https://youtube.com` in the URL box.
2. Tap **Request Access**.
3. Watch the Parent Dashboard – the request appears instantly (no refresh needed).
4. Tap **Approve** or **Deny** on the parent device.
5. Watch the Child Dashboard – the status updates instantly.

---

## Running backend tests

```bash
cd GuardianLinkLite/server
npm test
```

Tests cover:
- Login (success and failure)
- Unauthorized access to protected endpoints
- Valid and invalid URL submission
- Parent approve / deny
- Child cannot decide
- Unlinked parent cannot decide
- Duplicate decision returns 409

---

## Project structure

```
GuardianLinkLite/
├── server/
│   ├── src/
│   │   ├── server.js           Main entry point
│   │   ├── store.js            In-memory data + seeded accounts
│   │   ├── middleware/
│   │   │   └── auth.js         JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js         POST /login
│   │   │   └── requests.js     GET/POST /requests, POST /requests/:id/decision
│   │   └── utils/
│   │       └── validate.js     URL + decision validation
│   ├── tests/
│   │   └── api.test.js         Automated backend tests
│   ├── .env                    Local secrets (git-ignored)
│   ├── .env.example            Template for environment variables
│   └── package.json
│
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx         Root layout (AuthProvider)
│   │   ├── index.tsx           Redirects to /login
│   │   ├── login.tsx           Login route
│   │   ├── child.tsx           Child dashboard route (guarded)
│   │   └── parent.tsx          Parent dashboard route (guarded)
│   ├── src/
│   │   ├── config.ts           ← SET YOUR SERVER URL HERE
│   │   ├── context/
│   │   │   └── AuthContext.tsx Auth state + actions
│   │   ├── hooks/
│   │   │   ├── useSocket.ts    Socket.IO connection lifecycle
│   │   │   └── useRequests.ts  Request list with live updates
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── ChildDashboard.tsx
│   │   │   └── ParentDashboard.tsx
│   │   ├── services/
│   │   │   ├── api.ts          HTTP API client
│   │   │   └── socket.ts       Socket.IO client singleton
│   │   ├── components/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── ConnectionBadge.tsx
│   │   │   ├── PrimaryButton.tsx
│   │   │   ├── RequestCard.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── styles/
│   │   │   └── theme.ts        Design tokens
│   │   └── types/
│   │       └── index.ts        Shared TypeScript types
│   └── package.json
│
└── README.md                   ← You are here
```

---

## Known limitations

- **No persistence**: restarting the server clears all requests and resets accounts.
- **Single parent-child pair**: only the seeded `parent` + `child` accounts are linked.
- **No device-wide blocking**: the app records decisions but cannot enforce them in a browser.
- **No push notifications**: the app must be open and foreground to receive live updates.
- **HTTP only in development**: production requires HTTPS.
- **No public registration**: accounts are seeded at startup.

---

## Future improvements (out of MVP scope)

- Persistent database (PostgreSQL, SQLite)
- Dynamic parent-child pairing via invitation codes
- Push notifications (Expo Notifications + APNs / FCM)
- Per-category URL analysis (safe browsing API)
- Time-limited approvals ("allowed for 30 minutes")
- Multiple children per parent
- Parent notification preferences (email, SMS)
- Production HTTPS deployment guide

---

## Security notes

- Passwords are hashed with bcrypt (never stored as plaintext).
- JWTs expire after 24 hours.
- The JWT secret comes from an environment variable – never hardcoded.
- All authorization decisions are made server-side; the client cannot forge a parent identity.
- Rate limiting is applied to login (20 req / 15 min) and the API (100 req / min).
- For production: use HTTPS, a proper secret manager, and review the CORS policy.
