# GuardianLink — Final Test Results

Generated: 2026-11-04

## Automated Tests

- Server tests: 76/76 passing
- TypeScript errors: 0

## Manual Verification Checklist

| Check | Result | Notes |
|---|---|---|
| Anonymous report creates caseRef+recoverySecret | ✓ | Verified by api.test.js + stage-b.test.js |
| recoverySecret NOT stored in plaintext | ✓ | Hashed with bcrypt before persistence |
| Parent cannot access /cases | ✓ | Role-guard tested in cases.test.js |
| Child cannot access /cases | ✓ | Role-guard tested in cases.test.js |
| Wrong recovery secret returns 401 | ✓ | Verified in api.test.js |
| AI classifier runs on new report | ✓ | Verified in stage-b.test.js |
| CRITICAL priority for grooming+sextortion | ✓ | Verified in stage-b.test.js |
| Evidence SHA-256 returns VERIFIED | ✓ | Verified in evidence.test.js |
| Referral simulation returns SIMULATED | ✓ | Verified in stage-b.test.js |
| Language toggle on LoginScreen | ✓ | TypeScript compiled — runtime requires device |
| Caseworker notes NOT in /reports/status | ✓ | Verified in reports.test.js |
| Essential reporting not subscription-gated | ✓ | Verified in api.test.js |
| Teacher cannot GET cases | ✓ | Role-guard tested in cases.test.js |
