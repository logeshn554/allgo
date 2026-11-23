import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { PaymentService } from '../ordering/services/payment.service.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelPricingService } from './parcel-pricing.service.js';
import { ParcelDispatchService } from './parcel-dispatch.service.js';
import { ParcelRepository } from './data/parcel.repository.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
import { CreateParcelBookingDto, PayParcelDto, CancelParcelDto } from './dto/parcel.dto.js';
import { formatCustomerParcel } from './parcel-formatting.helper.js';

@Injectable()
export class ParcelBookingService {
  private readonly logger = new Logger(ParcelBookingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly parcelRepo: ParcelRepository,
    private readonly eventRepo: ParcelEventRepository,
    private readonly pricingService: ParcelPricingService,
    private readonly dispatchService: ParcelDispatchService,
    private readonly paymentService: PaymentService,
    private readonly continuityService: PartnerContinuityService
  ) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  private generateOtp(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  async createBooking(customerId: string, dto: CreateParcelBookingDto): Promise<any> {
    const quote = await this.pricingService.calculateQuote(
      {
        pickupLocation: dto.pickupLocation,
        dropoffLocation: dto.dropoffLocation,
        packageCategory: dto.packageCategory || 'GENERAL',
        vehicleType: dto.vehicleType || 'TWO_WHEELER',
        isFragile: Boolean(dto.isFragile),
        weightKg: dto.weightKg,
        lengthCm: dto.lengthCm,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        serviceType: dto.serviceType || 'STANDARD',
        declaredValueInr: dto.declaredValueInr,
      },
      customerId
    );

    const parcelNumber = `PCL-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const pickupOtp = this.generateOtp();
    const deliveryOtp = this.generateOtp();
    const cityId = await this.parcelRepo.getDefaultCityId();

    const paymentMethod = dto.paymentMethod || 'ONLINE';
    const initialStatus = paymentMethod === 'COD' ? 'BOOKED' : 'PAYMENT_PENDING';
    const paymentStatus = paymentMethod === 'COD' ? 'AUTHORIZED' : 'PENDING';

    const parcel = await this.db.transaction(async (client) => {
      const created = await this.parcelRepo.insertParcel(client, {
        parcelNumber, customerId, cityId, zoneId: quote.zoneId || null, initialStatus,
        pickupAddress: dto.pickupAddress, pickupLon: dto.pickupLocation.longitude, pickupLat: dto.pickupLocation.latitude,
        pickupContactName: dto.pickupContactName, pickupContactPhone: dto.pickupContactPhone,
        dropAddress: dto.dropoffAddress, dropLon: dto.dropoffLocation.longitude, dropLat: dto.dropoffLocation.latitude,
        recipientName: dto.recipientName, recipientPhone: dto.recipientPhone,
        packageCategory: (dto.packageCategory || 'GENERAL').toUpperCase(),
        vehicleType: dto.vehicleType || 'TWO_WHEELER',
        weightKg: dto.weightKg,
        packageDescription: dto.packageDescription || 'Parcel package', packageQuantity: dto.packageQuantity || 1,
        lengthCm: dto.lengthCm || 20.0, widthCm: dto.widthCm || 15.0, heightCm: dto.heightCm || 10.0,
        declaredValueInr: dto.declaredValueInr || 0.0, handlingInstructions: dto.handlingInstructions || null,
        isFragile: dto.isFragile || false, serviceType: quote.serviceType,
        requestedPickupTime: dto.requestedPickupTime ? new Date(dto.requestedPickupTime) : null,
        priceSnapshot: JSON.stringify(quote), paymentMethod, paymentStatus, pickupOtp, deliveryOtp,
        pickupOtpHash: this.hashOtp(pickupOtp), deliveryOtpHash: this.hashOtp(deliveryOtp),
        otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        deliveryFeeInr: quote.distanceFareInr + quote.baseFareInr + quote.weightFareInr,
        platformFeeInr: quote.platformFeeInr, taxTotalInr: quote.gstInr,
        totalAmountInr: quote.totalAmountInr, partnerPayoutInr: quote.partnerPayoutInr,
      });

      await this.eventRepo.recordEvent({
        parcelId: created.id, eventType: initialStatus, fromStatus: null, toStatus: initialStatus,
        actorId: customerId, actorRole: 'CUSTOMER', reason: 'Parcel delivery booking created', metadata: { quote },
      }, client);

      return created;
    });

    if (paymentMethod === 'COD') {
      setImmediate(async () => {
        try {
          await this.dispatchService.requestDispatch(parcel.id);
        } catch (e: any) {
          this.logger.warn(`Auto-dispatch trigger failed: ${e.message}`);
        }
      });
    }

    this.logger.log(`Created parcel booking ${parcel.parcel_number} (${initialStatus})`);
    return formatCustomerParcel(parcel, customerId);
  }

  async payBooking(customerId: string, parcelId: string, dto: PayParcelDto): Promise<any> {
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (parcel.customer_id !== customerId && parcel.sender_id !== customerId) {
      throw new ForbiddenException('You do not own this parcel booking');
    }

    if (parcel.status !== 'PAYMENT_PENDING' && parcel.payment_status === 'COMPLETED') {
      throw new BadRequestException(`Parcel is not in payment pending state (current status: ${parcel.status})`);
    }

    const idempotencyKey = dto.idempotencyKey || `idem-pcl-${parcel.id}-${Date.now()}`;

    const paymentResult = await this.paymentService.initiatePayment(
      parcel.id,
      parcel.id,
      customerId,
      (dto.paymentMethod as any) || 'UPI',
      Number(parcel.total_amount_inr),
      idempotencyKey
    );

    if (dto.gatewayPaymentId && dto.gatewaySignature) {
      await this.paymentService.confirmPayment(
        paymentResult.transactionId,
        dto.gatewayPaymentId,
        dto.gatewaySignature
      );
    }

    const transCheck = await this.db.query(
      `SELECT * FROM payment_transactions WHERE id = $1;`,
      [paymentResult.transactionId]
    );
    const trans = transCheck.rows[0];
    const isPaid = trans && (trans.status === 'CAPTURED' || trans.status === 'AUTHORIZED');

    if (!isPaid) {
      return {
        paymentRequired: true,
        transactionId: paymentResult.transactionId,
        gatewayOrderId: paymentResult.gatewayOrderId,
        amountInr: paymentResult.amountInr,
        status: trans?.status || 'PENDING',
      };
    }

    await this.db.transaction(async (client) => {
      await this.parcelRepo.updateParcelStatus(parcelId, 'PAYMENT_CONFIRMED', {
        payment_status: 'COMPLETED', payment_reference: trans.gateway_payment_id || trans.gateway_order_id,
      }, client);

      await this.eventRepo.recordEvent({
        parcelId, eventType: 'PAYMENT_CONFIRMED', fromStatus: 'PAYMENT_PENDING', toStatus: 'PAYMENT_CONFIRMED',
        actorId: customerId, actorRole: 'CUSTOMER', reason: 'Payment captured successfully',
        metadata: { transactionId: trans.id, method: dto.paymentMethod },
      }, client);
    });

    setImmediate(async () => {
      try {
        await this.dispatchService.requestDispatch(parcelId);
      } catch (e: any) {
        this.logger.warn(`Dispatch request failed: ${e.message}`);
      }
    });

    const updated = await this.parcelRepo.findByIdWithDetails(parcelId);
    return formatCustomerParcel(updated, customerId);
  }

  async cancelBooking(
    userId: string,
    role: string,
    parcelId: string,
    dto: CancelParcelDto
  ): Promise<any> {
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    if (['CANCELLED', 'RETURNED_TO_SENDER', 'DELIVERED'].includes(parcel.status)) {
      throw new BadRequestException(`Cannot cancel parcel with current status: ${parcel.status}`);
    }

    if (role === 'CUSTOMER') {
      if (parcel.customer_id !== userId && parcel.sender_id !== userId) {
        throw new ForbiddenException('You do not own this parcel booking');
      }
      if (['PICKED_UP', 'IN_TRANSIT', 'ARRIVING_AT_DESTINATION', 'DELIVERED'].includes(parcel.status)) {
        throw new BadRequestException(`Cannot cancel parcel after pickup (current status: ${parcel.status})`);
      }
    }

    const updated = await this.db.transaction(async (client) => {
      const res = await this.parcelRepo.updateParcelStatus(
        parcelId,
        'CANCELLED',
        { cancellation_reason: dto.reason },
        client
      );

      await client.query(
        `UPDATE parcel_assignments SET status = 'CANCELLED' WHERE parcel_id = $1 AND status = 'OFFERED';`,
        [parcelId]
      );

      await this.eventRepo.recordEvent(
        {
          parcelId,
          eventType: 'CANCELLED',
          fromStatus: parcel.status,
          toStatus: 'CANCELLED',
          actorId: userId,
          actorRole: role,
          reason: `Booking cancelled: ${dto.reason}`,
        },
        client
      );

      return res;
    });

    if (parcel.partner_id) {
      await this.continuityService.releaseVerticalLock(parcel.partner_id);
    }

    return updated;
  }
}
