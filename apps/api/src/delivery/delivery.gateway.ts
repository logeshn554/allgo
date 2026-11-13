import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../config/config.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DatabaseService } from '../database/database.service.js';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/delivery',
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeliveryGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly db: DatabaseService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.substring(7)
          : null) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`WS connection rejected: missing token [client=${client.id}]`);
        client.disconnect(true);
        return;
      }

      const decoded = jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'] }) as any;

      if (decoded.status === 'BLOCKED' || decoded.status === 'SUSPENDED') {
        client.disconnect(true);
        return;
      }

      // Check revoked token
      const isRevoked = await this.redis.get(`token:revoked:${token}`);
      if (isRevoked) {
        client.disconnect(true);
        return;
      }

      // Resolve partner ID if partner
      let partnerId: string | null = null;
      if (decoded.roles?.includes('PARTNER') || decoded.roles?.includes('DRIVER')) {
        const pRes = await this.db.query('SELECT id FROM partners WHERE user_id = $1;', [decoded.userId]);
        if (pRes.rows.length > 0) partnerId = pRes.rows[0].id;
      }

      client.data = {
        userId: decoded.userId,
        roles: decoded.roles || [],
        partnerId,
      };

      // Join user private room
      client.join(`user:${decoded.userId}`);
      if (partnerId) {
        client.join(`partner:${partnerId}`);
      }
      if (decoded.roles?.includes('ADMIN') || decoded.roles?.includes('SUPER_ADMIN')) {
        client.join('admin:dispatch');
      }

      this.logger.log(`WS client connected: user=${decoded.userId} role=${decoded.roles?.join(',')} partner=${partnerId}`);
    } catch (err: any) {
      this.logger.warn(`WS auth failure: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage('job:subscribe')
  async handleJobSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { jobId: string }) {
    if (!data?.jobId) return;

    // Authorize room subscription: must be customer, merchant of outlet, assigned partner, or admin
    const { userId, roles, partnerId } = client.data || {};
    const isAdmin = roles?.includes('ADMIN') || roles?.includes('SUPER_ADMIN');

    if (!isAdmin) {
      const jobCheck = await this.db.query(
        `SELECT j.id, j.customer_id, j.assigned_partner_id, m.owner_id as merchant_owner_id
         FROM delivery_jobs j
         JOIN outlets o ON o.id = j.outlet_id
         JOIN merchants m ON m.id = o.merchant_id
         WHERE j.id = $1;`,
        [data.jobId]
      );

      if (jobCheck.rows.length === 0) return;
      const j = jobCheck.rows[0];

      const isCustomer = j.customer_id === userId;
      const isAssignedPartner = partnerId && j.assigned_partner_id === partnerId;
      const isMerchant = j.merchant_owner_id === userId;

      if (!isCustomer && !isAssignedPartner && !isMerchant) {
        this.logger.warn(`Unauthorized subscription attempt to job:${data.jobId} by user ${userId}`);
        return;
      }
    }

    client.join(`job:${data.jobId}`);
    client.join(`order:${data.jobId}`);
    client.emit('job:subscribed', { jobId: data.jobId });
  }

  @SubscribeMessage('order:subscribe')
  async handleOrderSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return;
    return this.handleJobSubscribe(client, { jobId: data.orderId });
  }

  @SubscribeMessage('job:unsubscribe')
  handleJobUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { jobId: string }) {
    if (data?.jobId) {
      client.leave(`job:${data.jobId}`);
      client.leave(`order:${data.jobId}`);
    }
  }

  @SubscribeMessage('order:unsubscribe')
  handleOrderUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (data?.orderId) {
      client.leave(`job:${data.orderId}`);
      client.leave(`order:${data.orderId}`);
    }
  }

  // ==========================================
  // Public Notification Emitters
  // ==========================================

  emitJobOffer(partnerId: string, offer: any) {
    if (this.server) {
      this.server.to(`partner:${partnerId}`).emit('delivery:offer', offer);
    }
  }

  emitJobStatusChanged(jobId: string, status: string, payload: any) {
    if (this.server) {
      this.server.to(`job:${jobId}`).to(`order:${jobId}`).emit('job:status_changed', { jobId, status, ...payload });
      this.server.to('admin:dispatch').emit('admin:job_update', { jobId, status, ...payload });
    }
  }

  emitPartnerLocationUpdate(jobId: string, locationData: any) {
    if (this.server) {
      // Stream sanitized location coordinates, heading, and speed deltas to the customer client without exposing personal identifiers
      const sanitized = {
        orderId: jobId,
        jobId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        heading: locationData.heading ?? null,
        speedMps: locationData.speedMps ?? null,
        recordedAt: locationData.recordedAt || new Date().toISOString(),
      };
      this.server.to(`job:${jobId}`).to(`order:${jobId}`).emit('partner:location_update', sanitized);
      this.server.to(`job:${jobId}`).to(`order:${jobId}`).emit('order:driver_location', sanitized);
    }
  }

  emitDispatchException(jobId: string, exceptionData: any) {
    if (this.server) {
      this.server.to(`job:${jobId}`).emit('job:exception', exceptionData);
      this.server.to('admin:dispatch').emit('admin:exception', exceptionData);
    }
  }
}
