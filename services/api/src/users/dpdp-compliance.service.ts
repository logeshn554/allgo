import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DpdpConsentDto, DpdpExportResult } from './dto/dpdp.dto.js';

@Injectable()
export class DpdpComplianceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async recordConsent(
    userId: string,
    dto: DpdpConsentDto,
    ip?: string,
    userAgent?: string,
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO dpdp_consents (user_id, consent_purpose, is_granted, ip_address, user_agent, policy_version)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [
        userId,
        dto.purpose,
        dto.granted,
        ip || null,
        userAgent || null,
        dto.policyVersion || 'v1.0',
      ],
    );
    return res.rows[0];
  }

  async getConsents(userId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT DISTINCT ON (consent_purpose) consent_purpose, is_granted, policy_version, recorded_at
       FROM dpdp_consents WHERE user_id = $1 ORDER BY consent_purpose, recorded_at DESC;`,
      [userId],
    );
    return res.rows;
  }

  async exportUserData(userId: string): Promise<DpdpExportResult> {
    const userRes = await this.db.query(
      `SELECT id, phone, email, full_name FROM users WHERE id = $1;`,
      [userId],
    );
    const user = userRes.rows[0];
    const consents = await this.getConsents(userId);
    const addrRes = await this.db.query(
      `SELECT id, label, address_line1, city, postal_code FROM addresses WHERE user_id = $1;`,
      [userId],
    );
    const ordersRes = await this.db.query(
      `SELECT COUNT(*)::int as total,
              COALESCE(SUM(CASE WHEN status IN ('CREATED', 'CONFIRMED', 'IN_TRANSIT') THEN 1 ELSE 0 END), 0)::int as active
       FROM order_groups WHERE customer_id = $1;`,
      [userId],
    );

    return {
      userId: user.id,
      phone: user.phone,
      fullName: user.full_name,
      email: user.email,
      consents,
      savedAddresses: addrRes.rows,
      ordersSummary: {
        totalOrders: ordersRes.rows[0]?.total || 0,
        activeOrders: ordersRes.rows[0]?.active || 0,
      },
      exportedAt: new Date().toISOString(),
    };
  }

  async requestAccountDeletion(userId: string, reason: string): Promise<any> {
    // Check if user has active ongoing orders
    const activeRes = await this.db.query(
      `SELECT id FROM order_groups WHERE customer_id = $1 AND status IN ('CREATED', 'CONFIRMED', 'DISPATCHING') LIMIT 1;`,
      [userId],
    );
    if (activeRes.rows.length > 0) {
      throw new BadRequestException(
        'Cannot request account deletion while you have active, in-flight orders.',
      );
    }

    // India DPDP Act: 30-day grace period before physical purge, with immediate account soft-lock
    const purgeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const res = await this.db.query(
      `INSERT INTO dpdp_deletion_requests (user_id, reason, scheduled_purge_at, status)
       VALUES ($1, $2, $3, 'PENDING') RETURNING *;`,
      [userId, reason, purgeDate],
    );

    await this.db.query(
      `UPDATE users SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1;`,
      [userId],
    );
    await this.redis.set(`user:status:${userId}`, 'SUSPENDED', 'EX', 86400 * 30);

    return {
      success: true,
      requestId: res.rows[0].id,
      scheduledPurgeAt: purgeDate.toISOString(),
      status: 'PENDING_PURGE',
      message: 'Account scheduled for deletion. Access suspended per DPDP Section 12.',
    };
  }
}
