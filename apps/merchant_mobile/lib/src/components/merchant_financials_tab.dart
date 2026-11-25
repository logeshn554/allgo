import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class MerchantFinancialsTab extends StatelessWidget {
  final Map<String, dynamic>? earningsData;
  final bool isLoading;
  final VoidCallback onRefresh;

  const MerchantFinancialsTab({
    super.key,
    required this.earningsData,
    required this.isLoading,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Center(child: CircularProgressIndicator());
    final gross = ((earningsData?['totalGrossSalesInr'] ?? earningsData?['gross_sales'] ?? 0) as num).toDouble();
    final commission = ((earningsData?['totalCommissionInr'] ?? earningsData?['commission_amount'] ?? 0) as num).toDouble();
    final netSettled = ((earningsData?['netSettledInr'] ?? (gross - commission)) as num).toDouble();
    final settlementCount = ((earningsData?['settlementCount'] ?? 0) as num).toInt();

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6200EA), Color(0xFF7C4DFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Total Net Settled Earnings', style: AllGoTypography.caption.copyWith(color: Colors.white70)),
                const SizedBox(height: 8),
                Text('₹${netSettled.toStringAsFixed(2)}', style: AllGoTypography.heading1.copyWith(color: Colors.white)),
                const SizedBox(height: 8),
                Text(
                  '$settlementCount settlement cycles processed from live ledger',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Gross Delivered Sales', style: AllGoTypography.bodyMedium),
                      Text('₹${gross.toStringAsFixed(2)}', style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Platform Commission', style: AllGoTypography.bodyMedium),
                      Text(
                        '-₹${commission.toStringAsFixed(2)}',
                        style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold, color: AllGoColors.error),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
