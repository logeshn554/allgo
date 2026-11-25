import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import '../utils/partner_navigation_helper.dart';

class ActiveDeliveryCard extends StatelessWidget {
  final DeliveryJobModel activeJob;
  final bool isActionBusy;
  final VoidCallback onArrivedPickup;
  final VoidCallback onStartDelivery;
  final VoidCallback onArrivedDestination;
  final VoidCallback onCompleteDelivery;
  final VoidCallback onReportException;

  const ActiveDeliveryCard({
    super.key,
    required this.activeJob,
    required this.isActionBusy,
    required this.onArrivedPickup,
    required this.onStartDelivery,
    required this.onArrivedDestination,
    required this.onCompleteDelivery,
    required this.onReportException,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AllGoColors.primary.withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AllGoColors.primary.withOpacity(0.08),
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
                  color: AllGoColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'ACTIVE DELIVERY: ${activeJob.status}',
                  style: AllGoTypography.caption.copyWith(
                    color: AllGoColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                'Job #${activeJob.id.substring(0, 8)}',
                style: AllGoTypography.caption.copyWith(color: AllGoColors.textTertiary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Pickup Details', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeJob.pickupAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Dropoff Details', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeJob.destinationAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AllGoColors.background,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AllGoColors.divider),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Vertical: ${activeJob.verticalType}',
                  style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  'Courier Fee: ₹${activeJob.courierFeeInr.toStringAsFixed(0)}',
                  style: AllGoTypography.caption.copyWith(
                    color: AllGoColors.success,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.navigation_outlined, size: 18),
                  label: Text(
                    (activeJob.status == 'ASSIGNED' || activeJob.status == 'ARRIVED_PICKUP')
                        ? 'Navigate to Store'
                        : 'Navigate to Drop',
                  ),
                  onPressed: () {
                    final toPickup = activeJob.status == 'ASSIGNED' || activeJob.status == 'ARRIVED_PICKUP';
                    final targetLoc = toPickup ? activeJob.pickupLocation : activeJob.dropoffLocation;
                    final targetAddr = toPickup ? activeJob.pickupAddress : activeJob.destinationAddress;
                    PartnerNavigationHelper.openDirections(
                      context: context,
                      latitude: targetLoc?.latitude,
                      longitude: targetLoc?.longitude,
                      addressFallback: targetAddr,
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                icon: const Icon(Icons.phone_outlined, size: 18),
                label: const Text('Call'),
                onPressed: () => PartnerNavigationHelper.callPhone(context, activeJob.assignedPartner?.phone),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (activeJob.status == 'ASSIGNED')
            AllGoButton(
              label: 'Arrived at Store / Pickup',
              isLoading: isActionBusy,
              onPressed: onArrivedPickup,
            )
          else if (activeJob.status == 'ARRIVED_PICKUP')
            AllGoButton(
              label: 'Start Delivery Transit',
              isLoading: isActionBusy,
              onPressed: onStartDelivery,
            )
          else if (activeJob.status == 'IN_TRANSIT')
            AllGoButton(
              label: 'Arrived at Customer',
              isLoading: isActionBusy,
              onPressed: onArrivedDestination,
            )
          else if (activeJob.status == 'ARRIVED_DESTINATION')
            AllGoButton(
              label: 'Complete Order Handover',
              isLoading: isActionBusy,
              onPressed: onCompleteDelivery,
            ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: isActionBusy ? null : onReportException,
            style: OutlinedButton.styleFrom(
              foregroundColor: AllGoColors.error,
              side: const BorderSide(color: AllGoColors.error),
            ),
            child: const Text('Report Delivery Exception'),
          ),
        ],
      ),
    );
  }
}
