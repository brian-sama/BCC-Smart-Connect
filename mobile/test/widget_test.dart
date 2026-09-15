import 'package:flutter_test/flutter_test.dart';
import 'package:bcc_smartconnect/main.dart';

void main() {
  testWidgets('BCC SmartConnect smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BccSmartConnectApp());
    expect(find.text('Bulawayo Citizen'), findsOneWidget);
  });
}
