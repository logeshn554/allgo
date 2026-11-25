import { UserRole } from '@allgo/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export type AllowedRole = 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN' | UserRole | string;

export function normalizeRole(role: string): string {
  const upper = (role || '').toUpperCase().trim();
  if (upper === 'PARTNER') return 'DRIVER';
  if (upper === 'SUPER_ADMIN') return 'ADMIN';
  if (upper.startsWith('MERCHANT_')) return 'MERCHANT';
  return upper;
}

export function hasRoleMatch(userRoles: string[], allowedRoles: AllowedRole[]): boolean {
  const normalizedAllowed = new Set(allowedRoles.map((r) => normalizeRole(String(r))));

  for (const r of userRoles) {
    const norm = normalizeRole(r);
    if (normalizedAllowed.has(norm) || normalizedAllowed.has(r)) {
      return true;
    }
  }
  return false;
}

export function requireRole(allowedRoles: AllowedRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !user.userId) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'UNAUTHORIZED: User authentication required',
      });
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const activeHeaderRole = req.headers['x-allgo-role'] as string | undefined;

    if (activeHeaderRole) {
      const normHeader = normalizeRole(activeHeaderRole);
      const userHasHeaderRole = userRoles.some(
        (r) => normalizeRole(r) === normHeader || r === activeHeaderRole,
      );

      if (
        !userHasHeaderRole &&
        !userRoles.includes('ADMIN') &&
        !userRoles.includes('SUPER_ADMIN')
      ) {
        return res.status(403).json({
          statusCode: 403,
          error: 'Forbidden',
          message: `FORBIDDEN_ROLE: Active role context '${activeHeaderRole}' not held by user`,
        });
      }
      req.activeRole = normHeader;
    }

    if (userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN')) {
      req.activeRole = req.activeRole || 'ADMIN';
      return next();
    }

    const isAuthorized = hasRoleMatch(userRoles, allowedRoles);
    if (!isAuthorized) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: `FORBIDDEN_ROLE: Requires one of [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}
