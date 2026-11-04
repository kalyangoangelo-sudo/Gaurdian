# GuardianLink — Web Application

React + TypeScript + Vite + Tailwind CSS web application with five role-based portals.

## Quick Start

### Development (two terminals)

**Terminal 1 — Backend server:**
```bash
cd GuardianLinkLite/server
cp .env.example .env  # Set JWT_SECRET
npm start
# Server runs on http://localhost:3001
```

**Terminal 2 — Web dev server (hot reload):**
```bash
cd GuardianLinkLite/web
npm install
npm run dev
# Web app runs on http://localhost:5173
# API calls are proxied to localhost:3001 automatically
```

Open `http://localhost:5173` for the development experience.

### Production (single server)

```bash
# Build the web app
cd GuardianLinkLite/web
npm run build  # Outputs to web/dist/

# Serve from Express
cd GuardianLinkLite/server
npm start
# Web app available at http://localhost:3001/app/
```

## Portals

| Portal | URL | Login Required | Demo Credentials |
|---|---|---|---|
| Child Portal | `/` | No | N/A (anonymous) |
| Parent Portal | `/parent` | Yes | `parent` / `Parent123!` |
| Teacher Portal | `/teacher` | Yes | `teacher` / `Teacher123!` |
| Counselor Portal | `/counselor` | Yes | `caseworker` / `Caseworker123!` |
| Admin Portal | `/admin` | Yes | `caseworker` / `Caseworker123!` |

## Features

### Child Portal (public, no login)
- Anonymous incident reporting (picture-based, typed, paste, voice)
- Secure case reference + recovery code
- Case status checking
- Curiosity Corner (Q&A with pre-approved responses)
- Learning library with quizzes
- English + Luganda language toggle
- PWA installable
- Persistent Report Harm button

### Parent Portal
- View child device status
- Generate pairing codes
- Approve/deny website access requests
- View SafeSignal reports
- Cannot access confidential child reports

### Teacher Portal
- Assign lessons to classes
- View assignment history
- Cannot access confidential reports or Curiosity Corner

### Counselor Portal
- Case queue with priority/status filters
- Case detail with AI assessment, PII-tokenized content
- Actions: set priority, change status, add note, refer, send response
- Pre-approved response templates
- Curiosity Corner review queue
- Audit trail
- Referral management (simulated via WireMock)

### Admin Portal
- System health monitoring
- Organization registration
- Subscription plan management
- Simulated billing
- Cannot access confidential child reports

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| PWA | Service Worker + Web Manifest |
| Backend | Node.js + Express (existing, unchanged) |
| Auth | JWT (existing) |
| i18n | Custom dictionary (English + Luganda) |

## Build Output

| File | Size | Gzipped |
|---|---|---|
| index.html | 0.82 KB | 0.52 KB |
| CSS | 19.95 KB | 4.28 KB |
| JS | 227 KB | 68 KB |
| **Total** | **~248 KB** | **~73 KB** |

## Environment Variables

The web app uses a Vite proxy in development. In production, it's served from the Express server at the same origin.

## Known Limitations

- Voice reporting requires browser support for Web Speech API (Chrome, Edge, Safari)
- Offline mode only caches educational lessons — reporting always requires network
- Luganda speech recognition may be unreliable — text/picture fallback available
- Admin portal shares caseworker login until dedicated admin role is added
