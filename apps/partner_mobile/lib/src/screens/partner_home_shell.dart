import 'package:flutter/material.dart';
import '../pages/partner_home_page.dart';

export '../pages/partner_home_page.dart';

/// Partner Home Shell Screen Facade.
/// Backwards-compatible route handler and duty switcher definitions:
/// - DELIVERIES_ONLY: Hyperlocal Food & Grocery delivery orders
/// - RIDES_ONLY: Passenger mobility (Bike Taxi, Auto, Cab)
/// - ALL_JOBS: Universal dispatch with Live Dispatch Radar
class PartnerHomeShell extends StatelessWidget {
  const PartnerHomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const PartnerHomePage();
  }
}
