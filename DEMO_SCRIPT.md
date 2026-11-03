# GuardianLink Lite — Hackathon Demo Script

**Total runtime: ~6 minutes 30 seconds**

> **Before the demo**
> - Server running: `cd server && npm start` → `http://<LAN-IP>:3001`
> - Mobile app open on device/emulator: `cd mobile && npx expo start`
> - `SERVER_URL` in `src/config.ts` set to the correct LAN IP
> - Two devices (or two emulators/tabs) ready: one logged in as parent, one as child
> - Both demo accounts pre-confirmed as paired (run pair flow beforehand, or seed the relationship in `store.js`)

---

## Scene 1 — Introduction (30 seconds)

**What to show:** Role-selection screen on first launch.

**Steps:**

1. Open the app on a fresh device (or log out to reach the login screen).
2. Point to the role selector — **Parent** and **Child** options displayed.
3. Narrate: "One codebase, two distinct experiences. A parent always sees the control dashboard. A child sees an age-appropriate, transparent protection interface. Role is validated server-side — a child cannot switch into parent mode."

**Key talking point:** The architecture separates concerns at the server layer, not just the UI. The JWT payload carries the role, and every privileged endpoint enforces it with `requireRole()` middleware.

---

## Scene 2 — Parent Setup (60 seconds)

**What to show:** Parent logs in, views the dashboard, generates a pairing code.

**Steps:**

1. On the parent device, enter **kalyangoangelo@gmail.com** / **Parent123!** and tap **Login**.
2. Dashboard loads — point out the live counters: connected children, pending requests, safety reports.
3. Navigate to **Manage Children** → tap **Generate Pairing Code**.
4. A 6-digit code appears on screen (e.g. `482 319`) with a 30-minute expiry countdown.
5. Narrate: "The parent generates a one-time code. It is stored server-side with an expiry timestamp. The child enters it on their device to establish a cryptographically verified link."

**Key talking point:** The pairing route (`POST /pair/generate`, `POST /pair/confirm`) enforces roles on both ends. A code cannot be confirmed by another parent.

---

## Scene 3 — Child Enrollment (30 seconds)

**What to show:** Child logs in, sees protection status, heartbeat active.

**Steps:**

1. On the child device, enter **kalyango.200@gmail.com** / **Child123!** and tap **Login**.
2. Child dashboard shows the **Protection Status** screen — status badge reads **VERIFIED**.
3. Point to the heartbeat indicator — "Last check-in: just now."
4. Narrate: "The child app sends a heartbeat every 60 seconds. The parent dashboard reflects the device as ACTIVE. If the app is closed, the status moves to OFFLINE after 5 minutes of missed beats."

**Honest label to state aloud:** "Heartbeat works while the app is running. OS-level persistence — surviving a force-stop or uninstall — is not implemented in this prototype."

---

## Scene 4 — Content Filtering Demo (60 seconds)

**What to show:** Parent content restrictions screen; educational exception in action.

**Steps:**

1. On the parent device, navigate to **Content Restrictions**.
2. The screen shows the active policy: blocked categories and custom keywords.
3. In the filter demo input, type `pornography` → tap **Check**. Result: **BLOCK — ADULT** (HIGH confidence).
4. Clear the input. Type `breast cancer` → tap **Check**. Result: **REVIEW — ADULT / Educational context detected** (MEDIUM confidence).
5. Narrate: "The engine applies word-boundary matching with Unicode normalization. Typing `pörnography` with a diacritic still triggers the ADULT rule. But 'breast cancer' hits the educational-exception list and is downgraded to REVIEW rather than BLOCK."
6. Scroll down to **Custom Keywords**. Add a keyword, e.g. `vaping`. Tap **Save Policy**. Narrate: "The policy is persisted on the server and applied to the child's filter session immediately."

**Key talking point:** The filter engine (`filterEngine.ts`) is real TypeScript logic — not a third-party API. It runs on the client for instant feedback and on the server for enforcement.

---

## Scene 5 — SafeSignal End-to-End (90 seconds)

**What to show:** Child submits a report; parent sees triage result; parent acknowledges.

**Steps:**

