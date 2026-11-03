/**
 * types/index.ts
 *
 * Shared TypeScript types for GuardianLink Lite.
 * Firebase-backed version.
 */

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  token: string;
  user: User;
}

// ─── Request ──────────────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface AccessRequest {
  id: string;
  childId: string;
  parentId: string;
  url: string;
  status: RequestStatus;
  createdAt: string;        // ISO 8601
  decidedAt: string | null; // ISO 8601 or null
}
