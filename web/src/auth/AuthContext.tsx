import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser, Role } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  login: (token: string, role: string, username: string, id: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('gl_token');
    const saved = localStorage.getItem('gl_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser({ ...parsed, token });
      } catch {}
    }
  }, []);

  function login(token: string, role: string, username: string, id: string) {
    const newUser: AuthUser = { token, role: role as Role, username, id };
    localStorage.setItem('gl_token', token);
    localStorage.setItem('gl_user', JSON.stringify({ id, username, role }));
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('gl_token');
    localStorage.removeItem('gl_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
