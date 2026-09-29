import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/incident_model.dart';
import 'storage_service.dart';

/// BCC SmartConnect — REST API Service
/// Connects directly to the Express backend at [baseUrl].
/// Falls back to local offline storage if network is unavailable.
class BccApiService {
  // ─── Backend URL ──────────────────────────────────────────────────────────
  // Override with --dart-define=BCC_API_URL=... for a physical device or production.
  static String get baseUrl {
    const envUrl = String.fromEnvironment('BCC_API_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:3000/api';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
    } catch (_) {}
    return 'http://localhost:3000/api';
  }

  static const Duration _timeout = Duration(seconds: 10);

  // ─── Token Storage ────────────────────────────────────────────────────────
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('bcc_access_token');
  }

  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('bcc_access_token', token);
  }

  static Future<void> _saveUser(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('bcc_user', jsonEncode(user));
  }

  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('bcc_user');
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('bcc_access_token');
    await prefs.remove('bcc_user');
  }

  static bool get isGuest {
    // Synchronous check — relies on cached user data
    return true; // Default to guest; check getSavedUser() for actual state
  }

  // ─── Auth headers ─────────────────────────────────────────────────────────
  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  /// Login with email + password → returns user map
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await http
        .post(
          Uri.parse('$baseUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(_timeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      await _saveToken(data['access'] as String);
      await _saveUser(data['user'] as Map<String, dynamic>);
      return data['user'] as Map<String, dynamic>;
    }

    final error = jsonDecode(res.body)['error'] ?? 'Login failed';
    throw Exception(error);
  }

  /// Register a new citizen account
  static Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
  }) async {
    final res = await http
        .post(
          Uri.parse('$baseUrl/auth/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'first_name': firstName,
            'last_name': lastName,
            'email': email,
            'password': password,
            if (phone != null && phone.isNotEmpty) 'phone': phone,
          }),
        )
        .timeout(_timeout);

    if (res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      await _saveToken(data['access'] as String);
      await _saveUser(data['user'] as Map<String, dynamic>);
      return data['user'] as Map<String, dynamic>;
    }

    final error = jsonDecode(res.body)['error'] ?? 'Registration failed';
    throw Exception(error);
  }

  /// Continue as guest (no account needed)
  static Future<void> continueAsGuest() async {
    try {
      final res = await http
          .post(
            Uri.parse('$baseUrl/auth/guest'),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        await _saveToken(data['access'] as String);
        await _saveUser(data['user'] as Map<String, dynamic>);
      }
    } catch (_) {
      // Guest mode works offline — just clear any old session
      await clearSession();
    }
  }

  /// Sign out
  static Future<void> signOut() async {
    await clearSession();
  }

  // ─── Incidents ────────────────────────────────────────────────────────────

  /// Submit a new fault / emergency report
  static Future<IncidentModel> submitIncident({
    required String incidentType,
    required String description,
    required String address,
    required double lat,
    required double lng,
    String? phone,
    String? reporterName,
  }) async {
    try {
      final headers = await _authHeaders();
      final res = await http
          .post(
            Uri.parse('$baseUrl/incidents'),
            headers: headers,
            body: jsonEncode({
              'incident_type': incidentType,
              'description': description,
              'address': address,
              'lat': lat,
              'lng': lng,
              if (phone != null && phone.isNotEmpty) 'phone': phone,
            }),
          )
          .timeout(_timeout);

      if (res.statusCode == 201) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final incident = IncidentModel.fromJson(
          data['incident'] as Map<String, dynamic>,
        );
        await StorageService.saveReport(incident);
        return incident;
      }

      throw Exception(_errorMessage(res.body, 'Incident submission failed'));
    } on SocketException catch (e) {
      debugPrint('submitIncident error: $e');
    } on TimeoutException catch (e) {
      debugPrint('submitIncident timeout: $e');
    } on http.ClientException catch (e) {
      debugPrint('submitIncident network error: $e');
    }

    // ── Offline fallback ──────────────────────────────────────────────────
    final stamp = DateTime.now()
        .toIso8601String()
        .substring(0, 10)
        .replaceAll('-', '');
    final rand = (DateTime.now().millisecondsSinceEpoch % 9000 + 1000)
        .toString();
    final fallback = IncidentModel(
      id: 'local-$rand',
      referenceNumber: 'BCC-$stamp-$rand',
      incidentType: incidentType,
      status: 'New',
      description: description,
      address: address,
      lat: lat,
      lng: lng,
      isEmergency: ['Ambulance', 'Fire', 'Disaster'].contains(incidentType),
      createdAt: DateTime.now(),
    );
    await StorageService.saveReport(fallback);
    return fallback;
  }

  static String _errorMessage(String body, String fallback) {
    try {
      final data = jsonDecode(body);
      if (data is Map<String, dynamic> && data['error'] != null) {
        return data['error'].toString();
      }
    } catch (_) {}
    return fallback;
  }

  /// Upload photo evidence (multipart to /api/incidents/:id/media)
  static Future<String?> uploadPhoto({
    required String incidentId,
    required File photoFile,
  }) async {
    try {
      final token = await getToken();
      final req = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/incidents/$incidentId/media'),
      );
      if (token != null) {
        req.headers['Authorization'] = 'Bearer $token';
      }
      req.files.add(await http.MultipartFile.fromPath('file', photoFile.path));
      final streamed = await req.send().timeout(_timeout);
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode == 201) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return data['url']?.toString();
      }
    } catch (e) {
      debugPrint('uploadPhoto error: $e');
    }
    return null;
  }

  /// Track an incident by its reference number
  static Future<IncidentModel?> trackIncident(String reference) async {
    final cleanRef = reference.trim().toUpperCase();
    try {
      final res = await http
          .get(Uri.parse('$baseUrl/incidents/track/$cleanRef'))
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return IncidentModel.fromJson(data['incident'] as Map<String, dynamic>);
      }
    } catch (_) {}

    // Fallback to local storage
    final local = await StorageService.getSavedReports();
    for (var inc in local) {
      if (inc.referenceNumber.toUpperCase() == cleanRef) return inc;
    }
    return null;
  }

  /// Fetch citizen's own submitted reports (requires login)
  static Future<List<IncidentModel>> fetchMyReports() async {
    try {
      final headers = await _authHeaders();
      final res = await http
          .get(Uri.parse('$baseUrl/incidents/my'), headers: headers)
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = data['incidents'] as List<dynamic>? ?? [];
        return list
            .map((e) => IncidentModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    // Fall back to local cache
    return StorageService.getSavedReports();
  }

  // ─── Bulletins ────────────────────────────────────────────────────────────

  /// Fetch public council bulletins / notices
  static Future<List<Map<String, dynamic>>> fetchBulletins() async {
    try {
      final res = await http
          .get(Uri.parse('$baseUrl/bulletins'))
          .timeout(_timeout);

      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('fetchBulletins error: $e');
    }

    // No dummy data — feeds directly from database
    return [];
  }
}
