import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../screens/chat_with_driver_screen.dart';

class ActiveRideTrackingView extends StatelessWidget {
  final RideModel ride;
  final double pickupLat;
  final double pickupLng;
  final double destLat;
  final double destLng;
  final double? driverLat;
  final double? driverLng;
  final bool isCancelling;
  final bool isTriggeringSos;
  final VoidCallback onCancel;
  final VoidCallback onTriggerSos;

  const ActiveRideTrackingView({
    super.key,
    required this.ride,
    required this.pickupLat,
    required this.pickupLng,
    required this.destLat,
    required this.destLng,
    this.driverLat,
    this.driverLng,
    required this.isCancelling,
    required this.isTriggeringSos,
    required this.onCancel,
    required this.onTriggerSos,
  });

  Future<void> _callDriver() async {
    final phone = ride.driverPhone;
    if (phone == null || phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _shareRide() {
    final ref = ride.rideNumber.isNotEmpty ? ride.rideNumber : ride.id;
    Share.share('Track my AllGo Ride #$ref live: https://allgo.app/rides/$ref');
  }

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(pickupLat, pickupLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'Pickup'),
      ),
      Marker(
        markerId: const MarkerId('dropoff'),
        position: LatLng(destLat, destLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Destination'),
      ),
      if (driverLat != null && driverLng != null)
        Marker(
          markerId: const MarkerId('captain'),
          position: LatLng(driverLat!, driverLng!),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: InfoWindow(title: ride.driverName ?? 'AllGo Captain'),
        ),
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 220,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(driverLat ?? pickupLat, driverLng ?? pickupLng),
                zoom: 14.5,
              ),
              markers: markers,
              polylines: {
                Polyline(
                  polylineId: const PolylineId('ride_route'),
                  color: AllGoColors.primary,
                  width: 4,
                  points: [LatLng(pickupLat, pickupLng), LatLng(destLat, destLng)],
                ),
              },
              zoomControlsEnabled: false,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${ride.serviceType.replaceAll('_', ' ')} Ride', style: AllGoTypography.heading3),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.share_outlined, size: 20),
                          tooltip: 'Share Ride',
                          onPressed: _shareRide,
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            ride.status,
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.teal.shade900),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (ride.startOtp != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Start Ride PIN (Share with Captain):', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text(ride.startOtp!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.brown)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                if (ride.driverName != null || ride.driverVehicle != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AllGoColors.background,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AllGoColors.divider),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: AllGoColors.primary,
                          child: Icon(Icons.person, color: Colors.white),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ride.driverName ?? 'Assigned Captain',
                                style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
                              ),
                              if (ride.driverVehicle != null)
                                Text(ride.driverVehicle!, style: AllGoTypography.caption),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chat_bubble_outline, color: AllGoColors.primary),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ChatWithDriverScreen(
                                  driverName: ride.driverName ?? 'AllGo Captain',
                                  driverPhone: ride.driverPhone,
                                  orderId: ride.id,
                                ),
                              ),
                            );
                          },
                        ),
                        if (ride.driverPhone != null && ride.driverPhone!.isNotEmpty)
                          IconButton(
                            icon: const Icon(Icons.call, color: AllGoColors.success),
                            onPressed: _callDriver,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Text('Pickup: ${ride.pickupAddress}', style: AllGoTypography.bodyMedium),
                const SizedBox(height: 6),
                Text('Destination: ${ride.destinationAddress}', style: AllGoTypography.bodyMedium),
                const SizedBox(height: 8),
                Text(
                  'Estimated Fare: ₹${ride.totalFareInr.toStringAsFixed(0)}',
                  style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold, color: AllGoColors.primary),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.warning, color: Colors.red),
                        label: const Text('SOS Safety'),
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
                        onPressed: isTriggeringSos ? null : onTriggerSos,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (ride.status == 'REQUESTED' || ride.status == 'SEARCHING' || ride.status == 'DRIVER_ASSIGNED')
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isCancelling ? null : onCancel,
                          child: const Text('Cancel Ride'),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
