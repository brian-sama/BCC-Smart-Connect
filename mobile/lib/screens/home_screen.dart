import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/bcc_colors.dart';
import '../models/incident_model.dart';
import 'auth_screen.dart';
import '../services/supabase_service.dart';
import '../services/storage_service.dart';
import '../widgets/emergency_sos_dialog.dart';
import '../widgets/report_fault_modal.dart';
import '../widgets/track_reference_dialog.dart';
import '../widgets/whatsapp_community_modal.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  String _selectedFilter = 'All';
  String _statusFilter = 'All'; // 'All' | 'Active' | 'Resolved'
  bool _isBalanceVisible = true;
  List<IncidentModel> _reports = [];
  bool _isLoading = true;
  String _userName = 'Bulawayo Citizen';
  bool _isGuest = true;
  Timer? _pollTimer;
  final Map<String, String> _lastKnownStatuses = {};
  final List<Map<String, String>> _statusNotifications = [];

  // ─── Bulletin & Unified Feed State ─────────────────────────────────────────
  String _bulletinCategory = 'All';
  String _bulletinWard = 'All Bulawayo Wards';
  String _bulletinSearch = '';
  final Set<String> _expandedBulletinIds = {};
  final TextEditingController _bulletinSearchController = TextEditingController();
  List<Map<String, dynamic>> _bulletinFeed = [];
  bool _isLoadingBulletins = true;

  static const List<String> _bulawayoWards = [
    'All Bulawayo Wards',
    'Ward 1 - Bulawayo Central & Suburbs',
    'Ward 2 - Northend & Kumalo',
    'Ward 3 - Safari & Killarney',
    'Ward 4 - Bradfield & Hillside',
    'Ward 5 - Newton West & Montrose',
    'Ward 6 - Bellevue & Southwold',
    'Ward 7 - Makokoba & Mzilikazi',
    'Ward 8 - Barbourfields & Thorngrove',
    'Ward 9 - Mpopoma & Matshobana',
    'Ward 10 - Entumbane',
    'Ward 11 - Emakhandeni',
    'Ward 12 - Njube & Lobengula West',
    'Ward 13 - Iminyela & Mabutweni',
    'Ward 14 - Old Lobengula & Luveve',
    'Ward 15 - Luveve 4 & 5',
    'Ward 16 - Gwabalanda',
    'Ward 17 - Pumula South',
    'Ward 18 - Pumula North',
    'Ward 19 - Pumula East',
    'Ward 20 - Nkulumane 1 to 5',
    'Ward 21 - Nkulumane 6 to 12',
    'Ward 22 - Nketa 6 to 9',
    'Ward 23 - Nketa 7 & 8',
    'Ward 24 - Nketa 9',
    'Ward 25 - Nkulumane 11 & 12',
    'Ward 26 - Emganwini',
    'Ward 27 - Magwegwe North & West',
    'Ward 28 - Cowdray Park',
    'Ward 29 - Magwegwe Extension'
  ];

  @override
  void initState() {
    super.initState();
    _loadReports();
    _loadUser();
    _loadBulletinFeed();
    // Poll every 15 seconds so citizens receive live status updates & Resolved alerts
    _pollTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _loadReports(silent: true),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _bulletinSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadBulletinFeed() async {
    setState(() => _isLoadingBulletins = true);
    try {
      final wardParam = _bulletinWard == 'All Bulawayo Wards'
          ? null
          : _bulletinWard.split(' - ').first;
      final feed = await BccApiService.fetchBulletinFeed(
        ward: wardParam,
        category: _bulletinCategory == 'All' ? null : _bulletinCategory,
        search: _bulletinSearch.isEmpty ? null : _bulletinSearch,
      );
      if (mounted) {
        setState(() {
          _bulletinFeed = feed;
          _isLoadingBulletins = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingBulletins = false);
      }
    }
  }

  Future<void> _loadUser() async {
    final user = await BccApiService.getSavedUser();
    if (user != null && mounted) {
      final first = user['first_name']?.toString() ?? '';
      final last = user['last_name']?.toString() ?? '';
      setState(() {
        _userName = (first.isNotEmpty || last.isNotEmpty)
            ? '$first $last'.trim()
            : 'Bulawayo Citizen';
        _isGuest = user['is_guest'] == true;
      });
    }
  }

  Future<void> _loadReports({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    List<IncidentModel> list;
    try {
      list = await BccApiService.fetchMyReports();
    } catch (_) {
      list = await StorageService.getSavedReports();
    }
    if (!mounted) return;

    // Detect newly resolved or updated complaints and notify the user
    final List<IncidentModel> newlyResolved = [];
    for (final inc in list) {
      final prevStatus = _lastKnownStatuses[inc.referenceNumber];
      if (prevStatus != null && prevStatus != inc.status) {
        final isNowResolved = inc.status == 'Resolved' || inc.status == 'Closed';
        _statusNotifications.insert(0, {
          'ref': inc.referenceNumber,
          'title': isNowResolved
              ? 'Complaint Resolved: ${inc.readableType}'
              : 'Status Updated: ${inc.readableType}',
          'body': isNowResolved
              ? 'Your report ${inc.referenceNumber} has been marked ${inc.status} by BCC staff.'
              : 'Your report ${inc.referenceNumber} moved from $prevStatus to ${inc.status}.',
          'time': TimeOfDay.now().format(context),
        });
        if (isNowResolved) newlyResolved.add(inc);
      }
      _lastKnownStatuses[inc.referenceNumber] = inc.status;
    }

    setState(() {
      _reports = list;
      _isLoading = false;
    });

    if (newlyResolved.isNotEmpty) {
      final latest = newlyResolved.first;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: BccColors.statusResolved,
          duration: const Duration(seconds: 6),
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Issue Resolved! ${latest.readableType} (${latest.referenceNumber}) has been resolved by BCC.',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'TRACK',
            textColor: Colors.white,
            onPressed: () => _openTrackModal(latest.referenceNumber),
          ),
        ),
      );
    }
  }

  void _openNotificationsSheet() {
    final resolvedReports = _reports
        .where((r) => r.status == 'Resolved' || r.status == 'Closed')
        .toList();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Complaint Notifications',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: BccColors.textDark),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const Divider(),
            if (_statusNotifications.isEmpty && resolvedReports.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'No resolved complaint alerts yet. Pull down to refresh.',
                    style: TextStyle(color: BccColors.textMuted, fontSize: 13),
                  ),
                ),
              )
            else
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    ..._statusNotifications.map((n) => ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: BccColors.statusResolvedSoft,
                            child: Icon(Icons.check_circle_rounded, color: BccColors.statusResolved),
                          ),
                          title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                          subtitle: Text(n['body'] ?? '', style: const TextStyle(fontSize: 12)),
                          trailing: Text(n['time'] ?? '', style: const TextStyle(fontSize: 11, color: BccColors.textMuted)),
                          onTap: () {
                            Navigator.pop(ctx);
                            if (n['ref'] != null) _openTrackModal(n['ref']);
                          },
                        )),
                    if (_statusNotifications.isEmpty)
                      ...resolvedReports.map((r) => ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: BccColors.statusResolvedSoft,
                              child: Icon(Icons.check_circle_rounded, color: BccColors.statusResolved),
                            ),
                            title: Text('Resolved: ${r.readableType}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                            subtitle: Text('${r.referenceNumber} • ${r.resolutionNotes ?? 'Marked Resolved by BCC staff.'}', style: const TextStyle(fontSize: 12)),
                            onTap: () {
                              Navigator.pop(ctx);
                              _openTrackModal(r.referenceNumber);
                            },
                          )),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _openReportModal([String? initialCategory]) async {
    final result = await showModalBottomSheet<IncidentModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ReportFaultModal(initialCategory: initialCategory),
    );

    if (result != null) {
      _loadReports();
    }
  }

  void _openEmergencySos() {
    showDialog(context: context, builder: (ctx) => const EmergencySosDialog());
  }

  void _openTrackModal([String? initialRef]) {
    showDialog(
      context: context,
      builder: (ctx) => TrackReferenceDialog(initialRef: initialRef),
    );
  }

  void _openWhatsAppCommunity() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const WhatsAppCommunityModal(),
    );
  }

  Future<void> _shareBulletinWhatsApp({
    required String title,
    required String body,
    required String category,
  }) async {
    final text = 'Notice shared by a resident (not an official BCC broadcast):\n\n$title\n\n$body';
    final uri = Uri.parse('https://api.whatsapp.com/send?text=${Uri.encodeComponent(text)}');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {}
  }

  List<IncidentModel> get _filteredReports {
    Iterable<IncidentModel> list = _reports;
    if (_statusFilter == 'Active') {
      list = list.where((r) => r.status != 'Resolved' && r.status != 'Closed');
    } else if (_statusFilter == 'Resolved') {
      list = list.where((r) => r.status == 'Resolved' || r.status == 'Closed');
    }
    if (_selectedFilter == 'Water') {
      list = list.where((r) => r.incidentType == 'WaterLeak');
    } else if (_selectedFilter == 'Sewer') {
      list = list.where((r) => r.incidentType == 'SewerBurst');
    } else if (_selectedFilter == 'Roads') {
      list = list.where((r) => r.incidentType == 'RoadDamage');
    } else if (_selectedFilter == 'Lighting') {
      list = list.where((r) => r.incidentType == 'StreetLight');
    }
    return list.toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BccColors.scaffoldBg,
      body: _buildCurrentPage(),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        child: _buildCurvedBottomNav(),
      ),
    );
  }

  Widget _buildCurrentPage() {
    switch (_currentNavIndex) {
      case 1:
        return _buildReportsPage();
      case 2:
        return _buildBulletinsPage();
      case 3:
        return _buildProfilePage();
      default:
        return RefreshIndicator(
          color: BccColors.primaryForest,
          onRefresh: _loadReports,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                _buildHeroHeader(),
                const SizedBox(height: 18),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildQuickActionsCard(),
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildRecentReportsSection(),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
    }
  }

  Widget _buildPageScaffold({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: BccColors.primaryForest,
            foregroundColor: Colors.white,
            title: Text(title),
            leading: Icon(icon),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            sliver: SliverToBoxAdapter(child: child),
          ),
        ],
      ),
    );
  }

  Widget _buildReportsPage() {
    return _buildPageScaffold(
      title: 'My Reports',
      icon: Icons.assignment_outlined,
      child: _buildRecentReportsSection(),
    );
  }

  Widget _buildBulletinsPage() {
    final urgentItems = _bulletinFeed.where((item) => item['is_urgent'] == true).toList();

    return SafeArea(
      child: RefreshIndicator(
        color: BccColors.primaryForest,
        onRefresh: _loadBulletinFeed,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: BccColors.primaryForest,
              foregroundColor: Colors.white,
              title: const Text(
                'Council Bulletins & Feed',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              leading: const Icon(Icons.campaign_rounded),
              actions: [
                IconButton(
                  tooltip: 'WhatsApp Community Directory',
                  icon: const Icon(Icons.forum_outlined, color: BccColors.accentLime),
                  onPressed: _openWhatsAppCommunity,
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Pinned Urgent Banner (if any urgent alert exists)
                    if (urgentItems.isNotEmpty) ...[
                      _buildUrgentAlertBanner(urgentItems.first),
                      const SizedBox(height: 16),
                    ],

                    // 2. Search & Ward Selector Header Card
                    _buildBulletinSearchAndWardHeader(),
                    const SizedBox(height: 14),

                    // 3. Category Filter Chips (All, Council, Channels, Ward, Water)
                    _buildBulletinCategoryChips(),
                    const SizedBox(height: 16),

                    // 4. Water Situation & Reservoir Status Card (from citybyo.co.zw)
                    if (_bulletinCategory == 'All' || _bulletinCategory == 'Water Cut') ...[
                      _buildWaterSituationCard(),
                      const SizedBox(height: 16),
                    ],

                    // 5. Feed List / Loading / Empty State
                    if (_isLoadingBulletins)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 48),
                          child: CircularProgressIndicator(color: BccColors.primaryForest),
                        ),
                      )
                    else if (_bulletinFeed.isEmpty)
                      _buildBulletinEmptyState()
                    else
                      ..._bulletinFeed.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _buildUnifiedFeedCard(item),
                          )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaterSituationCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFBAE6FD), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0284C7).withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.water_drop_rounded, color: Color(0xFF0284C7), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Live Water Situation & Dam Inflows',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: BccColors.textDark,
                      ),
                    ),
                    Text(
                      'City of Bulawayo Daily Supply Status',
                      style: TextStyle(fontSize: 11, color: BccColors.textMuted),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: () async {
                  final uri = Uri.parse('https://citybyo.co.zw/Services/WaterSituationUpdate');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'citybyo.co.zw',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.open_in_new_rounded, size: 11, color: Color(0xFF0284C7)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          const Text(
            'Live reservoir levels and supply schedules are not available in the app. Check the council source for current information.',
            style: TextStyle(fontSize: 12, color: BccColors.textMuted, height: 1.4),
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),

          // Schedule Footer & Link
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF94A3B8),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'No verified live supply schedule available',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: BccColors.textMuted),
                ),
              ),
              InkWell(
                onTap: () async {
                  final uri = Uri.parse('https://citybyo.co.zw/Services/WaterSituationUpdate');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                child: const Text(
                  'Full Report ↗',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReservoirBar(String name, double percent, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(name, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percent,
            minHeight: 6,
            backgroundColor: const Color(0xFFE2E8F0),
            valueColor: AlwaysStoppedAnimation<Color>(
              percent > 0.4 ? const Color(0xFF0284C7) : (percent > 0.3 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUrgentAlertBanner(Map<String, dynamic> item) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFCA5A5), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEF4444).withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.white, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'URGENT COUNCIL NOTICE',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                _formatTimeAgo(item['created_at']?.toString()),
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF991B1B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            item['title']?.toString() ?? 'Urgent Notice',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              color: Color(0xFF7F1D1D),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            item['body']?.toString() ?? '',
            style: const TextStyle(
              fontSize: 12.5,
              color: Color(0xFF991B1B),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              InkWell(
                onTap: () => _shareBulletinWhatsApp(
                  title: item['title']?.toString() ?? 'Urgent BCC Notice',
                  body: item['body']?.toString() ?? '',
                  category: item['category']?.toString() ?? 'Urgent Alert',
                ),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF87171)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.share_rounded, size: 13, color: Color(0xFFB91C1C)),
                      SizedBox(width: 5),
                      Text(
                        'Broadcast Notice',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFB91C1C),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBulletinSearchAndWardHeader() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BccColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Search Input
          TextField(
            controller: _bulletinSearchController,
            onChanged: (val) {
              setState(() => _bulletinSearch = val.trim());
              _loadBulletinFeed();
            },
            decoration: InputDecoration(
              hintText: 'Search bulletins, water cuts, roads...',
              hintStyle: const TextStyle(fontSize: 13, color: BccColors.textMuted),
              prefixIcon: const Icon(Icons.search_rounded, size: 20, color: BccColors.primaryForest),
              suffixIcon: _bulletinSearch.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _bulletinSearchController.clear();
                        setState(() => _bulletinSearch = '');
                        _loadBulletinFeed();
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Ward Dropdown Filter
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: BccColors.primaryForest),
                const SizedBox(width: 8),
                const Text(
                  'Ward:',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: BccColors.textDark,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _bulawayoWards.contains(_bulletinWard) ? _bulletinWard : _bulawayoWards.first,
                      icon: const Icon(Icons.arrow_drop_down_rounded, color: BccColors.primaryForest),
                      style: const TextStyle(fontSize: 12, color: BccColors.textDark, fontWeight: FontWeight.w600),
                      items: _bulawayoWards.map((w) {
                        return DropdownMenuItem<String>(
                          value: w,
                          child: Text(
                            w,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _bulletinWard = val);
                          _loadBulletinFeed();
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBulletinCategoryChips() {
    final categories = [
      {'id': 'All', 'label': 'All Feeds', 'icon': Icons.all_inclusive_rounded},
      {'id': 'Council', 'label': '🏛️ Council Bulletins', 'icon': Icons.account_balance_rounded},
      {'id': 'Channels', 'label': '📢 Channels', 'icon': Icons.cell_tower_rounded},
      {'id': 'Ward', 'label': '👥 Ward Groups', 'icon': Icons.groups_rounded},
      {'id': 'Water Cut', 'label': '💧 Water Cuts', 'icon': Icons.water_drop_rounded},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((cat) {
          final isSelected = _bulletinCategory == cat['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: isSelected,
              label: Text(cat['label'] as String),
              labelStyle: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : BccColors.textDark,
              ),
              selectedColor: BccColors.primaryForest,
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isSelected ? BccColors.primaryForest : BccColors.cardBorder,
                ),
              ),
              showCheckmark: false,
              onSelected: (_) {
                setState(() => _bulletinCategory = cat['id'] as String);
                _loadBulletinFeed();
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBulletinEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BccColors.cardBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.search_off_rounded, color: BccColors.textMuted, size: 28),
          ),
          const SizedBox(height: 14),
          const Text(
            'No matching bulletins found',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              color: BccColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Try clearing your search keyword or switching your ward filter to "All Bulawayo Wards".',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: BccColors.textMuted),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              _bulletinSearchController.clear();
              setState(() {
                _bulletinCategory = 'All';
                _bulletinWard = 'All Bulawayo Wards';
                _bulletinSearch = '';
              });
              _loadBulletinFeed();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: BccColors.primaryForest,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Reset All Filters'),
          ),
        ],
      ),
    );
  }

  Widget _buildProfilePage() {
    return _buildPageScaffold(
      title: 'Profile',
      icon: Icons.person_outline_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: BccColors.primaryForest,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.shield_rounded,
                color: BccColors.accentLime,
                size: 38,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              _isGuest ? 'Guest User' : _userName,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
                color: BccColors.textDark,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 6),
          const Center(
            child: Text(
              'BCC SmartConnect Citizen Portal',
              textAlign: TextAlign.center,
              style: TextStyle(color: BccColors.textMuted),
            ),
          ),
          const SizedBox(height: 24),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.info_outline_rounded, color: BccColors.textMuted),
            title: Text('Council contact directory unavailable'),
            subtitle: Text('Contact details will appear here after BCC verifies and publishes them.'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(
              Icons.groups_outlined,
              color: Color(0xFF0C3827),
            ),
            title: const Text('WhatsApp Ward Groups & Directory'),
            subtitle: const Text('Verified contact channels appear here when available'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: _openWhatsAppCommunity,
          ),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.language_rounded,
              color: BccColors.primaryForest,
            ),
            title: Text('Official Website'),
            subtitle: Text('cityofbulawayo.co.zw'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              await BccApiService.signOut();
              if (!mounted) return;
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
              );
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Top Hero Header (Deep Forest Green with curved bottom)
  // ---------------------------------------------------------------------------
  Widget _buildHeroHeader() {
    final activeCount = _reports
        .where((r) => r.status != 'Resolved' && r.status != 'Closed')
        .length;

    return Container(
      decoration: const BoxDecoration(
        color: BccColors.primaryForest,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
        boxShadow: [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 12,
        left: 20,
        right: 20,
        bottom: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Row: Avatar + Greeting + Bell Icon
          Row(
            children: [
              // Avatar with subtle green border
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: BccColors.accentLime, width: 2),
                  color: BccColors.primaryForestLight,
                ),
                child: const ClipOval(
                  child: Center(
                    child: Icon(
                      Icons.person_rounded,
                      color: BccColors.accentLime,
                      size: 26,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hello,',
                    style: TextStyle(
                      color: BccColors.textLime,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 190),
                    child: Text(
                      _userName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              // WhatsApp Community Directory Button
              GestureDetector(
                onTap: _openWhatsAppCommunity,
                child: Container(
                  width: 44,
                  height: 44,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF25D366).withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: const Color(0xFF25D366).withValues(alpha: 0.5),
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.chat_bubble_rounded,
                      color: Color(0xFF4ADE80),
                      size: 20,
                    ),
                  ),
                ),
              ),
              // Frosted Notification Bell Pill with live resolved badge
              GestureDetector(
                onTap: _openNotificationsSheet,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(
                        Icons.notifications_none_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                      if (_statusNotifications.isNotEmpty ||
                          _reports.any((r) => r.status == 'Resolved' || r.status == 'Closed'))
                        Positioned(
                          top: 10,
                          right: 12,
                          child: Container(
                            width: 9,
                            height: 9,
                            decoration: const BoxDecoration(
                              color: BccColors.accentLime,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Subtitle Metric Label
          const Center(
            child: Text(
              'Active Municipal Reports',
              style: TextStyle(
                color: BccColors.textLime,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Big Metric Display with Eye Toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _isBalanceVisible
                    ? '$activeCount Active ${activeCount == 1 ? 'Fault' : 'Faults'}'
                    : '••••••••',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () =>
                    setState(() => _isBalanceVisible = !_isBalanceVisible),
                child: Icon(
                  _isBalanceVisible
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: BccColors.textLime,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Center(
            child: Text(
              '${_reports.where((r) => r.status == 'Resolved' || r.status == 'Closed').length} Resolved  •  ${_reports.length} Total Complaints',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          const SizedBox(height: 18),

          // Two Side-by-Side Pill CTA Buttons (as shown in reference image: Fund & Send)
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BccColors.accentLime,
                    foregroundColor: BccColors.primaryForestDark,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  onPressed: _openEmergencySos,
                  icon: const Icon(Icons.warning_amber_rounded, size: 18),
                  label: const Text(
                    'Emergency SOS',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BccColors.accentLimeSoft.withValues(
                      alpha: 0.85,
                    ),
                    foregroundColor: BccColors.primaryForestDark,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  onPressed: () => _openReportModal(),
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                  label: const Text(
                    'Report Fault',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Inner Filter Card (Like "Your Wallet" in reference image)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Filter by Service Area',
                  style: TextStyle(
                    color: BccColors.textLime,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildHeaderFilterChip('All'),
                      _buildHeaderFilterChip('Water'),
                      _buildHeaderFilterChip('Sewer'),
                      _buildHeaderFilterChip('Roads'),
                      _buildHeaderFilterChip('Lighting'),
                      // Add Report Button
                      InkWell(
                        onTap: () => _openTrackModal(),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.search_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Track Code',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: () => setState(() => _selectedFilter = label),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? BccColors.accentLime
                : Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? BccColors.primaryForestDark : Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Floating Quick Actions Bar (White Card with 4 Circular Action Icons)
  // ---------------------------------------------------------------------------
  Widget _buildQuickActionsCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth < 360 ? 2 : 4;
          return GridView.count(
            crossAxisCount: columns,
            mainAxisSpacing: 8,
            crossAxisSpacing: 4,
            childAspectRatio: columns == 2 ? 1.65 : 0.88,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _buildCircularActionButton(
                label: 'Water',
                sublabel: 'Pipe Leak',
                icon: Icons.water_drop_rounded,
                iconColor: const Color(0xFF0288D1),
                bgColor: const Color(0xFFE1F5FE),
                onTap: () => _openReportModal('WaterLeak'),
              ),
              _buildCircularActionButton(
                label: 'Sewer',
                sublabel: 'Overflow',
                icon: Icons.warning_amber_rounded,
                iconColor: const Color(0xFFD32F2F),
                bgColor: const Color(0xFFFFEBEE),
                onTap: () => _openReportModal('SewerBurst'),
              ),
              _buildCircularActionButton(
                label: 'Roads',
                sublabel: 'Pothole',
                icon: Icons.remove_road_rounded,
                iconColor: const Color(0xFF3949AB),
                bgColor: const Color(0xFFE8EAF6),
                onTap: () => _openReportModal('RoadDamage'),
              ),
              _buildCircularActionButton(
                label: 'Lighting',
                sublabel: 'Streetlight',
                icon: Icons.lightbulb_rounded,
                iconColor: const Color(0xFFF57F17),
                bgColor: const Color(0xFFFFF9C4),
                onTap: () => _openReportModal('StreetLight'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCircularActionButton({
    required String label,
    required String sublabel,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: BccColors.textDark,
              ),
            ),
            Text(
              sublabel,
              style: const TextStyle(fontSize: 10, color: BccColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Recent Reports Section (Matches "Recent Transactions" in reference)
  // ---------------------------------------------------------------------------
  Widget _buildRecentReportsSection() {
    final list = _filteredReports;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'My Complaints (${_reports.length})',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: BccColors.textDark,
              ),
            ),
            InkWell(
              onTap: () => _openTrackModal(),
              child: const Text(
                'Track Code',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF43A047),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: ['All', 'Active', 'Resolved'].map((tab) {
            final selected = _statusFilter == tab;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(tab),
                selected: selected,
                selectedColor: BccColors.primaryForest,
                labelStyle: TextStyle(
                  color: selected ? Colors.white : BccColors.textDark,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
                onSelected: (_) => setState(() => _statusFilter = tab),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        if (_isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: BccColors.primaryForest),
            ),
          )
        else if (list.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Center(
              child: Text(
                'No reports found in this category.',
                style: TextStyle(color: BccColors.textMuted, fontSize: 13),
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ListView.separated(
              itemCount: list.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              separatorBuilder: (ctx, idx) => Divider(
                height: 1,
                color: Colors.grey.shade100,
                indent: 72,
                endIndent: 16,
              ),
              itemBuilder: (ctx, idx) {
                final item = list[idx];
                return _buildReportItemRow(item);
              },
            ),
          ),
      ],
    );
  }

  Widget _buildReportItemRow(IncidentModel item) {
    IconData iconData = Icons.report_problem_rounded;
    Color iconColor = BccColors.primaryForest;
    Color iconBg = BccColors.scaffoldBg;

    switch (item.incidentType) {
      case 'WaterLeak':
        iconData = Icons.water_drop_rounded;
        iconColor = const Color(0xFF0288D1);
        iconBg = const Color(0xFFE1F5FE);
        break;
      case 'SewerBurst':
        iconData = Icons.warning_amber_rounded;
        iconColor = const Color(0xFFD32F2F);
        iconBg = const Color(0xFFFFEBEE);
        break;
      case 'RoadDamage':
        iconData = Icons.remove_road_rounded;
        iconColor = const Color(0xFF3949AB);
        iconBg = const Color(0xFFE8EAF6);
        break;
      case 'StreetLight':
        iconData = Icons.lightbulb_rounded;
        iconColor = const Color(0xFFF57F17);
        iconBg = const Color(0xFFFFF9C4);
        break;
      case 'Ambulance':
      case 'Fire':
      case 'Disaster':
        iconData = Icons.emergency_rounded;
        iconColor = BccColors.emergencyRed;
        iconBg = BccColors.emergencyRedSoft;
        break;
    }

    return InkWell(
      onTap: () => _openTrackModal(item.referenceNumber),
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Circular category icon (like Spotify/MTN icon in reference)
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
              child: Icon(iconData, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),

            // Title & Subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.readableType,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: BccColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.address ?? 'City of Bulawayo',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: BccColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),

            // Reference & Status Pill (clearly shows Resolved vs Unresolved)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  item.referenceNumber,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: BccColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                _buildStatusPill(item.status),
                const SizedBox(height: 2),
                Text(
                  (item.status == 'Resolved' || item.status == 'Closed')
                      ? 'Resolved ✓'
                      : 'Not Resolved',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: (item.status == 'Resolved' || item.status == 'Closed')
                        ? BccColors.statusResolved
                        : BccColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    Color bg = const Color(0xFFFFF3E0);
    Color text = const Color(0xFFE65100);

    if (status == 'Assigned') {
      bg = const Color(0xFFE3F2FD);
      text = const Color(0xFF1565C0);
    } else if (status == 'InProgress') {
      bg = const Color(0xFFF3E5F5);
      text = const Color(0xFF7B1FA2);
    } else if (status == 'Resolved') {
      bg = BccColors.statusResolvedSoft;
      text = BccColors.statusResolved;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status == 'InProgress' ? 'In Progress' : status,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: text,
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Floating Curved Bottom Navigation Bar (Matches reference design)
  // ---------------------------------------------------------------------------
  Widget _buildCurvedBottomNav() {
    return Container(
      height: 68,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: BccColors.primaryForest,
        borderRadius: BorderRadius.circular(34),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 1: Home
          _buildNavItem(icon: Icons.home_rounded, label: 'Home', index: 0),

          // 2: My Reports
          _buildNavItem(
            icon: Icons.assignment_outlined,
            label: 'Reports',
            index: 1,
          ),

          // 3: Center Raised Action Button (Lime circle with airplane/report icon)
          GestureDetector(
            onTap: () => _openReportModal(),
            child: Container(
              width: 48,
              height: 48,
              decoration: const BoxDecoration(
                color: BccColors.accentLime,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x44000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.send_rounded,
                color: BccColors.primaryForestDark,
                size: 22,
              ),
            ),
          ),

          // 4: Notices / Bulletins
          _buildNavItem(
            icon: Icons.campaign_outlined,
            label: 'Bulletins',
            index: 2,
          ),

          // 5: Profile / Info
          _buildNavItem(
            icon: Icons.person_outline_rounded,
            label: 'Profile',
            index: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
    VoidCallback? onTap,
  }) {
    final isSelected = _currentNavIndex == index;
    return InkWell(
      onTap: () {
        setState(() => _currentNavIndex = index);
        if (onTap != null) onTap();
      },
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected
                  ? BccColors.accentLime
                  : Colors.white.withValues(alpha: 0.6),
              size: 22,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected
                    ? BccColors.accentLime
                    : Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimeAgo(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'Recent';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays == 1) return 'Yesterday';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Recent';
    }
  }

  Widget _buildUnifiedFeedCard(Map<String, dynamic> item) {
    final id = item['id']?.toString() ?? UniqueKey().toString();
    final isExpanded = _expandedBulletinIds.contains(id);
    final title = item['title']?.toString() ?? 'Council Notice';
    final body = item['body']?.toString() ?? '';
    final sourceType = item['source_type']?.toString() ?? 'council';
    final badgeText = item['source_badge']?.toString() ?? 'Official Notice';
    final category = item['category']?.toString() ?? 'Notice';
    final targetWard = item['target_ward']?.toString();
    final actionUrl = item['action_url']?.toString();
    final actionLabel = item['action_label']?.toString() ?? 'Open in WhatsApp';
    final isUrgent = item['is_urgent'] == true;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUrgent ? const Color(0xFFFCA5A5) : BccColors.cardBorder,
          width: isUrgent ? 1.2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Source Badge + Time
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _buildSourceBadge(sourceType, badgeText),
              const Spacer(),
              Text(
                _formatTimeAgo(item['created_at']?.toString()),
                style: const TextStyle(fontSize: 11, color: BccColors.textMuted, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Title
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14.5,
              color: isUrgent ? const Color(0xFF991B1B) : BccColors.textDark,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 6),

          // Body text (with expand/collapse)
          Text(
            body,
            maxLines: isExpanded ? null : 3,
            overflow: isExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569), height: 1.45),
          ),

          if (body.length > 130) ...[
            const SizedBox(height: 4),
            InkWell(
              onTap: () {
                setState(() {
                  if (isExpanded) {
                    _expandedBulletinIds.remove(id);
                  } else {
                    _expandedBulletinIds.add(id);
                  }
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  isExpanded ? 'Show less ▴' : 'Read full update ▾',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.bold,
                    color: BccColors.primaryForest,
                  ),
                ),
              ),
            ),
          ],

          const SizedBox(height: 10),

          // Metadata Chips (Category & Ward)
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '#$category',
                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                ),
              ),
              if (targetWard != null && targetWard.isNotEmpty && targetWard != 'All Bulawayo Wards')
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on, size: 10, color: Color(0xFF0284C7)),
                      const SizedBox(width: 3),
                      Text(
                        targetWard,
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                      ),
                    ],
                  ),
                ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          // Action Buttons Bar
          Row(
            children: [
              if (actionUrl != null && actionUrl.isNotEmpty) ...[
                InkWell(
                  onTap: () async {
                    final uri = Uri.parse(actionUrl);
                    try {
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    } catch (_) {}
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.chat_bubble_outline_rounded, size: 13, color: Color(0xFF16A34A)),
                        const SizedBox(width: 5),
                        Text(
                          actionLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF16A34A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              const Spacer(),
              // Copy Button
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16, color: BccColors.textMuted),
                tooltip: 'Copy update text',
                constraints: const BoxConstraints(),
                padding: const EdgeInsets.all(6),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: '$title\n\n$body'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Notice text copied to clipboard'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
              const SizedBox(width: 4),
              // Share Button
              InkWell(
                onTap: () => _shareBulletinWhatsApp(
                  title: title,
                  body: body,
                  category: category,
                ),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.share_rounded, size: 13, color: Color(0xFF475569)),
                      SizedBox(width: 5),
                      Text(
                        'Share',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSourceBadge(String sourceType, String badgeText) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF475569);
    IconData icon = Icons.info_outline_rounded;

    if (sourceType == 'council') {
      bg = const Color(0xFFE8F5E9);
      text = const Color(0xFF1B5E20);
      icon = Icons.account_balance_rounded;
    } else if (sourceType == 'channel') {
      bg = const Color(0xFFDCFCE7);
      text = const Color(0xFF15803D);
      icon = Icons.cell_tower_rounded;
    } else if (sourceType == 'ward') {
      bg = const Color(0xFFEFF6FF);
      text = const Color(0xFF1D4ED8);
      icon = Icons.groups_rounded;
    } else if (sourceType == 'broadcast') {
      bg = const Color(0xFFFEF3C7);
      text = const Color(0xFFB45309);
      icon = Icons.bolt_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: text),
          const SizedBox(width: 4),
          Text(
            badgeText,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: text,
            ),
          ),
        ],
      ),
    );
  }
}
