import crypto from 'node:crypto';
import type { DispatchRequest, DispatchOffer, DispatchCandidate } from './types.js';

export class StandaloneDispatchEngine {
  private readonly offers = new Map<string, DispatchOffer>();
  private readonly activeJobs = new Map<string, DispatchRequest>();

  requestDispatch(req: DispatchRequest, candidates: DispatchCandidate[]): DispatchOffer | null {
    this.activeJobs.set(req.jobId, req);
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
      throw new Error('Offer has expired');
    }

    offer.status = 'ACCEPTED';
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
