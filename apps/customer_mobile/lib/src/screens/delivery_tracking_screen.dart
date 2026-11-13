import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/delivery_tracking_stepper.dart';

class DeliveryTrackingScreen extends ConsumerStatefulWidget {
  final String jobId;

  const DeliveryTrackingScreen({
    super.key,
    required this.jobId,
  });

  @override
  ConsumerState<DeliveryTrackingScreen> createState() => _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState extends ConsumerState<DeliveryTrackingScreen> {
  bool _isLoading = true;
  DeliveryJobModel? _job;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadJob();
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) _loadJob();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadJob() async {
    try {
      final job = await ref.read(apiClientProvider).getCustomerDeliveryTracking(widget.jobId);
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

  int _stepForStatus(String status) {
    switch (status) {
      case 'ASSIGNED':
        return 0;
      case 'ARRIVED_PICKUP':
        return 1;
      case 'IN_TRANSIT':
        return 2;
      case 'ARRIVED_DESTINATION':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
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
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.map_outlined, size: 48, color: Colors.blue),
                            SizedBox(height: 8),
                            Text('Live Courier Telemetry Simulation', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DeliveryTrackingStepper(currentStep: _stepForStatus(_job!.status)),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Route Details', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
                            const SizedBox(height: 8),
                            Text('Pickup: ${_job!.pickupAddress}', style: AllGoTypography.bodyMedium),
                            const SizedBox(height: 6),
                            Text('Dropoff: ${_job!.destinationAddress}', style: AllGoTypography.bodyMedium),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
