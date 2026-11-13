import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ActiveRideCard extends StatelessWidget {
  final RideModel activeRide;
  final bool isActionBusy;
  final VoidCallback onArrivedPickup;
  final VoidCallback onStartTrip;
  final VoidCallback onCompleteTrip;

  const ActiveRideCard({
    super.key,
    required this.activeRide,
    required this.isActionBusy,
    required this.onArrivedPickup,
    required this.onStartTrip,
    required this.onCompleteTrip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.teal.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.teal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${activeRide.serviceType.replaceAll('_', ' ')}: ${activeRide.status}',
                  style: AllGoTypography.caption.copyWith(
                    color: Colors.teal.shade800,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                'Ride #${activeRide.id.substring(0, 8)}',
                style: AllGoTypography.caption.copyWith(color: AllGoColors.textTertiary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Passenger Pickup', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeRide.pickupAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Passenger Destination', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeRide.destinationAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          if (activeRide.status == 'DRIVER_ASSIGNED')
            AllGoButton(
              label: 'Confirm Arrived at Passenger Pickup',
              isLoading: isActionBusy,
              onPressed: onArrivedPickup,
            )
          else if (activeRide.status == 'ARRIVED_PICKUP')
            AllGoButton(
              label: 'Verify Passenger OTP & Start Trip',
              isLoading: isActionBusy,
              onPressed: onStartTrip,
            )
          else if (activeRide.status == 'IN_TRIP')
            AllGoButton(
              label: 'Complete Trip at Destination',
              isLoading: isActionBusy,
              onPressed: onCompleteTrip,
            ),
        ],
      ),
    );
  }
}
