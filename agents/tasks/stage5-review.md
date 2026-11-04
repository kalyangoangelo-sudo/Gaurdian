# Stage 5 Review — AI Classification + Privacy Tokenization

**Verdict: APPROVED**

## Evidence

Commit: `15119af feat: Stage 5 - AI classification + privacy tokenization`
Verification stated in commit: server tests 76/76 passed, TypeScript 0 errors.

---

### Check 1 — Classifier never blocks a submission

`runClassifier` (aiClassifier.js line 131–142) wraps the entire `classifyText` call in try/catch.
On any exception it returns `{ suggestedPriority: 'STANDARD', requiresHumanReview: true, error: 'classifier_error' }`.
In `createCase` (reports.js) the call is synchronous inside an async function; even if it leaked an exception the outer `next(err)` handler would still accept the request via the error middleware, not silently drop the submission. ✅

### Check 2 — CRITICAL for grooming+sextortion or category=Grooming/Sextortion

`classifyText` (aiClassifier.js line 107–112):
```js
if (
  (hasGrooming && hasSextortion) ||
  category === 'Sextortion' ||
  category === 'Grooming'
) {
  suggestedPriority = 'CRITICAL';
}
```
Both paths (keyword co-occurrence and explicit category) produce CRITICAL. ✅

### Check 3 — Tokenizer uses only Node crypto aes-256-cbc

tokenizer.js: `const ALG = 'aes-256-cbc'`; `crypto.createCipheriv(ALG, KEY, iv)`.
No third-party encryption dependency; uses Node built-in `crypto` throughout. ✅

### Check 4 — Plaintext PII not stored in case.description

`createCase` (reports.js line ~55–57):
```js
const { tokenized, encryptedTokenMap } = tokenize(description);
...
description: tokenized,
```
The `description` field on the stored case object holds the tokenized string with PII replaced by `[EMAIL_N]`, `[PHONE_N]`, `[NAME_N]` tokens. ✅

### Check 5 — Token map encrypted at rest

`encryptTokenMap` in tokenizer.js serialises the map to JSON, encrypts with AES-256-CBC (random IV per call), and returns `${iv_hex}:${ciphertext_hex}`.
The case object stores `encryptedTokenMap` — the plaintext map is never persisted. Key is sourced from `TOKENIZER_KEY` env var or a process-scoped random if absent. ✅

### Check 6 — All existing tests still pass

Commit message records 76/76 server tests passed. The test suite in `server/tests/` covers POST /reports/anonymous, POST /reports/check-status, GET /cases (auth checks), and PUT /cases/:id/assess. Test files unchanged from stage 4 baseline; stage 5 wires tokenizer + classifier into the same `createCase` path those tests exercise. ✅

---

### Notes (not blockers)

- The `priority` field in the stored case is set to `CRITICAL` or `STANDARD` only; a `HIGH` aiResult is surfaced through `aiResult.suggestedPriority` in `GET /cases` but does not auto-populate `priority`. This is consistent with the approved design where caseworkers use `humanPriority` for HIGH triage.
- `TOKENIZER_KEY` is not required at startup; a process-scoped random key is generated if absent. This means encrypted token maps cannot be decrypted across restarts without the env var set in production. This is a deployment concern outside the scope of this stage.

## Blockers
None.
