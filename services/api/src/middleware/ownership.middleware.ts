import { NextFunction, Response } from 'express';
import { DatabaseService } from '../database/database.service.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export type ResourceKind = 'order' | 'merchant' | 'driver';

export function requireOwnership(db: DatabaseService, resourceKind: ResourceKind) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !user.userId) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'UNAUTHORIZED: User authentication required',
      });
    }

    const roles: string[] = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const rawId =
      req.params.id || req.params.orderId || req.params.merchantId || req.params.driverId;
    if (!rawId) {
      return next();
    }
    const resourceId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

    try {
      if (resourceKind === 'order') {
        const isOwner = await verifyOrderOwnership(db, user.userId, resourceId);
        if (!isOwner) {
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'IDOR_PREVENTION: Access denied to order resource',
          });
        }
      } else if (resourceKind === 'merchant') {
        const isOwner = await verifyMerchantOwnership(db, user.userId, resourceId);
        if (!isOwner) {
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'IDOR_PREVENTION: Access denied to merchant resource',
          });
        }
      } else if (resourceKind === 'driver') {
        const isOwner = await verifyDriverOwnership(db, user.userId, resourceId);
        if (!isOwner) {
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'IDOR_PREVENTION: Access denied to driver resource',
          });
        }
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        statusCode: 500,
        error: 'InternalServerError',
        message: `IDOR_CHECK_FAILED: ${err.message || 'Database lookup failure'}`,
      });
    }
  };
}

async function verifyOrderOwnership(
  db: DatabaseService,
  userId: string,
  orderId: string,
): Promise<boolean> {
  const query = `
    SELECT 1 FROM (
      SELECT customer_id as cid, NULL as mid, NULL as did FROM order_groups WHERE id = $1
      UNION ALL
      SELECT og.customer_id as cid, m.owner_id as mid, p.user_id as did
      FROM sub_orders so
      JOIN order_groups og ON og.id = so.order_group_id
      JOIN outlets o ON o.id = so.outlet_id
      JOIN merchants m ON m.id = o.merchant_id
      LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
      LEFT JOIN partners p ON p.id = dj.assigned_partner_id
      WHERE so.id = $1 OR so.sub_order_number = $1
      UNION ALL
      SELECT r.customer_id as cid, NULL as mid, p.user_id as did
      FROM rides r
      LEFT JOIN partners p ON p.id = r.partner_id
      WHERE r.id = $1
      UNION ALL
      SELECT pr.sender_id as cid, NULL as mid, p.user_id as did
      FROM parcels pr
      LEFT JOIN partners p ON p.id = pr.assigned_partner_id
      WHERE pr.id = $1
    ) sub
    WHERE cid = $2 OR mid = $2 OR did = $2
    LIMIT 1;
  `;
  const res = await db.query(query, [orderId, userId]);
  return res.rows.length > 0;
}

async function verifyMerchantOwnership(
  db: DatabaseService,
  userId: string,
  merchantId: string,
): Promise<boolean> {
  const res = await db.query(
    `SELECT 1 FROM merchants m
     LEFT JOIN outlets o ON o.merchant_id = m.id
     WHERE (m.id = $1 OR o.id = $1) AND m.owner_id = $2
     LIMIT 1;`,
    [merchantId, userId],
  );
  return res.rows.length > 0;
}

async function verifyDriverOwnership(
  db: DatabaseService,
  userId: string,
  driverId: string,
): Promise<boolean> {
  const res = await db.query(
    `SELECT 1 FROM partners p
     WHERE (p.id = $1 OR p.user_id = $1) AND p.user_id = $2
     LIMIT 1;`,
    [driverId, userId],
  );
  return res.rows.length > 0;
}
