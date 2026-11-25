// Job: Manage user registration, progressive profile details (name, address, KYC), and existing vs new account status.

import { getLocalItem, removeLocalItem, setLocalItem } from './localCache.ts';

export type UserRole = 'customer' | 'driver' | 'merchant';

export interface UserAccountRecord {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  address: string;
  isProfileComplete: boolean;
  kycStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED';
  merchantStoreName?: string;
  merchantFssai?: string;
  merchantGstin?: string;
  driverDlNumber?: string;
  driverRcNumber?: string;
  driverVehicle?: string;
  createdAt: string;
  updatedAt: string;
}

const ACCOUNTS_DB_KEY = 'allgo_accounts_registry_v1';
const CURRENT_SESSION_KEY = 'allgo_active_session_v1';

export function loadAllAccounts(): Map<string, UserAccountRecord> {
  const raw = getLocalItem(ACCOUNTS_DB_KEY);
  if (!raw) return new Map();
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return new Map();
    const map = new Map<string, UserAccountRecord>();
    for (const item of list) {
      if (item && item.phone) {
        map.set(item.phone, item);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

export function saveAllAccounts(map: Map<string, UserAccountRecord>): void {
  const list = Array.from(map.values());
  setLocalItem(ACCOUNTS_DB_KEY, JSON.stringify(list));
}

export function checkAccountExists(phone: string): {
  exists: boolean;
  account?: UserAccountRecord;
} {
  const cleanPhone = phone.trim();
  const map = loadAllAccounts();
  const acc = map.get(cleanPhone);
  return { exists: Boolean(acc), account: acc };
}

export function getOrCreateAccount(
  phone: string,
  role: UserRole,
): { account: UserAccountRecord; isNew: boolean } {
  const cleanPhone = phone.trim();
  const map = loadAllAccounts();
  const existing = map.get(cleanPhone);

  if (existing) {
    return { account: existing, isNew: false };
  }

  const newAccount: UserAccountRecord = {
    id: `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    phone: cleanPhone,
    name: '',
    role,
    address: '',
    isProfileComplete: false,
    kycStatus: role === 'customer' ? 'APPROVED' : 'NOT_SUBMITTED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  map.set(cleanPhone, newAccount);
  saveAllAccounts(map);
  return { account: newAccount, isNew: true };
}

export function updateCustomerProfile(
  phone: string,
  name: string,
  address: string,
): { success: boolean; account?: UserAccountRecord } {
  const cleanPhone = phone.trim();
  const map = loadAllAccounts();
  const acc = map.get(cleanPhone);
  if (!acc) return { success: false };

  acc.name = name.trim();
  acc.address = address.trim();
  acc.isProfileComplete = Boolean(acc.name && acc.address);
  acc.updatedAt = new Date().toISOString();

  map.set(cleanPhone, acc);
  saveAllAccounts(map);
  saveActiveSession(acc);
  return { success: true, account: acc };
}

export function updateDriverKyc(
  phone: string,
  name: string,
  dlNumber: string,
  rcNumber: string,
  vehicle: string,
): { success: boolean; account?: UserAccountRecord } {
  const cleanPhone = phone.trim();
  const map = loadAllAccounts();
  const acc = map.get(cleanPhone);
  if (!acc) return { success: false };

  acc.name = name.trim();
  acc.driverDlNumber = dlNumber.trim();
  acc.driverRcNumber = rcNumber.trim();
  acc.driverVehicle = vehicle.trim();
  acc.kycStatus = 'PENDING';
  acc.isProfileComplete = true;
  acc.updatedAt = new Date().toISOString();

  map.set(cleanPhone, acc);
  saveAllAccounts(map);
  saveActiveSession(acc);
  return { success: true, account: acc };
}

export function updateMerchantStore(
  phone: string,
  ownerName: string,
  storeName: string,
  address: string,
  fssai: string,
  gstin: string,
): { success: boolean; account?: UserAccountRecord } {
  const cleanPhone = phone.trim();
  const map = loadAllAccounts();
  const acc = map.get(cleanPhone);
  if (!acc) return { success: false };

  acc.name = ownerName.trim();
  acc.merchantStoreName = storeName.trim();
  acc.address = address.trim();
  acc.merchantFssai = fssai.trim();
  acc.merchantGstin = gstin.trim();
  acc.kycStatus = 'PENDING';
  acc.isProfileComplete = true;
  acc.updatedAt = new Date().toISOString();

  map.set(cleanPhone, acc);
  saveAllAccounts(map);
  saveActiveSession(acc);
  return { success: true, account: acc };
}

export function saveActiveSession(account: UserAccountRecord): void {
  setLocalItem(CURRENT_SESSION_KEY, JSON.stringify(account));
}

export function getActiveSession(): UserAccountRecord | null {
  const raw = getLocalItem(CURRENT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  removeLocalItem(CURRENT_SESSION_KEY);
}
