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
import 'partner_trip_history_screen.dart';

class PartnerProfileScreen extends ConsumerStatefulWidget {
  const PartnerProfileScreen({super.key});

  @override
  ConsumerState<PartnerProfileScreen> createState() => _PartnerProfileScreenState();
}

class _PartnerProfileScreenState extends ConsumerState<PartnerProfileScreen> {
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _codStatus;
  Map<String, dynamic>? _earningsSummary;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);
    final client = ref.read(apiClientProvider);
    final results = await Future.wait([
      client.getPartnerProfile().catchError((_) => <String, dynamic>{}),
      client.getPartnerCodStatus().catchError((_) => <String, dynamic>{}),
      client.getPartnerEarningsDashboard().catchError((_) => <String, dynamic>{}),
    ]);
    if (!mounted) return;
    setState(() {
      _profile = results[0];
      _codStatus = results[1];
      _earningsSummary = results[2];
      _isLoading = false;
    });
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

  void _showDocumentCenter(List<dynamic> documents) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('KYC Document Center', style: AllGoTypography.heading3),
            const SizedBox(height: 12),
            if (documents.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('No KYC documents uploaded yet. Update your Vehicle or Bank proof to submit.'),
              )
            else
              ...documents.map((doc) {
                final m = doc as Map<String, dynamic>;
                final type = (m['documentType'] ?? m['document_type'] ?? 'DOCUMENT').toString();
                final status = (m['verificationStatus'] ?? m['status'] ?? 'PENDING').toString();
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    status == 'VERIFIED' || status == 'APPROVED' ? Icons.verified : Icons.hourglass_bottom,
                    color: status == 'VERIFIED' || status == 'APPROVED' ? AllGoColors.success : AllGoColors.warning,
                  ),
                  title: Text(type),
                  subtitle: Text('Status: $status'),
                );
              }),
            const SizedBox(height: 12),
            AllGoButton(label: 'Close', onPressed: () => Navigator.pop(ctx)),
          ],
        ),
      ),
    );
  }

  void _showFatiguePolicy() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Duty Hours & Fatigue Policy'),
        content: const Text(
          'For partner road safety, continuous duty is capped at 12 hours per 24-hour cycle with a mandatory 6-hour rest cooldown. Break reminders trigger automatically after 5 continuous hours online.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Understood')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final partner = _profile?['partner'] as Map<String, dynamic>? ?? _profile ?? {};
    final vehicles = (_profile?['vehicles'] as List<dynamic>?) ?? [];
    final primaryVehicle = vehicles.isNotEmpty ? vehicles.first as Map<String, dynamic> : null;
    final documents = (_profile?['documents'] as List<dynamic>?) ?? [];

    final rating = (partner['averageRating'] ?? partner['average_rating'] ?? _earningsSummary?['averageRating']);
    final trips = (partner['totalCompletedTrips'] ?? partner['total_trips'] ?? _earningsSummary?['completedTrips'] ?? 0);
    final ratingLabel = rating != null ? '${(rating as num).toStringAsFixed(2)} ($trips trips)' : '$trips completed trips';

    final codCash = ((_codStatus?['cashInHandInr'] ?? _codStatus?['cash_in_hand_inr'] ?? 0) as num).toDouble();
    final codLimit = ((_codStatus?['codLimitInr'] ?? _codStatus?['cod_limit_inr'] ?? 2000) as num).toDouble();

    final vehicleLabel = primaryVehicle != null
        ? '${primaryVehicle['makeModel'] ?? primaryVehicle['make_model'] ?? primaryVehicle['vehicleType'] ?? 'Vehicle'} (${primaryVehicle['registrationNumber'] ?? primaryVehicle['registration_number'] ?? '--'})'
        : 'Tap to configure vehicle & RC';

    final bankAcc = (partner['bankAccountNumber'] ?? partner['bank_account_number'] ?? '').toString();
    final bankIfsc = (partner['bankIfsc'] ?? partner['bank_ifsc'] ?? '').toString();
    final bankHolder = (partner['bankBeneficiaryName'] ?? partner['bank_beneficiary_name'] ?? user?.fullName ?? '').toString();
    final bankMasked = bankAcc.length >= 4 ? 'Account ending in •••• ${bankAcc.substring(bankAcc.length - 4)}' : 'Tap to add settlement bank account';
    final bankVerified = partner['bankVerified'] == true || partner['bank_verified'] == true;

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: const AllGoAppBar(title: 'Partner Profile', showBackButton: false),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfileData,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            children: [
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: LinearProgressIndicator(minHeight: 2),
                ),
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
                              Text(ratingLabel, style: AllGoTypography.caption.copyWith(fontWeight: FontWeight.bold)),
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
                        Text(
                          '₹${codCash.toStringAsFixed(2)} / ₹${codLimit.toStringAsFixed(0)} limit',
                          style: AllGoTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold),
                        ),
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
                'Trip & Delivery History',
                'Completed parcels, rides, and chauffeur duties',
                Icons.history,
                () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PartnerTripHistoryScreen())),
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
                vehicleLabel,
                Icons.motorcycle,
                onTap: () async {
                  final updated = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(builder: (_) => PartnerVehicleEditScreen(initialVehicle: primaryVehicle)),
                  );
                  if (updated == true) _loadProfileData();
                },
              ),
              _buildTile(
                'Bank Account Details',
                bankMasked,
                Icons.account_balance,
                onTap: () async {
                  final updated = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => PartnerBankEditScreen(
                        initialAccountMasked: bankMasked,
                        initialIfsc: bankIfsc,
                        initialHolderName: bankHolder,
                        isVerified: bankVerified,
                      ),
                    ),
                  );
                  if (updated == true) _loadProfileData();
                },
              ),
              _buildTile(
                'Document Center',
                '${documents.length} KYC documents on file',
                Icons.verified_user_outlined,
                onTap: () => _showDocumentCenter(documents),
              ),
              _buildTile(
                'Duty Hours & Fatigue Policy',
                'Max 12 hours continuous duty enforced',
                Icons.schedule,
                onTap: _showFatiguePolicy,
              ),
              const SizedBox(height: 32),
              AllGoButton(
                label: 'Log Out of Partner App',
                variant: AllGoButtonVariant.outlined,
                icon: Icons.logout,
                onPressed: () => _handleLogout(context),
              ),
              const SizedBox(height: 16),
            ],
          ),
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
