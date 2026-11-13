import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'customer' | 'driver' | 'merchant' | 'admin';
  };
}

export function enforceOrderOwnership() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id || req.params.orderId;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized request.' });
        return;
      }

      if (userRole === 'admin') {
        return next();
      }

      const order = await db('orders')
        .where({ id: orderId })
        .andWhere((builder) => {
          builder.where('user_id', userId).orWhere('driver_id', userId);
        })
        .first();

      if (!order) {
        res.status(403).json({ error: 'Access denied: Target order does not belong to your session.' });
        return;
      }

      next();
    } catch (_error) {
      res.status(500).json({ error: 'Authorization check failed.' });
    }
  };
}
