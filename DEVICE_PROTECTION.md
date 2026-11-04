# GuardianLink — Device Protection Capabilities & Limitations

**Honest technical assessment of what the GuardianLink Family Application can and cannot do.**

---

## What the App CAN Do (Expo SDK 57 / React Native)

| Feature | Status | How |
|---|---|---|
| In-app browsing with content filtering | ✅ WORKING | `filterEngine.ts` — domain blocklist, keyword filtering, educational exceptions |
| Parent-child pairing | ✅ WORKING | One-time 6-digit code, 30-min expiry, server-verified |
| Website access requests | ✅ WORKING | Child requests URL, parent approves/denies, Socket.IO real-time |
| Device heartbeat (app active check) | ✅ WORKING | `heartbeatService.ts` — POST every 60s while app is foregrounded |
| Content policy management | ✅ WORKING | Parent sets blocked keywords, allowed domains via server API |
| SafeSignal reporting | ✅ WORKING | Child sends safety concern to parent with AI triage |
| Removal request workflow | ✅ WORKING | Child requests removal, parent reviews |

## What the App CANNOT Do (Technical Limitations)

| Claimed Capability | Reality | Why |
|---|---|---|
| Block all browsers on the device | ❌ NOT POSSIBLE | Expo managed workflow cannot intercept system browser launches. Requires Android Device Admin or Kiosk mode. |
| Monitor other apps (WhatsApp, TikTok, YouTube) | ❌ NOT POSSIBLE | Android and iOS sandbox apps. No app can read another app's content without OS-level privileges or accessibility services. GuardianLink does NOT claim this capability. |
| Prevent app uninstallation | ❌ NOT POSSIBLE | Expo managed workflow cannot prevent uninstall. Requires Android Device Admin / Device Owner mode. |
| Device-wide URL filtering (all apps) | ❌ NOT POSSIBLE | Content filtering only works within the GuardianLink in-app browser. System-wide filtering requires a VPN service or DNS-level filtering. |
| Read SMS or call logs | ❌ NOT POSSIBLE | Not requested, not supported in Expo managed workflow. Would require dangerous permissions and is inappropriate for a child safety app. |
| Track GPS location | ❌ NOT IMPLEMENTED | GuardianLink does not collect location data. This is a privacy-by-design decision, not a technical limitation. |
| Background monitoring of screen time | ❌ NOT POSSIBLE | Expo managed workflow cannot query screen time usage of other apps. Requires Android `UsageStatsManager` (system-level permission). |

## What Would Require Platform-Level Privileges

| Feature | Required Capability | Expo Compatible? |
|---|---|---|
| Prevent uninstall | Android Device Admin / Device Owner | ❌ Requires bare workflow + native module |
| Block all browsers | Android Kiosk mode / Device Owner | ❌ Requires bare workflow |
| Device-wide URL filtering | Android VPN service | ⚠️ Requires EAS custom dev build + native module |
| Screen time monitoring | Android UsageStatsManager | ❌ Requires bare workflow + system permission |
| iOS Screen Time integration | iOS Family Controls API | ❌ Requires bare workflow + Apple Family Controls entitlement |

## Honest Positioning for the Hackathon

GuardianLink's Family Application provides **in-app browsing protection** with content filtering and parental oversight. It does NOT claim to monitor the entire device, block all browsers, or prevent uninstallation. These capabilities require Android enterprise/device-owner provisioning or iOS Family Controls, which are outside the scope of the Expo managed workflow.

The child portal PWA provides **independent confidential reporting** that does not require any device-level privileges. This is the core Track 5 feature.

## Future Expansion Path

For organizations requiring device-level controls:
1. **Android Enterprise**: Use Android Management API to provision devices as managed (kiosk or fully managed). GuardianLink would integrate as a managed app.
2. **Custom Native Build**: Eject from Expo managed workflow to bare workflow, add native modules for Device Admin, VPN service, or UsageStatsManager.
3. **iOS Family Controls**: Apply for the Apple Family Controls entitlement to integrate with iOS Screen Time.

All of these require additional development, platform-specific credentials, and parental consent procedures. They are documented as FUTURE features, not current capabilities.
