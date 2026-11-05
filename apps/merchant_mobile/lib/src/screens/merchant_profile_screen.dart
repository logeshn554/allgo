import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';

class MerchantProfileScreen extends ConsumerWidget {
  const MerchantProfileScreen({super.key});

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    await ref.read(authNotifierProvider.notifier).logout();
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PhoneLoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Outlet Profile', showBackButton: false),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          children: [
            // Outlet Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AllGoColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AllGoColors.divider),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFFEDE7F6),
                    child: const Icon(Icons.restaurant, size: 30, color: Color(0xFF6200EA)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Anjappar Chettinad', style: AllGoTypography.heading3),
                        const SizedBox(height: 4),
                        Text('Owner: ${user?.phone ?? "+91 --"}', style: AllGoTypography.caption),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AllGoColors.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Status: APPROVED & LIVE',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AllGoColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildTile('FSSAI Food License', '12423001000123 (Verified)', Icons.verified),
            _buildTile('Outlet Address', 'Plot 42, 2nd Avenue, Anna Nagar, Chennai 600040', Icons.location_on_outlined),
            _buildTile('Settlement Bank Account', 'HDFC Bank ending in •••• 5678 (Verified)', Icons.account_balance),
            _buildTile('Platform Commission', '15.00% Standard Restaurant Tier', Icons.pie_chart_outline),
            _buildTile('Operating Hours & Prep Time', '11:00 AM - 11:00 PM | Default Prep: 15 mins', Icons.access_time),

            const SizedBox(height: 32),

            AllGoButton(
              label: 'Log Out of Merchant App',
              variant: AllGoButtonVariant.outlined,
              icon: Icons.logout,
              onPressed: () => _handleLogout(context, ref),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTile(String title, String subtitle, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, width: 0.6),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF6200EA), size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle, style: AllGoTypography.caption),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 18, color: AllGoColors.textTertiary),
        ],
      ),
    );
  }
}
