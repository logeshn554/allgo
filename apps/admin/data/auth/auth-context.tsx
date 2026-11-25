'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import {
  clearLegacyAuthStorage,
  clearStoredSessions,
  getStoredSessions,
  removeStoredSession,
  updateStoredSessionUser,
} from './session-store';
import { isTwoFactorChallenge, StoredAdminSession, UserSummary } from '../types';

export type LoginActionResult =
  | { requiresTwoFactor: true; twoFactorToken: string; identifier?: string }
  | void;

export interface AuthContextType {
  user: UserSummary | null;
  sessions: StoredAdminSession[];
  isLoading: boolean;
  login: (phone: string, code: string, redirectTo?: string) => Promise<LoginActionResult>;
  loginWithPassword: (
    identifier: string,
    password: string,
    redirectTo?: string,
  ) => Promise<LoginActionResult>;
  loginWithEmail: (
    email: string,
    password: string,
    redirectTo?: string,
  ) => Promise<LoginActionResult>;
  registerWithEmail: (
    email: string,
    password: string,
    fullName?: string,
    redirectTo?: string,
  ) => Promise<void>;
  loginWithEmailOtp: (
    email: string,
    code: string,
    redirectTo?: string,
  ) => Promise<LoginActionResult>;
  completeOAuthLogin: (
    oauthCode: string,
    redirectTo?: string,
  ) => Promise<LoginActionResult>;
  verifyTwoFactorLogin: (
    twoFactorToken: string,
    code: string,
    isBackupCode?: boolean,
    redirectTo?: string,
  ) => Promise<void>;
  switchSession: (userId: string) => Promise<void>;
  removeSession: (userId: string) => void;
  refreshUser: () => Promise<void>;
  clearClientSession: (redirectToLogin?: boolean) => void;
  logout: () => void;
  logoutAll: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  sessions: [],
  isLoading: true,
  login: async () => {},
  loginWithPassword: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithEmailOtp: async () => {},
  completeOAuthLogin: async () => {},
  verifyTwoFactorLogin: async () => {},
  switchSession: async () => {},
  removeSession: () => {},
  refreshUser: async () => {},
  clearClientSession: () => {},
  logout: () => {},
  logoutAll: () => {},
  isAuthenticated: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [sessions, setSessions] = useState<StoredAdminSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const syncSessions = useCallback(() => {
    setSessions(getStoredSessions());
  }, []);

