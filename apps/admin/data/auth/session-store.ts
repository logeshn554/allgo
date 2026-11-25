import type { AuthResponse, StoredAdminSession, UserSummary } from '../types';

const LEGACY_STORAGE_KEYS = [
  'allgo_admin_token',
  'allgo_admin_user',
  'allgo_admin_sessions',
];

let inMemorySessions: StoredAdminSession[] = [];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function clearLegacyAuthStorage(): void {
  if (!isBrowser()) return;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getStoredSessions(): StoredAdminSession[] {
  return inMemorySessions;
}

function saveSessions(sessions: StoredAdminSession[]): StoredAdminSession[] {
  inMemorySessions = sessions.map((s) => ({
    userId: s.userId,
    user: s.user,
    addedAt: s.addedAt,
    lastActiveAt: s.lastActiveAt,
  }));
  return inMemorySessions;
}

export function upsertStoredSession(auth: AuthResponse): StoredAdminSession[] {
  const now = new Date().toISOString();
  const prev = inMemorySessions.find((s) => s.userId === auth.user.id);
  const nextEntry: StoredAdminSession = {
    userId: auth.user.id,
    user: auth.user,
    addedAt: prev?.addedAt || now,
    lastActiveAt: now,
  };
  const filtered = inMemorySessions.filter((s) => s.userId !== auth.user.id);
  return saveSessions([nextEntry, ...filtered]);
}

export function updateStoredSessionUser(user: UserSummary): StoredAdminSession[] {
  const idx = inMemorySessions.findIndex((s) => s.userId === user.id);
  const now = new Date().toISOString();
  if (idx === -1) {
    return saveSessions([
      {
        userId: user.id,
        user,
        addedAt: now,
        lastActiveAt: now,
      },
      ...inMemorySessions,
    ]);
  }
  const updated = inMemorySessions.map((s) =>
    s.userId === user.id
      ? {
          ...s,
          user,
          lastActiveAt: now,
        }
      : s,
  );
  return saveSessions(updated);
}

export function removeStoredSession(userId: string): StoredAdminSession[] {
  return saveSessions(inMemorySessions.filter((s) => s.userId !== userId));
}

export function clearStoredSessions(): void {
  inMemorySessions = [];
  clearLegacyAuthStorage();
}
