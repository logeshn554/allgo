import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerDutyHeader extends StatelessWidget {
  final bool isOnline;
  final bool isActionBusy;
  final String activeMode;
  final String? activeVerticalLock;
  final ValueChanged<bool> onToggleOnline;
  final ValueChanged<String> onChangeMode;

  const PartnerDutyHeader({
    super.key,
    required this.isOnline,
    required this.isActionBusy,
    required this.activeMode,
    required this.activeVerticalLock,
    required this.onToggleOnline,
    required this.onChangeMode,
  });

  Widget _buildModeChip(String label, String modeKey) {
    final isSelected = activeMode == modeKey;
    return Expanded(
      child: GestureDetector(
        onTap: isActionBusy ? null : () => onChangeMode(modeKey),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AllGoColors.primary : AllGoColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? AllGoColors.primary : AllGoColors.divider),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AllGoTypography.caption.copyWith(
              color: isSelected ? Colors.white : AllGoColors.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          color: AllGoColors.surface,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isOnline ? 'ONLINE & RECEIVING JOBS' : 'YOU ARE OFFLINE',
                    style: AllGoTypography.caption.copyWith(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                      color: isOnline ? AllGoColors.success : AllGoColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isOnline ? 'Live Dispatch Radar: Active' : 'Go online to start earning',
                    style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              Switch(
                value: isOnline,
                activeColor: AllGoColors.success,
                onChanged: isActionBusy ? null : onToggleOnline,
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: AllGoColors.divider),
        Container(
          padding: const EdgeInsets.all(16),
          color: AllGoColors.surface,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Active Service Mode', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildModeChip('Deliveries', 'DELIVERIES_ONLY'),
                  const SizedBox(width: 8),
                  _buildModeChip('Rides', 'RIDES_ONLY'),
                  const SizedBox(width: 8),
                  _buildModeChip('All Jobs', 'ALL_JOBS'),
                ],
              ),
              if (activeVerticalLock != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade400),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.lock, size: 16, color: Colors.brown),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Safety Mutual Exclusion Active: Locked to $activeVerticalLock.',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.brown),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
