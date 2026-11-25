import type { CreateZoneDto, UpdateZoneSurgeDto } from '../types';
import { adminFetch } from './base-client';

export class ZonesApi {
  async listZones(cityId?: string, isActive?: boolean): Promise<any[]> {
    const query = new URLSearchParams();
    if (cityId) query.append('cityId', cityId);
    if (isActive !== undefined) query.append('isActive', String(isActive));
    return adminFetch<any[]>(`/v1/admin/zones?${query.toString()}`);
  }

  async getZoneDetails(id: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/zones/${encodeURIComponent(id)}`);
  }

  async createZone(dto: CreateZoneDto): Promise<any> {
    return adminFetch<any>('/v1/admin/zones', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateZone(id: string, dto: any): Promise<any> {
    return adminFetch<any>(`/v1/admin/zones/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async upsertZoneSettings(id: string, dto: any): Promise<any> {
    return adminFetch<any>(`/v1/admin/zones/${encodeURIComponent(id)}/settings`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateZoneSurge(id: string, dto: UpdateZoneSurgeDto): Promise<any> {
    return adminFetch<any>(`/v1/admin/zones/${encodeURIComponent(id)}/surge`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async testServiceability(lat: number, lng: number, verticalType = 'FOOD'): Promise<any> {
    const query = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      verticalType,
    });
    return adminFetch<any>(`/v1/zones/serviceability?${query.toString()}`);
  }
}

export const zonesApi = new ZonesApi();
