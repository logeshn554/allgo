import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class PartnerRepository {
  public readonly inMemoryPartners = new Map<string, any>();
  public readonly inMemoryVehicles = new Map<string, any>();
  public readonly inMemoryServices = new Map<string, any>(); // key: `${partnerId}:${serviceType}`
  public readonly inMemoryDocuments = new Map<string, any>();

  constructor(private readonly db: DatabaseService) {}

  async findUserById(userId: string): Promise<any> {
    try {
      const userRes = await this.db.query('SELECT id, phone FROM users WHERE id = $1;', [userId]);
      if (userRes.rows.length > 0) return userRes.rows[0];
    } catch {
      // offline
    }
    return null;
  }

  async findPartnerByUserId(userId: string): Promise<any> {
    try {
      const res = await this.db.query(
        `SELECT p.*, u.phone, u.full_name, u.email 
         FROM partners p 
         JOIN users u ON u.id = p.user_id 
         WHERE p.user_id = $1;`,
        [userId],
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch {
      // offline fallback
    }

    for (const p of this.inMemoryPartners.values()) {
      if (p.user_id === userId) return p;
    }
    return null;
  }

  findPartnerById(partnerId: string): any {
    return this.inMemoryPartners.get(partnerId) || null;
  }

  async savePartner(partnerData: any, isExisting: boolean): Promise<void> {
    try {
      if (isExisting) {
        await this.db.query(
          `UPDATE partners 
           SET bank_account_number = $1, bank_ifsc = $2, bank_beneficiary_name = $3, bank_account_hmac = $4, updated_at = NOW()
           WHERE id = $5;`,
          [
            partnerData.bank_account_number,
            partnerData.bank_ifsc,
            partnerData.bank_beneficiary_name,
            partnerData.bank_account_hmac,
            partnerData.id,
          ],
        );
      } else {
        await this.db.query(
          `INSERT INTO partners 
            (id, user_id, status, bank_account_number, bank_ifsc, bank_beneficiary_name, bank_account_hmac)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            partnerData.id,
            partnerData.user_id,
            partnerData.status,
            partnerData.bank_account_number,
            partnerData.bank_ifsc,
            partnerData.bank_beneficiary_name,
            partnerData.bank_account_hmac,
          ],
        );
      }
    } catch {
      // offline
    }
    this.inMemoryPartners.set(partnerData.id, partnerData);
  }

  async saveVehicle(partnerId: string, vehicleData: any): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO vehicles (id, partner_id, vehicle_type, registration_number, make_model)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (registration_number) DO UPDATE
         SET vehicle_type = EXCLUDED.vehicle_type, make_model = EXCLUDED.make_model, updated_at = NOW();`,
        [
          vehicleData.id,
          partnerId,
          vehicleData.vehicle_type,
          vehicleData.registration_number,
          vehicleData.make_model,
        ],
      );
    } catch {
      // offline
    }
    this.inMemoryVehicles.set(partnerId, vehicleData);
  }

  findVehicleByPartnerId(partnerId: string): any {
    return this.inMemoryVehicles.get(partnerId) || null;
  }

  async findCurrentDocument(partnerId: string, docType: string): Promise<any> {
    try {
      const res = await this.db.query(
        `SELECT * FROM partner_documents 
         WHERE partner_id = $1 AND document_type = $2 AND is_current = TRUE AND deleted_at IS NULL;`,
        [partnerId, docType],
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch {
      // offline
    }

    for (const d of this.inMemoryDocuments.values()) {
      if (d.partner_id === partnerId && d.document_type === docType && d.is_current) {
        return d;
      }
    }
    return null;
  }

  async supersedeDocument(existingDoc: any, newDocId: string): Promise<void> {
    existingDoc.is_current = false;
    existingDoc.superseded_by = newDocId;
    try {
      await this.db.query(
        `UPDATE partner_documents 
         SET is_current = FALSE, superseded_by = $1 
         WHERE id = $2;`,
        [newDocId, existingDoc.id],
      );
    } catch {
      // offline
    }
    this.inMemoryDocuments.set(existingDoc.id, existingDoc);
  }

  async insertDocument(docData: any): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO partner_documents 
          (id, partner_id, document_type, document_number, storage_key, file_url, mime_type, file_size_bytes, version, is_current, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'PENDING');`,
        [
          docData.id,
          docData.partner_id,
          docData.document_type,
          docData.document_number,
          docData.storage_key,
          docData.file_url,
          docData.mime_type,
          docData.file_size_bytes,
          docData.version,
        ],
      );
    } catch {
      // offline
    }
    this.inMemoryDocuments.set(docData.id, docData);
  }

  async saveServiceApplication(key: string, appData: any): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO partner_service_applications (id, partner_id, service_type, status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (partner_id, service_type) DO UPDATE
         SET status = 'PENDING', rejection_reason = NULL, updated_at = NOW();`,
        [appData.id, appData.partner_id, appData.service_type],
      );
    } catch {
      // offline
    }
    this.inMemoryServices.set(key, appData);
  }

  async updatePartnerStatus(
    partnerId: string,
    adminUserId: string,
    newStatus: string,
    reason?: string,
  ): Promise<{ oldStatus: string; newStatus: string }> {
    const partner = this.inMemoryPartners.get(partnerId);
    const oldStatus = partner?.status || 'UNKNOWN';
    if (partner) {
      partner.status = newStatus;
      partner.updated_at = new Date();
    }

    try {
      await this.db.query(`UPDATE partners SET status = $1, updated_at = NOW() WHERE id = $2;`, [
        newStatus,
        partnerId,
      ]);
      await this.db.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_state, new_state, reason)
         VALUES ($1, 'ADMIN_PARTNER_STATUS_CHANGE', 'partner', $2, $3, $4, $5);`,
        [
          adminUserId,
          partnerId,
          JSON.stringify({ status: oldStatus }),
          JSON.stringify({ status: newStatus }),
          reason || null,
        ],
      );
    } catch {
      // offline
    }
    if (partner) {
      this.inMemoryPartners.set(partnerId, partner);
    }
    return { oldStatus, newStatus };
  }

  async updateServiceStatus(
    partnerId: string,
    serviceType: string,
    adminUserId: string,
    newStatus: string,
    reason?: string,
  ): Promise<{ oldStatus: string; newStatus: string }> {
    const key = `${partnerId}:${serviceType}`;
    let app = this.inMemoryServices.get(key);
    if (!app) {
      app = {
        id: crypto.randomUUID(),
        partner_id: partnerId,
        service_type: serviceType,
        status: 'PENDING',
      };
    }

    const oldStatus = app.status;
    app.status = newStatus;
    app.rejection_reason = reason || null;
    app.updated_at = new Date();

    try {
      await this.db.query(
        `UPDATE partner_service_applications 
         SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
         WHERE partner_id = $4 AND service_type = $5;`,
        [newStatus, reason || null, adminUserId, partnerId, serviceType],
      );
      await this.db.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_state, new_state, reason)
         VALUES ($1, 'ADMIN_PARTNER_SERVICE_STATUS_CHANGE', 'partner_service', $2, $3, $4, $5);`,
        [
          adminUserId,
          key,
          JSON.stringify({ status: oldStatus }),
          JSON.stringify({ status: newStatus }),
          reason || null,
        ],
      );
    } catch {
      // offline
    }
    this.inMemoryServices.set(key, app);
    return { oldStatus, newStatus };
  }
}
