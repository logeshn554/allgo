import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../components/active_delivery_card.dart';
import '../components/active_parcel_card.dart';
import '../components/active_ride_card.dart';
import '../components/active_hire_driver_card.dart';
import '../components/otp_verification_dialog.dart';
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
  final int completedJobsCount;
  final double totalEarnings;
  final bool isActionBusy;
  final double? currentLat;
  final double? currentLng;
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
    required this.completedJobsCount,
    required this.totalEarnings,
    required this.isActionBusy,
    this.currentLat,
    this.currentLng,
    required this.actions,
    required this.onRefresh,
    required this.onReportException,
  });

  Future<void> _promptChauffeurOtpAndOdometer(
    BuildContext context, {
    required String title,
    required String buttonLabel,
    required Future<void> Function(String otp, double odometerKm) onSubmit,
  }) async {
    final otpCtrl = TextEditingController();
    final odoCtrl = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 4,
              decoration: const InputDecoration(labelText: '4-Digit Customer PIN', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: odoCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Vehicle Odometer (km)', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(buttonLabel),
          ),
        ],
      ),
    );
    if (submitted == true) {
      final otp = otpCtrl.text.trim();
      final odo = double.tryParse(odoCtrl.text.trim()) ?? 0.0;
      if (otp.length >= 4 && odo > 0) {
        await onSubmit(otp, odo);
      } else if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a valid 4-digit PIN and positive odometer reading.')),
        );
      }
    }
    otpCtrl.dispose();
    odoCtrl.dispose();
  }

  Set<Marker> _buildMapMarkers() {
    final markers = <Marker>{};
    if (currentLat != null && currentLng != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('partner_self'),
          position: LatLng(currentLat!, currentLng!),
          infoWindow: const InfoWindow(title: 'Your Live Location'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ),
      );
    }
    if (activeJob?.pickupLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('job_pickup'),
          position: LatLng(activeJob!.pickupLocation!.latitude, activeJob!.pickupLocation!.longitude),
          infoWindow: InfoWindow(title: 'Pickup', snippet: activeJob!.pickupAddress),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        ),
      );
    }
    if (activeJob?.dropoffLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('job_dropoff'),
          position: LatLng(activeJob!.dropoffLocation!.latitude, activeJob!.dropoffLocation!.longitude),
          infoWindow: InfoWindow(title: 'Dropoff', snippet: activeJob!.dropoffAddress),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ),
      );
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final hasMapCenter = currentLat != null && currentLng != null;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        if (hasMapCenter) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 180,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: LatLng(currentLat!, currentLng!),
                  zoom: 14.5,
                ),
                myLocationEnabled: true,
                myLocationButtonEnabled: true,
                zoomControlsEnabled: false,
                markers: _buildMapMarkers(),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
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
                  customerName: activeJob!.customerName ?? activeJob!.destinationAddress,
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
            onVerifyPickupOtp: () async {
              final otp = await OtpVerificationDialog.show(
                context,
                title: 'Sender Pickup PIN',
                subtitle: 'Enter the 4-digit pickup PIN shared by the sender.',
                length: 4,
              );
              if (otp != null) {
                await actions.verifyParcelPickupOtp(activeParcel!.id, otp);
              }
            },
            onStartTransit: () => actions.startParcelTransit(activeParcel!.id),
            onArrivedDestination: () => actions.confirmParcelArrivedDestination(activeParcel!.id),
            onVerifyDeliveryOtp: () async {
              final otp = await OtpVerificationDialog.show(
                context,
                title: 'Recipient Delivery PIN',
                subtitle: 'Enter the 4-digit delivery PIN shared by the recipient.',
                length: 4,
              );
              if (otp != null) {
                await actions.verifyParcelDeliveryOtp(activeParcel!.id, otp);
              }
            },
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
            onStartTrip: () async {
              final otp = await OtpVerificationDialog.show(
                context,
                title: 'Start Ride PIN',
                subtitle: 'Ask the passenger for their 4-digit ride start PIN.',
                length: 4,
              );
              if (otp != null) {
                await actions.driverStartTrip(activeRide!.id, otp);
              }
            },
            onCompleteTrip: () => actions.driverCompleteTrip(activeRide!.id),
          ),
          const SizedBox(height: 16),
        ],
        if (activeHireDriver != null) ...[
          ActiveHireDriverCard(
            activeHireDriver: activeHireDriver!,
            isActionBusy: isActionBusy,
            onArrived: () => actions.arrivedHireDriver(activeHireDriver!.id),
            onStartDuty: () => _promptChauffeurOtpAndOdometer(
              context,
              title: 'Start Chauffeur Duty',
              buttonLabel: 'Start Duty',
              onSubmit: (otp, odo) => actions.startHireDuty(activeHireDriver!.id, otp, odo),
            ),
            onEndDuty: () => _promptChauffeurOtpAndOdometer(
              context,
              title: 'End Chauffeur Duty',
              buttonLabel: 'End Duty',
              onSubmit: (otp, odo) => actions.endHireDuty(activeHireDriver!.id, otp, odo),
            ),
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
        PartnerMetricsCard(
          completedJobsCount: completedJobsCount,
          totalEarnings: totalEarnings,
        ),
      ],
    );
  }
}
