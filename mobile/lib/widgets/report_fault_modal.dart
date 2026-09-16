import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Geolocator, LocationPermission, LocationSettings, LocationAccuracy;
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../constants/bcc_colors.dart';
import '../constants/bulawayo_data.dart';
import '../models/incident_model.dart';
import '../services/supabase_service.dart';
import 'map_picker_dialog.dart';

class ReportFaultModal extends StatefulWidget {
  final String? initialCategory;

  const ReportFaultModal({super.key, this.initialCategory});

  @override
  State<ReportFaultModal> createState() => _ReportFaultModalState();
}

class _ReportFaultModalState extends State<ReportFaultModal> {
  late String _selectedType;
  String _selectedSuburb = 'Cowdray Park';
  final _addressCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  double _lat = -20.1500;
  double _lng = 28.5800;
  bool _isLocating = false;

  File? _photoFile;
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _categories = [
    {
      'type': 'WaterLeak',
      'label': 'Water Leak',
      'icon': Icons.water_drop_rounded,
      'color': BccColors.categoryWater,
    },
    {
      'type': 'SewerBurst',
      'label': 'Sewer Burst',
      'icon': Icons.warning_amber_rounded,
      'color': BccColors.categorySewer,
    },
    {
      'type': 'RoadDamage',
      'label': 'Road Damage',
      'icon': Icons.remove_road_rounded,
      'color': BccColors.categoryRoads,
    },
    {
      'type': 'StreetLight',
      'label': 'Street Light',
      'icon': Icons.lightbulb_rounded,
      'color': BccColors.categoryLighting,
    },
    {
      'type': 'Other',
      'label': 'Refuse / Other',
      'icon': Icons.delete_outline_rounded,
      'color': BccColors.statusNew,
    },
  ];

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialCategory ?? 'WaterLeak';
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _acquireCurrentLocation() async {
    setState(() => _isLocating = true);
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
        setState(() {
          _lat = pos.latitude;
          _lng = pos.longitude;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'GPS Location Acquired: ${_lat.toStringAsFixed(4)}, ${_lng.toStringAsFixed(4)}',
              ),
              backgroundColor: BccColors.primaryForest,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('GPS error: $e');
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              InkWell(
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.camera_alt_rounded, size: 32, color: BccColors.primaryForest),
                    SizedBox(height: 6),
                    Text('Take Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
              ),
              InkWell(
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.photo_library_rounded, size: 32, color: BccColors.primaryForest),
                    SizedBox(height: 6),
                    Text('Choose Gallery', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (source != null) {
      final picked = await picker.pickImage(source: source, imageQuality: 75);
      if (picked != null) {
        setState(() {
          _photoFile = File(picked.path);
        });
      }
    }
  }

  Future<void> _openMapPinPicker() async {
    final result = await showDialog<LatLng>(
      context: context,
      builder: (ctx) => MapPickerDialog(
        initialLat: _lat,
        initialLng: _lng,
      ),
    );

    if (result != null) {
      setState(() {
        _lat = result.latitude;
        _lng = result.longitude;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_descCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a brief description of the fault.'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final fullAddress =
        '$_selectedSuburb, ${_addressCtrl.text.trim().isEmpty ? 'General Ward Area' : _addressCtrl.text.trim()}';

    final incident = await BccApiService.submitIncident(
      incidentType: _selectedType,
      description: _descCtrl.text.trim(),
      address: fullAddress,
      lat: _lat,
      lng: _lng,
      phone: _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim() : null,
    );

    // Upload photo separately after incident is created
    if (_photoFile != null && !incident.id.startsWith('local-')) {
      await BccApiService.uploadPhoto(
        incidentId: incident.id,
        photoFile: _photoFile!,
      );
    }

    setState(() => _isSubmitting = false);

    if (mounted) {
      Navigator.pop(context, incident);
      _showSuccessDialog(incident);
    }
  }

  void _showSuccessDialog(IncidentModel incident) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: BccColors.statusResolvedSoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: BccColors.statusResolved,
                  size: 38,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Fault Successfully Reported',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: BccColors.textDark,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Your reference tracking number:',
                style: TextStyle(fontSize: 13, color: BccColors.textMuted),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: BccColors.scaffoldBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: BccColors.cardBorder),
                ),
                child: SelectableText(
                  incident.referenceNumber,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: BccColors.primaryForest,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'BCC response dispatchers will review this report. Keep your reference code to track progress.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: BccColors.textMuted),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: BccColors.primaryForest,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 12,
                  ),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text(
                  'Done',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Modal Title
            Row(
              children: [
                const Icon(Icons.add_location_alt_rounded, color: BccColors.primaryForest),
                const SizedBox(width: 8),
                const Text(
                  'Report Municipal Fault',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: BccColors.textDark,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: BccColors.textMuted),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Fault Category Selector
            const Text(
              'Select Fault Category',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: BccColors.textMuted,
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories.map((cat) {
                  final isSelected = _selectedType == cat['type'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      selected: isSelected,
                      label: Text(cat['label'] as String),
                      avatar: Icon(
                        cat['icon'] as IconData,
                        size: 16,
                        color: isSelected ? Colors.white : cat['color'] as Color,
                      ),
                      selectedColor: BccColors.primaryForest,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : BccColors.textDark,
                      ),
                      backgroundColor: BccColors.scaffoldBg,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected ? BccColors.primaryForest : BccColors.cardBorder,
                        ),
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedType = cat['type'] as String);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Location Controls (GPS + Pin Drop)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: _isLocating
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded, size: 16),
                    label: const Text('Use Live GPS'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: BccColors.primaryForest,
                      side: const BorderSide(color: BccColors.primaryForest),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: _isLocating ? null : _acquireCurrentLocation,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.map_rounded, size: 16),
                    label: const Text('Pin on Map'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: BccColors.primaryForest,
                      side: const BorderSide(color: BccColors.cardBorder),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: _openMapPinPicker,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Suburb Dropdown
            const Text(
              'Suburb / Municipal Ward',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: BccColors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: BccColors.scaffoldBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: BccColors.cardBorder),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedSuburb,
                  isExpanded: true,
                  items: BulawayoData.suburbs.map((s) {
                    return DropdownMenuItem(
                      value: s,
                      child: Text(s, style: const TextStyle(fontSize: 14)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedSuburb = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Street Address
            const Text(
              'Street / House Number / Landmark',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: BccColors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _addressCtrl,
              decoration: InputDecoration(
                hintText: 'e.g. Stand 14002 or Near Clinic',
                hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                filled: true,
                fillColor: BccColors.scaffoldBg,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Description
            const Text(
              'Fault Details & Observations',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: BccColors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Describe the issue (e.g. pipe burst spraying water onto road)...',
                hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                filled: true,
                fillColor: BccColors.scaffoldBg,
                contentPadding: const EdgeInsets.all(14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Optional Phone
            const Text(
              'Your Phone Number (Optional for SMS updates)',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: BccColors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                hintText: 'e.g. +263 77 123 4567',
                hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                filled: true,
                fillColor: BccColors.scaffoldBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Photo Evidence Picker
            InkWell(
              onTap: _pickPhoto,
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _photoFile != null
                      ? BccColors.statusResolvedSoft
                      : BccColors.scaffoldBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: _photoFile != null
                        ? BccColors.statusResolved
                        : BccColors.cardBorder,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _photoFile != null
                          ? Icons.check_circle_rounded
                          : Icons.camera_alt_rounded,
                      color: _photoFile != null
                          ? BccColors.statusResolved
                          : BccColors.primaryForest,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _photoFile != null
                          ? 'Photo Attached • Tap to change'
                          : 'Attach Photo Evidence (Camera or Gallery)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _photoFile != null
                            ? BccColors.statusResolved
                            : BccColors.primaryForest,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: BccColors.primaryForest,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              onPressed: _isSubmitting ? null : _handleSubmit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      'Submit Municipal Report',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
