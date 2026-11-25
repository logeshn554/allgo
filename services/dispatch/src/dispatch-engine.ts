import crypto from 'node:crypto';
import type { DispatchCandidate, DispatchOffer, DispatchRequest } from './types.js';

export interface DispatchStore {
  saveOffer(offer: DispatchOffer): Promise<void>;
  getOffer(attemptId: string): Promise<DispatchOffer | null>;
  updateOfferStatus(attemptId: string, status: DispatchOffer['status']): Promise<DispatchOffer>;
  saveJob(job: DispatchRequest): Promise<void>;
  getJob(jobId: string): Promise<DispatchRequest | null>;
  getPendingOffersCount(): Promise<number>;
}

export class StandaloneDispatchEngine {
  private readonly offers = new Map<string, DispatchOffer>();
  private readonly activeJobs = new Map<string, DispatchRequest>();
  private readonly store?: DispatchStore;

  constructor(store?: DispatchStore) {
    this.store = store;
  }

  requestDispatch(req: DispatchRequest, candidates: DispatchCandidate[]): DispatchOffer | null {
    this.activeJobs.set(req.jobId, req);
    if (this.store) {
      this.store.saveJob(req).catch(() => {});
    }

    if (!candidates || candidates.length === 0) {
      return null;
    }

    const sorted = [...candidates].sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
    const chosen = sorted[0];
    if (!chosen) {
      return null;
    }

    const offer: DispatchOffer = {
      attemptId: `dsp_att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      jobId: req.jobId,
      partnerId: chosen.partnerId,
      status: 'PENDING',
      offerExpiresAt: new Date(Date.now() + 45000).toISOString(),
    };

    this.offers.set(offer.attemptId, offer);
    if (this.store) {
      this.store.saveOffer(offer).catch(() => {});
    }
    return offer;
  }

  acceptOffer(attemptId: string, partnerId: string): DispatchOffer {
    const offer = this.offers.get(attemptId);
    if (!offer) {
      throw new Error(`Offer ${attemptId} not found`);
    }
    if (offer.partnerId !== partnerId) {
      throw new Error(`Partner ${partnerId} not authorized for offer ${attemptId}`);
    }
    if (offer.status !== 'PENDING') {
      throw new Error(`Offer is not pending (status: ${offer.status})`);
    }
    if (new Date(offer.offerExpiresAt).getTime() < Date.now()) {
      offer.status = 'EXPIRED';
      if (this.store) this.store.updateOfferStatus(attemptId, 'EXPIRED').catch(() => {});
      throw new Error('Offer has expired');
    }

    offer.status = 'ACCEPTED';
    if (this.store) {
      this.store.updateOfferStatus(attemptId, 'ACCEPTED').catch(() => {});
    }
    return offer;
  }

  rejectOffer(attemptId: string, partnerId: string, _reason?: string): DispatchOffer {
    const offer = this.offers.get(attemptId);
    if (!offer) {
      throw new Error(`Offer ${attemptId} not found`);
    }
    if (offer.partnerId !== partnerId) {
      throw new Error(`Partner ${partnerId} not authorized`);
    }
    offer.status = 'REJECTED';
    if (this.store) {
      this.store.updateOfferStatus(attemptId, 'REJECTED').catch(() => {});
    }
    return offer;
  }

  getOffer(attemptId: string): DispatchOffer | undefined {
    return this.offers.get(attemptId);
  }

  getPendingOffersCount(): number {
    let count = 0;
    const now = Date.now();
    for (const offer of this.offers.values()) {
      if (offer.status === 'PENDING' && new Date(offer.offerExpiresAt).getTime() >= now) {
        count++;
      }
    }
    return count;
  }
}
