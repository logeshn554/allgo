import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { CloudKmsService } from './cloud-kms.service.js';
import { UploadTicket, UploadTicketRepository } from './data/upload-ticket.repository.js';
import { CreateUploadTicketDto } from './dto/create-upload-ticket.dto.js';
import { SignedUrlOptions, StoredFileMetadata } from './file-storage.interface.js';
import { FileStorageService } from './file-storage.service.js';
import { UploadTicketService } from './upload-ticket.service.js';

export { UploadTicket };

@Injectable()
export class StorageService implements OnModuleInit {
  public readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  private readonly fileStorage: FileStorageService;
  private readonly ticketService: UploadTicketService;
  private readonly ticketRepo: UploadTicketRepository;
  private readonly kmsService: CloudKmsService;

  public scanFileWithClamAv = async (
    filePath: string,
  ): Promise<{ clean: boolean; error?: string }> => {
    return this.fileStorage.scanFileWithClamAv(filePath);
  };

  constructor(
    private readonly db: DatabaseService,
    fileStorage?: FileStorageService,
    ticketService?: UploadTicketService,
    ticketRepo?: UploadTicketRepository,
    kmsService?: CloudKmsService,
  ) {
    this.kmsService = kmsService || new CloudKmsService();
    if (fileStorage && ticketService && ticketRepo) {
      this.fileStorage = fileStorage;
      this.ticketService = ticketService;
      this.ticketRepo = ticketRepo;
    } else {
      this.ticketRepo = new UploadTicketRepository(this.db);
      this.fileStorage = new FileStorageService(this.kmsService);
      this.ticketService = new UploadTicketService(this.ticketRepo, this.fileStorage);
    }
  }

  onModuleInit() {
    this.fileStorage.ensureStorageRootExists();
    this.kmsService.initializeKms();
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

  public async generateSignedUploadUrl(
    storageKey: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    return this.fileStorage.generateSignedUploadUrl(storageKey, options);
  }

  public async generateSignedDownloadUrl(
    storageKey: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    return this.fileStorage.generateSignedDownloadUrl(storageKey, options);
  }

  public async uploadKmsEncryptedFile(
    storageKey: string,
    buffer: Buffer,
    declaredMimeType: string,
    kmsKeyId?: string,
  ): Promise<StoredFileMetadata> {
    return this.fileStorage.uploadBufferWithKms(storageKey, buffer, declaredMimeType, kmsKeyId);
  }

  public async createTicket(userId: string, dto: CreateUploadTicketDto): Promise<UploadTicket> {
    return this.ticketService.createTicket(userId, dto);
  }

  public async getTicket(ticketId: string): Promise<UploadTicket | null> {
    return this.ticketService.getTicket(ticketId);
  }

  public async saveUploadedFile(
    ticketId: string,
    userId: string,
    buffer: Buffer,
  ): Promise<UploadTicket> {
    return this.ticketService.saveUploadedFile(ticketId, userId, buffer, this.scanFileWithClamAv);
  }

  public async linkTicket(
    ticketId: string,
    userId: string,
    entityType: 'partner' | 'merchant',
    entityId: string,
  ): Promise<UploadTicket> {
    return this.ticketService.linkTicket(ticketId, userId, entityType, entityId);
  }

  public async cleanupOrphanUploads(): Promise<{ cleanedCount: number }> {
    return this.ticketService.cleanupOrphanUploads();
  }
}
