# GuardianLink — Architecture

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      React Native (Expo SDK 57)                              │
│                           expo-router (file-based)                           │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  CHILD MODE  │  │ PARENT MODE  │  │  CASEWORKER  │  │ TEACHER MODE   │  │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │  │ Assisted Report│  │
│  │  SafeSignal  │  │  SafeSignal  │  │  Case Detail │  │                │  │
│  │  Req Access  │  │  Req Review  │  │  Evidence    │  │                │  │
│  │  Protection  │  │  Policy Mgmt │  │  Referral    │  │                │  │
│  │  Removal Req │  │  Device Sec  │  │  Audit Trail │  │                │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                  │                   │           │
│  ┌──────▼─────────────────▼──────────────────▼───────────────────▼───────┐  │
│  │                    PUBLIC / UNAUTHENTICATED                            │  │
│  │          PublicReportScreen   CaseStatusScreen   CommercialLandingScreen│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Shared Services (TypeScript)                       │    │
│  │  filterEngine.ts  │  safetyClassifier.ts  │  safeSignalTriage.ts   │    │
│  │  heartbeatService.ts  │  AuthContext.tsx   │  useSocket hook        │    │
│  │  localization/ (en + lg)  │  notifications.ts  │  api.ts            │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTP (REST) + Socket.IO
                                      │ LAN / localhost:3001
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                    Express 4 + Socket.IO 4 (Node 18+)                        │
│                    Port 3001  —  in-memory Map stores                        │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────────┐  │
│  │   Public Routes    │  │  Protected Routes  │  │  Caseworker Routes    │  │
│  │  POST /login       │  │  /requests         │  │  POST /auth/caseworker│  │
│  │  POST /reports/    │  │  /pair             │  │       /login          │  │
│  │    anonymous       │  │  /policy           │  │  GET/PUT /cases       │  │
│  │  POST /reports/    │  │  /safesignal       │  │  POST /cases/:id/refer│  │
│  │    check-status    │  │  /heartbeat        │  │  GET /cases/:id/audit │  │
│  │  POST /organizations│  │  /removal-request │  │  POST /evidence/:id   │  │
│  │    /demo-request   │  │  POST /reports/    │  │  GET /evidence/verify │  │
│  └────────────────────┘  │    authenticated  │  └───────────────────────┘  │
│                           │  POST /reports/   │                              │
│                           │    assisted       │                              │
│                           └────────────────────┘                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Server-side Services                             │    │
│  │  aiClassifier.js — heuristic + rule scoring                         │    │
│  │  tokenizer.js    — PII tokenization before storage                  │    │
│  │  referralService.js — simulated external agency referral            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────┬──────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼──────────────────────────────────┐
│                      Firebase (guardian-link-6de8a)                          │
│   Auth (Email/Password) — optional   │   Firestore — FCM token storage      │
│   FCM Messaging — client token reg.  │   (server does not send FCM pushes)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

All stores are in-memory JavaScript Maps. Keys are UUIDs (or `randomBytes(16).toString('hex')` as fallback). Data is lost on server restart.

### Users (seeded at startup)

```
{ id, username, hash (bcrypt), role: 'parent'|'child'|'caseworker'|'teacher' }
```

### Relationships (parent-child pairing)

```
Map<parentId, Set<childId>>
```

### Cases (confidential reports)

```
{
  id, caseRef (8-char hex), category, description (PII-tokenized),
  encryptedTokenMap, safeToContact, anonymous, childId,
  status, aiResult, priority, humanPriority, notes[], referrals[],
  auditTrail[], createdAt, updatedAt, recoverySecretHash, submittedByRole
}
```

### Evidence

```
{ id, caseId, filename, mimetype, size, sha256, data (base64), uploadedBy, uploadedAt }
```

### SafeSignals

```
{ id, childId, parentId, category, description, pastedText,
  status, acknowledgedAt, acknowledgedNote, createdAt }
```

### Access Requests

```
{ id, childId, parentId, url, status: 'pending'|'approved'|'denied', decidedAt, createdAt }
```

### Pairing Codes

```
{ code (6-digit), parentId, expiresAt, confirmed: bool }
```

### Policies (content filtering)

```
{ childId, blockedKeywords[], allowedDomains[], updatedAt }
```

### Heartbeats

```
{ childId, lastSeen (ISO timestamp) }
```

### Organizations

```
{ id, name, type, plan, contactEmail, status: 'pending', createdAt }
```

### Demo Requests

```
{ id, orgId|null, contactName, contactEmail, orgName, message, createdAt }
```

---

## Full API Routes

### Authentication

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/login` | Public | JWT login for parent / child / teacher |
| POST | `/auth/caseworker/login` | Public | JWT login for caseworker |

### Confidential Reporting

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/reports/anonymous` | Public | Anonymous report → `{ caseRef, recoverySecret }` |
| POST | `/reports/authenticated` | child | Authenticated child report |
| POST | `/reports/assisted` | teacher | Teacher-assisted institutional report |
| GET | `/reports/status/:caseRef` | Public | Status lookup (recoverySecret in body) |
| POST | `/reports/check-status` | Public | Status lookup (body-based, RN-friendly) |

### Case Management

| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/cases` | caseworker | List all cases |
| GET | `/cases/:id` | caseworker | Full case detail |
| PUT | `/cases/:id/assess` | caseworker | Set `humanPriority` |
| PUT | `/cases/:id/note` | caseworker | Append note |
| PUT | `/cases/:id/status` | caseworker | Update status |
| POST | `/cases/:id/refer` | caseworker | Simulated referral |
| GET | `/cases/:id/audit` | caseworker | Audit trail |

### Evidence

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/evidence/:caseId` | Any authenticated | Upload file; returns `sha256` |
| GET | `/evidence/:caseId` | caseworker | List evidence with integrity status |
| GET | `/evidence/verify/:evidenceId` | caseworker | Verify SHA-256 → VERIFIED / TAMPERED |

### SafeSignal

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/safesignal` | child | Submit SafeSignal |
| GET | `/safesignal/:parentId` | parent | Fetch SafeSignals for parent |
| PUT | `/safesignal/:id/acknowledge` | parent | Acknowledge report |

### Access Requests

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/requests` | child | Submit URL access request |
| GET | `/requests` | parent | List pending requests |
| POST | `/requests/:id/decision` | parent | Approve / deny |

### Pairing

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/pair/generate` | parent | Generate one-time 6-digit code |
| POST | `/pair/confirm` | child | Confirm pairing |

### Policy

| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/policy/:childId` | parent | Get content policy |
| PUT | `/policy/:childId` | parent | Update content policy |

### Heartbeat

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/heartbeat` | child | Record device heartbeat |
| GET | `/device-status/:childId` | parent | Get device last-seen |

### Removal Requests

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/removal-request` | child | Submit removal request |
| GET | `/removal-requests` | parent | List removal requests |

### Organizations / Commercial

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/organizations/register` | Public | Register organization |
| GET | `/organizations/:id/subscription` | Public | Get subscription plan |
| POST | `/organizations/demo-request` | Public | Submit demo request |
| POST | `/organizations/:id/demo-request` | Public | Submit org-linked demo request |

### Misc

| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/health` | Public | Health check |

---

## Role Matrix

| Capability | Anonymous | Child | Parent | Teacher | Caseworker |
|---|---|---|---|---|---|
| Submit anonymous report | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit authenticated report | — | ✅ | — | — | — |
| Submit teacher-assisted report | — | — | — | ✅ | — |
| Check case status via recoverySecret | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit SafeSignal | — | ✅ | — | — | — |
| Submit URL access request | — | ✅ | — | — | — |
| Submit removal request | — | ✅ | — | — | — |
| Heartbeat | — | ✅ | — | — | — |
| View / acknowledge SafeSignals | — | — | ✅ | — | — |
| Approve / deny access requests | — | — | ✅ | — | — |
| Manage content policy | — | — | ✅ | — | — |
| Generate pairing code | — | — | ✅ | — | — |
| Confirm pairing code | — | ✅ | — | — | — |
| View device heartbeat status | — | — | ✅ | — | — |
| View removal requests | — | — | ✅ | — | — |
| List all cases | — | — | — | — | ✅ |
| View case detail | — | — | — | — | ✅ |
| Set case priority / status | — | — | — | — | ✅ |
| Add case notes | — | — | — | — | ✅ |
| Refer case (simulated) | — | — | — | — | ✅ |
| View audit trail | — | — | — | — | ✅ |
| Upload evidence | — | ✅ | ✅ | ✅ | ✅ |
| Verify evidence integrity | — | — | — | — | ✅ |
| Register organization | ✅ | — | — | — | — |
| Submit demo request | ✅ | — | — | — | — |

---

## Technology Rationale

| Choice | Rationale |
|---|---|
| **Expo / React Native** | Single codebase targets Android and (structurally) iOS. Expo managed workflow eliminates native toolchain setup for most contributors. |
| **expo-router (file-based)** | Role-based tab groups (`(parent)/`, `(child)/`) map directly to directory structure. Deep-link routing is automatic. |
| **Express + Socket.IO** | Minimal, well-understood stack. Socket.IO provides real-time parent-child communication without a cloud dependency. |
| **In-memory Maps** | Zero-infrastructure demo setup. Any contributor can run `npm start` with no database install. Production would swap in SQLite or PostgreSQL behind the same store interface. |
| **JWT (jsonwebtoken)** | Stateless authentication. Role is embedded in the token payload and verified by `requireRole()` middleware on every protected route. |
| **bcryptjs (10 rounds)** | Industry-standard password hashing. Applied to both login passwords and recovery secrets. |
| **SHA-256 evidence hashing** | Chain-of-custody without external infrastructure. Hash computed from the raw file buffer server-side and re-derived on every verification request. |
| **Rule-based safety classifier** | Deterministic, auditable, zero-latency. 18 named rules (grooming, bullying, threat categories) with word-boundary matching. A probabilistic layer (`aiClassifier.js`) adds confidence scoring on top. |
| **PII tokenization** | Description text is tokenized before storage. Named entities (names, phone numbers, emails) are replaced with placeholder tokens, reducing data exposure if the in-memory store were inspected. |
| **Luganda localization (lg)** | Uganda is the initial target market. Luganda is one of the most widely spoken indigenous languages in Uganda, directly serving the community the platform aims to protect. |
| **UGX pricing** | Prices expressed in Ugandan Shillings align with the Uganda NDP III digital inclusion mandate and reflect real purchasing power for the target market. |
| **Firebase (optional)** | FCM push token registration and Firestore storage. Optional — all core features run on Express JWT alone. Keeps the demo accessible without a Firebase project. |

---

*GuardianLink — Stage 9 architecture document.*
