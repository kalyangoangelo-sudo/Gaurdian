/**
 * firebaseAuth.ts
 *
 * Authentication helpers using Firebase Auth + Firestore user profiles.
 *
 * Flow:
 *   login()   → signInWithEmailAndPassword → fetch /users/{uid} for role
 *   logout()  → auth().signOut()
 *   getUser() → current Firebase user + Firestore profile
 */

import { auth, usersRef } from './firebase';
import type { User } from '../types';

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Signs in with email/password and fetches the Firestore profile.
 * Throws a human-readable error on failure.
 */
export async function firebaseLogin(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  try {
    const credential = await auth().signInWithEmailAndPassword(email, password);
    const uid = credential.user.uid;

    // Fetch role and username from Firestore
    const snap = await usersRef().doc(uid).get();
    if (!snap.exists) {
      throw new Error('User profile not found. Contact your administrator.');
    }

    const data = snap.data()!;
    const user: User = {
      id: uid,
      username: data.username,
      role: data.role,
    };

    // Get the ID token to use as our "JWT" for the Node.js server (optional)
    const token = await credential.user.getIdToken();

    return { user, token };
  } catch (err: any) {
    // Map Firebase error codes to friendly messages
    const code: string = err?.code ?? '';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
      throw new Error('Invalid email or password.');
    }
    if (code.includes('too-many-requests')) {
      throw new Error('Too many failed attempts. Please wait a moment.');
    }
    if (code.includes('network-request-failed')) {
      throw new Error('No internet connection.');
    }
    throw new Error(err?.message ?? 'Login failed.');
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function firebaseLogout(): Promise<void> {
  await auth().signOut();
}

// ─── Get current user profile ─────────────────────────────────────────────────

export async function getCurrentUserProfile(): Promise<User | null> {
  const firebaseUser = auth().currentUser;
  if (!firebaseUser) return null;

  const snap = await usersRef().doc(firebaseUser.uid).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  return {
    id: firebaseUser.uid,
    username: data.username,
    role: data.role,
  };
}

// ─── Save FCM token ───────────────────────────────────────────────────────────

export async function saveFcmToken(uid: string, token: string): Promise<void> {
  await usersRef().doc(uid).update({ fcmToken: token });
}
