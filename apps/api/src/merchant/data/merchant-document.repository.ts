import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class MerchantDocumentRepository {
  constructor(private readonly db: DatabaseService) {}

  async findCurrentDocument(merchantId: string, documentType: string): Promise<any> {
    try {
      const res = await this.db.query(
        `SELECT * FROM merchant_documents 
         WHERE merchant_id = $1 AND document_type = $2 AND is_current = TRUE AND deleted_at IS NULL;`,
        [merchantId, documentType]
      );
      return res.rows[0] || null;
    } catch {
      return null;
    }
  }

  async supersedeDocument(docId: string, supersededById: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE merchant_documents 
         SET is_current = FALSE, superseded_by = $1 
         WHERE id = $2;`,
        [supersededById, docId]
      );
    } catch {
      // offline
    }
  }

  async insertDocument(docData: any): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO merchant_documents 
          (id, merchant_id, document_type, document_number, storage_key, file_name, mime_type, file_size_bytes, version, is_current, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'PENDING');`,
        [
          docData.id,
          docData.merchant_id,
          docData.document_type,
          docData.document_number,
          docData.storage_key,
          docData.file_name,
          docData.mime_type,
          docData.file_size_bytes,
          docData.version,
        ]
      );
    } catch {
      // offline
    }
  }

  async listCurrentDocuments(merchantId: string): Promise<any[]> {
    try {
      const res = await this.db.query(
        `SELECT * FROM merchant_documents 
         WHERE merchant_id = $1 AND is_current = TRUE AND deleted_at IS NULL
         ORDER BY created_at DESC;`,
        [merchantId]
      );
      return res.rows;
    } catch {
      return [];
    }
  }
}
