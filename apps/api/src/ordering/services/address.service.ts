import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateAddressDto } from '../dto/ordering.dto.js';

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
      [customerId]
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
      [addressId, customerId]
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
      await this.db.query(
        `UPDATE addresses SET is_default = FALSE WHERE user_id = $1;`,
        [customerId]
      );
      await this.db.query(
        `UPDATE customer_saved_addresses SET is_default = FALSE WHERE customer_id = $1;`,
        [customerId]
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
      ]
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
        ]
      );
    } catch {
      // ignore secondary table failure if already exists
    }

    return savedAddr;
  }

  async deleteSavedAddress(addressId: string, customerId: string): Promise<void> {
    const res = await this.db.query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [addressId, customerId]
    );
    await this.db.query(
      `DELETE FROM customer_saved_addresses WHERE id = $1 AND customer_id = $2;`,
      [addressId, customerId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Delivery address not found');
    }
  }

  async validateServiceability(
    outletId: string,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<{ serviceable: boolean; distanceKm: number; maxRadiusKm: number }> {
    const outletRes = await this.db.query(
      `SELECT id, outlet_name, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM outlets WHERE id = $1;`,
      [outletId]
    );

    if (outletRes.rows.length === 0) {
      throw new NotFoundException('Outlet not found');
    }

    const outlet = outletRes.rows[0];
    const maxRadiusKm = 15.0; // 15 km serviceability radius limit

    const R = 6371;
    const dLat = ((dropoffLat - Number(outlet.lat)) * Math.PI) / 180;
    const dLon = ((dropoffLng - Number(outlet.lng)) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((Number(outlet.lat) * Math.PI) / 180) *
        Math.cos((dropoffLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(R * c * 1.25 * 10) / 10;

    const serviceable = distanceKm <= maxRadiusKm;
    if (!serviceable) {
      throw new BadRequestException(
        `Destination is outside the outlet's delivery range (${distanceKm} km, max supported is ${maxRadiusKm} km)`
      );
    }

    return { serviceable: true, distanceKm, maxRadiusKm };
  }
}
