import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

import '../components/order_detail_safety_and_partner_card.dart';
import '../components/order_detail_items_and_pricing.dart';
import 'delivery_tracking_screen.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String subOrderId;
  final CustomerOrderDetail? initialDetail;

  const OrderDetailScreen({
    super.key,
    required this.subOrderId,
    this.initialDetail,
  });

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  late CustomerOrderDetail _order;
  bool _isLoading = false;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _order = widget.initialDetail ?? CustomerOrderDetail.dummy(widget.subOrderId);
    _refreshOrder();
  }

  Future<void> _refreshOrder() async {
    setState(() => _isLoading = true);
    try {
      final updated = await ref.read(apiClientProvider).getCustomerOrderDetail(widget.subOrderId);
      if (mounted) setState(() => _order = updated);
    } catch (_) {} finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _cancelOrder() async {
    setState(() => _isCancelling = true);
    try {
      await ref.read(apiClientProvider).cancelCustomerOrder(widget.subOrderId, 'Customer cancelled');
      _refreshOrder();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cancel failed: $e')));
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  Widget _buildStatusHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Order #${_order.subOrderNumber}', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
              const SizedBox(height: 4),
              Text('Placed: ${_order.createdAt.split("T")[0]}', style: AllGoTypography.caption),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: AllGoColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
            child: Text(_order.status, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AllGoColors.primary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCancellable = _order.status == 'PLACED' || _order.status == 'MERCHANT_ACCEPTED';

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AppBar(
        title: Text(_order.subOrderNumber),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _refreshOrder),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshOrder,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildStatusHeader(),
            const SizedBox(height: 16),
            OrderDetailSafetyAndPartnerCard(
              order: _order,
              onTrackDelivery: () {
                if (_order.deliveryJob != null) {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => DeliveryTrackingScreen(jobId: _order.deliveryJob!.id)),
                  );
                }
              },
            ),
            OrderDetailItemsAndPricing(order: _order),
            if (isCancellable) ...[
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: _isCancelling ? null : _cancelOrder,
                style: OutlinedButton.styleFrom(foregroundColor: AllGoColors.error, side: const BorderSide(color: AllGoColors.error)),
                child: const Text('Cancel Order'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
