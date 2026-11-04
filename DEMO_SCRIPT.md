# GuardianLink — Demo Script

**Total runtime: ~10 minutes**

> **Before the demo**
> - Server running: `cd server && npm start` → `http://<LAN-IP>:3001`
> - Mobile app open on device/emulator: `cd mobile && npx expo start`
> - `API_BASE_URL` in `mobile/src/config/api.ts` set to the correct LAN IP (emulator: `http://10.0.2.2:3001`)
> - Screens to have open: app at the login/home screen

---

## Scenario A — Independent Reporting (no login required) ~2 min

**What to show:** A child, community member, or anyone can report abuse without creating an account.

**Steps:**

1. Open the app on a fresh device (or log out to reach the unauthenticated home).
2. Tap **Report an Incident** (or navigate to `PublicReportScreen`). No login prompt appears.
3. Select category **Online Harassment** from the picker.
4. Enter a description: "Someone online keeps sending me threatening messages and sharing my photos without permission."
5. Toggle **Safe to Contact** off (the reporter is not comfortable being contacted).
6. Tap **Submit Report**.
7. A success modal appears showing:
   - `Case Reference: A1B2C3D4` (8-character hex code)
   - `Recovery Secret: <64-char hex string>`
   - Warning: "Copy and save this code now — it will not be shown again."
8. Tap **Copy Recovery Secret**. The secret is placed in the clipboard.
9. Tap **Done**. The modal closes. The secret is gone from the UI.

**Key talking points:**
- The `caseRef` + `recoverySecret` are the only way to check case status later. The secret is stored as a bcrypt hash — the server cannot reconstruct it.
- No personal data is required to report. The platform is accessible to children who cannot or will not log in.

**Honest label to state aloud:** "All data is in-memory. A server restart clears cases. A production deployment would require a persistent database."

---

## Scenario B — AI Assessment (caseworker views CRITICAL + GROOMING_INDICATORS) ~2 min

**What to show:** An AI-classified report arrives. The caseworker sees the severity and can override it.

**Steps:**

1. In the same session or a new one, open **PublicReportScreen** (no login).
2. Select category **Grooming**. Enter description:
   > "An adult online keeps telling me to keep our chats secret from my parents. He sends me gifts and says we have a special relationship."
3. Tap **Submit**. Note the `caseRef`.
4. On a second device (or the same device in a new tab), navigate to **Caseworker Login**.
5. Enter username `caseworker` / password `Caseworker123!`. Tap **Login**.
6. `CaseworkerDashboardScreen` loads. The grooming report appears at the top — priority badge shows **CRITICAL**.
7. Tap the case to open `CaseDetailScreen`.
8. Show the **AI Assessment** panel:
   - Suggested Priority: **CRITICAL**
   - Classification tags include: **GROOMING_INDICATORS**
   - `requiresHumanReview: true`
9. The caseworker taps **Override Priority** and selects **HIGH** (a judgment call — the AI said CRITICAL, the caseworker disagrees).
10. `PUT /cases/:id/assess` is called. The case now shows `humanPriority: HIGH`. The audit trail records the override.

**Key talking points:**
- The AI classifier (`aiClassifier.js`) scores the text using named rules and probability weights from `safetyClassifier.ts`. It does not call an external API.
- Human override is explicit and auditable. The original AI score is always preserved.

---

## Scenario C — Evidence Integrity ~1.5 min

**What to show:** A file is uploaded as evidence. Its SHA-256 hash is displayed. Verification returns VERIFIED.

**Steps:**

1. Logged in as caseworker, open `CaseDetailScreen` for any existing case.
2. Navigate to the **Evidence** tab or tap **Upload Evidence**.
3. Select a PDF file (any file from the device).
4. Tap **Upload**.
5. The response card shows:
   - `filename: document.pdf`
   - `SHA-256: a3f9e2...` (64-char hex hash)
   - `uploadedAt: <timestamp>`
6. Tap **Verify Integrity**.
7. `GET /evidence/verify/:evidenceId` is called. The server recomputes the SHA-256 from the stored base64 data and compares it to the stored hash.
8. Result banner: **VERIFIED** ✅

**Key talking points:**
- The hash is computed server-side from the raw file buffer on upload. It is stored alongside the base64 data.
- Verification re-derives the hash at query time. If the stored data were altered by any means, the hashes would diverge and the result would show **TAMPERED**.
- This gives evidence a basic chain-of-custody audit trail without requiring a blockchain or external service.

---

## Scenario D — Human Response + Referral ~2 min

**What to show:** A caseworker works a case: adds a note, moves it through status transitions, then refers it to an external agency.

