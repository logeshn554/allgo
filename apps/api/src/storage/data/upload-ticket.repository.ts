import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface UploadTicket {
  id: string;
  uploader_user_id: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'PENDING_LINK' | 'LINKED' | 'REVIEWABLE' | 'EXPIRED' | 'FAILED' | 'ORPHANED';
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  scan_status: 'UNSCANNED' | 'CLEAN' | 'INFECTED' | 'SKIPPED_UNAVAILABLE' | 'FAILED';
  scan_result?: string | null;
  created_at: Date;
  expires_at: Date;
}

@Injectable()
export class UploadTicketRepository {
  private inMemoryTickets = new Map<string, UploadTicket>();

  constructor(private readonly db: DatabaseService) {}

  public getInMemoryTickets(): Map<string, UploadTicket> {
    return this.inMemoryTickets;
  }

  async insertTicket(ticket: UploadTicket): Promise<void> {
    this.inMemoryTickets.set(ticket.id, ticket);
    try {
      await this.db.query(
        `INSERT INTO document_upload_tickets 
          (id, uploader_user_id, storage_key, mime_type, file_size_bytes, status, scan_status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          ticket.id,
          ticket.uploader_user_id,
          ticket.storage_key,
          ticket.mime_type,
          ticket.file_size_bytes,
          ticket.status,
          ticket.scan_status,
          ticket.created_at,
          ticket.expires_at,
        ]
      );
    } catch {
      // DB offline; in-memory store populated
    }
  }

  async findById(ticketId: string): Promise<UploadTicket | null> {
    try {
      const res = await this.db.query('SELECT * FROM document_upload_tickets WHERE id = $1;', [ticketId]);
      if (res.rows.length > 0) return res.rows[0];
    } catch {
      // fallback to memory
    }
    return this.inMemoryTickets.get(ticketId) || null;
  }

  async updateUploadCompleted(
    ticketId: string,
    fileSizeBytes: number,
    scanStatus: string,
    scanResult?: string | null
  ): Promise<void> {
    const mem = this.inMemoryTickets.get(ticketId);
    if (mem) {
      mem.file_size_bytes = fileSizeBytes;
      mem.scan_status = scanStatus as any;
      mem.scan_result = scanResult;
    }
    try {
      await this.db.query(
        `UPDATE document_upload_tickets 
         SET file_size_bytes = $1, scan_status = $2, scan_result = $3 
         WHERE id = $4;`,
        [fileSizeBytes, scanStatus, scanResult, ticketId]
      );
    } catch {
      // offline
    }
  }

  async updateLinked(ticketId: string, entityType: string, entityId: string): Promise<void> {
    const mem = this.inMemoryTickets.get(ticketId);
    if (mem) {
      mem.linked_entity_type = entityType;
      mem.linked_entity_id = entityId;
      mem.status = 'LINKED';
    }
    try {
      await this.db.query(
        `UPDATE document_upload_tickets
         SET linked_entity_type = $1, linked_entity_id = $2, status = 'LINKED'
         WHERE id = $3;`,
        [entityType, entityId, ticketId]
      );
    } catch {
      // offline
    }
  }

  async findExpiredPendingTickets(): Promise<any[]> {
    try {
      const res = await this.db.query(
        `SELECT id, storage_key FROM document_upload_tickets 
         WHERE status = 'PENDING_LINK' AND expires_at < NOW();`
      );
      return res.rows;
    } catch {
      return [];
    }
  }

  async markOrphaned(ticketId: string): Promise<void> {
    const mem = this.inMemoryTickets.get(ticketId);
    if (mem) {
      mem.status = 'ORPHANED';
    }
    try {
      await this.db.query(
        `UPDATE document_upload_tickets SET status = 'ORPHANED' WHERE id = $1;`,
        [ticketId]
      );
    } catch {
      // offline
    }
  }
}
