import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:partner_mobile/src/screens/phone_login_screen.dart';

void main() {
  group('Partner Mobile App Smoke Tests', () {
    testWidgets('PhoneLoginScreen renders Partner Login UI correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: PhoneLoginScreen(),
          ),
        ),
      );

      // Verify title in AppBar
      expect(find.text('Partner Login'), findsOneWidget);

      // Verify heading and subtitle
      expect(find.text('Drive & Earn with AllGo'), findsOneWidget);
      expect(
        find.text('Log in or register as a delivery courier, cab driver, or auto captain.'),
        findsOneWidget,
      );

      // Verify CTA button
      expect(find.text('Send Verification Code'), findsOneWidget);
    });
  });
}
