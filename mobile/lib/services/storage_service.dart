import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/incident_model.dart';

class StorageService {
  static const String _keyReports = 'bcc_saved_reports';
  static const String _keyOfflineQueue = 'bcc_offline_queue';

  /// Save an incident to local history
  static Future<void> saveReport(IncidentModel incident) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> list = prefs.getStringList(_keyReports) ?? [];
    // Prepend to top
    list.removeWhere((item) {
      try {
        final decoded = jsonDecode(item);
        return decoded['reference_number'] == incident.referenceNumber;
      } catch (_) {
        return false;
      }
    });
    list.insert(0, jsonEncode(incident.toJson()));
    await prefs.setStringList(_keyReports, list);
  }

  /// Get all saved reports
  static Future<List<IncidentModel>> getSavedReports() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> list = prefs.getStringList(_keyReports) ?? [];
    List<IncidentModel> result = [];
    for (var str in list) {
      try {
        result.add(IncidentModel.fromJson(jsonDecode(str)));
      } catch (_) {}
    }
    return result;
  }

  /// Seed starter mock reports if empty so user immediately experiences the full visual design
  static Future<List<IncidentModel>> getReportsOrSeed() async {
    final existing = await getSavedReports();
    if (existing.isNotEmpty) return existing;

    final initialMock = [
      IncidentModel(
        id: 'mock-1',
        referenceNumber: 'BCC-20260904-W281',
        incidentType: 'WaterLeak',
        status: 'InProgress',
        description: 'Burst main water pipe leaking clean drinking water across the road.',
        address: 'Cowdray Park, Stand 14203',
        lat: -20.0821,
        lng: 28.5034,
        isEmergency: false,
        createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
      ),
      IncidentModel(
        id: 'mock-2',
        referenceNumber: 'BCC-20260904-S104',
        incidentType: 'SewerBurst',
        status: 'Assigned',
        description: 'Sewer manhole overflowing into street ditch near school entrance.',
        address: 'Nkulumane 12, Sekusile Shopping Centre',
        lat: -20.1983,
        lng: 28.5291,
        isEmergency: false,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 10)),
      ),
      IncidentModel(
        id: 'mock-3',
        referenceNumber: 'BCC-20260903-R899',
        incidentType: 'RoadDamage',
        status: 'Resolved',
        description: 'Dangerous deep pothole repaired and re-tarred.',
        address: 'Bradfield, 12th Avenue Extension',
        lat: -20.1742,
        lng: 28.6011,
        isEmergency: false,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        resolvedAt: DateTime.now().subtract(const Duration(hours: 4)),
        resolutionNotes: 'BCC Roads crew filled pothole with hot asphalt mix.',
      ),
    ];

    for (var m in initialMock) {
      await saveReport(m);
    }
    return initialMock;
  }
}
