// Job: Save and load user session, JWT token, and active address with disk persistence.

import { getLocalItem, setLocalItem, removeLocalItem } from './localCache.ts';

export interface UserProfile {
  id?: string;
  phone: string;
  name: string;
  role: 'customer' | 'driver';
  address: string;
  token?: string;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_guest',
  phone: '+91 98765 43210',
  name: 'AllGo User',
  role: 'customer',
  address: 'MG Road, Bengaluru',
};

export function loadUserProfile(): UserProfile | null {
  const raw = getLocalItem('user_profile');
  if (!raw) return DEFAULT_USER;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return DEFAULT_USER;
  }
}

export function saveUserLogin(phone: string, name: string, role: 'customer' | 'driver', token?: string): UserProfile {
  const profile: UserProfile = {
    id: `usr_${Date.now()}`,
    phone,
    name: name || 'User',
    role,
    address: 'MG Road, Bengaluru',
    token: token || `jwt_${Date.now()}`,
  };
  setLocalItem('user_profile', JSON.stringify(profile));
  if (profile.token) setLocalItem('auth_token', profile.token);
  return profile;
}

export function saveUserAddress(newAddress: string): UserProfile | null {
  const current = loadUserProfile();
  if (!current) return null;
  current.address = newAddress;
  setLocalItem('user_profile', JSON.stringify(current));
  return current;
}

export function clearUserSession(): void {
  removeLocalItem('user_profile');
  removeLocalItem('auth_token');
}
