import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class ActiveHireDriverCard extends StatelessWidget {
  final HireDriverBookingModel activeHireDriver;
  final bool isActionBusy;
  final VoidCallback onArrived;
  final VoidCallback onStartDuty;
  final VoidCallback onEndDuty;

  const ActiveHireDriverCard({
    super.key,
    required this.activeHireDriver,
    required this.isActionBusy,
    required this.onArrived,
    required this.onStartDuty,
    required this.onEndDuty,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.indigo.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.indigo.withOpacity(0.08),
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
                  color: Colors.indigo.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'CHAUFFEUR: ${activeHireDriver.status}',
                  style: AllGoTypography.caption.copyWith(
                    color: Colors.indigo,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                'Duty #${activeHireDriver.id.substring(0, 8)}',
                style: AllGoTypography.caption.copyWith(color: AllGoColors.textTertiary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Reporting Location', style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
          Text(activeHireDriver.reportingAddress, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          if (activeHireDriver.status == 'CHAUFFEUR_ASSIGNED')
            AllGoButton(
              label: 'Arrived at Customer Vehicle',
              isLoading: isActionBusy,
              onPressed: onArrived,
            )
          else if (activeHireDriver.status == 'ARRIVED_CUSTOMER')
            AllGoButton(
              label: 'Start Chauffeur Duty (Odometer Check)',
              isLoading: isActionBusy,
              onPressed: onStartDuty,
            )
          else if (activeHireDriver.status == 'DUTY_IN_PROGRESS')
            AllGoButton(
              label: 'Complete & End Chauffeur Duty',
              isLoading: isActionBusy,
              onPressed: onEndDuty,
            ),
        ],
      ),
    );
  }
}
