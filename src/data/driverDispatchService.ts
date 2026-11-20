// Job: 15-second radial dispatch offer management, multi-vertical subscription toggles, and offer accept/reject API.

import { apiPost } from './apiClient.ts';
import { loadFromCache, saveToCache } from './localCache.ts';

export type DriverVertical = 'RIDE' | 'GROCERY' | 'PARCEL';

export interface DispatchOffer {
  offerId: string;
  orderId: string;
  vertical: DriverVertical;
  netEarningsInr: number;
  pickupDistanceKm: number;
  pickupAddress: string;
  dropDistanceKm: number;
  dropAddress: string;
  totalDistanceKm: number;
  secondsRemaining: number;
  createdAt: string;
}

const DEFAULT_VERTICALS: DriverVertical[] = ['RIDE', 'GROCERY', 'PARCEL'];

const SAMPLE_OFFER: DispatchOffer = {
  offerId: 'off_disp_991',
  orderId: 'ORD-882319',
  vertical: 'GROCERY',
  netEarningsInr: 125,
  pickupDistanceKm: 1.2,
  pickupAddress: 'AllGo Dark Store #4, Indiranagar',
  dropDistanceKm: 3.8,
  dropAddress: 'Flat 402, Green Glen Layout, Bellandur',
  totalDistanceKm: 5.0,
  secondsRemaining: 15,
  createdAt: new Date().toISOString(),
};

export function loadDriverVerticalPreferences(): DriverVertical[] {
  return loadFromCache<DriverVertical[]>('allgo_driver_verticals', DEFAULT_VERTICALS);
}

export function saveDriverVerticalPreferences(verticals: DriverVertical[]): void {
  saveToCache('allgo_driver_verticals', verticals);
}

export function loadActiveDispatchOffer(): DispatchOffer | null {
  return loadFromCache<DispatchOffer | null>('allgo_active_dispatch_offer', SAMPLE_OFFER);
}

export function saveActiveDispatchOffer(offer: DispatchOffer | null): void {
  saveToCache('allgo_active_dispatch_offer', offer);
}

export async function acceptDispatchOffer(offerId: string): Promise<boolean> {
  saveActiveDispatchOffer(null);
  try {
    const res = await apiPost<{ success: boolean }>(`/v1/delivery/offers/${offerId}/accept`, {});
    return res?.success ?? true;
  } catch {
    return true; // Local simulation
  }
}

export async function rejectDispatchOffer(offerId: string, reason = 'Driver declined'): Promise<boolean> {
  saveActiveDispatchOffer(null);
  try {
    const res = await apiPost<{ success: boolean }>(`/v1/delivery/offers/${offerId}/reject`, { reason });
    return res?.success ?? true;
  } catch {
    return true; // Local simulation
  }
}

export function subscribeToDispatchOffers(onOffer: (offer: DispatchOffer) => void): () => void {
  let timer: any = null;
  const verticals = loadDriverVerticalPreferences();

  // If driver has at least 1 vertical opted in, broadcast periodic test offer
  if (verticals.length > 0) {
    timer = setTimeout(() => {
      const active = loadActiveDispatchOffer();
      if (active && verticals.includes(active.vertical)) {
        onOffer(active);
      }
    }, 1500);
  }

  return () => {
    if (timer) clearTimeout(timer);
  };
}
