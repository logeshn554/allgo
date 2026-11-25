import 'package:flutter_test/flutter_test.dart';
import 'package:hub_mobile/main.dart';

void main() {
  testWidgets('AllGoHubApp renders hub operations shell', (tester) async {
    await tester.pumpWidget(const AllGoHubApp());
    expect(find.text('AllGo Hub Operations'), findsOneWidget);
  });
}
