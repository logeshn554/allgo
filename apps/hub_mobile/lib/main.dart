import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'src/screens/hub_home_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: AllGoHubApp(),
    ),
  );
}

class AllGoHubApp extends StatelessWidget {
  const AllGoHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AllGo Hub',
      debugShowCheckedModeBanner: false,
      theme: AllGoTheme.lightTheme,
      home: const HubHomeShell(),
      builder: (context, child) => FTheme(
        data: AllGoTheme.foruiLightTheme,
        child: ShadTheme(
          data: AllGoTheme.shadLightTheme,
          child: FToaster(child: child ?? const SizedBox.shrink()),
        ),
      ),
    );
  }
}
