import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'welcome_screen.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to log out of AllGo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AllGoColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authNotifierProvider.notifier).logout();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const WelcomeScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'My Account', showBackButton: false),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          children: [
            // User Header Card
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
                    backgroundColor: AllGoColors.primaryLight.withOpacity(0.3),
                    child: Text(
                      (user?.fullName != null && user!.fullName!.isNotEmpty)
                          ? user.fullName![0].toUpperCase()
                          : 'U',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: AllGoColors.primaryDark),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.fullName ?? 'AllGo Customer', style: AllGoTypography.heading3),
                        const SizedBox(height: 4),
                        Text(user?.phone ?? '+91 --', style: AllGoTypography.bodyMedium.copyWith(color: AllGoColors.textSecondary)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AllGoColors.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Status: ${user?.status.toApiString() ?? "ACTIVE"}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AllGoColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Settings Options
            _buildSectionHeader('Preferences'),
            _buildOptionTile(
              icon: Icons.language,
              title: 'App Language',
              subtitle: 'English / தமிழ் (Tamil) / हिन्दी (Hindi)',
              onTap: () {},
            ),
            _buildOptionTile(
              icon: Icons.notifications_none,
              title: 'Notifications & Alerts',
              subtitle: 'Order and promotional SMS/Push notifications',
              onTap: () {},
            ),
            const SizedBox(height: 16),

            _buildSectionHeader('Account & Security'),
            _buildOptionTile(
              icon: Icons.shield_outlined,
              title: 'Privacy & Security',
              subtitle: 'Device sessions and login activity',
              onTap: () {},
            ),
            _buildOptionTile(
              icon: Icons.help_outline,
              title: 'Help & Customer Support',
              subtitle: '24x7 customer support line',
              onTap: () {},
            ),
            const SizedBox(height: 32),

            // Logout Button
            AllGoButton(
              label: 'Log Out',
              variant: AllGoButtonVariant.outlined,
              icon: Icons.logout,
              onPressed: () => _handleLogout(context, ref),
            ),
            const SizedBox(height: 20),
            Center(
              child: Text(
                'AllGo Super App v0.1.0 (Phase 1 Local)',
                style: AllGoTypography.caption,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4.0, bottom: 8.0),
      child: Text(
        title.toUpperCase(),
        style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold, letterSpacing: 0.8),
      ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, width: 0.6),
      ),
      child: ListTile(
        leading: Icon(icon, color: AllGoColors.textPrimary, size: 24),
        title: Text(title, style: AllGoTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: AllGoTypography.caption),
        trailing: const Icon(Icons.chevron_right, size: 20, color: AllGoColors.textTertiary),
        onTap: onTap,
      ),
    );
  }
}
