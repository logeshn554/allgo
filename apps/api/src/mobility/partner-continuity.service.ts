import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  PartnerOperationalMode,
  VerticalLock,
} from './dto/mobility.dto.js';

@Injectable()
export class PartnerContinuityService {
  private readonly logger = new Logger(PartnerContinuityService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService
  ) {}

  /**
   * Helper: Get partner entity by user ID
   */
  async getPartnerByUserId(userId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT p.*, u.full_name, u.phone
       FROM partners p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC LIMIT 1;`,
      [userId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Partner profile not found for user');
    }
    return res.rows[0];
  }

  /**
   * Get partner operational mode & active vertical lock
   */
  async getPartnerMode(partnerId: string): Promise<{
    partnerId: string;
    preferredMode: PartnerOperationalMode;
    activeVerticalLock: VerticalLock | null;
    isOnline: boolean;
  }> {
    const res = await this.db.query(
      `SELECT * FROM partner_modes WHERE partner_id = $1;`,
      [partnerId]
    );

    if (res.rows.length === 0) {
      // Default to DELIVERIES_ONLY if not initialized
      await this.db.query(
        `INSERT INTO partner_modes (partner_id, current_mode, is_online, active_vertical_lock)
         VALUES ($1, 'DELIVERIES_ONLY', false, null)
         ON CONFLICT (partner_id) DO NOTHING;`,
        [partnerId]
      );
      return {
        partnerId,
        preferredMode: 'DELIVERIES_ONLY',
        activeVerticalLock: null,
        isOnline: false,
      };
    }

    const row = res.rows[0];
    return {
      partnerId: row.partner_id,
      preferredMode: row.current_mode as PartnerOperationalMode,
      activeVerticalLock: row.active_vertical_lock as VerticalLock | null,
      isOnline: row.is_online,
    };
  }

  /**
   * Switch operational mode (DELIVERIES_ONLY, RIDES_ONLY, ALL_JOBS)
   */
  async updatePartnerMode(
    partnerUserId: string,
    mode: PartnerOperationalMode
  ): Promise<any> {
    const partner = await this.getPartnerByUserId(partnerUserId);

    // If switching to RIDES_ONLY or ALL_JOBS, verify passenger transport vehicle
    if (mode === 'RIDES_ONLY' || mode === 'ALL_JOBS') {
      const vehRes = await this.db.query(
        `SELECT * FROM vehicles WHERE partner_id = $1;`,
        [partner.id]
      );
      if (vehRes.rows.length === 0) {
        throw new ForbiddenException(
          'A registered and verified vehicle is required to activate passenger rides mode'
        );
      }
    }

    await this.db.query(
      `INSERT INTO partner_modes (partner_id, current_mode, is_online, last_mode_switch_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW())
       ON CONFLICT (partner_id) DO UPDATE SET
         current_mode = $2,
         last_mode_switch_at = NOW(),
         updated_at = NOW();`,
      [partner.id, mode]
    );

    this.logger.log(`Partner ${partner.id} switched mode to ${mode}`);

    return {
      partnerId: partner.id,
      preferredMode: mode,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * STRICT MUTUAL EXCLUSION SAFETY GUARD
   * - A courier carrying food or parcel orders is strictly barred from receiving ride offers.
   * - A driver engaged in a passenger trip is strictly barred from receiving delivery offers.
   */
  async assertMutualExclusion(
    partnerId: string,
    incomingVertical: VerticalLock
  ): Promise<void> {
    const mode = await this.getPartnerMode(partnerId);
    const activeLock = mode.activeVerticalLock;

    if (!activeLock) {
      // No active lock, check preferred mode compatibility
      if (
        mode.preferredMode === 'DELIVERIES_ONLY' &&
        (incomingVertical === 'RIDE' || incomingVertical === 'HIRE_DRIVER')
      ) {
        throw new ForbiddenException(
          `Partner is currently in DELIVERIES_ONLY mode. Incompatible with ${incomingVertical}.`
        );
      }
      if (
        mode.preferredMode === 'RIDES_ONLY' &&
        (incomingVertical === 'FOOD' ||
          incomingVertical === 'GROCERY' ||
          incomingVertical === 'PARCEL')
      ) {
        throw new ForbiddenException(
          `Partner is currently in RIDES_ONLY mode. Incompatible with ${incomingVertical}.`
        );
      }
      return;
    }

    // Mutual exclusion violation checks:
    const isDeliveryLock =
      activeLock === 'FOOD' || activeLock === 'GROCERY' || activeLock === 'PARCEL';
    const isRideLock = activeLock === 'RIDE';
    const isHireDriverLock = activeLock === 'HIRE_DRIVER';

    if (isDeliveryLock && (incomingVertical === 'RIDE' || incomingVertical === 'HIRE_DRIVER')) {
      throw new ForbiddenException(
        `Safety Invariant Violation: Partner currently has active delivery lock (${activeLock}). Passenger transport strictly barred.`
      );
    }

    if (isRideLock && incomingVertical !== 'RIDE') {
      throw new ForbiddenException(
        `Safety Invariant Violation: Partner currently carrying human passenger. Goods/parcel delivery strictly barred.`
      );
    }

    if (isHireDriverLock && incomingVertical !== 'HIRE_DRIVER') {
      throw new ForbiddenException(
        `Safety Invariant Violation: Partner currently on designated chauffeur duty.`
      );
    }
  }

  /**
   * Acquire atomic vertical lock for active trip or delivery
   */
  async acquireVerticalLock(
    partnerId: string,
    vertical: VerticalLock
  ): Promise<void> {
    await this.assertMutualExclusion(partnerId, vertical);

    await this.db.query(
      `INSERT INTO partner_modes (partner_id, current_mode, active_vertical_lock, updated_at)
       VALUES ($1, 'ALL_JOBS', $2, NOW())
       ON CONFLICT (partner_id) DO UPDATE SET
         active_vertical_lock = $2,
         updated_at = NOW();`,
      [partnerId, vertical]
    );

    // Also mirror to Redis for <1ms dispatch pre-filtering
    try {
      await this.redis.set(`partner:${partnerId}:vertical_lock`, vertical);
    } catch {}
  }

  /**
   * Release vertical lock upon trip or delivery completion
   */
  async releaseVerticalLock(partnerId: string): Promise<void> {
    await this.db.query(
      `UPDATE partner_modes SET active_vertical_lock = NULL, updated_at = NOW() WHERE partner_id = $1;`,
      [partnerId]
    );

    try {
      await this.redis.del(`partner:${partnerId}:vertical_lock`);
    } catch {}
  }
}
