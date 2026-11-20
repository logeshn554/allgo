import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class PartnerEarningsScreen extends ConsumerStatefulWidget {
  const PartnerEarningsScreen({super.key});

  @override
  ConsumerState<PartnerEarningsScreen> createState() => _PartnerEarningsScreenState();
}

class _PartnerEarningsScreenState extends ConsumerState<PartnerEarningsScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  double _totalEarnings = 0.0;
  double _outstandingCod = 0.0;
  double _totalCodCollected = 0.0;
  List<dynamic> _settlements = [];

  @override
  void initState() {
    super.initState();
    _loadEarnings();
  }

  Future<void> _loadEarnings() async {
    setState(() => _isLoading = true);
    try {
      final dash = await _apiClient.getPartnerEarningsDashboard();
      final settles = await _apiClient.getPartnerSettlements();
      if (mounted) {
        setState(() {
          _totalEarnings = (dash['totalSettledEarningsInr'] as num?)?.toDouble() ?? 0.0;
          _outstandingCod = (dash['outstandingCodInr'] as num?)?.toDouble() ?? 0.0;
          _totalCodCollected = (dash['totalCodCollectedInr'] as num?)?.toDouble() ?? 0.0;
          _settlements = settles;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showDepositDialog() async {
    final amountController = TextEditingController(text: _outstandingCod > 0 ? _outstandingCod.toStringAsFixed(0) : '500');
    final refController = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Deposit COD Cash'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Outstanding COD Balance: ₹${_outstandingCod.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AllGoColors.error)),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Deposit Amount (INR)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: refController,
              decoration: const InputDecoration(labelText: 'Bank / UPI Deposit Reference', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AllGoColors.primary),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Submit Handover Proof'),
          ),
        ],
      ),
    );

    if (submitted == true && mounted) {
      final amt = double.tryParse(amountController.text) ?? 0.0;
      if (amt > 0 && refController.text.isNotEmpty) {
        try {
          await _apiClient.submitPartnerCodDeposit(amt, refController.text.trim());
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('COD deposit submitted for admin reconciliation!')));
            _loadEarnings();
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Earnings & Settlements', showBackButton: true),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEarnings,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Unified Earnings Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TOTAL SETTLED EARNINGS', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        Text('₹${_totalEarnings.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Cash-in-Hand (COD)', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                Text('₹${_outstandingCod.toStringAsFixed(2)}', style: TextStyle(color: _outstandingCod > 1500 ? AllGoColors.error : Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 16)),
                                Text('Lifetime: ₹${_totalCodCollected.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white54, fontSize: 10)),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: _showDepositDialog,
                              icon: const Icon(Icons.upload, size: 16),
                              label: const Text('Deposit COD'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AllGoColors.primary,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  const Text('SETTLEMENT STATEMENTS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AllGoColors.textSecondary)),
                  const SizedBox(height: 12),

                  if (_settlements.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AllGoColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AllGoColors.divider),
                      ),
                      child: const Text('No weekly settlements generated yet.', style: TextStyle(color: AllGoColors.textTertiary)),
                    )
                  else
                    ..._settlements.map((s) {
                      final net = (s['net_payable_inr'] as num?)?.toDouble() ?? 0.0;
                      final gross = (s['gross_earnings_inr'] as num?)?.toDouble() ?? 0.0;
                      final deliveries = s['total_deliveries'] ?? 0;
                      final status = s['status']?.toString() ?? 'PENDING';
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AllGoColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AllGoColors.divider, width: 0.6),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Settlement #${s['id'].toString().slice(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                const SizedBox(height: 4),
                                Text('$deliveries jobs completed • Gross: ₹${gross.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: AllGoColors.textSecondary)),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('₹${net.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AllGoColors.primaryDark)),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: status == 'SETTLED' ? AllGoColors.success.withOpacity(0.1) : Colors.amber.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: status == 'SETTLED' ? AllGoColors.success : Colors.amber.shade800)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}

extension StringSlice on String {
  String slice(int start, [int? end]) {
    final e = end ?? length;
    return substring(start, e > length ? length : e);
  }
}
