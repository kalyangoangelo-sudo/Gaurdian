# GuardianLink — Deployment Guide

**Date:** 2026-11-04

---

## Architecture

```
                    ┌──────────────────────────┐
                    │   Reverse Proxy (nginx)  │
                    │   TLS termination          │
                    │   Port 443 → 3001         │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   Express Server          │
                    │   Port 3001               │
                    │   ┌────────────────────┐  │
                    │   │ SQLite (WAL mode)   │  │
                    │   │ /data/guardianlink.db│ │
                    │   └────────────────────┘  │
                    │   Serves:                 │
                    │   /app/  (React web app)   │
                    │   /pwa/  (vanilla PWA)     │
                    │   /portal/ (vanilla portal)│
                    │   API routes (/reports,    │
                    │   /cases, /curiosity,     │
                    │   /lessons, etc.)         │
                    └──────────────────────────┘
```

### Hosting Recommendation: Render

Render is recommended for the hackathon demo because:
- Single web service hosts Express + static files + SQLite
- SQLite persists across restarts on Render's persistent disk
- Free tier available for demo
- Simple `npm start` deployment
- Environment variables configured via dashboard

**Alternative: Railway** — similar features, persistent volumes, slightly more expensive.

**Not recommended: Fly.io** — SQLite requires LiteFS or external volume; more complex setup.

---

## Environment Variables

```env
# ── Required ──────────────────────────────────────────
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
NODE_ENV=production

# ── CORS (comma-separated origins) ────────────────────
CORS_ORIGIN=https://your-domain.com

# ── Database ───────────────────────────────────────────
DB_PATH=/data/guardianlink.db

# ── Optional: WireMock referral stub ──────────────────
REFERRAL_ENDPOINT_URL=http://localhost:8080/referral

# ── Optional: Firebase (for FCM push) ───────────────────
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
# TOKENIZER_KEY=<hex-encoded 32-byte key>
```

---

## Deployment Steps

### 1. Build the web app
```bash
cd GuardianLinkLite/web
npm install
npm run build
# Output: web/dist/
```

### 2. Install server dependencies
```bash
cd GuardianLinkLite/server
npm install
```

### 3. Set environment variables
```bash
cp .env.example .env
# Edit .env with production values
```

### 4. Start the server
```bash
npm start
# Server serves:
#   API:      http://localhost:3001/
#   Web app:  http://localhost:3001/app/
#   PWA:      http://localhost:3001/pwa/index.html
#   Portal:   http://localhost:3001/portal/index.html
```

### 5. Start WireMock stub (for referrals)
```bash
cd GuardianLinkLite
node wiremock/mock-server.js
# Runs on http://localhost:8080
```

### 6. Verify
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Database Backup

```bash
# Backup (SQLite WAL mode — use .backup command for consistency)
sqlite3 /data/guardianlink.db ".backup '/backups/guardianlink-$(date +%Y%m%d).db'"

# Restore
cp /backups/guardianlink-20260101.db /data/guardianlink.db
# Restart server
```

---

## Rollback Procedure

```bash
# 1. Stop server
kill $(pgrep -f "node src/server.js")

# 2. Restore database backup
cp /backups/guardianlink.db /data/guardianlink.db

# 3. Rebuild web app from previous commit
cd web && git checkout <previous-commit> && npm run build

# 4. Restart server
cd server && npm start

# 5. Verify health
curl http://localhost:3001/health
```

---

## Render Deployment

1. Create a new Web Service on Render
2. Connect the repository
3. Set:
   - Build command: `cd web && npm install && npm run build && cd ../server && npm install`
   - Start command: `cd server && npm start`
   - Health check: `/health`
4. Add environment variables (see above)
5. Add a persistent disk (min 1 GB) mounted at `/data`
6. Set `DB_PATH=/data/guardianlink.db`
7. Deploy

---

## Production Hardening Checklist

- [ ] Set `JWT_SECRET` to a 64+ char random hex string
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to approved domains
- [ ] Configure HTTPS via reverse proxy
- [ ] Set `DB_PATH` to a persistent volume
- [ ] Remove demo credentials from `store.js`
- [ ] Run `npm audit` before each deploy
- [ ] Configure automated database backups
- [ ] Set up monitoring and alerting
- [ ] Run external penetration testing
- [ ] Review safety messages with qualified child protection practitioner
