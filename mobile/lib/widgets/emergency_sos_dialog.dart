import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Geolocator, LocationPermission, LocationSettings, LocationAccuracy;
import '../constants/bcc_colors.dart';
import 'package:latlong2/latlong.dart' show LatLng;
import '../services/supabase_service.dart';
import 'map_picker_dialog.dart';

class EmergencySosDialog extends StatefulWidget {
  const EmergencySosDialog({super.key});

  @override
  State<EmergencySosDialog> createState() => _EmergencySosDialogState();
}

class _EmergencySosDialogState extends State<EmergencySosDialog> {
  bool _isSending = false;
  String? _sentRef;

  Future<void> _confirmAndSendAlert(String emergencyType, String label) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: BccColors.emergencyRed),
            const SizedBox(width: 8),
            Text('Dispatch $label?'),
          ],
        ),
        content: Text(
          'This will send an immediate critical alert with your current GPS coordinates to BCC emergency dispatchers.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: BccColors.emergencyRed,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm SOS Alert'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSending = true);

    // Never dispatch with a guessed location: use the device GPS fix, or a
    // point the resident confirms on the map. The old code silently fell back
    // to the city centre (-20.15, 28.58) when GPS failed.
    double? lat;
    double? lng;
    bool fromMap = false;

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 8),
          ),
        );
        lat = pos.latitude;
        lng = pos.longitude;
      }
    } catch (_) {
      // Fall through to the manual map pin below
    }

    if (!mounted) return;

    if (lat == null || lng == null) {
      final picked = await _askForMapPin();
      if (!mounted) return;
      if (picked == null) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'SOS not sent: no location. Enable GPS or call 999 (ambulance) / 993 (fire).',
            ),
          ),
        );
        return;
      }
      lat = picked.latitude;
      lng = picked.longitude;
      fromMap = true;
    }

    try {
      final incident = await BccApiService.submitIncident(
        incidentType: emergencyType,
        description: 'CRITICAL SOS: Citizen triggered emergency dispatch ($label).'
            '${fromMap ? ' Location pinned manually on map (GPS unavailable).' : ''}',
        address:
            '${fromMap ? 'Map pin' : 'Bulawayo GPS'} Coords: ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
        lat: lat,
        lng: lng,
      );
      if (!mounted) return;
      setState(() {
        _isSending = false;
        _sentRef = incident.referenceNumber;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _isSending = false);
      final message = error.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'SOS NOT delivered: $message Call 999 (ambulance) or 993 (fire) now.',
          ),
          duration: const Duration(seconds: 8),
        ),
      );
    }
  }

  /// Asks the resident to drop a pin when GPS is unavailable.
  /// Returns null if they cancel.
  Future<LatLng?> _askForMapPin() async {
    final usePin = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Location unavailable'),
        content: const Text(
          'We could not get your GPS location. Drop a pin on the map where help is needed, '
          'or cancel and call the emergency line directly.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Pick on map'),
          ),
        ],
      ),
    );
    if (usePin != true || !mounted) return null;
    return showDialog<LatLng>(
      context: context,
      // Start the picker at Bulawayo City Hall; the resident must move the pin
      builder: (ctx) => const MapPickerDialog(initialLat: -20.1500, initialLng: 28.5800),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: BccColors.emergencyRedSoft,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    color: BccColors.emergencyRed,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Emergency Dispatch',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: BccColors.textDark,
                        ),
                      ),
                      Text(
                        'Bulawayo Emergency Services',
                        style: TextStyle(
                          fontSize: 13,
                          color: BccColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: BccColors.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 18),
            if (_sentRef != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: BccColors.statusResolvedSoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: BccColors.statusResolved.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      color: BccColors.statusResolved,
                      size: 36,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Emergency Alert Broadcasted!',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: BccColors.statusResolved,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Reference: $_sentRef',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: BccColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Council dispatchers have been alerted with your live GPS location. Units are en route.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: BccColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ] else ...[
              if (_isSending)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: CircularProgressIndicator(color: BccColors.emergencyRed),
                  ),
                )
              else ...[
                _buildEmergencyButton(
                  title: 'Medical Ambulance (999)',
                  subtitle: '+263 2922 71717 / Famona Station',
                  icon: Icons.medical_services_rounded,
                  color: const Color(0xFFD32F2F),
                  onTap: () => _confirmAndSendAlert('Ambulance', 'Medical Ambulance'),
                ),
                const SizedBox(height: 10),
                _buildEmergencyButton(
                  title: 'Fire Brigade (993)',
                  subtitle: '+263 2922 71718 / Famona & North End',
                  icon: Icons.local_fire_department_rounded,
                  color: const Color(0xFFE65100),
                  onTap: () => _confirmAndSendAlert('Fire', 'Fire Brigade'),
                ),
                const SizedBox(height: 10),
                _buildEmergencyButton(
                  title: 'Disaster / Civil Protection',
                  subtitle: 'Bulawayo Emergency Command Unit',
                  icon: Icons.shield_rounded,
                  color: const Color(0xFF1565C0),
                  onTap: () => _confirmAndSendAlert('Disaster', 'Civil Protection'),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmergencyButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13.5,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: BccColors.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
