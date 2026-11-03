/**
 * firebaseRequests.ts
 *
 * All request CRUD operations using Firestore.
 * Replaces the REST API calls and Socket.IO listeners.
 *
 * Real-time updates come from Firestore onSnapshot — no Socket.IO needed.
 */

import firestore from '@react-native-firebase/firestore';
import { requestsRef, serverTimestamp } from './firebase';
import type { AccessRequest, RequestStatus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToRequest(doc: FirebaseFirestoreTypes.DocumentSnapshot): AccessRequest {
  const d = doc.data()!;
  return {
    id: doc.id,
    childId: d.childId,
    parentId: d.parentId,
    url: d.url,
    status: d.status as RequestStatus,
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    decidedAt: d.decidedAt?.toDate?.()?.toISOString() ?? null,
  };
}

// Needed for the TypeScript type reference above
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ─── URL validation (client-side, mirrors server) ─────────────────────────────

export function validateUrl(raw: string): { valid: boolean; reason?: string } {
  if (!raw || raw.trim() === '') return { valid: false, reason: 'URL must not be empty.' };
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { valid: false, reason: 'Only http:// and https:// URLs are accepted.' };
    }
    if (u.username || u.password) {
      return { valid: false, reason: 'URLs with embedded credentials are not allowed.' };
    }
    if (!u.hostname) return { valid: false, reason: 'URL must include a hostname.' };
    return { valid: true };
  } catch {
    return { valid: false, reason: 'URL is not well-formed.' };
  }
}

// ─── Create a request (child) ─────────────────────────────────────────────────

export async function createRequest(
  childId: string,
  parentId: string,
  url: string
): Promise<AccessRequest> {
  const validation = validateUrl(url);
  if (!validation.valid) throw new Error(validation.reason);

  const normalized = new URL(url.trim()).toString();

  const docRef = await requestsRef().add({
    childId,
    parentId,
    url: normalized,
    status: 'pending',
    createdAt: serverTimestamp(),
    decidedAt: null,
  });

  const snap = await docRef.get();
  return docToRequest(snap);
}

// ─── Decide a request (parent) ────────────────────────────────────────────────

export async function decideRequest(
  requestId: string,
  parentId: string,
  decision: 'approved' | 'denied'
): Promise<void> {
  const ref = requestsRef().doc(requestId);
  const snap = await ref.get();

  if (!snap.exists) throw new Error('Request not found.');

  const data = snap.data()!;

  // Authorization: only the linked parent can decide
  if (data.parentId !== parentId) {
    throw new Error('You are not authorized to decide this request.');
  }

  // Idempotency: only pending requests can be decided
  if (data.status !== 'pending') {
    throw new Error(`This request has already been ${data.status}.`);
  }

  await ref.update({
    status: decision,
    decidedAt: serverTimestamp(),
  });
}

// ─── Live listener — child sees their own requests ────────────────────────────

export function subscribeChildRequests(
  childId: string,
  onUpdate: (requests: AccessRequest[]) => void,
  onError?: (err: Error) => void
): () => void {
  return requestsRef()
    .where('childId', '==', childId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => onUpdate(snap.docs.map(docToRequest)),
      (err) => onError?.(err)
    );
}

// ─── Live listener — parent sees all their linked requests ────────────────────

export function subscribeParentRequests(
  parentId: string,
  onUpdate: (requests: AccessRequest[]) => void,
  onError?: (err: Error) => void
): () => void {
  return requestsRef()
    .where('parentId', '==', parentId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => onUpdate(snap.docs.map(docToRequest)),
      (err) => onError?.(err)
    );
}
