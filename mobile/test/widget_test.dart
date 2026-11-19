import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:bcc_smartconnect/main.dart';
import 'package:bcc_smartconnect/models/incident_model.dart';

void main() {
  setUp(() {
    // The app reads its saved session from SharedPreferences on start-up
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('App starts and shows the resident home screen', (WidgetTester tester) async {
    await tester.pumpWidget(const BccSmartConnectApp());
    // First frame is the session check spinner; let the async check finish
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    expect(find.text('Bulawayo Citizen'), findsWidgets);
  });

  group('IncidentModel.fromJson', () {
    test('parses an API incident with GPS coordinates', () {
      final m = IncidentModel.fromJson({
        'id': 'a1b2',
        'reference_number': 'BCC-20260924-AB12C',
        'incident_type': 'SewerBurst',
        'status': 'Assigned',
        'lat': -20.1983,
        'lng': 28.5291,
        'is_emergency': false,
        'created_at': '2026-09-24T08:15:00Z',
      });
      expect(m.referenceNumber, 'BCC-20260924-AB12C');
      expect(m.incidentType, 'SewerBurst');
      expect(m.status, 'Assigned');
      expect(m.lat, closeTo(-20.1983, 1e-9));
      expect(m.lng, closeTo(28.5291, 1e-9));
      expect(m.isEmergency, isFalse);
    });

    test('flags emergency incidents', () {
      final m = IncidentModel.fromJson({
        'id': 'x',
        'reference_number': 'BCC-20260924-ZZ999',
        'incident_type': 'Ambulance',
        'status': 'New',
        'lat': -20.15,
        'lng': 28.58,
        'is_emergency': true,
      });
      expect(m.isEmergency, isTrue);
    });
  });
}