1. On the child device, tap **SafeSignal** from the child home screen.
2. Select category **Suspicious Message**.
3. In the description field, type: "Someone online is asking me to keep our chat secret from my parents."
4. In the optional pasted-text field, type: "don't tell your parents about us, just keep this between us."
5. Tap **Submit Report**. Success screen: "Your report is private and only shared with your guardian."
6. Switch to the parent device. Navigate to **SafeSignal Reports**. The new report appears at the top — badge shows **HIGH RISK**.
7. Tap the report. Triage panel shows:
   - Classification: **GROOMING_INDICATORS**
   - Triggered rules: `G003 — Secrecy request (keep hidden from parents)`
   - Uncertainty: **LIKELY**
   - Recommended action: "Alert parent or guardian immediately. Do not respond to the sender. Save the conversation as evidence."
8. Parent taps **Acknowledge** and selects action "Spoke with child — monitoring situation."
9. Report status updates to **Acknowledged**.

**Key talking points:**
- The classifier (`safetyClassifier.ts`) matched rule **G003** — a strong rule ("keep this a secret") that triggers LIKELY certainty on a single match.
- The triage layer (`safeSignalTriage.ts`) combined the classification with the risk-derivation logic to produce HIGH risk.
- The Socket.IO `safesignal:new` event notified the parent in real time — no polling.

**Honest label to state aloud:** "The classifier is a rule-based engine — 18 named patterns. It is not a machine learning model. Human review is always recommended, as stated in the source file header."

---

## Scene 6 — Device Security & Heartbeat (45 seconds)

**What to show:** VERIFIED status badge; demonstrate OFFLINE transition.

**Steps:**

1. On the parent device, navigate to **Device Security**.
2. Show the child device entry: status **ACTIVE**, last heartbeat timestamp visible.
3. On the child device, force-close the app (swipe away from recent apps).
4. Wait approximately 5 minutes (or narrate: "In a live demo with full time, we would wait 5 minutes; in a sped-up demonstration the threshold can be lowered in `server/src/routes/heartbeat.js`").
5. Refresh the parent Device Security screen. Status changes to **OFFLINE**.
6. Narrate: "The heartbeat route records `lastSeen`. The parent dashboard computes OFFLINE when `now - lastSeen > 5 minutes`. This is all server-side logic with no proprietary device management APIs."

**Honest label to state aloud:** "OS-level uninstall protection — such as Android Device Policy Controller — is not implemented. A determined child who uninstalls the app will trigger OFFLINE, but the app cannot prevent uninstallation."

---

## Scene 7 — Policy Management (45 seconds)

**What to show:** Parent adds a blocked keyword; policy takes effect.

**Steps:**

1. On the parent device, navigate to **Content Restrictions**.
2. Under **Custom Blocked Keywords**, tap **Add Keyword**. Enter `tiktok`. Tap **Save Policy**.
3. The policy is sent to `PUT /policy/:childId`. Confirm with the server response displayed.
4. Switch to the child device. In the **Request Access** screen, enter a URL containing "tiktok" in the title or query field. Tap **Check**.
5. Result: **BLOCK — Policy keyword "tiktok" matched.**
6. Narrate: "The parent's keyword update was immediately reflected in the child's filter session. The policy round-trips through the server — the child cannot bypass it by modifying local state."

---

## Scene 8 — Closing (30 seconds)

**What to show:** Return to parent dashboard — real metrics from the session.

**Steps:**

1. Navigate to the parent **Dashboard**.
2. Point to the live counters updated during the demo:
   - Safety reports: 1 (submitted in Scene 5)
   - Acknowledged reports: 1
   - Access requests reviewed: (any submitted during demo)
   - Policy last updated: timestamp from Scene 7
3. Narrate: "Every number on this dashboard comes from real API calls made during this demonstration. There is no pre-seeded mock data on screen right now."
4. Close with the mission statement: "GuardianLink Lite gives parents real visibility and gives children a safe, transparent way to ask for help. Every feature is honestly labelled — we show what is working, what is in controlled demonstration, and what is not yet built. Child safety is too important for theatre."

---

## Fallback Notes

| If this breaks | Do this instead |
|---|---|
| Server not reachable from device | Run demo entirely on one machine using an Android emulator and `localhost:3001`; update `SERVER_URL` to `http://10.0.2.2:3001` for the emulator |
| Pairing code expired | Re-generate from the parent Manage Children screen; codes are instant |
| Socket.IO not delivering real-time updates | Refresh the parent screen manually — data is always available via the REST fetch fallback |
| Firebase Auth fails | Use the Express JWT login path (email prefix as username: `parent` / `child`) — all core features work without Firebase |

---

*Prepared for Stage H — GuardianLink Lite hackathon demo.*
