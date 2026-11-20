import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface CreateTicketDto {
  category: string;
  subject: string;
  description: string;
  orderGroupId?: string;
  subOrderId?: string;
  deliveryLegId?: string;
  rideId?: string;
  parcelId?: string;
  hireDriverBookingId?: string;
  partnerId?: string;
  merchantId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly db: DatabaseService) {}

  async createTicket(userId: string, creatorRole: string, dto: CreateTicketDto) {
    const {
      category,
      subject,
      description,
      orderGroupId,
      subOrderId,
      deliveryLegId,
      rideId,
      parcelId,
      hireDriverBookingId,
      partnerId,
      merchantId,
      priority = 'MEDIUM',
    } = dto;

    if (!category || !subject || !description) {
      throw new BadRequestException('category, subject, and description are required.');
    }

    const res = await this.db.query(
      `INSERT INTO support_tickets (
         user_id, creator_role, category, subject, description, priority, status,
         order_group_id, sub_order_id, delivery_leg_id, ride_id, parcel_id,
         hire_driver_booking_id, partner_id, merchant_id
       ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *;`,
      [
        userId,
        creatorRole,
        category,
        subject,
        description,
        priority,
        orderGroupId || null,
        subOrderId || null,
        deliveryLegId || null,
        rideId || null,
        parcelId || null,
        hireDriverBookingId || null,
        partnerId || null,
        merchantId || null,
      ]
    );

    const ticket = res.rows[0];

    await this.db.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message, is_internal)
       VALUES ($1, $2, $3, $4, FALSE);`,
      [ticket.id, userId, creatorRole, description]
    );

    return ticket;
  }

  async addMessage(
    ticketId: string,
    senderId: string,
    senderRole: string,
    message: string,
    isInternal = false,
    attachments: any[] = []
  ) {
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty.');
    }

    if (isInternal && senderRole !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can post internal notes.');
    }

    const ticketRes = await this.db.query(`SELECT * FROM support_tickets WHERE id = $1;`, [ticketId]);
    if (ticketRes.rows.length === 0) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const ticket = ticketRes.rows[0];

    if (senderRole !== 'ADMIN' && ticket.user_id !== senderId) {
      throw new ForbiddenException('You are not authorized to reply to this ticket.');
    }

    const res = await this.db.query(
      `INSERT INTO support_ticket_messages (
         ticket_id, sender_id, sender_role, message, is_internal, attachments
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [ticketId, senderId, senderRole, message, isInternal, JSON.stringify(attachments)]
    );

    let nextStatus = ticket.status;
    if (senderRole === 'ADMIN' && !isInternal) {
      nextStatus = 'WAITING_FOR_CUSTOMER';
    } else if (senderRole !== 'ADMIN' && ticket.status === 'WAITING_FOR_CUSTOMER') {
      nextStatus = 'IN_PROGRESS';
    }

    await this.db.query(
      `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2;`,
      [nextStatus, ticketId]
    );

    return res.rows[0];
  }

  async getTicketDetails(ticketId: string, requesterId: string, requesterRole: string) {
    const ticketRes = await this.db.query(
      `SELECT t.*, u.phone as creator_phone, u.name as creator_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1;`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const ticket = ticketRes.rows[0];

    if (requesterRole !== 'ADMIN' && ticket.user_id !== requesterId) {
      throw new ForbiddenException('You do not have permission to view this ticket.');
    }

    const messageQuery = requesterRole === 'ADMIN'
      ? `SELECT m.*, u.name as sender_name, u.phone as sender_phone
         FROM support_ticket_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.ticket_id = $1
         ORDER BY m.created_at ASC;`
      : `SELECT m.*, u.name as sender_name, u.phone as sender_phone
         FROM support_ticket_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.ticket_id = $1 AND m.is_internal = FALSE
         ORDER BY m.created_at ASC;`;

    const messagesRes = await this.db.query(messageQuery, [ticketId]);

    return {
      ticket,
      messages: messagesRes.rows,
    };
  }

  async listUserTickets(userId: string) {
    const res = await this.db.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC;`,
      [userId]
    );
    return res.rows;
  }

  async listAdminTickets(status?: string, priority?: string) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      values.push(status);
    }
    if (priority) {
      conditions.push(`t.priority = $${idx++}`);
      values.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await this.db.query(
      `SELECT t.*, u.phone as user_phone, u.name as user_name, a.name as assigned_admin_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.assigned_admin_id
       ${whereClause}
       ORDER BY t.created_at DESC;`,
      values
    );

    return res.rows;
  }

  async assignTicket(ticketId: string, adminId: string) {
    const res = await this.db.query(
      `UPDATE support_tickets
       SET assigned_admin_id = $1, status = 'ASSIGNED', updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [adminId, ticketId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }
    return res.rows[0];
  }

  async updateTicketStatus(
    ticketId: string,
    status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED',
    resolutionNotes?: string,
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ) {
    const res = await this.db.query(
      `UPDATE support_tickets
       SET status = $1,
           resolution_notes = COALESCE($2, resolution_notes),
           priority = COALESCE($3, priority),
           updated_at = NOW()
       WHERE id = $4 RETURNING *;`,
      [status, resolutionNotes || null, priority || null, ticketId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }
    return res.rows[0];
  }
}
