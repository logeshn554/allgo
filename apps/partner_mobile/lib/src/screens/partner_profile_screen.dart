import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';

class PartnerProfileScreen extends ConsumerWidget {
  const PartnerProfileScreen({super.key});

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
      appBar: const AllGoAppBar(title: 'Partner Profile', showBackButton: false),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          children: [
            // Partner Profile Card
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
                    backgroundColor: AllGoColors.secondaryLight.withOpacity(0.3),
                    child: const Icon(Icons.two_wheeler, size: 32, color: AllGoColors.secondary),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.fullName ?? 'Fleet Partner', style: AllGoTypography.heading3),
                        const SizedBox(height: 4),
                        Text(user?.phone ?? '+91 --', style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 16, color: AllGoColors.warning),
                            const SizedBox(width: 4),
                            Text('4.92 (180+ trips)', style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Cash-in-Hand Monitor
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AllGoColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AllGoColors.divider),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Cash-in-Hand Balance', style: AllGoTypography.caption),
                      const SizedBox(height: 4),
                      Text('₹420.00 / ₹2,000.00 limit', style: AllGoTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      side: const BorderSide(color: AllGoColors.secondary),
                    ),
                    child: const Text('Deposit Cash', style: TextStyle(color: AllGoColors.secondary)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            _buildTile('Assigned Vehicle', 'TVS Apache 160 (TN 09 AB 1234)', Icons.motorcycle),
            _buildTile('Bank Account Details', 'HDFC Bank ending in •••• 4012 (Penny-drop verified)', Icons.account_balance),
            _buildTile('Document Center', 'DL, RC, Commercial Insurance valid', Icons.verified_user_outlined),
            _buildTile('Duty Hours & Fatigue Policy', 'Max 12 hours continuous duty enforced', Icons.schedule),

            const SizedBox(height: 32),

            AllGoButton(
              label: 'Log Out of Partner App',
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
          Icon(icon, color: AllGoColors.textSecondary, size: 22),
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
