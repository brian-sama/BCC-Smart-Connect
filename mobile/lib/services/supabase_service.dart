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
/// Stores reports locally only after the backend confirms submission.
class BccApiService {
  // ─── Backend URL ──────────────────────────────────────────────────────────
  // Always choose the API explicitly for non-local deployments.
  static String get baseUrl {
    const envUrl = String.fromEnvironment('BCC_API_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:3000/api';
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
    try {
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

      final error = _errorMessage(res.body, 'Login failed (HTTP ${res.statusCode})');
      throw Exception(error);
    } on SocketException {
      throw Exception('Could not connect to the BCC server. Check your connection.');
    } on TimeoutException {
      throw Exception('Login request timed out. Please try again.');
    }
  }

  /// Register a new citizen account
  static Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
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

      final error = _errorMessage(res.body, 'Registration failed (HTTP ${res.statusCode})');
      throw Exception(error);
    } on SocketException {
      throw Exception('Could not connect to the BCC server. Check your connection.');
    } on TimeoutException {
      throw Exception('Registration request timed out. Please try again.');
    }
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
    required String locationSource,
    required double? locationAccuracyMeters,
    required DateTime locationCapturedAt,
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
              'location_source': locationSource,
              'location_accuracy_m': locationAccuracyMeters,
              'location_captured_at': locationCapturedAt.toIso8601String(),
              'location_confirmed': true,
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
    } on SocketException {
      throw Exception(
        'Could not reach the BCC server. Check your connection and try again.',
      );
    } on TimeoutException {
      throw Exception('The report request timed out. Please try again.');
    } on http.ClientException {
      throw Exception(
        'A network error prevented the report from being submitted.',
      );
    }
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

  // ─── Bulletins & Feed ───────────────────────────────────────────────────────

  /// Fetch unified bulletin feed (Council bulletins, WhatsApp channel updates, and Ward notices)
  static Future<List<Map<String, dynamic>>> fetchBulletinFeed({
    String? ward,
    String? category,
    String? search,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (ward != null && ward.isNotEmpty && ward != 'All' && ward != 'All Bulawayo Wards') {
        queryParams['ward'] = ward;
      }
      if (category != null && category.isNotEmpty && category != 'All') {
        queryParams['category'] = category;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final uri = Uri.parse('$baseUrl/bulletins/feed').replace(
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      final res = await http.get(uri).timeout(_timeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = data['feed'] as List<dynamic>? ?? [];
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('fetchBulletinFeed error: $e');
    }

    // Official notices are not cached as sample data.
    return [];
  }

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

    return [];
  }

  // ─── WhatsApp & Community Directory ────────────────────────────────────────

  /// Fetch verified WhatsApp channels and Ward groups
  static Future<List<Map<String, dynamic>>> fetchWhatsAppChannels({
    String? category,
    String? ward,
    String? search,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (category != null && category.isNotEmpty && category != 'All') {
        queryParams['category'] = category;
      }
      if (ward != null && ward.isNotEmpty) {
        queryParams['ward'] = ward;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final uri = Uri.parse('$baseUrl/whatsapp/channels').replace(
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      final res = await http.get(uri).timeout(_timeout);
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (e) {
      debugPrint('fetchWhatsAppChannels error: $e');
    }

    // Contact channels are not fabricated when the service is unavailable.
    return [];
  }
}
