import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelRepository } from './data/parcel.repository.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
import { FailedDeliveryAttemptDto, ReturnToSenderDto } from './dto/parcel.dto.js';

@Injectable()
export class ParcelLifecycleService {
  constructor(
    private readonly db: DatabaseService,
    private readonly parcelRepo: ParcelRepository,
    private readonly eventRepo: ParcelEventRepository,
    private readonly continuityService: PartnerContinuityService
  ) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  async confirmArrivedPickup(partnerUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException('Not assigned to this parcel');
    if (parcel.status !== 'PARTNER_ASSIGNED' && parcel.status !== 'PARTNER_ACCEPTED' && parcel.status !== 'ACCEPTED') {
      throw new BadRequestException(`Cannot mark arriving at pickup from status: ${parcel.status}`);
    }

    const res = await this.parcelRepo.updateParcelStatus(parcelId, 'ARRIVING_AT_PICKUP');
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'ARRIVING_AT_PICKUP', fromStatus: parcel.status,
      toStatus: 'ARRIVING_AT_PICKUP', actorId: partnerUserId, actorRole: 'PARTNER',
      reason: 'Courier arrived at pickup address',
    });
    return res;
  }

  async verifyPickupOtp(partnerUserId: string, parcelId: string, otp: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException(`Not assigned to this parcel`);
    if (parcel.status !== 'ARRIVING_AT_PICKUP') {
      throw new BadRequestException(`Cannot verify pickup from status: ${parcel.status}. Courier must first arrive at pickup location.`);
    }
    if (parcel.otp_expires_at && new Date() > new Date(parcel.otp_expires_at)) {
      throw new BadRequestException('Sender pickup OTP has expired. Please contact support.');
    }
    if (parcel.pickup_otp_attempts >= 5) {
      throw new BadRequestException('Maximum pickup verification attempts exceeded. Please contact AllGo dispatch support.');
    }

    const inputHash = this.hashOtp(otp);
    const expectedHash = parcel.pickup_otp_hash || (parcel.pickup_otp ? this.hashOtp(parcel.pickup_otp) : null);
    if (!expectedHash) throw new BadRequestException('No pickup OTP configured for this parcel.');

    const inBuf = Buffer.from(inputHash);
    const expBuf = Buffer.from(expectedHash);
    const isMatch = inBuf.length === expBuf.length && crypto.timingSafeEqual(inBuf, expBuf);

    if (!isMatch) {
      await this.parcelRepo.incrementPickupOtpAttempts(parcelId);
      throw new BadRequestException('Invalid sender pickup OTP. Please verify with the sender.');
    }

    return this.db.transaction(async (client) => {
      const updated = await this.parcelRepo.updateParcelStatus(
        parcelId, 'PICKED_UP', { picked_up_at: new Date() }, client
      );
      await this.eventRepo.recordEvent({
        parcelId, eventType: 'PICKED_UP', fromStatus: parcel.status, toStatus: 'PICKED_UP',
        actorId: partnerUserId, actorRole: 'PARTNER',
        reason: 'Courier completed sender package handover with verified OTP',
      }, client);
      return updated;
    });
  }

  async startTransit(partnerUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException('Not assigned to this parcel');
    if (parcel.status !== 'PICKED_UP') {
      throw new BadRequestException(`Cannot start transit from status: ${parcel.status}`);
    }

    const res = await this.parcelRepo.updateParcelStatus(parcelId, 'IN_TRANSIT');
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'IN_TRANSIT', fromStatus: 'PICKED_UP', toStatus: 'IN_TRANSIT',
      actorId: partnerUserId, actorRole: 'PARTNER', reason: 'Courier en route to dropoff destination',
    });
    return res;
  }

  async confirmArrivedDestination(partnerUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException('Not assigned to this parcel');
    if (parcel.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Cannot mark arriving at destination from status: ${parcel.status}. Package must be in transit.`);
    }

    const res = await this.parcelRepo.updateParcelStatus(parcelId, 'ARRIVING_AT_DESTINATION');
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'ARRIVING_AT_DESTINATION', fromStatus: parcel.status,
      toStatus: 'ARRIVING_AT_DESTINATION', actorId: partnerUserId, actorRole: 'PARTNER',
      reason: 'Courier arrived at recipient dropoff address',
    });
    return res;
  }

  async verifyDelivery(
    partnerUserId: string,
    parcelId: string,
    otp: string,
    photoUrl?: string
  ): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException('Not assigned to this parcel');
    if (!['ARRIVING_AT_DESTINATION', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot verify delivery from status: ${parcel.status}. Package must be arriving at destination or in transit.`);
    }
    if (parcel.otp_expires_at && new Date() > new Date(parcel.otp_expires_at)) {
      throw new BadRequestException('Recipient delivery OTP has expired. Please contact support.');
    }
    if (parcel.delivery_otp_attempts >= 5) {
      throw new BadRequestException('Maximum delivery verification attempts exceeded. Support escalation required.');
    }

    const inputHash = this.hashOtp(otp);
    const expectedHash = parcel.delivery_otp_hash || (parcel.delivery_otp ? this.hashOtp(parcel.delivery_otp) : null);
    if (!expectedHash) throw new BadRequestException('No delivery OTP configured for this parcel.');

    const inBuf = Buffer.from(inputHash);
    const expBuf = Buffer.from(expectedHash);
    const isMatch = inBuf.length === expBuf.length && crypto.timingSafeEqual(inBuf, expBuf);

    if (!isMatch) {
      await this.parcelRepo.incrementDeliveryOtpAttempts(parcelId);
      throw new BadRequestException('Invalid recipient delivery OTP. Please verify with the recipient.');
    }

    const updated = await this.db.transaction(async (client) => {
      const res = await this.parcelRepo.updateParcelStatus(
        parcelId, 'DELIVERED', { delivered_at: new Date(), payment_status: 'COMPLETED', delivery_proof_photo_url: photoUrl || null }, client
      );
      const payout = Number(parcel.partner_payout_inr);
      await client.query(
        `INSERT INTO partner_earnings_entries (partner_id, entry_type, base_amount_inr, total_earned_inr, notes)
         VALUES ($1, 'DELIVERY_PAY', $2, $3, $4);`,
        [partner.id, payout, payout, `Completed parcel delivery ${parcel.parcel_number}`]
      );
      await this.eventRepo.recordEvent({
        parcelId, eventType: 'DELIVERED', fromStatus: parcel.status, toStatus: 'DELIVERED',
        actorId: partnerUserId, actorRole: 'PARTNER',
        reason: 'Package successfully handed over to recipient with verified delivery OTP',
        metadata: { photoUrl: photoUrl || null },
      }, client);
      return res;
    });

    await this.continuityService.releaseVerticalLock(partner.id);
    return updated;
  }

  async recordFailedAttempt(partnerUserId: string, parcelId: string, dto: FailedDeliveryAttemptDto): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id) throw new ForbiddenException('Not assigned to this parcel');
    if (!['ARRIVING_AT_DESTINATION', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot record failed delivery from status: ${parcel.status}. Package must be in transit or arriving at destination.`);
    }

    const res = await this.parcelRepo.updateParcelStatus(parcelId, 'DELIVERY_FAILED', { failed_attempt_reason: dto.reason });
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'DELIVERY_FAILED', fromStatus: parcel.status, toStatus: 'DELIVERY_FAILED',
      actorId: partnerUserId, actorRole: 'PARTNER', reason: `Delivery attempt failed: ${dto.reason}`,
    });
    return res;
  }

  async initiateReturn(userId: string, role: string, parcelId: string, dto: ReturnToSenderDto): Promise<any> {
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);
    if (role === 'PARTNER') {
      const partner = await this.continuityService.getPartnerByUserId(userId);
      if (parcel.partner_id !== partner.id && parcel.return_assigned_partner_id !== partner.id) {
        throw new ForbiddenException('Not assigned to this parcel');
      }
    }
    if (!['DELIVERY_FAILED', 'DELIVERY_ATTEMPTED', 'ARRIVING_AT_DESTINATION', 'IN_TRANSIT'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot initiate return from status: ${parcel.status}. Package must have failed delivery or be in transit.`);
    }

    const res = await this.parcelRepo.updateParcelStatus(
      parcelId, 'RETURN_INITIATED', { return_reason: dto.reason, return_initiated_at: new Date() }
    );
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'RETURN_INITIATED', fromStatus: parcel.status, toStatus: 'RETURN_INITIATED',
      actorId: userId, actorRole: role, reason: `Return to sender initiated: ${dto.reason}`,
    });
    return res;
  }

  async completeReturn(partnerUserId: string, parcelId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.partner_id !== partner.id && parcel.return_assigned_partner_id !== partner.id) {
      throw new ForbiddenException('Not assigned to this parcel return');
    }
    if (!['RETURN_INITIATED', 'RETURN_IN_PROGRESS', 'RETURN_IN_TRANSIT'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot complete return from status: ${parcel.status}. Return must be initiated.`);
    }

    const res = await this.parcelRepo.updateParcelStatus(
      parcelId, 'RETURNED_TO_SENDER', { return_completed_at: new Date() }
    );
    await this.eventRepo.recordEvent({
      parcelId, eventType: 'RETURNED_TO_SENDER', fromStatus: parcel.status, toStatus: 'RETURNED_TO_SENDER',
      actorId: partnerUserId, actorRole: 'PARTNER', reason: 'Package successfully returned and handed back to sender',
    });
    await this.continuityService.releaseVerticalLock(partner.id);
    return res;
  }
}
