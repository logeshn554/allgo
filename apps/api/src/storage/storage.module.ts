import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { UploadTicketRepository } from './data/upload-ticket.repository.js';
import { FileStorageService } from './file-storage.service.js';
import { UploadTicketService } from './upload-ticket.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StorageController],
  providers: [
    UploadTicketRepository,
    FileStorageService,
    UploadTicketService,
    StorageService,
  ],
  exports: [StorageService, FileStorageService, UploadTicketService, UploadTicketRepository],
})
export class StorageModule {}
