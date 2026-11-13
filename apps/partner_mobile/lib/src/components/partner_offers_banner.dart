import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'driver_acceptance_countdown_card.dart';

class PartnerOffersBanner extends StatelessWidget {
  final List<DeliveryOfferModel> deliveryOffers;
  final List<ParcelOffer> parcelOffers;
  final List<RideOfferModel> rideOffers;
  final bool isActionBusy;
  final void Function(String attemptId) onAcceptDelivery;
  final void Function(String attemptId) onRejectDelivery;
  final void Function(String attemptId) onAcceptParcel;
  final void Function(String attemptId) onRejectParcel;
  final void Function(String attemptId) onAcceptRide;
  final void Function(String attemptId) onRejectRide;

  const PartnerOffersBanner({
    super.key,
    required this.deliveryOffers,
    required this.parcelOffers,
    required this.rideOffers,
    required this.isActionBusy,
    required this.onAcceptDelivery,
    required this.onRejectDelivery,
    required this.onAcceptParcel,
    required this.onRejectParcel,
    required this.onAcceptRide,
    required this.onRejectRide,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...deliveryOffers.map((o) => DriverAcceptanceCountdownCard(
              orderId: o.attemptId,
              verticalType: 'Food Delivery',
              pickupAddress: o.pickupAddress,
              dropoffAddress: o.destinationAddress,
              estimatedEarningsInr: o.estimatedEarnings,
              initialCountdownSeconds: 15,
              onAccept: () => onAcceptDelivery(o.attemptId),
              onReject: () => onRejectDelivery(o.attemptId),
            )),
        ...parcelOffers.map((p) => DriverAcceptanceCountdownCard(
              orderId: p.attemptId,
              verticalType: 'Parcel Courier',
              pickupAddress: p.pickupAddress,
              dropoffAddress: p.dropoffAddress,
              estimatedEarningsInr: p.partnerEarnings,
              initialCountdownSeconds: 15,
              onAccept: () => onAcceptParcel(p.attemptId),
              onReject: () => onRejectParcel(p.attemptId),
            )),
        ...rideOffers.map((r) => DriverAcceptanceCountdownCard(
              orderId: r.attemptId,
              verticalType: 'Ride (${r.serviceType})',
              pickupAddress: r.pickupAddress,
              dropoffAddress: r.destinationAddress,
              estimatedEarningsInr: r.estimatedFare,
              initialCountdownSeconds: 15,
              onAccept: () => onAcceptRide(r.attemptId),
              onReject: () => onRejectRide(r.attemptId),
            )),
      ],
    );
  }
}
