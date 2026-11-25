import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'operating_hours_screen.dart';
import 'merchant_profile_screen.dart';
import 'merchant_product_editor_screen.dart';
import 'merchant_csv_import_screen.dart';
import '../components/merchant_live_orders_tab.dart';
import '../components/merchant_menu_catalog_tab.dart';
import '../components/merchant_financials_tab.dart';
import '../components/merchant_incoming_order_alert_modal.dart';
import '../components/propose_substitution_modal.dart';

class MerchantDashboardShell extends ConsumerStatefulWidget {
  const MerchantDashboardShell({super.key});

  @override
  ConsumerState<MerchantDashboardShell> createState() => _MerchantDashboardShellState();
}

class _MerchantDashboardShellState extends ConsumerState<MerchantDashboardShell> {
  // Operational order queues: New Orders, Preparing, Ready for Courier, History
  // Financial metrics: client.getMerchantEarnings, Total Net Earnings, Platform Commission (15%), Gross Delivered Food
  int _currentTabIndex = 0;
  int _selectedOrderTab = 0;
  bool _isLoading = true;
  bool _isTogglingOutlet = false;

  MerchantDashboardData? _dashboardData;
  List<MerchantOrder> _orders = [];
  List<ProductItem> _products = [];
  Map<String, dynamic>? _earningsData;
  bool _isOpen = true;
  int _defaultPrepMinutes = 15;
  final Set<String> _alertedOrderIds = {};
  RealtimeSocketService? _socket;

  @override
  void initState() {
    super.initState();
    _loadAllDashboardData();
    _initRealtimeSocket();
  }

  Future<void> _initRealtimeSocket() async {
    final socket = ref.read(realtimeSocketServiceProvider);
    _socket = socket;
    await socket.connect();
    socket.on('order:new', (_) => _loadAllDashboardData());
    socket.on('job:status_changed', (_) => _loadAllDashboardData());
  }

  @override
  void dispose() {
    _socket?.off('order:new');
    _socket?.off('job:status_changed');
    super.dispose();
  }

