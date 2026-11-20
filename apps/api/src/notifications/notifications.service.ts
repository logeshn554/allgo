import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { FirebaseAdminFcmService } from './fcm/fcm-push.service.js';
import { IndiaDltSmsGateway } from './sms/india-dlt-sms.gateway.js';
import { DLT_TEMPLATES } from './sms/sms-gateway.interface.js';

export interface SendNotificationDto {
  userId: string;
  role?: string;
  title: string;
  body: string;
  category: 'BOOKING' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT' | 'PAYOUT' | 'SUPPORT' | 'PROMOTION';
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  priority?: 'high' | 'normal';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly fcmPush?: FirebaseAdminFcmService,
    private readonly dltSms?: IndiaDltSmsGateway
  ) {}

  async sendNotification(dto: SendNotificationDto) {
    const { userId, role = 'CUSTOMER', title, body, category, referenceType, referenceId, metadata = {}, priority } = dto;

    if (!userId || !title || !body || !category) {
      throw new BadRequestException('userId, title, body, and category are required.');
    }

    const dupCheck = await this.db.query(
      `SELECT id FROM notifications 
       WHERE user_id = $1 AND title = $2 AND category = $3 
         AND created_at >= NOW() - INTERVAL '1 minute'
       LIMIT 1;`,
      [userId, title, category]
    );

    if (dupCheck.rows.length > 0) {
      return dupCheck.rows[0];
    }

    const res = await this.db.query(
      `INSERT INTO notifications (
         user_id, role, title, body, category, reference_type, reference_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [userId, role, title, body, category, referenceType || null, referenceId || null, JSON.stringify(metadata)]
    );

    this.logger.log(`[Notification Dispatch] To user ${userId} (${role}): "${title}" - Category: ${category}`);

    await this.dispatchFcmPush(userId, role, title, body, category, referenceType, referenceId, metadata, priority);

    return res.rows[0];
  }

  private async dispatchFcmPush(
    userId: string,
    role: string,
    title: string,
    body: string,
    category: string,
    referenceType?: string,
    referenceId?: string,
    metadata: Record<string, any> = {},
    requestedPriority?: 'high' | 'normal'
  ) {
    if (!this.fcmPush) return;

    try {
      const deviceRes = await this.db.query(
        `SELECT device_id, fcm_token FROM devices 
         WHERE user_id = $1 AND fcm_token IS NOT NULL AND fcm_token != '';`,
        [userId]
      );

      if (deviceRes.rows.length === 0) return;

      const isMerchantNewOrder = role === 'MERCHANT' && (category === 'BOOKING' || referenceType === 'ORDER');
      const isPartnerJobOffer = role === 'PARTNER' && (category === 'BOOKING' || referenceType === 'JOB_OFFER');
      const isHighPriority = requestedPriority === 'high' || isMerchantNewOrder || isPartnerJobOffer;

      const channelId = isMerchantNewOrder
        ? 'merchant_orders_channel'
        : isPartnerJobOffer
        ? 'partner_jobs_channel'
        : isHighPriority
        ? 'critical_alerts_channel'
        : 'general_channel';

      const pushPayload: Record<string, string> = {
        category,
        role,
        ...(referenceType ? { referenceType } : {}),
        ...(referenceId ? { referenceId } : {}),
        ...(isMerchantNewOrder ? { isFullScreenAlert: 'true' } : {}),
      };

      for (const [k, v] of Object.entries(metadata)) {
        if (typeof v === 'string') pushPayload[k] = v;
        else if (v !== null && v !== undefined) pushPayload[k] = JSON.stringify(v);
      }

      for (const row of deviceRes.rows) {
        const token = row.fcm_token;
        const pushResult = await this.fcmPush.sendToDevice(
          token,
          title,
          body,
          pushPayload,
          {
            priority: isHighPriority ? 'high' : 'normal',
            channelId,
          }
        );

        if (pushResult.invalidToken) {
          this.logger.warn(`Pruning invalid/unregistered FCM token for user ${userId}: ${token.slice(0, 10)}...`);
          await this.db.query('UPDATE devices SET fcm_token = NULL WHERE fcm_token = $1;', [token]);
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in dispatchFcmPush for user ${userId}: ${err.message}`);
    }
  }

  async getNotifications(userId: string, role?: string, unreadOnly = false, limit = 50) {
    const conditions = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    if (unreadOnly) {
      conditions.push('is_read = FALSE');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const res = await this.db.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ${limit};`,
      params
    );

    const unreadCountRes = await this.db.query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE;`,
      [userId]
    );

    return {
      notifications: res.rows,
      unreadCount: parseInt(unreadCountRes.rows[0]?.unread_count || '0', 10),
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const res = await this.db.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *;`,
      [notificationId, userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Notification not found: ${notificationId}`);
    }

    return res.rows[0];
  }

  async markAllAsRead(userId: string, role?: string) {
    const roleClause = role ? 'AND role = $2' : '';
    const params = role ? [userId, role] : [userId];

    await this.db.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE ${roleClause};`,
      params
    );

    return { success: true };
  }
}
