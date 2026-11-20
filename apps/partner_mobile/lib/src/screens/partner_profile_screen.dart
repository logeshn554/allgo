import 'package:flutter/material.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'partner_earnings_screen.dart';
import 'partner_support_screen.dart';
import 'partner_notifications_screen.dart';
import 'partner_edit_profile_screen.dart';
import 'partner_vehicle_edit_screen.dart';
import 'partner_bank_edit_screen.dart';
import 'partner_emergency_sos_screen.dart';

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
                    backgroundColor: AllGoColors.secondaryLight.withValues(alpha: 0.3),
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
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AllGoColors.secondary),
                    tooltip: 'Edit Profile',
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PartnerEditProfileScreen()),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
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
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PartnerEarningsScreen()),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      side: const BorderSide(color: AllGoColors.secondary),
                    ),
                    child: const Text('Manage & Deposit', style: TextStyle(color: AllGoColors.secondary)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _buildActionTile(
              'Unified Earnings & Settlements',
              'Weekly payouts, statements, and commission breakdown',
              Icons.account_balance_wallet,
              () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PartnerEarningsScreen())),
            ),
            _buildActionTile(
              'Partner Notifications & Alerts',
              'Duty updates, batch offers, and payout confirmations',
              Icons.notifications_active,
              () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PartnerNotificationsScreen())),
            ),
            _buildActionTile(
              'Emergency SOS & Safety Contacts',
              'Configure emergency contacts and instant 112 / AllGo SOS trigger',
              Icons.emergency_outlined,
              () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PartnerEmergencySosScreen())),
            ),
            _buildActionTile(
              'Partner Support & Disputes',
              '24/7 dedicated fleet support and fare adjustments',
              Icons.support_agent,
              () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PartnerSupportScreen())),
            ),
            _buildActionTile(
              'App Language / மொழி / भाषा',
              'Choose preferred display language for partner app',
              Icons.language,
              () => LanguageSelectionSheet.show(context),
            ),
            const SizedBox(height: 16),
            _buildTile(
              'Assigned Vehicle',
              'TVS Apache 160 (TN 09 AB 1234)',
              Icons.motorcycle,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PartnerVehicleEditScreen()),
              ),
            ),
            _buildTile(
              'Bank Account Details',
              'HDFC Bank ending in •••• 4012 (Penny-drop verified)',
              Icons.account_balance,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PartnerBankEditScreen()),
              ),
            ),
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

  Widget _buildActionTile(String title, String subtitle, IconData icon, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, width: 0.6),
      ),
      child: Material(
        color: Colors.transparent,
        child: ListTile(
          leading: Icon(icon, color: AllGoColors.secondary, size: 22),
          title: Text(title, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: AllGoTypography.caption),
          trailing: const Icon(Icons.chevron_right, size: 18, color: AllGoColors.textTertiary),
          onTap: onTap,
        ),
      ),
    );
  }

  Widget _buildTile(String title, String subtitle, IconData icon, {VoidCallback? onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, width: 0.6),
      ),
      child: Material(
        color: Colors.transparent,
        child: ListTile(
          leading: Icon(icon, color: AllGoColors.textSecondary, size: 22),
          title: Text(title, style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: AllGoTypography.caption),
          trailing: const Icon(Icons.chevron_right, size: 18, color: AllGoColors.textTertiary),
          onTap: onTap,
        ),
      ),
    );
  }
}
