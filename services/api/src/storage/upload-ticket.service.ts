import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { UploadTicket, UploadTicketRepository } from './data/upload-ticket.repository.js';
import { CreateUploadTicketDto } from './dto/create-upload-ticket.dto.js';
import { FileStorageService } from './file-storage.service.js';

@Injectable()
export class UploadTicketService {
  private readonly logger = new Logger(UploadTicketService.name);

  constructor(
    private readonly ticketRepo: UploadTicketRepository,
    private readonly fileStorage: FileStorageService,
  ) {}

  async createTicket(userId: string, dto: CreateUploadTicketDto): Promise<UploadTicket> {
    if (dto.fileSizeBytes > this.fileStorage.MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('File size exceeds maximum allowed 5 MB limit');
    }

    const ext =
      dto.mimeType === 'application/pdf' ? '.pdf' : dto.mimeType === 'image/png' ? '.png' : '.jpg';
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const ticketId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const ticket: UploadTicket = {
      id: ticketId,
      uploader_user_id: userId,
      storage_key: storageKey,
      mime_type: dto.mimeType,
      file_size_bytes: dto.fileSizeBytes,
      status: 'PENDING_LINK',
      scan_status: 'UNSCANNED',
      created_at: now,
      expires_at: expiresAt,
    };

    await this.ticketRepo.insertTicket(ticket);
    return ticket;
  }

  async getTicket(ticketId: string): Promise<UploadTicket | null> {
    return this.ticketRepo.findById(ticketId);
  }

  async saveUploadedFile(
    ticketId: string,
    userId: string,
    buffer: Buffer,
    scanFn?: (path: string) => Promise<{ clean: boolean; error?: string }>,
  ): Promise<UploadTicket> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException('Upload ticket not found');
    }

    if (ticket.uploader_user_id !== userId) {
      throw new ForbiddenException('Ticket does not belong to authenticated user');
    }

    if (ticket.status !== 'PENDING_LINK') {
      throw new BadRequestException(`Upload ticket is in invalid status: ${ticket.status}`);
    }

    if (new Date() > new Date(ticket.expires_at)) {
      ticket.status = 'EXPIRED';
      throw new BadRequestException('Upload ticket has expired. Please initiate a new upload.');
    }

    this.fileStorage.validateFileContent(buffer, ticket.mime_type);
    const targetPath = this.fileStorage.resolveAndValidatePath(ticket.storage_key);
    this.fileStorage.writeFile(targetPath, buffer);

    const scanner = scanFn || ((p: string) => this.fileStorage.scanFileWithClamAv(p));
    const scan = await scanner(targetPath);

    if (!scan.clean) {
      this.logger.warn(`Document scan result for ticket ${ticketId}: ${scan.error}`);
      const isInfected = scan.error?.includes('FOUND') || scan.error?.includes('threat');
      ticket.scan_status = isInfected ? 'INFECTED' : 'SKIPPED_UNAVAILABLE';
      ticket.scan_result = scan.error;

      if (isInfected) {
        this.fileStorage.deleteFile(targetPath);
        ticket.status = 'FAILED';
        throw new BadRequestException(`Malware detected: ${scan.error}`);
      }
    } else {
      ticket.scan_status = 'CLEAN';
      ticket.scan_result = 'Scanned clean';
    }

    ticket.file_size_bytes = buffer.length;
    await this.ticketRepo.updateUploadCompleted(
      ticket.id,
      ticket.file_size_bytes,
      ticket.scan_status,
      ticket.scan_result,
    );

    return ticket;
  }

  async linkTicket(
    ticketId: string,
    userId: string,
    entityType: 'partner' | 'merchant',
    entityId: string,
  ): Promise<UploadTicket> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new NotFoundException('Upload ticket not found');
    }

    if (ticket.uploader_user_id !== userId) {
      throw new ForbiddenException('Cannot link ticket: ownership mismatch');
    }

    const filePath = this.fileStorage.resolveAndValidatePath(ticket.storage_key);
    if (!this.fileStorage.fileExists(filePath)) {
      throw new BadRequestException(
        'Cannot link ticket before file upload has been successfully completed',
      );
    }

    await this.ticketRepo.updateLinked(ticketId, entityType, entityId);
    ticket.linked_entity_type = entityType;
    ticket.linked_entity_id = entityId;
    ticket.status = 'LINKED';
    return ticket;
  }

  async cleanupOrphanUploads(): Promise<{ cleanedCount: number }> {
    let cleanedCount = 0;
    const now = new Date();
    const inMemTickets = this.ticketRepo.getInMemoryTickets();

    for (const [, ticket] of inMemTickets.entries()) {
      if (ticket.status === 'PENDING_LINK' && ticket.expires_at < now) {
        try {
          const filePath = this.fileStorage.resolveAndValidatePath(ticket.storage_key);
          this.fileStorage.deleteFile(filePath);
        } catch (e) {
          this.logger.error(`Failed to delete orphan file ${ticket.storage_key}: ${e}`);
        }
        ticket.status = 'ORPHANED';
        cleanedCount++;
      }
    }

    const expiredRows = await this.ticketRepo.findExpiredPendingTickets();
    for (const row of expiredRows) {
      try {
        const filePath = this.fileStorage.resolveAndValidatePath(row.storage_key);
        this.fileStorage.deleteFile(filePath);
      } catch {
        // ignore error on unlink
      }
      await this.ticketRepo.markOrphaned(row.id);
      cleanedCount++;
    }

    return { cleanedCount };
  }
}
