import 'package:flutter/material.dart';
import '../constants/bcc_colors.dart';
import '../models/incident_model.dart';
import '../services/api_service.dart';

class TrackReferenceDialog extends StatefulWidget {
  final String? initialRef;

  const TrackReferenceDialog({super.key, this.initialRef});

  @override
  State<TrackReferenceDialog> createState() => _TrackReferenceDialogState();
}

class _TrackReferenceDialogState extends State<TrackReferenceDialog> {
  late final TextEditingController _refCtrl;
  bool _isLoading = false;
  IncidentModel? _incident;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refCtrl = TextEditingController(text: widget.initialRef ?? '');
    if (widget.initialRef != null && widget.initialRef!.isNotEmpty) {
      _lookup(widget.initialRef!);
    }
  }

  @override
  void dispose() {
    _refCtrl.dispose();
    super.dispose();
  }

  Future<void> _lookup(String ref) async {
    if (ref.trim().isEmpty) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _incident = null;
    });

    final res = await ApiService.trackIncident(ref.trim());
    setState(() {
      _isLoading = false;
      if (res != null) {
        _incident = res;
      } else {
        _error =
            'No incident found with reference "$ref". Please verify the code.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: BccColors.primaryForest.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.track_changes_rounded,
                      color: BccColors.primaryForest,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Track Incident Status',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: BccColors.textDark,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: BccColors.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _refCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Enter BCC-YYYYMMDD-XXXX',
                        hintStyle: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                        ),
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
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: BccColors.primaryForest,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                    ),
                    onPressed: () => _lookup(_refCtrl.text),
                    child: const Icon(Icons.search_rounded, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: BccColors.primaryForest,
                    ),
                  ),
                )
              else if (_error != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: BccColors.emergencyRedSoft,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      color: BccColors.emergencyRed,
                      fontSize: 13,
                    ),
                  ),
                )
              else if (_incident != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: BccColors.scaffoldBg,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: BccColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _incident!.referenceNumber,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: BccColors.primaryForest,
                            ),
                          ),
                          _buildStatusPill(_incident!.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _incident!.readableType,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: BccColors.textDark,
                        ),
                      ),
                      if (_incident!.address != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on_outlined,
                              size: 14,
                              color: BccColors.textMuted,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                _incident!.address!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: BccColors.textMuted,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (_incident!.description != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _incident!.description!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: BccColors.textDark,
                          ),
                        ),
                      ],
                      const Divider(height: 24),
                      const Text(
                        'Resolution Timeline',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: BccColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildStepper(_incident!.status),
                      if (_incident!.resolutionNotes != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: BccColors.statusResolvedSoft,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.task_alt_rounded,
                                color: BccColors.statusResolved,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Council Notes: ${_incident!.resolutionNotes!}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: BccColors.statusResolved,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    Color bg = BccColors.statusNew.withValues(alpha: 0.15);
    Color text = BccColors.statusNew;
    if (status == 'Assigned') {
      bg = BccColors.statusAssigned.withValues(alpha: 0.15);
      text = BccColors.statusAssigned;
    } else if (status == 'InProgress') {
      bg = BccColors.statusInProgress.withValues(alpha: 0.15);
      text = BccColors.statusInProgress;
    } else if (status == 'Resolved') {
      bg = BccColors.statusResolvedSoft;
      text = BccColors.statusResolved;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: text,
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
      ),
    );
  }

  Widget _buildStepper(String currentStatus) {
    final steps = ['New', 'Assigned', 'InProgress', 'Resolved'];
    final labels = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
    int currentIndex = steps.indexOf(currentStatus);
    if (currentIndex == -1) currentIndex = 0;

    return Column(
      children: List.generate(steps.length, (idx) {
        final isCompleted = idx <= currentIndex;
        final isLast = idx == steps.length - 1;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? BccColors.primaryForest
                        : Colors.grey.shade300,
                    shape: BoxShape.circle,
                  ),
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.white, size: 12)
                      : null,
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 24,
                    color: idx < currentIndex
                        ? BccColors.primaryForest
                        : Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                labels[idx],
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal,
                  color: isCompleted ? BccColors.textDark : Colors.grey,
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