  useEffect(() => {
    async function initSession() {
      clearLegacyAuthStorage();

      const stored = getStoredSessions();
      setSessions(stored);

      // The session cookie is HttpOnly (set by the API server), so JS cannot
      // read it via document.cookie. Instead, we always probe /me — the cookie
      // is sent automatically by the browser with credentials: 'include'.
      try {
        const profile = await authApi.getMe();
        setUser(profile);
        setSessions(updateStoredSessionUser(profile));
      } catch {
        // No valid session — ensure stale client-side state is cleared
        clearLegacyAuthStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, [syncSessions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUnauthorized = () => {
      if (window.location.pathname === '/login') return;
      clearStoredSessions();
      setSessions([]);
      setUser(null);
      router.replace('/login?session_expired=1');
    };
    window.addEventListener('allgo:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('allgo:unauthorized', handleUnauthorized);
    };
  }, [router]);

  const login = async (
    phone: string,
    code: string,
    redirectTo = '/admin/dashboard',
  ): Promise<LoginActionResult> => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, code);
      if (isTwoFactorChallenge(res)) {
        return {
          requiresTwoFactor: true,
          twoFactorToken: res.twoFactorToken,
          identifier: res.user?.email || res.user?.phone || undefined,
        };
      }
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (
    identifier: string,
    password: string,
    redirectTo = '/admin/dashboard',
  ): Promise<LoginActionResult> => {
    setIsLoading(true);
    try {
      const res = await authApi.loginWithPassword(identifier, password);
      if (isTwoFactorChallenge(res)) {
        return {
          requiresTwoFactor: true,
          twoFactorToken: res.twoFactorToken,
          identifier: res.user?.email || res.user?.phone || undefined,
        };
      }
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (
    email: string,
    password: string,
    redirectTo = '/admin/dashboard',
  ): Promise<LoginActionResult> => {
    return loginWithPassword(email, password, redirectTo);
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    fullName?: string,
    redirectTo = '/admin/dashboard',
  ) => {
    setIsLoading(true);
    try {
      const res = await authApi.registerWithEmail(email, password, fullName);
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailOtp = async (
    email: string,
    code: string,
    redirectTo = '/admin/dashboard',
  ): Promise<LoginActionResult> => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyEmailOtp(email, code);
      if (isTwoFactorChallenge(res)) {
        return {
          requiresTwoFactor: true,
          twoFactorToken: res.twoFactorToken,
          identifier: res.user?.email || res.user?.phone || undefined,
        };
      }
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOAuthLogin = async (
    oauthCode: string,
    redirectTo = '/admin/dashboard',
  ): Promise<LoginActionResult> => {
    setIsLoading(true);
    try {
      const res = await authApi.exchangeOAuthCode(oauthCode);
      if (isTwoFactorChallenge(res)) {
        return {
          requiresTwoFactor: true,
          twoFactorToken: res.twoFactorToken,
          identifier: res.user?.email || res.user?.phone || undefined,
        };
      }
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactorLogin = async (
    twoFactorToken: string,
    code: string,
    isBackupCode = false,
    redirectTo = '/admin/dashboard',
  ) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyTwoFactorLogin(twoFactorToken, code, isBackupCode);
      setUser(res.user);
      syncSessions();
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const switchSession = async (userId: string) => {
    const target = getStoredSessions().find((s) => s.userId === userId);
    if (!target) return;

    setIsLoading(true);
    try {
      // The API uses HttpOnly session cookies — the user identity is switched
      // by calling /v1/auth/sessions/switch (or just /me after a re-login).
      // For now, reload the page so the server cookie re-validates.
      const profile = await authApi.getMe();
      if (profile.id === userId) {
        setUser(profile);
        setSessions(updateStoredSessionUser(profile));
        router.refresh();
      } else {
        // User is no longer active; remove stale session
        const remaining = removeStoredSession(userId);
        setSessions(remaining);
        if (remaining.length > 0 && remaining[0]) {
          setUser(remaining[0].user);
          router.refresh();
        } else {
          clearLegacyAuthStorage();
          setUser(null);
          router.push('/login?session_expired=1');
        }
      }
    } catch {
      const remaining = removeStoredSession(userId);
      setSessions(remaining);
      if (remaining.length > 0 && remaining[0]) {
        setUser(remaining[0].user);
        router.refresh();
      } else {
        clearLegacyAuthStorage();
        setUser(null);
        router.push('/login?session_expired=1');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeSession = (userId: string) => {
    const remaining = removeStoredSession(userId);
    setSessions(remaining);
    if (user?.id === userId) {
      if (remaining.length > 0 && remaining[0]) {
        void switchSession(remaining[0].userId);
      } else {
        clearLegacyAuthStorage();
        setUser(null);
        router.push('/login?session_expired=1');
      }
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
      setSessions(updateStoredSessionUser(profile));
    } catch {
      // Ignore transient refresh failure
    }
  };

  const clearClientSession = useCallback(
    (redirectToLogin = true) => {
      clearStoredSessions();
      setSessions([]);
      setUser(null);
      if (redirectToLogin) {
        router.replace('/login?session_expired=1');
      }
    },
    [router],
  );

  const logout = () => {
    const currentId = user?.id;
    authApi.logout().catch(() => {});
    if (currentId) {
      removeStoredSession(currentId);
    }
    clearStoredSessions();
    setSessions([]);
    setUser(null);
    router.replace('/login?session_expired=1');
  };

  const logoutAll = () => {
    authApi.logout().catch(() => {});
    clearStoredSessions();
    setSessions([]);
    setUser(null);
    router.replace('/login?session_expired=1');
  };

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        sessions,
        isLoading,
        login,
        loginWithPassword,
        loginWithEmail,
        registerWithEmail,
        loginWithEmailOtp,
        completeOAuthLogin,
        verifyTwoFactorLogin,
        switchSession,
        removeSession,
        refreshUser,
        clearClientSession,
        logout,
        logoutAll,
        isAuthenticated: !!user,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
