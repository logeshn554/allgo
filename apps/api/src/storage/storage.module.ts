import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { UploadTicketRepository } from './data/upload-ticket.repository.js';
import { FileStorageService } from './file-storage.service.js';
import { UploadTicketService } from './upload-ticket.service.js';
import { CloudKmsService } from './cloud-kms.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StorageController],
  providers: [
    StorageService,
    FileStorageService,
    UploadTicketService,
    UploadTicketRepository,
    CloudKmsService,
  ],
  exports: [
    StorageService,
    FileStorageService,
    UploadTicketService,
    UploadTicketRepository,
    CloudKmsService,
  ],
})
export class StorageModule {}
