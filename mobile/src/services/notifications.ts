/**
 * notifications.ts
 *
 * Firebase Cloud Messaging (FCM) setup.
 *
 * - Requests notification permission on Android 13+
 * - Gets the FCM token and saves it to Firestore
 * - Handles foreground messages (shows an in-app alert)
 * - Background/quit messages are handled by Firebase automatically
 */

import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import { saveFcmToken } from './firebaseAuth';

// ─── Request permission & register token ─────────────────────────────────────

export async function registerForPushNotifications(uid: string): Promise<void> {
  try {
    // Android 13+ requires explicit permission
    if (Platform.OS === 'android') {
      const status = await messaging().requestPermission();
      const enabled =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;
    }

    const token = await messaging().getToken();
    if (token) {
      await saveFcmToken(uid, token);
    }

    // Refresh token if it changes
    messaging().onTokenRefresh(async (newToken) => {
      await saveFcmToken(uid, newToken);
    });
  } catch (err) {
    // Non-fatal — app works without push notifications
    console.warn('[FCM] Failed to register for push notifications:', err);
  }
}

// ─── Foreground message handler ───────────────────────────────────────────────

/**
 * Call this once after login to show in-app alerts when a message arrives
 * while the app is open.
 * Returns an unsubscribe function — call it on logout.
 */
export function setupForegroundNotifications(): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? 'GuardianLink Lite';
    const body = remoteMessage.notification?.body ?? '';
    if (body) {
      Alert.alert(title, body);
    }
  });
}
