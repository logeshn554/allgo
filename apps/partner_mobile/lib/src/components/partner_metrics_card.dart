import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerMetricsCard extends StatelessWidget {
  final int completedJobsCount;
  final double totalEarnings;

  const PartnerMetricsCard({
    super.key,
    required this.completedJobsCount,
    required this.totalEarnings,
  });

  Widget _buildMetric(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AllGoColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AllGoColors.divider),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: AllGoColors.primary),
            const SizedBox(height: 6),
            Text(label, style: AllGoTypography.caption.copyWith(color: AllGoColors.textSecondary)),
            const SizedBox(height: 2),
            Text(value, style: AllGoTypography.heading3.copyWith(fontSize: 16)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _buildMetric('Trips Today', '$completedJobsCount', Icons.check_circle_outline),
        const SizedBox(width: 12),
        _buildMetric('Today Payout', '₹${totalEarnings.toStringAsFixed(0)}', Icons.account_balance_wallet_outlined),
      ],
    );
  }
}
