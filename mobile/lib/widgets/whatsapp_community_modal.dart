import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/bcc_colors.dart';
import '../services/supabase_service.dart';

class WhatsAppCommunityModal extends StatefulWidget {
  const WhatsAppCommunityModal({super.key});

  @override
  State<WhatsAppCommunityModal> createState() => _WhatsAppCommunityModalState();
}

class _WhatsAppCommunityModalState extends State<WhatsAppCommunityModal> {
  String _selectedCategory = 'All';
  String _searchQuery = '';
  List<Map<String, dynamic>> _channels = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  Future<void> _loadChannels() async {
    setState(() => _isLoading = true);
    final data = await BccApiService.fetchWhatsAppChannels(
      category: _selectedCategory == 'All' ? null : _selectedCategory,
      search: _searchQuery.isEmpty ? null : _searchQuery,
    );
    if (mounted) {
      setState(() {
        _channels = data;
        _isLoading = false;
      });
    }
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open WhatsApp: $e'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.chat_bubble_rounded,
                    color: Color(0xFF16A34A),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WhatsApp Council Hub',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: BccColors.textDark,
                        ),
                      ),
                      Text(
                        'Official BCC Channel, Customer Care & Meter Readings',
                        style: TextStyle(
                          fontSize: 12,
                          color: BccColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: Colors.grey),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              onChanged: (val) {
                _searchQuery = val;
                _loadChannels();
              },
              decoration: InputDecoration(
                hintText: 'Search Ward (e.g. Ward 1, Cowdray Park, Kumalo)...',
                hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Colors.grey),
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _buildFilterChip('All', 'All Links'),
                _buildFilterChip('Channel', 'Official Channel'),
                _buildFilterChip('Support', 'Customer Care (0784 136 505)'),
                _buildFilterChip('MeterReading', 'Meter Readings (0713 347 319)'),
                _buildFilterChip('WardGroup', 'Ward Groups'),
              ],
            ),
          ),

          const Divider(height: 20, thickness: 1, color: Color(0xFFF1F5F9)),

          // Channels List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: BccColors.primaryForest),
                  )
                : _channels.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No WhatsApp groups found for this filter.\nTry searching another Ward.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: BccColors.textMuted),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: _channels.length,
                    itemBuilder: (context, index) {
                      final item = _channels[index];
                      final category = item['category']?.toString() ?? 'WardGroup';
                      final isSupport = category == 'Support';
                      final isMeterReading = category == 'MeterReading';
                      final isChannel = category == 'Channel';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: isSupport
                                        ? const Color(0xFFFEE2E2)
                                        : isMeterReading
                                        ? const Color(0xFFE0F2FE)
                                        : isChannel
                                        ? const Color(0xFFDCFCE7)
                                        : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    isSupport
                                        ? Icons.support_agent_rounded
                                        : isMeterReading
                                        ? Icons.water_drop_rounded
                                        : isChannel
                                        ? Icons.campaign_rounded
                                        : Icons.groups_rounded,
                                    color: isSupport
                                        ? const Color(0xFFDC2626)
                                        : isMeterReading
                                        ? const Color(0xFF0284C7)
                                        : isChannel
                                        ? const Color(0xFF16A34A)
                                        : const Color(0xFF0C3827),
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['name']?.toString() ?? 'BCC Community Group',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: BccColors.textDark,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFDCFCE7),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  Icons.verified_rounded,
                                                  size: 11,
                                                  color: Color(0xFF16A34A),
                                                ),
                                                SizedBox(width: 3),
                                                Text(
                                                  'Official',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: Color(0xFF16A34A),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            item['ward']?.toString() ?? 'All Wards',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: BccColors.textMuted,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item['description']?.toString() ?? '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF475569),
                                height: 1.35,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '👥 ${item['member_count_approx'] ?? 'Active'}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF16A34A),
                                  ),
                                ),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF25D366),
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 8,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  onPressed: () {
                                    final url = item['invite_url']?.toString();
                                    if (url != null && url.isNotEmpty) {
                                      _launchUrl(url);
                                    }
                                  },
                                  icon: const Icon(
                                    Icons.open_in_new_rounded,
                                    size: 14,
                                  ),
                                  label: Text(
                                    isSupport
                                        ? 'Chat Care'
                                        : isMeterReading
                                        ? 'Send Reading'
                                        : isChannel
                                        ? 'Follow Channel'
                                        : 'Join Group',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String catKey, String label) {
    final isSelected = _selectedCategory == catKey;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: () {
          setState(() => _selectedCategory = catKey);
          _loadChannels();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? BccColors.primaryForest : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }
}
