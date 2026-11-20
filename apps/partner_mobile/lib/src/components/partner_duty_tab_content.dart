import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../components/active_delivery_card.dart';
import '../components/active_parcel_card.dart';
import '../components/active_ride_card.dart';
import '../components/active_hire_driver_card.dart';
import '../components/partner_offers_banner.dart';
import '../components/partner_metrics_card.dart';
import '../components/proof_of_delivery_modal.dart';
import '../data/partner_job_actions.dart';

class PartnerDutyTabContent extends StatelessWidget {
  final DeliveryJobModel? activeJob;
  final ParcelModel? activeParcel;
  final RideModel? activeRide;
  final HireDriverBookingModel? activeHireDriver;
  final List<DeliveryOfferModel> activeOffers;
  final List<ParcelOffer> activeParcelOffers;
  final List<RideOfferModel> activeRideOffers;
  final bool isActionBusy;
  final PartnerJobActions actions;
  final VoidCallback onRefresh;
  final void Function(String jobId) onReportException;

  const PartnerDutyTabContent({
    super.key,
    required this.activeJob,
    required this.activeParcel,
    required this.activeRide,
    required this.activeHireDriver,
    required this.activeOffers,
    required this.activeParcelOffers,
    required this.activeRideOffers,
    required this.isActionBusy,
    required this.actions,
    required this.onRefresh,
    required this.onReportException,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        if (activeJob != null) ...[
          ActiveDeliveryCard(
            activeJob: activeJob!,
            isActionBusy: isActionBusy,
            onArrivedPickup: () => actions.arrivedPickup(activeJob!.id),
            onStartDelivery: () => actions.startDelivery(activeJob!.id),
            onArrivedDestination: () => actions.arrivedDestination(activeJob!.id),
            onCompleteDelivery: () {
              showDialog(
                context: context,
                builder: (_) => ProofOfDeliveryModal(
                  jobId: activeJob!.id,
                  customerName: activeJob!.destinationAddress,
                  onConfirmDelivery: (otp, photoKey) async {
                    await actions.completeDelivery(activeJob!.id, otp, photoKey: photoKey);
                    onRefresh();
                  },
                ),
              );
            },
            onReportException: () => onReportException(activeJob!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (activeParcel != null) ...[
          ActiveParcelCard(
            activeParcel: activeParcel!,
            isActionBusy: isActionBusy,
            onArrivedPickup: () => actions.confirmParcelArrivedPickup(activeParcel!.id),
            onVerifyPickupOtp: () => actions.verifyParcelPickupOtp(activeParcel!.id, '1234'),
            onStartTransit: () => actions.startParcelTransit(activeParcel!.id),
            onArrivedDestination: () => actions.confirmParcelArrivedDestination(activeParcel!.id),
            onVerifyDeliveryOtp: () => actions.verifyParcelDeliveryOtp(activeParcel!.id, '5678'),
            onRecordFailure: () => actions.rejectParcelOffer(activeParcel!.id),
            onInitiateReturn: () => actions.rejectParcelOffer(activeParcel!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (activeRide != null) ...[
          ActiveRideCard(
            activeRide: activeRide!,
            isActionBusy: isActionBusy,
            onArrivedPickup: () => actions.driverArrivedRide(activeRide!.id),
            onStartTrip: () => actions.driverStartTrip(activeRide!.id, '1234'),
            onCompleteTrip: () => actions.driverCompleteTrip(activeRide!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (activeHireDriver != null) ...[
          ActiveHireDriverCard(
            activeHireDriver: activeHireDriver!,
            isActionBusy: isActionBusy,
            onArrived: onRefresh,
            onStartDuty: onRefresh,
            onEndDuty: onRefresh,
          ),
          const SizedBox(height: 16),
        ],
        if (activeOffers.isNotEmpty || activeParcelOffers.isNotEmpty || activeRideOffers.isNotEmpty) ...[
          PartnerOffersBanner(
            deliveryOffers: activeOffers,
            parcelOffers: activeParcelOffers,
            rideOffers: activeRideOffers,
            isActionBusy: isActionBusy,
            onAcceptDelivery: (id) => actions.acceptOffer(id),
            onRejectDelivery: (id) => actions.rejectOffer(id),
            onAcceptParcel: (id) => actions.acceptParcelOffer(id),
            onRejectParcel: (id) => actions.rejectParcelOffer(id),
            onAcceptRide: (id) => actions.acceptRideOffer(id),
            onRejectRide: (id) => actions.rejectRideOffer(id),
          ),
          const SizedBox(height: 16),
        ],
        const PartnerMetricsCard(completedJobsCount: 8, totalEarnings: 1420),
      ],
    );
  }
}