  Future<void> _loadAllDashboardData() async {
    setState(() => _isLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      final data = await client.getMerchantDashboard().catchError((_) => MerchantDashboardData.empty());
      final orders = await client.getMerchantOrders().catchError((_) => <MerchantOrder>[]);
      final products = await client.getMerchantProducts().catchError((_) => <ProductItem>[]);
      final overview = await client.getMerchantFinancialOverview().catchError((_) => <String, dynamic>{});
      final earnings = await client.getMerchantEarnings().catchError((_) => <String, dynamic>{});
      final mergedFinancials = <String, dynamic>{...earnings, ...overview};

      if (mounted) {
        setState(() {
          _dashboardData = data;
          _orders = orders;
          _products = products;
          _earningsData = mergedFinancials;
          _isOpen = data.outletIsOpen;
          _defaultPrepMinutes = data.defaultPrepTimeMinutes;
          _isLoading = false;
        });
        _checkForNewOrderAlert(orders);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _checkForNewOrderAlert(List<MerchantOrder> orders) {
    final newOrder = orders.cast<MerchantOrder?>().firstWhere(
          (o) =>
              o != null &&
              (o.status == 'PLACED' || o.status == 'CREATED' || o.status == 'PAID') &&
              !_alertedOrderIds.contains(o.id),
          orElse: () => null,
        );
    if (newOrder == null || !mounted) return;
    _alertedOrderIds.add(newOrder.id);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => MerchantIncomingOrderAlertModal(
        orderId: newOrder.id,
        orderNumber: newOrder.subOrderNumber,
        customerName: 'AllGo Customer',
        totalAmountPaise: (newOrder.itemsTotalInr * 100).round(),
        itemSummaries: newOrder.items.map((i) => '${i.quantity}x ${i.itemName}').toList(),
        onAccept: () => _handleAcceptOrder(newOrder),
        onReject: (_) => _handleRejectOrder(newOrder),
      ),
    );
  }

  Future<void> _handleToggleOutlet(bool val) async {
    setState(() => _isTogglingOutlet = true);
    final client = ref.read(apiClientProvider);
    try {
      final outletId = _dashboardData?.outletId ?? 'outlet-primary';
      await client.updateOutletStatus(outletId, val, defaultPrepTimeMinutes: _defaultPrepMinutes);
      setState(() => _isOpen = val);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(val ? 'STORE IS OPEN: Accepting live customer orders' : 'STORE IS CLOSED: Store paused'),
          backgroundColor: val ? AllGoColors.success : AllGoColors.textSecondary,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _isTogglingOutlet = false);
    }
  }

  Future<void> _handleAcceptOrder(MerchantOrder order) async {
    final client = ref.read(apiClientProvider);
    try {
      await client.updateOrderStatus(order.id, 'ACCEPTED');
      _loadAllDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _handleRejectOrder(MerchantOrder order) async {
    final client = ref.read(apiClientProvider);
    try {
      await client.updateOrderStatus(order.id, 'CANCELLED');
      _loadAllDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _handleUpdateOrderStatus(MerchantOrder order, String nextStatus) async {
    final client = ref.read(apiClientProvider);
    try {
      await client.updateOrderStatus(order.id, nextStatus);
      _loadAllDashboardData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _handleToggleProductStock(ProductItem product, bool inStock) async {
    final client = ref.read(apiClientProvider);
    try {
      await client.updateMerchantInventory(product.id, isInStock: inStock);
      setState(() {
        final idx = _products.indexWhere((p) => p.id == product.id);
        if (idx != -1) _products[idx] = product.copyWith(isInStock: inStock);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _openProductEditor([ProductItem? product]) async {
    final outletId = _dashboardData?.outletId ?? 'outlet-primary';
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => MerchantProductEditorScreen(
          outletId: outletId,
          existingProduct: product,
        ),
      ),
    );
    if (changed == true) _loadAllDashboardData();
  }

  Future<void> _openCsvImport() async {
    final outletId = _dashboardData?.outletId ?? 'outlet-primary';
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MerchantCsvImportScreen(outletId: outletId)),
    );
    _loadAllDashboardData();
  }

  Future<void> _handleVerifyHandoverOtp(MerchantOrder order) async {
    final otpCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Courier Handover PIN • #${order.subOrderNumber}'),
        content: TextField(
          controller: otpCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(
            labelText: 'Enter Courier Handover PIN',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Verify Handover')),
        ],
      ),
    );
    if (confirmed == true && otpCtrl.text.trim().length >= 4) {
      try {
        final client = ref.read(apiClientProvider);
        final outletId = _dashboardData?.outletId ?? 'outlet-primary';
        final jobs = await client.getMerchantDeliveryJobs(outletId).catchError((_) => <DeliveryJobModel>[]);
        final matchingJobId = jobs.isNotEmpty ? jobs.first.id : order.id;
        await client.merchantVerifyHandoverOtp(matchingJobId, otpCtrl.text.trim());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Courier handover PIN verified!'), backgroundColor: AllGoColors.success),
          );
          _loadAllDashboardData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Handover verification failed: $e')));
        }
      }
    }
    otpCtrl.dispose();
  }

  Future<void> _handleExtendPrepTime(MerchantOrder order, int extraMinutes) async {
    try {
      final outletId = _dashboardData?.outletId ?? 'outlet-primary';
      final nextPrep = _defaultPrepMinutes + extraMinutes;
      await ref.read(apiClientProvider).updateOutletStatus(outletId, _isOpen, defaultPrepTimeMinutes: nextPrep);
      if (mounted) {
        setState(() => _defaultPrepMinutes = nextPrep);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Prep time extended by +${extraMinutes}m ($nextPrep mins total)')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to extend prep time: $e')));
      }
    }
  }

  Future<void> _handleAddCategory() async {
    final nameCtrl = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create Menu Category'),
        content: TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(labelText: 'Category Name (e.g. Biryanis, Beverages)', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Create')),
        ],
      ),
    );
    if (created == true && nameCtrl.text.trim().isNotEmpty) {
      try {
        final outletId = _dashboardData?.outletId ?? 'outlet-primary';
        await ref.read(apiClientProvider).createOutletCategory(outletId, {'name': nameCtrl.text.trim()});
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Category "${nameCtrl.text.trim()}" created!'), backgroundColor: AllGoColors.success),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to create category: $e')));
        }
      }
    }
    nameCtrl.dispose();
  }

  Future<void> _handleTimedPause(ProductItem product) async {
    try {
      final outletId = _dashboardData?.outletId ?? 'outlet-primary';
      final resumeAt = DateTime.now().add(const Duration(hours: 2)).toIso8601String();
      await ref.read(apiClientProvider).setOutletProductOverride(outletId, product.id, {
        'isAvailable': false,
        'pausedUntil': resumeAt,
      });
      await _handleToggleProductStock(product, false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${product.name} paused for 2 hours')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pause failed: $e')));
      }
    }
  }

  Widget _buildOverviewScreen() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _isOpen ? Colors.green.shade50 : Colors.red.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _isOpen ? Colors.green : Colors.red),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_isOpen ? 'STORE IS OPEN' : 'STORE IS CLOSED', style: AllGoTypography.heading3.copyWith(color: _isOpen ? Colors.green.shade800 : Colors.red.shade800)),
                  Text(_isOpen ? 'Accepting live customer orders' : 'Store is paused. Orders disabled', style: AllGoTypography.caption),
                ],
              ),
              Switch(
                value: _isOpen,
                activeColor: Colors.green,
                onChanged: _isTogglingOutlet ? null : (v) => _handleToggleOutlet(v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Card(
          child: ListTile(
            leading: const Icon(Icons.access_time, color: Color(0xFF6200EA)),
            title: const Text('Store Operating Hours & Closures'),
            subtitle: const Text('Configure weekly hours and holiday closures'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => OperatingHoursScreen(outletId: _dashboardData?.outletId ?? 'primary')),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(title: _currentTabIndex == 0 ? 'Merchant Overview' : _currentTabIndex == 1 ? 'Live Orders' : _currentTabIndex == 2 ? 'Menu Catalog' : _currentTabIndex == 3 ? 'Financials' : 'Store Profile'),
      body: _currentTabIndex == 0
          ? _buildOverviewScreen()
          : _currentTabIndex == 1
              ? MerchantLiveOrdersTab(
                  selectedOrderTab: _selectedOrderTab,
                  onTabSelected: (idx) => setState(() => _selectedOrderTab = idx),
                  orders: _orders,
                  isLoading: _isLoading,
                  onRefresh: _loadAllDashboardData,
                  onAccept: _handleAcceptOrder,
                  onReject: _handleRejectOrder,
                  onUpdateStatus: _handleUpdateOrderStatus,
                  onVerifyHandoverOtp: _handleVerifyHandoverOtp,
                  onExtendPrepTime: _handleExtendPrepTime,
                  onProposeSubstitution: (order, item) {
                    ProposeSubstitutionModal.show(
                      context,
                      subOrderId: order.id,
                      orderItem: item,
                      catalogProducts: _products,
                      onSubmitted: _loadAllDashboardData,
                    );
                  },
                )
              : _currentTabIndex == 2
                  ? MerchantMenuCatalogTab(
                      products: _products,
                      isLoading: _isLoading,
                      onRefresh: _loadAllDashboardData,
                      onToggleStock: _handleToggleProductStock,
                      onAddProduct: () => _openProductEditor(),
                      onEditProduct: (p) => _openProductEditor(p),
                      onBulkCsvImport: _openCsvImport,
                      onAddCategory: _handleAddCategory,
                      onTimedPause: _handleTimedPause,
                    )
                  : _currentTabIndex == 3
                      ? MerchantFinancialsTab(
                          earningsData: _earningsData,
                          isLoading: _isLoading,
                          onRefresh: _loadAllDashboardData,
                        )
                      : const MerchantProfileScreen(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTabIndex,
        selectedItemColor: const Color(0xFF6200EA),
        unselectedItemColor: AllGoColors.textTertiary,
        type: BottomNavigationBarType.fixed,
        onTap: (idx) => setState(() => _currentTabIndex = idx),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Overview'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.restaurant_menu), label: 'Menu'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.storefront_outlined), label: 'Store'),
        ],
      ),
    );
  }
}
