import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SubmitMerchantDocumentDto } from './dto/submit-merchant-doc.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantDocumentRepository } from './data/merchant-document.repository.js';

@Injectable()
export class MerchantDocumentService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly docRepo: MerchantDocumentRepository,
    private readonly storage?: StorageService
  ) {}

  async submitDocument(userId: string, dto: SubmitMerchantDocumentDto, inMemoryDocs?: Map<string, any>): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    if (!this.storage) {
      throw new InternalServerErrorException('Storage service is unavailable. Document processing failed.');
    }

    const ticket = await this.storage.linkTicket(dto.ticketId, userId, 'merchant', merchant.id);

    let existingDoc = await this.docRepo.findCurrentDocument(merchant.id, dto.documentType);

    if (!existingDoc && inMemoryDocs) {
      for (const d of inMemoryDocs.values()) {
        if (d.merchant_id === merchant.id && d.document_type === dto.documentType && d.is_current) {
          existingDoc = d;
          break;
        }
      }
    }

    const newDocId = crypto.randomUUID();
    const newVersion = existingDoc ? (existingDoc.version || 1) + 1 : 1;

    if (existingDoc) {
      existingDoc.is_current = false;
      existingDoc.superseded_by = newDocId;
      await this.docRepo.supersedeDocument(existingDoc.id, newDocId);
      if (inMemoryDocs) {
        inMemoryDocs.set(existingDoc.id, existingDoc);
      }
    }

    const docData = {
      id: newDocId,
      merchant_id: merchant.id,
      document_type: dto.documentType,
      document_number: dto.documentNumber || null,
      storage_key: ticket.storage_key,
      file_name: `${dto.documentType.toLowerCase()}_v${newVersion}.${ticket.storage_key.split('.').pop()}`,
      mime_type: ticket.mime_type,
      file_size_bytes: ticket.file_size_bytes,
      version: newVersion,
      is_current: true,
      verification_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.docRepo.insertDocument(docData);
    if (inMemoryDocs) {
      inMemoryDocs.set(newDocId, docData);
    }

    return docData;
  }

  async getMerchantDocuments(merchantId: string, inMemoryDocs?: Map<string, any>): Promise<any[]> {
    const fromDb = await this.docRepo.listCurrentDocuments(merchantId);
    if (fromDb.length > 0) return fromDb;

    const list: any[] = [];
    if (inMemoryDocs) {
      for (const d of inMemoryDocs.values()) {
        if (d.merchant_id === merchantId && d.is_current) {
          list.push(d);
        }
      }
    }
    return list;
  }
}
