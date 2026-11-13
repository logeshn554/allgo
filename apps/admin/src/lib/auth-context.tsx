'use client';

/**
 * Backward-compatibility facade for Admin AuthContext.
 * Canonical implementation has been migrated to `apps/admin/src/data/auth/auth-context.tsx`.
 *
 * Session token storage: allgo_admin_token
 * Admin role verification: user?.roles?.includes('ADMIN')
 * Session operations: login, logout
 */

export { AuthProvider, useAuth } from '../data/auth/auth-context';
export type { AuthContextType } from '../data/auth/auth-context';
