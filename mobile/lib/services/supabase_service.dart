import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/incident_model.dart';
import 'storage_service.dart';

class SupabaseService {
  // Replace these with your Supabase project credentials (from supabase.com -> Project Settings -> API)
  static const String supabaseUrl = 'https://your-project-id.supabase.co';
  static const String supabaseAnonKey = 'your-anon-public-key-here';

  static bool get isConfigured =>
      supabaseUrl != 'https://your-project-id.supabase.co' &&
      supabaseAnonKey != 'your-anon-public-key-here';

  static SupabaseClient? get client {
    if (!isConfigured) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  /// Initialize Supabase if credentials are provided
  static Future<void> initialize() async {
    if (!isConfigured) return;
    try {
      await Supabase.initialize(
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      );
    } catch (e) {
      debugPrint('Supabase initialize error: $e');
    }
  }

  /// Current authenticated user (can be anonymous guest or registered citizen)
  static User? get currentUser => client?.auth.currentUser;
  static bool get isAuthenticated => currentUser != null;
  static bool get isAnonymous => currentUser?.isAnonymous ?? true;

  /// Sign in anonymously as a guest
  static Future<AuthResponse?> signInAnonymously() async {
    if (!isConfigured) return null;
    try {
      return await client?.auth.signInAnonymously();
    } catch (e) {
      debugPrint('Guest sign-in error: $e');
      return null;
    }
  }

  /// Sign up with Email and Password
  static Future<AuthResponse?> signUp({
    required String email,
    required String password,
    String? phone,
  }) async {
    if (!isConfigured) return null;
    try {
      final res = await client?.auth.signUp(
        email: email,
        password: password,
        data: phone != null ? {'phone': phone} : null,
      );
      return res;
    } catch (e) {
      debugPrint('Sign up error: $e');
      rethrow;
    }
  }

  /// Sign in with Email and Password
  static Future<AuthResponse?> signIn({
    required String email,
    required String password,
  }) async {
    if (!isConfigured) return null;
    try {
      return await client?.auth.signInWithPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      debugPrint('Sign in error: $e');
      rethrow;
    }
  }

  /// Sign Out
  static Future<void> signOut() async {
    if (!isConfigured) return;
    try {
      await client?.auth.signOut();
    } catch (e) {
      debugPrint('Sign out error: $e');
    }
  }

  /// Upload photo evidence to Supabase Storage bucket 'fault-evidence'
  static Future<String?> uploadEvidencePhoto({
    required Uint8List bytes,
    required String fileName,
  }) async {
    if (!isConfigured || client == null) return null;
    try {
      final path = 'evidence/${DateTime.now().millisecondsSinceEpoch}_$fileName';
      await client!.storage.from('fault-evidence').uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(contentType: 'image/jpeg'),
          );
      final publicUrl =
          client!.storage.from('fault-evidence').getPublicUrl(path);
      return publicUrl;
    } catch (e) {
      debugPrint('Photo upload error: $e');
      return null;
    }
  }

  /// Submit a new fault or emergency to Supabase
  static Future<IncidentModel> submitIncident({
    required String incidentType,
    required String description,
    required String address,
    required double lat,
    required double lng,
    String? phone,
    String? reporterName,
    Uint8List? photoBytes,
    String? photoName,
  }) async {
    final stamp = DateTime.now().toIso8601String().substring(0, 10).replaceAll('-', '');
    final rand = (DateTime.now().millisecondsSinceEpoch % 9000 + 1000).toString();
    final ref = 'BCC-$stamp-$rand';

    String? photoUrl;
    if (photoBytes != null && photoName != null) {
      photoUrl = await uploadEvidencePhoto(bytes: photoBytes, fileName: photoName);
    }

    final isEmergency = ['Ambulance', 'Fire', 'Disaster'].contains(incidentType);

    if (isConfigured && client != null) {
      try {
        final insertData = {
          'reference_number': ref,
          'incident_type': incidentType,
          'status': 'New',
          'description': description,
          'address': address,
          'lat': lat,
          'lng': lng,
          'reporter_phone': phone,
          'reporter_name': reporterName ?? 'Citizen',
          'photo_url': photoUrl,
          'is_emergency': isEmergency,
        };

        final res = await client!
            .from('incidents')
            .insert(insertData)
            .select()
            .single();

        final inc = IncidentModel.fromJson(res);
        await StorageService.saveReport(inc);
        return inc;
      } catch (e) {
        debugPrint('Supabase insert incident error: $e');
      }
    }

    // Fallback local save if Supabase is offline or not configured
    final localInc = IncidentModel(
      id: 'local-$rand',
      referenceNumber: ref,
      incidentType: incidentType,
      status: 'New',
      description: description,
      address: address,
      lat: lat,
      lng: lng,
      isEmergency: isEmergency,
      photoUrl: photoUrl,
      reporterPhone: phone,
      createdAt: DateTime.now(),
    );

    await StorageService.saveReport(localInc);
    return localInc;
  }

  /// Track incident by reference code
  static Future<IncidentModel?> trackIncident(String reference) async {
    final cleanRef = reference.trim().toUpperCase();

    if (isConfigured && client != null) {
      try {
        final res = await client!
            .from('incidents')
            .select('*')
            .eq('reference_number', cleanRef)
            .maybeSingle();

        if (res != null) {
          return IncidentModel.fromJson(res);
        }
      } catch (e) {
        debugPrint('Supabase track incident error: $e');
      }
    }

    // Fallback to local storage
    final localList = await StorageService.getSavedReports();
    for (var inc in localList) {
      if (inc.referenceNumber.toUpperCase() == cleanRef) {
        return inc;
      }
    }

    return null;
  }

  /// Fetch council public bulletins
  static Future<List<Map<String, dynamic>>> fetchBulletins() async {
    if (isConfigured && client != null) {
      try {
        final res = await client!
            .from('bulletins')
            .select('*')
            .order('created_at', {ascending: false});
        return List<Map<String, dynamic>>.from(res);
      } catch (e) {
        debugPrint('Supabase fetch bulletins error: $e');
      }
    }

    // Fallback bulletins
    return [
      {
        'title': 'Criterion Water Works Maintenance',
        'body': 'Scheduled water supply reduction in Eastern suburbs between 08:00 and 17:00 tomorrow.',
        'category': 'Water Cut',
        'is_urgent': true,
      },
      {
        'title': 'Luveve Road Resurfacing',
        'body': 'Expect traffic diversions along Luveve Road near Mpilo Central Hospital.',
        'category': 'Roads',
        'is_urgent': false,
      },
      {
        'title': 'Refuse Collection Schedule (Ward 28)',
        'body': 'Refuse compaction trucks servicing Cowdray Park sections 1 to 6 this Friday.',
        'category': 'Health',
        'is_urgent': false,
      },
    ];
  }
}
