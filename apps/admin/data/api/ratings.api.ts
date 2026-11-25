import { adminFetch } from './base-client';

export class RatingsApi {
  async listRatings(limit = 50, offset = 0): Promise<any[]> {
    return adminFetch<any[]>(`/v1/admin/ratings?limit=${limit}&offset=${offset}`);
  }

  async moderateRating(id: string, isHidden: boolean, reason?: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/ratings/${encodeURIComponent(id)}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ isHidden, reason }),
    });
  }
}

export const ratingsApi = new RatingsApi();
