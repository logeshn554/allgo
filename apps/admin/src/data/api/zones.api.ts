import { API_BASE, getAdminHeaders } from './base-client';
import { CreateZoneDto, UpdateZoneSurgeDto } from '../types';

export class ZonesApi {
  async listZones(cityId?: string, isActive?: boolean): Promise<any[]> {
    const query = new URLSearchParams();
    if (cityId) query.append('cityId', cityId);
    if (isActive !== undefined) query.append('isActive', String(isActive));

    const res = await fetch(`${API_BASE}/v1/admin/zones?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list zones');
    return data;
  }

  async getZoneDetails(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/zones/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch zone details');
    return data;
  }

  async createZone(dto: CreateZoneDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/zones`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create zone');
    return data;
  }

  async updateZone(id: string, dto: any): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/zones/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update zone');
    return data;
  }

  async upsertZoneSettings(id: string, dto: any): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/zones/${encodeURIComponent(id)}/settings`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update zone settings');
    return data;
  }

  async updateZoneSurge(id: string, dto: UpdateZoneSurgeDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/zones/${encodeURIComponent(id)}/surge`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update surge pricing');
    return data;
  }

  async testServiceability(lat: number, lng: number, verticalType = 'FOOD'): Promise<any> {
    const query = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      verticalType,
    });
    const res = await fetch(`${API_BASE}/v1/zones/serviceability?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to check serviceability');
    return data;
  }
}

export const zonesApi = new ZonesApi();
