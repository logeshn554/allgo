import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

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

  Widget _buildOfferCard({
    required BuildContext context,
    required String title,
    required String payout,
    required String pickup,
    required String dropoff,
    required VoidCallback onAccept,
    required VoidCallback onReject,
    Color accentColor = AllGoColors.primary,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withOpacity(0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accentColor.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: AllGoTypography.heading3.copyWith(fontSize: 16, color: accentColor)),
              Text(payout, style: AllGoTypography.heading2.copyWith(color: AllGoColors.success)),
            ],
          ),
          const SizedBox(height: 8),
          Text('Pickup: $pickup', style: AllGoTypography.caption),
          Text('Dropoff: $dropoff', style: AllGoTypography.caption),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: isActionBusy ? null : onReject,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AllGoColors.error,
                    side: const BorderSide(color: AllGoColors.error),
                  ),
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: isActionBusy ? null : onAccept,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AllGoColors.success,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Accept Offer'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...deliveryOffers.map((o) => _buildOfferCard(
              context: context,
              title: 'New Delivery Offer',
              payout: '₹${o.estimatedEarnings}',
              pickup: o.pickupAddress,
              dropoff: o.destinationAddress,
              onAccept: () => onAcceptDelivery(o.attemptId),
              onReject: () => onRejectDelivery(o.attemptId),
            )),
        ...parcelOffers.map((p) => _buildOfferCard(
              context: context,
              title: 'New Parcel Courier Offer',
              payout: '₹${p.partnerEarnings}',
              pickup: p.pickupAddress,
              dropoff: p.dropoffAddress,
              onAccept: () => onAcceptParcel(p.attemptId),
              onReject: () => onRejectParcel(p.attemptId),
              accentColor: Colors.deepPurple,
            )),
        ...rideOffers.map((r) => _buildOfferCard(
              context: context,
              title: 'New Ride Offer (${r.serviceType})',
              payout: '₹${r.estimatedFare}',
              pickup: r.pickupAddress,
              dropoff: r.destinationAddress,
              onAccept: () => onAcceptRide(r.attemptId),
              onReject: () => onRejectRide(r.attemptId),
              accentColor: Colors.teal,
            )),
      ],
    );
  }
}
