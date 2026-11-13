'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { UserSummary } from '../types';

export interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initSession() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('allgo_admin_token') : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authApi.getMe();
        setUser(profile);
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('allgo_admin_token');
          localStorage.removeItem('allgo_admin_user');
        }
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  const login = async (phone: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, code);
      setUser(res.user);
      router.push('/admin/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('allgo_admin_token');
      localStorage.removeItem('allgo_admin_user');
      if (typeof document !== 'undefined') {
        document.cookie = 'allgo_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
    }
    setUser(null);
    router.push('/login');
  };

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
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
