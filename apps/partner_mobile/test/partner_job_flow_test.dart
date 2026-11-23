import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:allgo_mobile_shared/allgo_mobile_shared.dart';
import 'package:partner_mobile/src/components/active_delivery_card.dart';

void main() {
  group('Partner Job Flow Tests', () {
    testWidgets('ActiveDeliveryCard renders order details, address and action buttons', (tester) async {
      final mockJob = const DeliveryJobModel(
        id: 'job_delivery_partner_42',
        jobNumber: 'AG-2026-4444',
        verticalType: 'FOOD',
        status: 'ASSIGNED',
        pickupAddress: 'Anjappar Chettinad, T. Nagar',
        dropoffAddress: 'Greenways Road, RA Puram',
        courierFeeInr: 65.0,
      );

      bool arrivedPickupClicked = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActiveDeliveryCard(
              activeJob: mockJob,
              isActionBusy: false,
              onArrivedPickup: () => arrivedPickupClicked = true,
              onStartDelivery: () {},
              onArrivedDestination: () {},
              onCompleteDelivery: () {},
              onReportException: () {},
            ),
          ),
        ),
      );

      expect(find.text('ACTIVE DELIVERY: ASSIGNED'), findsOneWidget);
      expect(find.text('Anjappar Chettinad, T. Nagar'), findsOneWidget);
      expect(find.text('Greenways Road, RA Puram'), findsOneWidget);
      expect(find.text('Arrived at Store / Pickup'), findsOneWidget);

      await tester.tap(find.text('Arrived at Store / Pickup'));
      await tester.pump();

      expect(arrivedPickupClicked, isTrue);
    });
  });
}
