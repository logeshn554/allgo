import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'merchant_registration_screen.dart';

class ApprovalStatusScreen extends ConsumerWidget {
  const ApprovalStatusScreen({super.key});

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
    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(
        title: 'Merchant Onboarding Status',
        showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () => _handleLogout(context, ref),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              // Status Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AllGoColors.warning.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AllGoColors.warning.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.store_mall_directory_outlined, color: AllGoColors.warning, size: 36),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Outlet Pending Verification', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
                          const SizedBox(height: 4),
                          Text(
                            'Your restaurant/store profile is under operational and FSSAI review.',
                            style: AllGoTypography.caption.copyWith(color: AllGoColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Operational Order Lock Warning
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AllGoColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AllGoColors.divider),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline, color: AllGoColors.textSecondary, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Orders Disabled: Outlets cannot accept live customer orders or go online until administrative approval is complete.',
                        style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.w600, color: AllGoColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              Text('Compliance Requirements', style: AllGoTypography.heading3),
              const SizedBox(height: 16),

              _buildTile('FSSAI Food License Number', 'Mandatory 14-digit food authority registration', false),
              _buildTile('GSTIN Tax Identification', 'Required for restaurant & dark store commission billing', false),
              _buildTile('Bank Penny-Drop Verification', 'Settlement account automated verification', false),
              _buildTile('Bilingual Catalog Audit', 'Menu items and pricing synchronization', false),

              const Spacer(),

              AllGoButton(
                label: 'Submit Outlet Credentials',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const MerchantRegistrationScreen()),
                  );
                },
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => _handleLogout(context, ref),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Log Out'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTile(String title, String subtitle, bool isCompleted) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AllGoColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AllGoColors.divider, width: 0.6),
      ),
      child: Row(
        children: [
          Icon(
            isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
            color: isCompleted ? AllGoColors.success : AllGoColors.textTertiary,
            size: 22,
          ),
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
        ],
      ),
    );
  }
}
