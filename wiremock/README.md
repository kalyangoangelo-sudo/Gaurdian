# WireMock Referral Stub

Simulates the Child Helpline 116 referral endpoint for the GuardianLink demonstration.

## Two ways to run

### Option A — Node.js mock server (simplest)

```bash
cd wiremock
node mock-server.js
# Runs on port 8080
```

### Option B — WireMock Java (full WireMock)

```bash
# Download WireMock standalone JAR
wget https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-jre8-standalone/3.5.4/wiremock-jre8-standalone-3.5.4.jar

# Run with mappings
java -jar wiremock-jre8-standalone.jar --port 8080 --root-dir .
```

WireMock will load mappings from `mappings/child-helpline-referral.json`.

## Environment variables

Set these in `server/.env`:

```
REFERRAL_ENDPOINT_URL=http://localhost:8080/referral
REFERRAL_TIMEOUT_MS=5000
```

## Endpoint

```
POST http://localhost:8080/referral

Request body:
{
  "referralId": "REF-A1B2C3D4",
  "caseId": "uuid-here",
  "service": "Childline Uganda 116",
  "timestamp": "2026-01-01T00:00:00.000Z"
}

Response (200):
{
  "status": "ACKNOWLEDGED",
  "referralId": "REF-A1B2C3D4",
  "receivedAt": "2026-01-01T00:00:00.000Z",
  "message": "Referral received and acknowledged by simulated Child Helpline 116 service.",
  "estimatedResponseTime": "24 hours",
  "caseWorker": "CW-1234"
}
```

⚠️ **SIMULATED** — No real agency is contacted. For demonstration purposes only.
