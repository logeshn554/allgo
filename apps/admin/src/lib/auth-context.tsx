'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, UserSummary } from './api-client.js';

interface AuthContextType {
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
      const token = localStorage.getItem('allgo_admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await adminApi.getMe();
        setUser(profile);
      } catch {
        localStorage.removeItem('allgo_admin_token');
        localStorage.removeItem('allgo_admin_user');
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  const login = async (phone: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await adminApi.verifyOtp(phone, code);
      setUser(res.user);
      router.push('/admin/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('allgo_admin_token');
    localStorage.removeItem('allgo_admin_user');
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
