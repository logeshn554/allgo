import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { CreateUploadTicketDto } from './dto/create-upload-ticket.dto.js';
import { UploadTicketRepository, UploadTicket } from './data/upload-ticket.repository.js';
import { FileStorageService } from './file-storage.service.js';
import { UploadTicketService } from './upload-ticket.service.js';

export { UploadTicket };

@Injectable()
export class StorageService implements OnModuleInit {
  public readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  private readonly fileStorage: FileStorageService;
  private readonly ticketService: UploadTicketService;
  private readonly ticketRepo: UploadTicketRepository;

  /**
   * Scan hook preserved for testing monkey-patching in storage-and-encryption.spec.ts.
   */
  public scanFileWithClamAv = async (filePath: string): Promise<{ clean: boolean; error?: string }> => {
    return this.fileStorage.scanFileWithClamAv(filePath);
  };

  constructor(
    private readonly db: DatabaseService,
    fileStorage?: FileStorageService,
    ticketService?: UploadTicketService,
    ticketRepo?: UploadTicketRepository,
  ) {
    if (fileStorage && ticketService && ticketRepo) {
      this.fileStorage = fileStorage;
      this.ticketService = ticketService;
      this.ticketRepo = ticketRepo;
    } else {
      this.ticketRepo = new UploadTicketRepository(this.db);
      this.fileStorage = new FileStorageService();
      this.ticketService = new UploadTicketService(this.ticketRepo, this.fileStorage);
    }
  }

  onModuleInit() {
    this.fileStorage.ensureStorageRootExists();
  }

  public getStorageRoot(): string {
    return this.fileStorage.getStorageRoot();
  }

  public setStorageRootForTesting(newRoot: string) {
    this.fileStorage.setStorageRootForTesting(newRoot);
  }

  public resolveAndValidatePath(storageKey: string): string {
    return this.fileStorage.resolveAndValidatePath(storageKey);
  }

  public validateFileContent(buffer: Buffer, declaredMimeType: string): void {
    this.fileStorage.validateFileContent(buffer, declaredMimeType);
  }

  public getFileBuffer(storageKey: string): Buffer {
    return this.fileStorage.getFileBuffer(storageKey);
  }

  async createTicket(userId: string, dto: CreateUploadTicketDto): Promise<UploadTicket> {
    return this.ticketService.createTicket(userId, dto);
  }

  async getTicket(ticketId: string): Promise<UploadTicket | null> {
    return this.ticketService.getTicket(ticketId);
  }

  async saveUploadedFile(ticketId: string, userId: string, buffer: Buffer): Promise<UploadTicket> {
    return this.ticketService.saveUploadedFile(ticketId, userId, buffer, this.scanFileWithClamAv);
  }

  async linkTicket(
    ticketId: string,
    userId: string,
    entityType: 'partner' | 'merchant',
    entityId: string
  ): Promise<UploadTicket> {
    return this.ticketService.linkTicket(ticketId, userId, entityType, entityId);
  }

  async cleanupOrphanUploads(): Promise<{ cleanedCount: number }> {
    return this.ticketService.cleanupOrphanUploads();
  }
}
