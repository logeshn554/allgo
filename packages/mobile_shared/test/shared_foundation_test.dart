import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';

void main() {
  group('Mobile Shared Foundation Tests', () {
    test('User model serialization and deserialization', () {
      final json = {
        'id': 'usr_test_123',
        'phone': '+919876543210',
        'email': 'partner@allgo.in',
        'full_name': 'Test User',
        'status': 'ACTIVE',
        'roles': ['CUSTOMER', 'MERCHANT'],
        'default_language': 'ta',
      };

      final user = User.fromJson(json);

      expect(user.id, 'usr_test_123');
      expect(user.phone, '+919876543210');
      expect(user.phoneNumber, '+919876543210');
      expect(user.email, 'partner@allgo.in');
      expect(user.fullName, 'Test User');
      expect(user.status, AccountStatus.active);
      expect(user.hasRole('CUSTOMER'), isTrue);
      expect(user.hasRole('MERCHANT'), isTrue);
      expect(user.hasRole('ADMIN'), isFalse);
      expect(user.defaultLanguage, 'ta');

      final serialized = user.toJson();
      expect(serialized['id'], 'usr_test_123');
      expect(serialized['phone'], '+919876543210');
      expect(serialized['status'], 'ACTIVE');
      expect(serialized['roles'], ['CUSTOMER', 'MERCHANT']);
    });

    test('AuthTokens model serialization and deserialization', () {
      final userJson = {
        'id': 'usr_test_123',
        'phone': '+919876543210',
        'email': 'partner@allgo.in',
        'full_name': 'Test User',
        'status': 'ACTIVE',
        'roles': ['CUSTOMER'],
        'default_language': 'en',
      };

      final json = {
        'accessToken': 'jwt_access_token_abc',
        'refreshToken': 'jwt_refresh_token_xyz',
        'expiresIn': 3600,
        'user': userJson,
      };

      final tokens = AuthTokens.fromJson(json);
      expect(tokens.accessToken, 'jwt_access_token_abc');
      expect(tokens.refreshToken, 'jwt_refresh_token_xyz');
      expect(tokens.expiresIn, 3600);
      expect(tokens.user.id, 'usr_test_123');

      final serialized = tokens.toJson();
      expect(serialized['accessToken'], 'jwt_access_token_abc');
      expect(serialized['refreshToken'], 'jwt_refresh_token_xyz');
      expect(serialized['expiresIn'], 3600);
      expect(serialized['user']['id'], 'usr_test_123');
    });

    test('AccountStatus string parsing and edge cases', () {
      expect(AccountStatus.fromString('ACTIVE'), AccountStatus.active);
      expect(AccountStatus.fromString('PENDING_VERIFICATION'), AccountStatus.pendingVerification);
      expect(AccountStatus.fromString('SUSPENDED'), AccountStatus.suspended);
      expect(AccountStatus.fromString('BLOCKED'), AccountStatus.blocked);
      expect(AccountStatus.fromString('UNKNOWN_STATUS'), AccountStatus.pendingVerification);

      expect(AccountStatus.active.toApiString(), 'ACTIVE');
      expect(AccountStatus.pendingVerification.toApiString(), 'PENDING_VERIFICATION');
      expect(AccountStatus.blocked.toApiString(), 'BLOCKED');
    });

    testWidgets('AllGoButton renders label and handles tap event', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: AllGoButton(
                label: 'Confirm Order',
                onPressed: () {
                  tapped = true;
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('Confirm Order'), findsOneWidget);

      await tester.tap(find.text('Confirm Order'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('AllGoTextField renders label and allows text input', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: AllGoTextField(
                label: 'Store Name',
                controller: controller,
                hint: 'Enter store name',
              ),
            ),
          ),
        ),
      );

      expect(find.text('Store Name'), findsOneWidget);
      expect(find.text('Enter store name'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'AllGo Fresh Market');
      await tester.pump();

      expect(controller.text, 'AllGo Fresh Market');
    });
  });
}
