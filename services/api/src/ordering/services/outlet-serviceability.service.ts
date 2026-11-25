import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class OutletServiceabilityService {
  constructor(private readonly db: DatabaseService) {}

  async validateServiceability(
    outletId: string,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<{ serviceable: boolean; distanceKm: number; maxRadiusKm: number }> {
    const outletRes = await this.db.query(
      `SELECT id, outlet_name, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM outlets WHERE id = $1;`,
      [outletId],
    );

    if (outletRes.rows.length === 0) {
      throw new NotFoundException('Outlet not found');
    }

    const outlet = outletRes.rows[0];
    const maxRadiusKm = 15.0;

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
        `Destination is outside the outlet's delivery range (${distanceKm} km, max supported is ${maxRadiusKm} km)`,
      );
    }

    return { serviceable: true, distanceKm, maxRadiusKm };
  }
}
