import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/incident_model.dart';

class StorageService {
  static const String _keyReports = 'bcc_saved_reports';

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

}
