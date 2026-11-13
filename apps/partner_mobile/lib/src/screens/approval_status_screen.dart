import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'partner_registration_screen.dart';

class ApprovalStatusScreen extends ConsumerStatefulWidget {
  const ApprovalStatusScreen({super.key});

  @override
  ConsumerState<ApprovalStatusScreen> createState() => _ApprovalStatusScreenState();
}

class _ApprovalStatusScreenState extends ConsumerState<ApprovalStatusScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _profileData;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final profile = await client.getPartnerProfile();
      setState(() {
        _profileData = profile;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _handleLogout(BuildContext context) async {
    await ref.read(authNotifierProvider.notifier).logout();
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PhoneLoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _profileData?['status']?.toString() ?? 'DOCS_SUBMITTED';
    final services = (_profileData?['services'] as List<dynamic>?) ?? [];
    final partner = _profileData?['partner'] as Map<String, dynamic>?;

    final isDocsRequired = status == 'DOCUMENTS_REQUIRED';
    final isRejected = status == 'REJECTED';
    final isApproved = status == 'APPROVED' || status == 'ACTIVE';

    Color statusColor = AllGoColors.warning;
    IconData statusIcon = Icons.pending_actions;
    String statusTitle = 'Verification in Progress';
    String statusSubtitle = 'Your partner dossier is under operational and compliance review.';

    if (isApproved) {
      statusColor = AllGoColors.success;
      statusIcon = Icons.check_circle;
      statusTitle = 'Partner Account Approved';
      statusSubtitle = 'Your onboarding documents have been verified.';
    } else if (isDocsRequired) {
      statusColor = Colors.orange;
      statusIcon = Icons.warning_amber_rounded;
      statusTitle = 'Additional Documents Required';
      statusSubtitle = 'Operational review requires document updates.';
    } else if (isRejected) {
      statusColor = AllGoColors.error;
      statusIcon = Icons.cancel;
      statusTitle = 'Application Rejected';
      statusSubtitle = 'Compliance review rejected the application.';
    }

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(
        title: 'Partner Onboarding Status',
        showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _fetchProfile,
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () => _handleLogout(context),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Status Alert Box
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: statusColor.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          Icon(statusIcon, color: statusColor, size: 36),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(statusTitle, style: AllGoTypography.heading3.copyWith(fontSize: 16)),
                                const SizedBox(height: 4),
                                Text(statusSubtitle, style: AllGoTypography.caption.copyWith(color: AllGoColors.textPrimary)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Operational Lock Warning
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
                    const SizedBox(height: 20),

                    // Resubmit Button if documents required or registration incomplete
                    if (!isApproved) ...[
                      AllGoButton(
                        label: 'Complete Document Submission',
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const PartnerRegistrationScreen()),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Independent Service Approvals breakdown
                    Text('Service Category Approvals', style: AllGoTypography.heading3),
                    const SizedBox(height: 12),
                    if (services.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AllGoColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AllGoColors.divider),
                        ),
                        child: Text('No service categories applied yet.', style: AllGoTypography.subtitle),
                      )
                    else
                      ...services.map((s) {
                        final sName = s['service_type']?.toString() ?? '';
                        final sStatus = s['status']?.toString() ?? 'PENDING';
                        final sReason = s['rejection_reason']?.toString();
                        final isSApproved = sStatus == 'APPROVED';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AllGoColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSApproved ? AllGoColors.success : AllGoColors.divider,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSApproved ? Icons.verified : Icons.hourglass_top,
                                color: isSApproved ? AllGoColors.success : AllGoColors.warning,
                                size: 22,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(sName.replaceAll('_', ' '), style: AllGoTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                                    if (sReason != null)
                                      Text('Reason: $sReason', style: const TextStyle(color: AllGoColors.error, fontSize: 12)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (isSApproved ? AllGoColors.success : AllGoColors.warning).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  sStatus,
                                  style: TextStyle(
                                    color: isSApproved ? AllGoColors.success : Colors.orange.shade800,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                    const SizedBox(height: 24),
                    Text('Banking Information (Encrypted at rest)', style: AllGoTypography.heading3.copyWith(fontSize: 15)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AllGoColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AllGoColors.divider),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Account: ${partner?['bankAccountMasked'] ?? '**********'}', style: AllGoTypography.bodyMedium),
                          const SizedBox(height: 4),
                          Text('IFSC: ${partner?['bankIfsc'] ?? '--'}', style: AllGoTypography.caption),
                          Text('Beneficiary: ${partner?['bankBeneficiaryName'] ?? '--'}', style: AllGoTypography.caption),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
