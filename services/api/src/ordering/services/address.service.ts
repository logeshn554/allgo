import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateAddressDto, UpdateAddressDto } from '../dto/ordering.dto.js';

@Injectable()
export class AddressService {
  constructor(private readonly db: DatabaseService) {}

  async listSavedAddresses(customerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, label, recipient_name, recipient_phone, address_line1, address_line2,
              landmark, city, state, postal_code, is_default,
              ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
              created_at
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC;`,
      [customerId],
    );
    return res.rows;
  }

  async getSavedAddress(addressId: string, customerId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT id, label, recipient_name, recipient_phone, address_line1, address_line2,
              landmark, city, state, postal_code, is_default,
              ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
       FROM addresses
       WHERE id = $1 AND user_id = $2;`,
      [addressId, customerId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Delivery address not found');
    }
    return res.rows[0];
  }

  async createSavedAddress(customerId: string, dto: CreateAddressDto): Promise<any> {
    let label = (dto.label || 'HOME').trim().toUpperCase();
    if (!['HOME', 'WORK', 'OTHER'].includes(label)) {
      label = 'OTHER';
    }

    // If set as default, reset previous defaults
    if (dto.isDefault) {
      await this.db.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1;`, [
        customerId,
      ]);
      await this.db.query(
        `UPDATE customer_saved_addresses SET is_default = FALSE WHERE customer_id = $1;`,
        [customerId],
      );
    }

    const res = await this.db.query(
      `INSERT INTO addresses (
         user_id, label, recipient_name, recipient_phone,
         address_line1, address_line2, landmark, city, state, postal_code,
         location, is_default
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8, $9, $10,
         ST_SetSRID(ST_MakePoint($11, $12), 4326), $13
       ) RETURNING id, label, recipient_name, recipient_phone, address_line1, address_line2,
                   landmark, city, state, postal_code, is_default,
                   ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude;`,
      [
        customerId,
        label,
        dto.recipientName,
        dto.recipientPhone,
        dto.addressLine1,
        dto.addressLine2 || null,
        dto.landmark || null,
        dto.city || 'Chennai',
        dto.state || 'Tamil Nadu',
        dto.postalCode,
        dto.longitude,
        dto.latitude,
        dto.isDefault || false,
      ],
    );

    const savedAddr = res.rows[0];

    // Symmetrically write to customer_saved_addresses for backward compatibility
    try {
      await this.db.query(
        `INSERT INTO customer_saved_addresses (
           id, customer_id, label, recipient_name, recipient_phone,
           address_line1, address_line2, landmark, city, state, postal_code,
           location, is_default
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11,
           ST_SetSRID(ST_MakePoint($12, $13), 4326), $14
         ) ON CONFLICT (id) DO NOTHING;`,
        [
          savedAddr.id,
          customerId,
          savedAddr.label,
          savedAddr.recipient_name,
          savedAddr.recipient_phone,
          savedAddr.address_line1,
          savedAddr.address_line2,
          savedAddr.landmark,
          savedAddr.city,
          savedAddr.state,
          savedAddr.postal_code,
          dto.longitude,
          dto.latitude,
          savedAddr.is_default,
        ],
      );
    } catch {
      // ignore secondary table failure if already exists
    }

    return savedAddr;
  }

  async updateSavedAddress(
    addressId: string,
    customerId: string,
    dto: UpdateAddressDto,
  ): Promise<any> {
    const existing = await this.getSavedAddress(addressId, customerId);

    if (dto.isDefault) {
      await this.db.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1;`, [
        customerId,
      ]);
      await this.db.query(
        `UPDATE customer_saved_addresses SET is_default = FALSE WHERE customer_id = $1;`,
        [customerId],
      );
    }

    const label = dto.label ? dto.label.trim().toUpperCase() : existing.label;
    const recipientName = dto.recipientName ?? existing.recipient_name;
    const recipientPhone = dto.recipientPhone ?? existing.recipient_phone;
    const addressLine1 = dto.addressLine1 ?? existing.address_line1;
    const addressLine2 = dto.addressLine2 !== undefined ? dto.addressLine2 : existing.address_line2;
    const landmark = dto.landmark !== undefined ? dto.landmark : existing.landmark;
    const city = dto.city ?? existing.city;
    const state = dto.state ?? existing.state;
    const postalCode = dto.postalCode ?? existing.postal_code;
    const latitude = dto.latitude ?? Number(existing.latitude);
    const longitude = dto.longitude ?? Number(existing.longitude);
    const isDefault = dto.isDefault !== undefined ? dto.isDefault : existing.is_default;

    const res = await this.db.query(
      `UPDATE addresses SET
         label = $1, recipient_name = $2, recipient_phone = $3,
         address_line1 = $4, address_line2 = $5, landmark = $6,
         city = $7, state = $8, postal_code = $9,
         location = ST_SetSRID(ST_MakePoint($10, $11), 4326),
         is_default = $12, updated_at = NOW()
       WHERE id = $13 AND user_id = $14
       RETURNING id, label, recipient_name, recipient_phone, address_line1, address_line2,
                 landmark, city, state, postal_code, is_default,
                 ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude;`,
      [
        label,
        recipientName,
        recipientPhone,
        addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        postalCode,
        longitude,
        latitude,
        isDefault,
        addressId,
        customerId,
      ],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Delivery address not found');
    }

    try {
      await this.db.query(
        `UPDATE customer_saved_addresses SET
           label = $1, recipient_name = $2, recipient_phone = $3,
           address_line1 = $4, address_line2 = $5, landmark = $6,
           city = $7, state = $8, postal_code = $9,
           location = ST_SetSRID(ST_MakePoint($10, $11), 4326),
           is_default = $12
         WHERE id = $13 AND customer_id = $14;`,
        [
          label,
          recipientName,
          recipientPhone,
          addressLine1,
          addressLine2,
          landmark,
          city,
          state,
          postalCode,
          longitude,
          latitude,
          isDefault,
          addressId,
          customerId,
        ],
      );
    } catch {
      // ignore secondary table failure
    }

    return res.rows[0];
  }

  async setDefaultAddress(addressId: string, customerId: string): Promise<any> {
    return this.updateSavedAddress(addressId, customerId, { isDefault: true });
  }

  async deleteSavedAddress(addressId: string, customerId: string): Promise<void> {
    const res = await this.db.query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [addressId, customerId],
    );
    await this.db.query(
      `DELETE FROM customer_saved_addresses WHERE id = $1 AND customer_id = $2;`,
      [addressId, customerId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Delivery address not found');
    }
  }

  async validateServiceability(
    outletId: string,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<{ serviceable: boolean; distanceKm: number; maxRadiusKm: number }> {
    const { OutletServiceabilityService } = await import('./outlet-serviceability.service.js');
    return new OutletServiceabilityService(this.db).validateServiceability(
      outletId,
      dropoffLat,
      dropoffLng,
    );
  }
}
