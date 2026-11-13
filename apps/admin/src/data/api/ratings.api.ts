import { API_BASE, getAdminHeaders } from './base-client';

export class RatingsApi {
  async listRatings(limit = 50, offset = 0): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/ratings?limit=${limit}&offset=${offset}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list ratings');
    return data;
  }

  async moderateRating(id: string, isHidden: boolean, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/ratings/${encodeURIComponent(id)}/moderate`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ isHidden, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to moderate rating');
    return data;
  }
}

export const ratingsApi = new RatingsApi();
