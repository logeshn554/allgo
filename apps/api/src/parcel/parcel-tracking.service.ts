import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ParcelRepository } from './data/parcel.repository.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
import { formatCustomerParcel } from './parcel-formatting.helper.js';

@Injectable()
export class ParcelTrackingService {
  constructor(
    private readonly parcelRepo: ParcelRepository,
    private readonly eventRepo: ParcelEventRepository
  ) {}

  async getParcelDetails(userId: string, role: string, parcelId: string): Promise<any> {
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    const isCustomer = parcel.customer_id === userId || parcel.sender_id === userId;
    const isCourier = role === 'PARTNER';
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isCustomer && !isCourier && !isAdmin) {
      throw new ForbiddenException('Not authorized to access this parcel booking');
    }

    return formatCustomerParcel(parcel, userId, role);
  }

  async listCustomerBookings(
    customerId: string,
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<any> {
    const rows = await this.parcelRepo.listByCustomerId(customerId, limit, offset, status);
    return rows.map((r: any) => formatCustomerParcel(r, customerId));
  }

  async getTracking(userId: string, role: string, parcelId: string): Promise<any> {
    const parcel = await this.getParcelDetails(userId, role, parcelId);

    let partnerLocation: any = null;
    if (parcel.partnerId) {
      partnerLocation = await this.parcelRepo.getPartnerLocation(parcel.partnerId);
    }

    return {
      parcelId: parcel.id,
      parcelNumber: parcel.parcelNumber,
      status: parcel.status,
      pickupAddress: parcel.pickupAddress,
      dropoffAddress: parcel.dropoffAddress,
      courier: parcel.courier,
      partnerLocation,
      events: await this.getEventTimeline(parcelId),
    };
  }

  async getEventTimeline(parcelId: string): Promise<any[]> {
    return this.eventRepo.listEventsByParcelId(parcelId);
  }

  async getReceipt(userId: string, role: string, parcelId: string): Promise<any> {
    const parcel = await this.getParcelDetails(userId, role, parcelId);

    return {
      parcelNumber: parcel.parcelNumber,
      serviceType: parcel.serviceType,
      createdAt: parcel.createdAt,
      pickupAddress: parcel.pickupAddress,
      dropoffAddress: parcel.dropoffAddress,
      weightKg: parcel.weightKg,
      packageCategory: parcel.packageCategory,
      deliveryFeeInr: Number(parcel.deliveryFeeInr || parcel.totalAmountInr - 5),
      platformFeeInr: Number(parcel.platformFeeInr || 5),
      taxTotalInr: Number(parcel.taxTotalInr || 0),
      totalAmountInr: Number(parcel.totalAmountInr),
      paymentMethod: parcel.paymentMethod,
      paymentStatus: parcel.paymentStatus,
      paymentReference: parcel.paymentReference,
    };
  }
}
