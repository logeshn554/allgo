import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../utils/partner_navigation_helper.dart';

class ActiveParcelCard extends StatelessWidget {
  final ParcelModel activeParcel;
  final bool isActionBusy;
  final VoidCallback onArrivedPickup;
  final VoidCallback onVerifyPickupOtp;
  final VoidCallback onStartTransit;
  final VoidCallback onArrivedDestination;
  final VoidCallback onVerifyDeliveryOtp;
  final VoidCallback onRecordFailure;
  final VoidCallback onInitiateReturn;

  const ActiveParcelCard({
    super.key,
    required this.activeParcel,
    required this.isActionBusy,
    required this.onArrivedPickup,
    required this.onVerifyPickupOtp,
    required this.onStartTransit,
    required this.onArrivedDestination,
    required this.onVerifyDeliveryOtp,
    required this.onRecordFailure,
    required this.onInitiateReturn,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.deepPurple.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.deepPurple.withOpacity(0.08),
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
                  color: Colors.deepPurple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'PARCEL COURIER: ${activeParcel.status}',
                  style: AllGoTypography.caption.copyWith(
                    color: Colors.deepPurple,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                'Pkg #${activeParcel.id.substring(0, 8)}',
                style: AllGoTypography.caption.copyWith(color: AllGoColors.textTertiary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Sender / Pickup', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeParcel.pickupAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Recipient / Dropoff', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeParcel.dropoffAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.navigation_outlined, size: 18),
                  label: Text(
                    (activeParcel.status == 'COURIER_ASSIGNED' || activeParcel.status == 'ARRIVED_PICKUP')
                        ? 'Navigate to Sender'
                        : 'Navigate to Drop',
                  ),
                  onPressed: () {
                    final toPickup = activeParcel.status == 'COURIER_ASSIGNED' || activeParcel.status == 'ARRIVED_PICKUP';
                    final loc = toPickup ? activeParcel.pickupLocation : activeParcel.dropLocation;
                    final addr = toPickup ? activeParcel.pickupAddress : activeParcel.dropoffAddress;
                    PartnerNavigationHelper.openDirections(
                      context: context,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      addressFallback: addr,
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                icon: const Icon(Icons.phone_outlined, size: 18),
                label: const Text('Call'),
                onPressed: () {
                  final toPickup = activeParcel.status == 'COURIER_ASSIGNED' || activeParcel.status == 'ARRIVED_PICKUP';
                  PartnerNavigationHelper.callPhone(
                    context,
                    toPickup ? activeParcel.senderPhone : activeParcel.recipientPhone,
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (activeParcel.status == 'COURIER_ASSIGNED')
            AllGoButton(
              label: 'Confirm Arrived at Sender Pickup',
              isLoading: isActionBusy,
              onPressed: onArrivedPickup,
            )
          else if (activeParcel.status == 'ARRIVED_PICKUP')
            AllGoButton(
              label: 'Verify Sender Pickup OTP',
              isLoading: isActionBusy,
              onPressed: onVerifyPickupOtp,
            )
          else if (activeParcel.status == 'PICKED_UP')
            AllGoButton(
              label: 'Start Courier Transit',
              isLoading: isActionBusy,
              onPressed: onStartTransit,
            )
          else if (activeParcel.status == 'IN_TRANSIT')
            AllGoButton(
              label: 'Confirm Arrived at Recipient',
              isLoading: isActionBusy,
              onPressed: onArrivedDestination,
            )
          else if (activeParcel.status == 'ARRIVED_DESTINATION') ...[
            AllGoButton(
              label: 'Verify Delivery OTP & Handover',
              isLoading: isActionBusy,
              onPressed: onVerifyDeliveryOtp,
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: isActionBusy ? null : onRecordFailure,
              style: OutlinedButton.styleFrom(
                foregroundColor: AllGoColors.error,
                side: const BorderSide(color: AllGoColors.error),
              ),
              child: const Text('Recipient Unavailable / Delivery Failed'),
            ),
          ] else if (activeParcel.status == 'FAILED')
            AllGoButton(
              label: 'Initiate Return to Sender',
              isLoading: isActionBusy,
              onPressed: onInitiateReturn,
            ),
        ],
      ),
    );
  }
}
