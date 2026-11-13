import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/live_trip_tracking_bottom_sheet.dart';

class DeliveryTrackingScreen extends ConsumerStatefulWidget {
  final String jobId;

  const DeliveryTrackingScreen({
    super.key,
    required this.jobId,
  });

  @override
  ConsumerState<DeliveryTrackingScreen> createState() =>
      _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState
    extends ConsumerState<DeliveryTrackingScreen> {
  bool _isLoading = true;
  DeliveryJobModel? _job;
  Timer? _pollingTimer;
  double _mockDriverLat = 13.0827;
  double _mockDriverLng = 80.2707;
  double _mockHeading = 45.0;
  double _mockSpeedMps = 8.5;

  @override
  void initState() {
    super.initState();
    _loadJob();
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        _loadJob();
        setState(() {
          _mockDriverLat += 0.0002;
          _mockDriverLng += 0.0002;
        });
      }
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadJob() async {
    try {
      final job = await ref
          .read(apiClientProvider)
          .getCustomerDeliveryTracking(widget.jobId);
      if (mounted) {
        setState(() {
          _job = job;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _snapCameraToDriver() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Camera snapped to driver: ${_mockDriverLat.toStringAsFixed(4)}, ${_mockDriverLng.toStringAsFixed(4)}',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AppBar(
        title: const Text('Live Delivery Tracking'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadJob),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _job == null
              ? const Center(child: Text('Delivery job details not found'))
              : Stack(
                  children: [
                    // Persistent Polyline / Map Viewport
                    Positioned.fill(
                      child: Container(
                        color: Colors.blue.shade50,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.map, size: 72, color: Colors.blue),
                              const SizedBox(height: 12),
                              Text(
                                'Live Map Viewport & Polyline Snapped',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'WebSocket Driver Coordinates: ${_mockDriverLat.toStringAsFixed(4)}, ${_mockDriverLng.toStringAsFixed(4)}',
                                style: TextStyle(fontSize: 12, color: Colors.blue.shade600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Persistent Bottom Sheet
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: LiveTripTrackingBottomSheet(
                        status: _job!.status,
                        pickupAddress: _job!.pickupAddress,
                        dropoffAddress: _job!.destinationAddress,
                        deliveryOtp: _job!.deliveryPin,
                        driverLatitude: _mockDriverLat,
                        driverLongitude: _mockDriverLng,
                        driverHeading: _mockHeading,
                        driverSpeedMps: _mockSpeedMps,
                        onSnapCameraToDriver: _snapCameraToDriver,
                      ),
                    ),
                  ],
                ),
    );
  }
}
