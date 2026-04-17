import { createContext, useContext } from 'react';

import type { User } from '@/types/domain';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthContextValue {
  currentUser: User | null;
  authResolved: boolean;
  isAuthenticated: boolean;
  isCaregiver: boolean;
  login: (payload: LoginPayload) => Promise<User | null>;
  logout: () => Promise<void>;
  updateCurrentUser: (updater: (prev: User) => User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
