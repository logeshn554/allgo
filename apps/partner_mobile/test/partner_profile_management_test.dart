import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'package:partner_mobile/src/screens/partner_profile_screen.dart';
import 'package:partner_mobile/src/screens/partner_edit_profile_screen.dart';
import 'package:partner_mobile/src/screens/partner_vehicle_edit_screen.dart';
import 'package:partner_mobile/src/screens/partner_bank_edit_screen.dart';

void main() {
  group('Partner Profile Management & Edit Flows Tests', () {
    testWidgets('PartnerProfileScreen renders edit profile button and interactive tiles', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerProfileScreen()),
        ),
      );

      expect(find.text('Partner Profile'), findsOneWidget);
      expect(find.byIcon(Icons.edit_outlined), findsOneWidget);
      expect(find.text('Assigned Vehicle'), findsOneWidget);
      expect(find.text('Bank Account Details'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.edit_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Edit Personal Profile'), findsOneWidget);
    });

    testWidgets('PartnerProfileScreen vehicle tile navigates to PartnerVehicleEditScreen', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerProfileScreen()),
        ),
      );

      await tester.tap(find.text('Assigned Vehicle'));
      await tester.pumpAndSettle();
      expect(find.text('Vehicle Management'), findsOneWidget);
      expect(find.text('Vehicle Category'), findsOneWidget);
      expect(find.text('Registration Plate Number'), findsOneWidget);
      expect(find.text('Vehicle Make & Model'), findsOneWidget);
    });

    testWidgets('PartnerProfileScreen bank tile navigates to PartnerBankEditScreen', (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerProfileScreen()),
        ),
      );

      await tester.tap(find.text('Bank Account Details'));
      await tester.pumpAndSettle();
      expect(find.text('Bank Account & Payouts'), findsOneWidget);
      expect(find.text('Submit bank details & cancelled cheque for verification'), findsOneWidget);
      expect(find.text('Account Holder Name'), findsOneWidget);
      expect(find.text('Bank IFSC Code'), findsOneWidget);
    });

    testWidgets('PartnerEditProfileScreen form renders and validates inputs', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerEditProfileScreen()),
        ),
      );

      expect(find.text('Edit Personal Profile'), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Secondary / Alternate Phone'), findsOneWidget);
      expect(find.text('Emergency Contact Name'), findsOneWidget);
      expect(find.text('Emergency Contact Phone Number'), findsOneWidget);
      expect(find.text('Current Residential Address'), findsOneWidget);

      final saveButton = find.text('Save Profile Changes');
      await tester.ensureVisible(saveButton);
      await tester.tap(saveButton);
      await tester.pumpAndSettle();
      expect(find.text('Emergency contact name is required'), findsOneWidget);
    });

    testWidgets('PartnerVehicleEditScreen renders dropdown and form controls', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerVehicleEditScreen()),
        ),
      );

      expect(find.text('Vehicle Management'), findsOneWidget);
      expect(find.text('Save Vehicle Details'), findsOneWidget);
      expect(find.text('Registration Certificate (RC)'), findsOneWidget);
      expect(find.text('Commercial Insurance Policy'), findsOneWidget);
    });

    testWidgets('PartnerBankEditScreen validates account fields and renders save button', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: PartnerBankEditScreen()),
        ),
      );

      expect(find.text('Account Holder Name'), findsOneWidget);
      expect(find.text('Bank IFSC Code'), findsOneWidget);
      expect(find.text('Bank Passbook / Cheque Proof'), findsOneWidget);
      expect(find.text('Save & Update Bank Account'), findsOneWidget);
    });
  });
}
