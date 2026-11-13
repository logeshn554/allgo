import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'phone_login_screen.dart';
import 'partner_home_shell.dart';
import 'approval_status_screen.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkInitialAuth();
  }

  Future<void> _checkInitialAuth() async {
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;

    final client = ref.read(apiClientProvider);
    client.activeRole = 'PARTNER';

    final authNotifier = ref.read(authNotifierProvider.notifier);
    await authNotifier.checkSession();

    if (!mounted) return;
    final authState = ref.read(authNotifierProvider);

    if (authState.isAuthenticated) {
      final user = authState.user;
      final isApproved = user?.hasRole('PARTNER') == true && user?.status == AccountStatus.active;

      if (isApproved) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const PartnerHomeShell()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ApprovalStatusScreen()),
        );
      }
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const PhoneLoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AllGoColors.surface,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: AllGoColors.secondary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.delivery_dining,
                size: 56,
                color: AllGoColors.textInverse,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'AllGo Partner',
              style: AllGoTypography.heading1.copyWith(fontSize: 30),
            ),
            const SizedBox(height: 8),
            Text(
              'Delivery Fleet & Mobility Drivers',
              style: AllGoTypography.subtitle,
            ),
            const SizedBox(height: 48),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AllGoColors.secondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

