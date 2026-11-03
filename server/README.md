# GuardianLink Lite – Server

Node.js + Express + Socket.IO backend for the GuardianLink Lite MVP.

## ⚠️ Development-only demo accounts

| Role   | Username | Password   |
|--------|----------|------------|
| Parent | parent   | Parent123! |
| Child  | child    | Child123!  |

These are seeded at startup for hackathon demo purposes. Do **not** use in production.

## Setup

```bash
# 1. Install dependencies
cd GuardianLinkLite/server
npm install

# 2. Create your .env file
cp .env.example .env

# 3. Edit .env and set a real JWT_SECRET
# Generate one with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Start the server
npm start

# For auto-reload during development:
npm run dev
```

The server starts on port **3001** by default.

## Running tests

```bash
npm test
```

## API Reference

### Health check

```
GET /health
→ 200 { status: "ok", timestamp: "..." }
```

### Login

```
POST /login
Body: { "username": "parent", "password": "Parent123!" }
→ 200 { token: "...", user: { id, username, role } }
→ 401 { error: "Invalid username or password." }
```

### List requests

```
GET /requests
Authorization: Bearer <token>
→ 200 { requests: [...] }
```

Responses are filtered by role:
- **Child** sees only their own requests
- **Parent** sees all requests linked to them

### Create request (child only)

```
POST /requests
Authorization: Bearer <token>
Body: { "url": "https://example.com" }
→ 201 { request: { id, childId, parentId, url, status, createdAt, decidedAt } }
→ 400 invalid URL
→ 403 not a child account
```

### Decide request (linked parent only)

```
POST /requests/:id/decision
Authorization: Bearer <token>
Body: { "decision": "approved" | "denied" }
→ 200 { request: { ...updated } }
→ 403 not authorized
→ 404 request not found
→ 409 already decided
```

## Socket.IO events

Connect with JWT in auth:
```js
const socket = io('http://localhost:3001', { auth: { token: '<jwt>' } });
```

| Event             | Emitted to          | Payload              |
|-------------------|---------------------|----------------------|
| `request:new`     | parent + child rooms | `{ request }`       |
| `request:updated` | parent + child rooms | `{ request }`       |

## Important limitations

- **No persistence** – restarting the server clears all requests.
- **In-memory only** – not suitable for multi-server deployment.
- **HTTP only** – production requires HTTPS with a reverse proxy (nginx, Caddy, etc.).
- **Single parent-child pair** – dynamic pairing is out of scope for MVP.
