/**
 * firebase.ts
 *
 * Central Firebase initialisation for GuardianLink Lite.
 *
 * Firebase project: guardian-link-6de8a
 * Package:          com.angelo.guardian
 *
 * Exports typed references to:
 *   - auth      : Firebase Authentication
 *   - db        : Firestore database
 *   - messaging : Firebase Cloud Messaging
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

export { auth, firestore, messaging };

// ─── Firestore collection references ─────────────────────────────────────────

/**
 * /users/{uid}
 * Schema:
 *   uid      : string
 *   username : string
 *   role     : 'parent' | 'child'
 *   parentId : string | null   (set for child accounts)
 *   fcmToken : string | null
 */
export const usersRef = () => firestore().collection('users');

/**
 * /requests/{requestId}
 * Schema:
 *   id         : string
 *   childId    : string
 *   parentId   : string
 *   url        : string
 *   status     : 'pending' | 'approved' | 'denied'
 *   createdAt  : Firestore Timestamp
 *   decidedAt  : Firestore Timestamp | null
 */
export const requestsRef = () => firestore().collection('requests');

// ─── Firestore Timestamp helper ───────────────────────────────────────────────

export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();
