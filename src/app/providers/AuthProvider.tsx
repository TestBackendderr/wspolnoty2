import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '@/services/auth';

import { AuthContext, type AuthContextValue, type LoginPayload } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthContextValue['currentUser']>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    void (async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setAuthResolved(true);
    })();
  }, []);

  const login = async (payload: LoginPayload) => {
    const user = await loginRequest({
      email: payload.email.trim(),
      password: payload.password,
    });
    if (user) setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    await logoutRequest();
    setCurrentUser(null);
  };

  const updateCurrentUser: AuthContextValue['updateCurrentUser'] = (updater) => {
    setCurrentUser((prev) => (prev ? updater(prev) : prev));
  };

  const value: AuthContextValue = {
    currentUser,
    authResolved,
    isAuthenticated: currentUser !== null,
    isCaregiver:
      currentUser?.role === 'opiekun' || currentUser?.role === 'caregiver',
    login,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
