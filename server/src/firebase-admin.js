/**
 * firebase-admin.js
 *
 * Firebase Admin SDK initialisation for the Node.js server.
 *
 * Used to:
 *  1. Send FCM push notifications when a new request is created
 *  2. Send FCM push notifications when a request is decided
 *
 * Setup:
 *  1. Go to Firebase Console → Project Settings → Service Accounts
 *  2. Click "Generate new private key" → download the JSON file
 *  3. Save it as server/firebase-service-account.json  (git-ignored)
 *     OR set FIREBASE_SERVICE_ACCOUNT env var to the JSON string
 *
 * ⚠️  NEVER commit the service account JSON to version control.
 */

'use strict';

let adminApp = null;

function getAdmin() {
  if (adminApp) return adminApp;

  try {
    const admin = require('firebase-admin');

    // Prefer env var (for deployment), fall back to local file
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else {
      const path = require('path');
      const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
      // eslint-disable-next-line
      credential = admin.credential.cert(require(serviceAccountPath));
    }

    adminApp = admin.initializeApp({ credential });
    console.log('[Firebase Admin] Initialised ✓');
  } catch (err) {
    console.warn(
      '[Firebase Admin] Not initialised — FCM push notifications disabled.\n' +
      '  To enable: add firebase-service-account.json or set FIREBASE_SERVICE_ACCOUNT env var.\n' +
      '  Error:', err.message
    );
  }

  return adminApp;
}

/**
 * Send a push notification to a specific FCM token.
 * Silently no-ops if Firebase Admin is not configured.
 *
 * @param {string} fcmToken   The recipient's device token
 * @param {string} title      Notification title
 * @param {string} body       Notification body
 * @param {object} data       Optional key-value data payload
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  const admin = getAdmin();
  if (!admin || !fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { ...data },
      android: {
        priority: 'high',
        notification: { channelId: 'guardianlink-requests', sound: 'default' },
      },
    });
  } catch (err) {
    // Non-fatal — log and continue
    console.warn('[FCM] Failed to send notification:', err.message);
  }
}

/**
 * Get a user's FCM token from Firestore.
 * Returns null if not found.
 */
async function getUserFcmToken(uid) {
  const admin = getAdmin();
  if (!admin) return null;

  try {
    const snap = await admin.firestore().collection('users').doc(uid).get();
    return snap.data()?.fcmToken ?? null;
  } catch {
    return null;
  }
}

module.exports = { sendPushNotification, getUserFcmToken };
