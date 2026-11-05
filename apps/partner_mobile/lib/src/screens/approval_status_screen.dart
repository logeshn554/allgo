import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'partner_registration_screen.dart';

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
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(
        title: 'Partner Onboarding Status',
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
              // Status Alert Box
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AllGoColors.warning.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AllGoColors.warning.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.pending_actions, color: AllGoColors.warning, size: 36),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Verification in Progress', style: AllGoTypography.heading3.copyWith(fontSize: 16)),
                          const SizedBox(height: 4),
                          Text(
                            'Your partner application is currently under operational review.',
                            style: AllGoTypography.caption.copyWith(color: AllGoColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Operational Warning
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
                        'Dispatch & Online Mode Locked: Partners cannot accept jobs or go online until required verification is approved.',
                        style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.w600, color: AllGoColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              Text('Onboarding Checklist', style: AllGoTypography.heading3),
              const SizedBox(height: 16),

              _buildChecklistTile('Phone Number Verified', user?.phone ?? '+91 --', true),
              _buildChecklistTile('Driving License / Govt ID', 'Under manual verification', false),
              _buildChecklistTile('Vehicle RC & Commercial Permit', 'Pending document submission', false),
              _buildChecklistTile('Cash-in-Hand Limit Binding', 'Default limit: ₹2,000 INR', false),

              const Spacer(),

              AllGoButton(
                label: 'Complete Document Submission',
                variant: AllGoButtonVariant.secondary,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PartnerRegistrationScreen()),
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

  Widget _buildChecklistTile(String title, String subtitle, bool isCompleted) {
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
