import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'outlet_management_screen.dart';
import '../components/merchant_profile_tiles.dart';
import 'merchant_financials_screen.dart';
import 'merchant_support_screen.dart';
import 'merchant_notifications_screen.dart';

class MerchantProfileScreen extends ConsumerStatefulWidget {
  const MerchantProfileScreen({super.key});

  @override
  ConsumerState<MerchantProfileScreen> createState() => _MerchantProfileScreenState();
}

class _MerchantProfileScreenState extends ConsumerState<MerchantProfileScreen> {
  Map<String, dynamic>? _profileData;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final client = ref.read(apiClientProvider);
      final data = await client.getMerchantProfile();
      if (mounted) {
        setState(() {
          _profileData = data;
          _isLoading = false;
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    await ref.read(authNotifierProvider.notifier).logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PhoneLoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final merchant = _profileData?['merchant'] as Map<String, dynamic>?;
    final outlet = _profileData?['outlet'] as Map<String, dynamic>?;
    final status = _profileData?['status']?.toString() ?? 'SUBMITTED';

    Color statusColor = AllGoColors.warning;
    if (status == 'APPROVED' || status == 'LIVE' || status == 'ACTIVE') {
      statusColor = AllGoColors.success;
    } else if (status == 'SUSPENDED' || status == 'REJECTED') {
      statusColor = AllGoColors.error;
    }

    return Scaffold(
      backgroundColor: AllGoColors.background,
      appBar: AllGoAppBar(
        title: 'Outlet Profile',
        showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 22),
            onPressed: _isLoading ? null : _loadProfile,
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6200EA)))
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: AllGoColors.error),
                          const SizedBox(height: 12),
                          Text('Failed to load profile', style: AllGoTypography.heading3),
                          const SizedBox(height: 6),
                          Text(_error!, style: AllGoTypography.caption, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          OutlinedButton(onPressed: _loadProfile, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadProfile,
                    color: const Color(0xFF6200EA),
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
                                child: const Icon(Icons.storefront, size: 30, color: Color(0xFF6200EA)),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      merchant?['business_name']?.toString() ?? 'Store Profile',
                                      style: AllGoTypography.heading3,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Owner: ${user?.phoneNumber ?? merchant?['owner_phone'] ?? "+91 --"}',
                                      style: AllGoTypography.caption,
                                    ),
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: statusColor.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'Status: $status',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        MerchantInfoTile(
                          title: 'Business Category',
                          subtitle: (merchant?['merchant_type']?.toString() ?? 'RESTAURANT').replaceAll('_', ' '),
                          icon: Icons.category_outlined,
                        ),
                        MerchantInfoTile(
                          title: 'FSSAI Food License',
                          subtitle: merchant?['fssai_license_number'] != null
                              ? '${merchant!['fssai_license_number']} (Verified)'
                              : 'Exempt / Not Submitted',
                          icon: Icons.verified_outlined,
                        ),
                        MerchantInfoTile(
                          title: 'PAN Number',
                          subtitle: merchant?['pan_number']?.toString() ?? 'Not Submitted',
                          icon: Icons.badge_outlined,
                        ),
                        if (merchant?['gstin'] != null && merchant!['gstin'].toString().isNotEmpty)
                          MerchantInfoTile(
                            title: 'GSTIN Number',
                            subtitle: merchant['gstin'].toString(),
                            icon: Icons.receipt_outlined,
                          ),
                        MerchantInfoTile(
                          title: 'Outlet Address',
                          subtitle: '${outlet?['address_line1'] ?? 'Primary Outlet'}, PIN: ${outlet?['postal_code'] ?? 'N/A'}',
                          icon: Icons.location_on_outlined,
                        ),
                        MerchantInfoTile(
                          title: 'Settlement Bank Account',
                          subtitle: merchant?['bank_account_number'] != null
                              ? '${merchant!['bank_beneficiary_name'] ?? 'Beneficiary'} •••• ${merchant['bank_account_number'].toString().length > 4 ? merchant['bank_account_number'].toString().substring(merchant['bank_account_number'].toString().length - 4) : merchant['bank_account_number']} (${merchant['bank_ifsc'] ?? ''})'
                              : 'Pending Bank Setup',
                          icon: Icons.account_balance,
                        ),
                        MerchantInfoTile(
                          title: 'Platform Commission',
                          subtitle: '${merchant?['commission_rate_percentage'] ?? '15.00'}% Standard Platform Fee',
                          icon: Icons.pie_chart_outline,
                        ),
                        MerchantInfoTile(
                          title: 'Kitchen Prep Time & Operations',
                          subtitle: 'Default Prep: ${outlet?['default_prep_time_minutes'] ?? 15} mins • Duty: ${outlet?['is_open'] == true ? "OPEN" : "CLOSED"}',
                          icon: Icons.access_time,
                        ),

                        const SizedBox(height: 16),

                        MerchantActionTile(
                          title: 'Settlements & Bank Payouts',
                          subtitle: 'Weekly invoices, TCS deductions, and net payouts',
                          icon: Icons.receipt_long,
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MerchantFinancialsScreen())),
                        ),
                        MerchantActionTile(
                          title: 'Store Alerts & Notifications',
                          subtitle: 'Order volume spikes, payout confirmations, and notices',
                          icon: Icons.notifications_active,
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MerchantNotificationsScreen())),
                        ),
                        MerchantActionTile(
                          title: 'Merchant Support & Disputes',
                          subtitle: 'Direct hotline to merchant relations and dispute team',
                          icon: Icons.support_agent,
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MerchantSupportScreen())),
                        ),

                        const SizedBox(height: 24),

                        AllGoButton(
                          label: 'Manage Outlets & Branches',
                          icon: Icons.store_mall_directory_outlined,
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const OutletManagementScreen()),
                            );
                          },
                        ),
                        const SizedBox(height: 12),

                        AllGoButton(
                          label: 'Log Out of Merchant App',
                          variant: AllGoButtonVariant.outlined,
                          icon: Icons.logout,
                          onPressed: _handleLogout,
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
      ),
    );
  }
}
