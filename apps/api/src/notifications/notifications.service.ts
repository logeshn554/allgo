import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface SendNotificationDto {
  userId: string;
  role?: string;
  title: string;
  body: string;
  category: 'BOOKING' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT' | 'PAYOUT' | 'SUPPORT' | 'PROMOTION';
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Send and persist notification
   */
  async sendNotification(dto: SendNotificationDto) {
    const { userId, role = 'CUSTOMER', title, body, category, referenceType, referenceId, metadata = {} } = dto;

    if (!userId || !title || !body || !category) {
      throw new BadRequestException('userId, title, body, and category are required.');
    }

    // Deduplication check: do not send identical notification in last 60 seconds
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

    return res.rows[0];
  }

  /**
   * Get notifications for a user
   */
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

  /**
   * Mark single notification as read
   */
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

  /**
   * Mark all notifications as read for a user
   */
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
