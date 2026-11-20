import { Injectable, BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { ReferralProfile, ReferralValidationResult } from './dto/referral.dto.js';

@Injectable()
export class ReferralService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService
  ) {}

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const existing = await this.db.query(
      `SELECT code FROM referral_codes WHERE user_id = $1 LIMIT 1;`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].code;
    }
    const code = `ALLGO${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await this.db.query(
      `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING;`,
      [userId, code]
    );
    return code;
  }

  async getReferralProfile(userId: string): Promise<ReferralProfile> {
    const code = await this.getOrCreateReferralCode(userId);
    const res = await this.db.query(
      `SELECT 
         COUNT(*)::int as total,
         COALESCE(SUM(CASE WHEN status = 'REWARDED' THEN 1 ELSE 0 END), 0)::int as rewarded,
         COALESCE(SUM(CASE WHEN status = 'REWARDED' THEN referrer_reward_inr ELSE 0 END), 0)::numeric as earned
       FROM referral_redemptions WHERE referrer_user_id = $1;`,
      [userId]
    );
    const row = res.rows[0] || { total: 0, rewarded: 0, earned: 0 };
    return {
      referralCode: code,
      totalReferrals: Number(row.total),
      successfulRedemptions: Number(row.rewarded),
      totalEarnedInr: Number(row.earned),
    };
  }

  async validateAndApplyReferral(
    refereeUserId: string,
    rawCode: string,
    deviceId?: string
  ): Promise<ReferralValidationResult> {
    const code = (rawCode || '').trim().toUpperCase();
    const codeRow = await this.db.query(
      `SELECT rc.*, u.phone as referrer_phone FROM referral_codes rc JOIN users u ON u.id = rc.user_id WHERE rc.code = $1;`,
      [code]
    );

    if (codeRow.rows.length === 0) {
      return { valid: false, discountInr: 0, message: 'Invalid referral code.' };
    }
    const referral = codeRow.rows[0];

    // Abuse check 1: Self-referral
    if (referral.user_id === refereeUserId) {
      return { valid: false, discountInr: 0, message: 'Self-referral is strictly barred.' };
    }

    // Abuse check 2: Device abuse check
    if (deviceId) {
      const devRes = await this.db.query(
        `SELECT id FROM referral_redemptions WHERE referee_device_id = $1 AND status != 'REJECTED_ABUSE' LIMIT 1;`,
        [deviceId]
      );
      if (devRes.rows.length > 0) {
        return { valid: false, discountInr: 0, message: 'Device has already claimed a welcome referral discount.' };
      }
    }

    // Abuse check 3: User already referred
    const userRes = await this.db.query(
      `SELECT id FROM referral_redemptions WHERE referee_user_id = $1;`,
      [refereeUserId]
    );
    if (userRes.rows.length > 0) {
      return { valid: false, discountInr: 0, message: 'You have already used a referral code.' };
    }

    // Record pending redemption
    await this.db.query(
      `INSERT INTO referral_redemptions (referral_code_id, referrer_user_id, referee_user_id, referee_device_id, status, referrer_reward_inr, referee_discount_inr)
       VALUES ($1, $2, $3, $4, 'PENDING', 50.00, 50.00);`,
      [referral.id, referral.user_id, refereeUserId, deviceId || null]
    );

    return {
      valid: true,
      code,
      referrerUserId: referral.user_id,
      discountInr: 50.0,
      message: 'Referral code applied! You get ₹50 off on your first order.',
    };
  }

  async rewardReferrerOnFirstOrder(refereeUserId: string): Promise<void> {
    const res = await this.db.query(
      `UPDATE referral_redemptions
       SET status = 'REWARDED', reward_granted_at = NOW()
       WHERE referee_user_id = $1 AND status = 'PENDING'
       RETURNING *;`,
      [refereeUserId]
    );
    if (res.rows.length > 0) {
      const redemption = res.rows[0];
      await this.db.query(
        `UPDATE referral_codes SET times_used = times_used + 1 WHERE id = $1;`,
        [redemption.referral_code_id]
      );
      // Credit referrer's wallet
      await this.db.query(
        `UPDATE wallets SET promotional_balance_inr = promotional_balance_inr + $1, updated_at = NOW()
         WHERE user_id = $2;`,
        [redemption.referrer_reward_inr, redemption.referrer_user_id]
      );
    }
  }
}
