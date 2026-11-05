import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'merchant_profile_screen.dart';

class MerchantDashboardShell extends ConsumerStatefulWidget {
  const MerchantDashboardShell({super.key});

  @override
  ConsumerState<MerchantDashboardShell> createState() => _MerchantDashboardShellState();
}

class _MerchantDashboardShellState extends ConsumerState<MerchantDashboardShell> {
  bool _isStoreOpen = true;
  int _currentIndex = 0;
  int _orderFilterTab = 0; // 0 = New, 1 = Preparing, 2 = Ready

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildOrdersScreen(),
          const Center(child: AllGoEmptyView(title: 'Menu & Stock Inventory', message: 'Manage item availability, pricing, and 86 out-of-stock items.', icon: Icons.menu_book)),
          const Center(child: AllGoEmptyView(title: 'Daily Settlements', message: 'View gross food revenue, platform commissions (15%), and net bank payouts.', icon: Icons.point_of_sale)),
          const MerchantProfileScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AllGoColors.surface,
          border: Border(top: BorderSide(color: AllGoColors.divider, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: const Color(0xFF6200EA),
          unselectedItemColor: AllGoColors.textTertiary,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'Live Orders'),
            BottomNavigationBarItem(icon: Icon(Icons.restaurant_menu), label: 'Menu'),
            BottomNavigationBarItem(icon: Icon(Icons.analytics_outlined), label: 'Settlements'),
            BottomNavigationBarItem(icon: Icon(Icons.store), label: 'Outlet'),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersScreen() {
    return SafeArea(
      child: Column(
        children: [
          // Outlet Status Top Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            color: AllGoColors.surface,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isStoreOpen ? 'STORE IS OPEN' : 'STORE IS CLOSED',
                      style: AllGoTypography.caption.copyWith(
                        fontWeight: FontWeight.bold,
                        color: _isStoreOpen ? AllGoColors.success : AllGoColors.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Anjappar Chettinad (Anna Nagar)',
                      style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Switch(
                  value: _isStoreOpen,
                  activeColor: AllGoColors.success,
                  onChanged: (val) {
                    setState(() => _isStoreOpen = val);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(val ? 'Store is now LIVE on customer app' : 'Store closed - orders paused'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AllGoColors.divider),

          // Order Pipeline Segmented Controls
          Container(
            color: AllGoColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterTab('New (1)', 0),
                const SizedBox(width: 8),
                _buildFilterTab('Preparing (2)', 1),
                const SizedBox(width: 8),
                _buildFilterTab('Ready for Courier (1)', 2),
              ],
            ),
          ),
          const Divider(height: 1, color: AllGoColors.divider),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_orderFilterTab == 0) ...[
                  // New Order Card
                  _buildOrderCard(
                    orderId: 'ORD-7821-A',
                    itemsSummary: '1x Mutton Biryani, 2x Parotta, 1x Pepper Chicken',
                    totalInr: '₹620.00',
                    timeRemaining: '142s left to accept',
                    status: 'NEW_ORDER',
                    isUrgent: true,
                  ),
                ] else if (_orderFilterTab == 1) ...[
                  _buildOrderCard(
                    orderId: 'ORD-7819-B',
                    itemsSummary: '2x Chicken Biryani, 1x Paneer Butter Masala',
                    totalInr: '₹540.00',
                    timeRemaining: 'Prep time: 12 mins remaining',
                    status: 'PREPARING',
                  ),
                ] else ...[
                  _buildOrderCard(
                    orderId: 'ORD-7815-A',
                    itemsSummary: '1x Ghee Podi Dosa, 1x Filter Coffee',
                    totalInr: '₹180.00',
                    timeRemaining: 'Courier arriving in 2 mins',
                    status: 'READY_FOR_PICKUP',
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTab(String title, int index) {
    final isSelected = _orderFilterTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _orderFilterTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF6200EA) : AllGoColors.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? const Color(0xFF6200EA) : AllGoColors.divider),
          ),
          child: Center(
            child: Text(
              title,
              style: AllGoTypography.caption.copyWith(
                fontWeight: FontWeight.bold,
                color: isSelected ? AllGoColors.textInverse : AllGoColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOrderCard({
    required String orderId,
    required String itemsSummary,
    required String totalInr,
    required String timeRemaining,
    required String status,
    bool isUrgent = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUrgent ? AllGoColors.error : AllGoColors.divider,
          width: isUrgent ? 1.5 : 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(orderId, style: AllGoTypography.heading3.copyWith(fontSize: 16)),
              Text(totalInr, style: AllGoTypography.heading3.copyWith(color: AllGoColors.primaryDark)),
            ],
          ),
          const SizedBox(height: 8),
          Text(itemsSummary, style: AllGoTypography.bodyMedium),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.timer_outlined, size: 16, color: isUrgent ? AllGoColors.error : AllGoColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                timeRemaining,
                style: AllGoTypography.caption.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isUrgent ? AllGoColors.error : AllGoColors.textSecondary,
                ),
              ),
              const Spacer(),
              if (status == 'NEW_ORDER') ...[
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AllGoColors.success,
                    minimumSize: const Size(90, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  child: const Text('Accept', style: TextStyle(fontSize: 13)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
