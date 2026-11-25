import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

class OffersCouponsScreen extends ConsumerStatefulWidget {
  const OffersCouponsScreen({super.key});

  @override
  ConsumerState<OffersCouponsScreen> createState() => _OffersCouponsScreenState();
}

class _OffersCouponsScreenState extends ConsumerState<OffersCouponsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _error;
  List<_CouponItem> _coupons = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadPromotions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPromotions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final raw = await ref.read(apiClientProvider).listEligiblePromotions();
      final parsed = raw.map((p) {
        final upper = '${p.code} ${p.title}'.toUpperCase();
        String category = 'Food';
        if (upper.contains('GROCERY') || upper.contains('MART') || upper.contains('SHIP')) {
          category = 'Groceries';
        } else if (upper.contains('RIDE') || upper.contains('PARCEL') || upper.contains('CAB')) {
          category = 'Rides';
        }
        final pct = p.discountPercentage;
        final flat = p.flatDiscountInr ?? p.maxDiscountInr;
        final discountLabel = pct != null
            ? '${pct.toStringAsFixed(0)}% OFF${flat != null ? ' up to ₹${flat.toStringAsFixed(0)}' : ''}'
            : flat != null
                ? 'Flat ₹${flat.toStringAsFixed(0)} OFF'
                : p.title;

        return _CouponItem(
          code: p.code,
          category: category,
          discount: discountLabel,
          description: p.reason.isNotEmpty ? p.reason : p.title,
          minOrder: p.minOrderAmountInr > 0
              ? 'Min order ₹${p.minOrderAmountInr.toStringAsFixed(0)}'
              : 'No minimum order',
          validTill: p.isEligible ? 'Eligible now' : 'Check cart criteria',
        );
      }).toList();

      if (!mounted) return;
      setState(() {
        _coupons = parsed;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load promotions: $e';
        _isLoading = false;
      });
    }
  }

  void _copyCouponCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Coupon code "$code" copied to clipboard!'),
        backgroundColor: AllGoColors.success,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Offers & Coupons'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AllGoColors.primary,
          unselectedLabelColor: AllGoColors.textTertiary,
          indicatorColor: AllGoColors.primary,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Food'),
            Tab(text: 'Groceries'),
            Tab(text: 'Rides'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _loadPromotions, child: const Text('Retry')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildCouponList(_coupons),
                    _buildCouponList(_coupons.where((c) => c.category == 'Food').toList()),
                    _buildCouponList(_coupons.where((c) => c.category == 'Groceries').toList()),
                    _buildCouponList(_coupons.where((c) => c.category == 'Rides').toList()),
                  ],
                ),
    );
  }

  Widget _buildCouponList(List<_CouponItem> list) {
    if (list.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadPromotions,
        child: ListView(
          children: const [
            SizedBox(height: 120),
            Center(child: Text('No active coupons available right now')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPromotions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, index) {
          final item = list[index];
          final theme = Theme.of(context);

          return Card(
            margin: const EdgeInsets.only(bottom: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.6)),
            ),
            elevation: 0,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AllGoColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          item.code,
                          style: const TextStyle(
                            color: AllGoColors.primary,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.copy, size: 16),
                        label: const Text('COPY', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: () => _copyCouponCode(item.code),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    item.discount,
                    style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.description,
                    style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary, height: 1.4),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.minOrder, style: AllGoTypography.caption),
                      Text(item.validTill, style: AllGoTypography.caption.copyWith(color: AllGoColors.textTertiary)),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CouponItem {
  final String code;
  final String category;
  final String discount;
  final String description;
  final String minOrder;
  final String validTill;

  const _CouponItem({
    required this.code,
    required this.category,
    required this.discount,
    required this.description,
    required this.minOrder,
    required this.validTill,
  });
}