**Steps:**

1. Logged in as caseworker, open any case in `CaseworkerDashboardScreen`.
2. Tap **Add Note**. Enter: "Spoke with school counsellor. Child confirmed the messages. Parent has been notified. Proceeding to referral."
3. Tap **Save Note**. The note appears in the **Notes** section with timestamp.
4. Tap **Update Status**. Select **Under Review**. Confirm. Status badge updates.
5. Tap **Update Status** again. Select **Action Required**. Status updates.
6. Tap **Refer**. A service picker appears (e.g. NCMEC, Police, NGO).
7. Select a service and tap **Confirm Referral**.
8. `POST /cases/:id/refer` is called. The response shows:
   - `referralId: REF-XXXXXXXX`
   - `service: NCMEC`
   - `status: SENT`
   - Label: **SIMULATED**
9. Case status automatically moves to **Referred**. The referral card appears in `CaseDetailScreen`.

**Key talking points:**
- The referral is simulated — `referralService.js` returns a realistic response without calling a live agency API. This is clearly marked both in the UI (SIMULATED badge) and in the source code.
- Every status change and note addition is appended to the immutable audit trail visible via `GET /cases/:id/audit`.

---

## Scenario E — Parent Confidentiality ~1.5 min

**What to show:** A parent cannot access confidential cases. The CaseStatusScreen requires the recovery code.

**Steps:**

1. Log in as **parent** (`parent` / `Parent123!`).
2. Navigate to the parent dashboard. Point out: there is no "View Cases" or "View Reports" link from the parent role.
3. Attempt to navigate directly to `/cases` (or try a direct API call: `GET /cases` with the parent JWT).
4. Server returns **403 Forbidden** — `requireRole('caseworker')` rejects the parent token.
5. Now navigate to **Check Report Status** (`CaseStatusScreen`).
6. Enter a `caseRef` from Scenario A. Leave the recovery secret blank and tap **Check**. Error: "Invalid case reference or recovery secret."
7. Enter the correct recovery secret (from clipboard). Tap **Check**.
8. The case status card appears: category, status, submission date, last updated.
9. The parent can see their case is being handled — without being able to browse all cases.

**Key talking points:**
- Confidential reports are accessible only through the `caseRef` + `recoverySecret` pair. Even a logged-in parent cannot enumerate or read other people's cases.
- The recovery secret is bcrypt-hashed on the server. The server never stores the plaintext secret. If the reporter loses the secret, there is no recovery path by design.

---

## Scenario F — Commercial Model ~1 min

**What to show:** The commercial landing screen with 4 pricing tiers and the demo request form.

**Steps:**

1. From the unauthenticated home screen (or any screen), navigate to **GuardianLink Plans** (`CommercialLandingScreen`).
2. The hero banner shows the GuardianLink shield logo and the note: "Public reporting is always free — no subscription required."
3. Scroll through the 4 plan cards:
   - **Free** — UGX 0 — anonymous reporting, case status, safety tips.
   - **Family Premium** — UGX 10,000/mo — SafeSignal, content filtering, device heartbeat. (MOST POPULAR badge)
   - **School Starter** — UGX 100,000/mo — up to 50 student profiles, caseworker access, school dashboard.
   - **NGO / Institutional** — Custom — unlimited profiles, custom integrations, SLA.
4. Tap **Request Demo** on the School Starter card. The demo request form pre-fills the message field.
5. Fill in Name and Email. Tap **Send Request**.
6. `POST /organizations/demo-request` is called. Success message: "Thank you! We will be in touch within 1–2 business days."

**Key talking points:**
- The free tier is not a trial — anonymous reporting and case status are permanently free. This is a deliberate social impact decision aligned with UNICEF child protection principles.
- Pricing is expressed in Ugandan Shillings (UGX) as the initial target market is Uganda, addressing the NDP III digital safety mandate.

---

## Fallback Notes

| If this breaks | Do this instead |
|---|---|
| Server not reachable from device | Run entirely on one machine with an Android emulator and `API_BASE_URL = 'http://10.0.2.2:3001'` |
| Caseworker login fails | Verify `JWT_SECRET` is set in `server/.env` and the server was restarted after setting it |
| Recovery secret lost | Resubmit a fresh report for the demo — secrets cannot be recovered by design |
| Socket.IO events not delivering | Refresh the screen manually — data is always available via REST fetch fallback |
| Firebase Auth fails | Use the Express JWT login path — all core features work without Firebase |
| Evidence upload fails | Check that the `multer` dependency is installed: `cd server && npm install` |

---

*GuardianLink — Stage 9 demo script.*
