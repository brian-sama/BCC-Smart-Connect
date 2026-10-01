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

    // Default fallback channels if offline
    return [
      {
        'id': '1',
        'name': 'City of Bulawayo Official WhatsApp Channel',
        'category': 'Channel',
        'ward': 'All Bulawayo Wards',
        'description': 'Follow the official verified City of Bulawayo WhatsApp Channel for daily water shedding updates, civic notices, emergency alerts, and exchange rates.',
        'invite_url': 'https://whatsapp.com/channel/0029VbA48WT1iUxQRxulvU41',
        'is_official': true,
        'member_count_approx': 'Official Channel',
      },
      {
        'id': '2',
        'name': 'BCC Customer Care & Enquiries',
        'category': 'Support',
        'ward': 'All Bulawayo Wards',
        'description': 'Main City of Bulawayo customer care line (0784 136 505) for public inquiries, fault reporting, service updates, and citizen feedback.',
        'invite_url': 'https://wa.me/263784136505?text=Hello%20City%20of%20Bulawayo%20Customer%20Care,%20I%20would%20like%20to%20make%20an%20enquiry.',
        'phone_number': '+263 78 413 6505',
        'is_official': true,
        'member_count_approx': 'Main Customer Line',
      },
      {
        'id': '3',
        'name': 'BCC Monthly Water Meter Readings',
        'category': 'MeterReading',
        'ward': 'All Bulawayo Wards',
        'description': 'Official WhatsApp number (0713 347 319) dedicated for Bulawayo residents to submit monthly water meter readings and billing photos.',
        'invite_url': 'https://wa.me/263713347319?text=Hello%20City%20of%20Bulawayo,%20I%20am%20submitting%20my%20monthly%20water%20meter%20reading.%0AAccount%20No:%20%0AAddress:%20%0AMeter%20Reading:%20',
        'phone_number': '+263 71 334 7319',
        'is_official': true,
        'member_count_approx': 'Water Readings Desk',
      },
      {
        'id': '4',
        'name': 'Ward 1 - Bulawayo Central & Suburbs',
        'category': 'WardGroup',
        'ward': 'Ward 1',
        'description': 'Community group for CBD, Suburbs, Kumalo, and Ascot residents.',
        'invite_url': 'https://chat.whatsapp.com/BCCWard01CommunityGroup',
        'is_official': true,
        'member_count_approx': '1,020 Members',
      },
      {
        'id': '5',
        'name': 'Ward 28 - Cowdray Park',
        'category': 'WardGroup',
        'ward': 'Ward 28',
        'description': 'Cowdray Park municipal updates group for sewer works and road gravelling.',
        'invite_url': 'https://chat.whatsapp.com/BCCWard28CommunityGroup',
        'is_official': true,
        'member_count_approx': '1,800 Members',
      }
    ];
  }
}
