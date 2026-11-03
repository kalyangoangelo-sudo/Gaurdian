/**
 * AuthContext.tsx
 *
 * Authentication state using Firebase Auth + Firestore profiles.
 * Replaces the previous JWT/REST login.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'expo-router';

import { auth } from '../services/firebase';
import { firebaseLogin, firebaseLogout, getCurrentUserProfile } from '../services/firebaseAuth';
import { registerForPushNotifications, setupForegroundNotifications } from '../services/notifications';
import type { User } from '../types';

// ─── Local demo accounts (no Firebase Console setup needed) ───────────────────
const DEMO_ACCOUNTS: Record<string, { password: string; user: User; token: string }> = {
  'kalyangoangelo@gmail.com': {
    password: 'Parent123!',
    token: 'demo-parent-token',
    user: { id: 'demo-parent-001', username: 'Angelo', email: 'kalyangoangelo@gmail.com', role: 'parent', fcmToken: null },
  },
  'kalyango.200@gmail.com': {
    password: 'Child123!',
    token: 'demo-child-token',
    user: { id: 'demo-child-001', username: 'Child', email: 'kalyango.200@gmail.com', role: 'child', fcmToken: null },
  },
};

// ─── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Re-hydrate session on app resume (Firebase persists auth state)
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getCurrentUserProfile();
          const idToken = await firebaseUser.getIdToken();
          setUser(profile);
          setToken(idToken);
        } catch {
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setInitialising(false);
    });
    return unsubscribe;
  }, []);

  // Set up foreground FCM listener when user logs in
  useEffect(() => {
    if (!user) return;
    const unsub = setupForegroundNotifications();
    return unsub;
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Try local demo accounts first (works without Firebase Console setup)
      const demo = DEMO_ACCOUNTS[trimmedEmail];
      if (demo) {
        if (demo.password !== password) {
          throw new Error('Incorrect password.');
        }
        setUser(demo.user);
        setToken(demo.token);
        if (demo.user.role === 'parent') {
          router.replace('/parent');
        } else {
          router.replace('/child');
        }
        return;
      }

      // Fall back to Firebase Auth for any other accounts
      const result = await firebaseLogin(trimmedEmail, password);
      setUser(result.user);
      setToken(result.token);
      registerForPushNotifications(result.user.id).catch(() => {});
      if (result.user.role === 'parent') {
        router.replace('/parent');
      } else {
        router.replace('/child');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    await firebaseLogout();
    setUser(null);
    setToken(null);
    setLoginError(null);
    router.replace('/login');
  }, [router]);

  // Don't render children until Firebase restores session
  if (initialising) return null;

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
