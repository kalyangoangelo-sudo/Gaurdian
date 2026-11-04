# GuardianLink — Android Build Guide

**Date:** 2026-11-04

---

## Prerequisites

- Node.js v18+ (v24 confirmed working)
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Expo account (free): https://expo.dev
- Android Studio (for local Gradle build) OR EAS Build (cloud, no Android Studio needed)

---

## Build Methods

### Method A: EAS Build (Recommended — Cloud, No Local Setup)

```bash
cd GuardianLinkLite/mobile

# Install dependencies
npm install

# Login to Expo
eas login

# Build APK (development profile)
eas build --platform android --profile development

# Download the APK when build completes
# EAS provides a download link
```

**EAS build profiles** (from `eas.json`):
- `development`: Debug APK, internal distribution
- `preview`: Release APK, internal distribution
- `production`: Release APK

### Method B: Local Gradle Build (Requires Android Studio + SDK)

```bash
cd GuardianLinkLite/mobile

# Generate native Android project
npx expo prebuild --clean

# Build debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Configuration

### API URL

Update `mobile/src/config/api.ts` with the server address:

```typescript
export const API_BASE_URL = 'http://<SERVER_LAN_IP>:3001';
// For emulator: 'http://10.0.2.2:3001'
// For LAN demo: 'http://192.168.x.x:3001'
```

### App Identity

Defined in `mobile/app.json`:
- Package: `com.angelo.guardian`
- Name: `GuardianLink Lite`
- SDK: Expo SDK 57

### Firebase

- `google-services.json` is included in the mobile directory
- Firebase is used for: Auth (optional), FCM token storage, Firestore (token storage)
- All core features work WITHOUT Firebase (Express JWT is the primary auth)

---

## Working Features (Automated Verification)

| Feature | Status | Verification |
|---|---|---|
| TypeScript compilation | PASS | `tsc --noEmit` — 0 errors |
| Login (parent, child, teacher, caseworker) | WORKING | API tested |
| Parent-child pairing | WORKING | API tested |
| Website access requests | WORKING | API tested |
| Content filtering | WORKING | Service tested |
| SafeSignal reporting | WORKING | API tested |
| Public anonymous reporting | WORKING | API + web tested |
| Case status checking | WORKING | API tested |
| Caseworker dashboard | WORKING | API + portal tested |
| Evidence upload + SHA-256 | WORKING | API tested |

---

## Features Requiring Manual Device Verification

| Feature | Why Manual | What to Check |
|---|---|---|
| Push notifications | Requires device + FCM | Notification arrives on access request |
| Heartbeat service | Requires foreground app | Heartbeat sends every 60s while app active |
| Device status (parent view) | Requires paired child | Parent sees ACTIVE/OFFLINE status |
| Navigation between screens | Requires device UI | All screens navigable, no crashes |
| Offline behavior | Requires airplane mode | App shows appropriate error states |

---

## Limitations (Honest Assessment)

- **Cannot prevent app uninstallation** — requires Android Device Admin/Owner mode (not implemented in Expo managed workflow)
- **Cannot monitor other apps** (WhatsApp, TikTok, etc.) — Android sandbox prevents this
- **Cannot block all browsers** — content filtering only works in GuardianLink's in-app browser
- **Cannot track GPS location** — not collected (privacy by design)
- **FCM push notifications may not work in Expo Go** — requires a development build or production APK

---

## APK Distribution for Hackathon Judges

```bash
# Build the APK
eas build --platform android --profile development

# Share the download link provided by EAS
# OR download and distribute the .apk file directly
# Judges can install via "adb install app-debug.apk" or by opening the APK on their device
```

---

## Post-Hackathon: Google Play

1. Create a production build: `eas build --platform android --profile production`
2. Configure app signing: `eas credentials`
3. Submit: `eas submit --platform android`
4. Requires: Google Play Developer account ($25 one-time fee)
5. Requires: Privacy policy URL, content rating questionnaire, data safety form
