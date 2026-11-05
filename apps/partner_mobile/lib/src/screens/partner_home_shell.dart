import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'partner_profile_screen.dart';

class PartnerHomeShell extends ConsumerStatefulWidget {
  const PartnerHomeShell({super.key});

  @override
  ConsumerState<PartnerHomeShell> createState() => _PartnerHomeShellState();
}

class _PartnerHomeShellState extends ConsumerState<PartnerHomeShell> {
  bool _isOnline = false;
  String _activeMode = 'DELIVERIES_ONLY'; // DELIVERIES_ONLY, RIDES_ONLY, ALL_JOBS
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildDutyScreen(),
          const Center(child: AllGoEmptyView(title: 'Earnings History', message: 'Your daily payouts and settled earnings will be listed here.', icon: Icons.currency_rupee)),
          const PartnerProfileScreen(),
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
          selectedItemColor: AllGoColors.secondary,
          unselectedItemColor: AllGoColors.textTertiary,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.flash_on), label: 'Duty'),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Earnings'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _buildDutyScreen() {
    return SafeArea(
      child: Column(
        children: [
          // Header / Online Status Switcher
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
                      _isOnline ? 'ONLINE & RECEIVING JOBS' : 'YOU ARE OFFLINE',
                      style: AllGoTypography.caption.copyWith(
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.6,
                        color: _isOnline ? AllGoColors.success : AllGoColors.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _isOnline ? 'Ready for nearby orders' : 'Go online to start earning',
                      style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                Switch(
                  value: _isOnline,
                  activeColor: AllGoColors.success,
                  onChanged: (val) {
                    setState(() => _isOnline = val);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(val ? 'Connected to live dispatch feed' : 'Duty paused - you are now offline'),
                        duration: const Duration(seconds: 1),
                        backgroundColor: val ? AllGoColors.success : AllGoColors.textSecondary,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AllGoColors.divider),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              children: [
                // Mode Switcher Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AllGoColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AllGoColors.divider),
                  ),
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
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Daily Metrics Summary
                Row(
                  children: [
                    Expanded(child: _buildMetricCard('Today Earnings', '₹850', Icons.currency_rupee, AllGoColors.success)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildMetricCard('Completed Jobs', '7 Orders', Icons.check_circle_outline, AllGoColors.info)),
                  ],
                ),
                const SizedBox(height: 24),

                Text('Live Dispatch Radar', style: AllGoTypography.heading3),
                const SizedBox(height: 12),

                if (_isOnline) ...[
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AllGoColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AllGoColors.divider),
                    ),
                    child: Column(
                      children: [
                        const SizedBox(
                          height: 36,
                          width: 36,
                          child: CircularProgressIndicator(strokeWidth: 3, color: AllGoColors.secondary),
                        ),
                        const SizedBox(height: 16),
                        Text('Searching for nearby orders in Anna Nagar...', style: AllGoTypography.bodyMedium),
                        const SizedBox(height: 4),
                        Text('Sub-second GPS telemetry connected via Redis Socket.IO', style: AllGoTypography.caption),
                      ],
                    ),
                  ),
                ] else ...[
                  const AllGoEmptyView(
                    title: 'Offline Mode Active',
                    message: 'Flip the toggle at the top right to start receiving order dispatches.',
                    icon: Icons.power_settings_new,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeChip(String label, String modeValue) {
    final isSelected = _activeMode == modeValue;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeMode = modeValue),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AllGoColors.secondary : AllGoColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AllGoColors.secondary : AllGoColors.divider),
          ),
          child: Center(
            child: Text(
              label,
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

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AllGoColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 10),
          Text(value, style: AllGoTypography.heading2.copyWith(fontSize: 20)),
          const SizedBox(height: 2),
          Text(title, style: AllGoTypography.caption),
        ],
      ),
    );
  }
}
