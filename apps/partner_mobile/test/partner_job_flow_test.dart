import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'package:allgo_partner_mobile/src/components/partner_duty_tab_content.dart';
import 'package:allgo_partner_mobile/src/components/active_delivery_card.dart';
import 'package:allgo_partner_mobile/src/data/partner_job_actions.dart';

void main() {
  group('Partner Job Flow Tests', () {
    testWidgets('ActiveDeliveryCard renders order details, address and action buttons', (tester) async {
      final mockJob = DeliveryJobModel(
        id: 'job_delivery_partner_42',
        orderId: 'ord_sample_202',
        orderNumber: 'AG-2026-4444',
        status: 'ACCEPTED',
        pickupAddress: 'Anjappar Chettinad, T. Nagar',
        deliveryAddress: 'Greenways Road, RA Puram',
        driverName: 'Suresh Kumar',
        driverPhone: '+919988771122',
        driverVehicleNumber: 'TN 07 CD 5678',
        estimatedMinutesRemaining: 20,
        estimatedDeliveryTime: DateTime.now().add(const Duration(minutes: 20)),
        items: const [],
      );

      bool reachedClicked = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActiveDeliveryCard(
              job: mockJob,
              isActionBusy: false,
              onReachedPickup: () => reachedClicked = true,
              onPickupOrder: () {},
              onReachedDrop: () {},
              onStartDropOtp: () {},
            ),
          ),
        ),
      );

      expect(find.text('ACTIVE DELIVERY'), findsOneWidget);
      expect(find.text('AG-2026-4444'), findsOneWidget);
      expect(find.text('Anjappar Chettinad, T. Nagar'), findsOneWidget);
      expect(find.text('Arrived at Store'), findsOneWidget);

      await tester.tap(find.text('Arrived at Store'));
      await tester.pump();
      expect(reachedClicked, isTrue);
    });
  });
}
