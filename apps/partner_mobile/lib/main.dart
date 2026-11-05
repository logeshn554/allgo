import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'src/screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: AllGoPartnerApp(),
    ),
  );
}

class AllGoPartnerApp extends StatelessWidget {
  const AllGoPartnerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AllGo Partner',
      debugShowCheckedModeBanner: false,
      theme: AllGoTheme.lightTheme.copyWith(
        colorScheme: ColorScheme.light(
          primary: AllGoColors.secondary,
          secondary: AllGoColors.primary,
          surface: AllGoColors.surface,
          error: AllGoColors.error,
        ),
      ),
      home: const SplashScreen(),
    );
  }
}
