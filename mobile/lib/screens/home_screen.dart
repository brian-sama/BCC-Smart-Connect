import 'package:flutter/material.dart';
import '../constants/bcc_colors.dart';
import '../models/incident_model.dart';
import 'auth_screen.dart';
import '../services/supabase_service.dart';
import '../services/storage_service.dart';
import '../widgets/emergency_sos_dialog.dart';
import '../widgets/report_fault_modal.dart';
import '../widgets/track_reference_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  String _selectedFilter = 'All';
  bool _isBalanceVisible = true;
  List<IncidentModel> _reports = [];
  bool _isLoading = true;
  String _userName = 'Bulawayo Citizen';
  bool _isGuest = true;

  @override
  void initState() {
    super.initState();
    _loadReports();
    _loadUser();
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

  Future<void> _loadReports() async {
    setState(() => _isLoading = true);
    try {
      // Load directly from backend
      final list = await BccApiService.fetchMyReports();
      if (mounted) {
        setState(() {
          _reports = list;
          _isLoading = false;
        });
        return;
      }
    } catch (_) {}
    // Fallback to locally saved reports on device (no dummy data)
    final list = await StorageService.getSavedReports();
    if (mounted) {
      setState(() {
        _reports = list;
        _isLoading = false;
      });
    }
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

  List<IncidentModel> get _filteredReports {
    if (_selectedFilter == 'All') return _reports;
    if (_selectedFilter == 'Water') {
      return _reports.where((r) => r.incidentType == 'WaterLeak').toList();
    }
    if (_selectedFilter == 'Sewer') {
      return _reports.where((r) => r.incidentType == 'SewerBurst').toList();
    }
    if (_selectedFilter == 'Roads') {
      return _reports.where((r) => r.incidentType == 'RoadDamage').toList();
    }
    if (_selectedFilter == 'Lighting') {
      return _reports.where((r) => r.incidentType == 'StreetLight').toList();
    }
    return _reports;
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
    return _buildPageScaffold(
      title: 'Council Bulletins',
      icon: Icons.campaign_outlined,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: BccApiService.fetchBulletins(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: BccColors.primaryForest),
            );
          }
          final bulletins = snapshot.data ?? [];
          if (bulletins.isEmpty) {
            return const Text(
              'No bulletins available right now.',
              style: TextStyle(color: BccColors.textMuted),
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: bulletins.map((bulletin) {
              final category = bulletin['category']?.toString() ?? '';
              final prefix = category == 'Water Cut'
                  ? 'Water'
                  : category == 'Roads'
                  ? 'Roads'
                  : category == 'Health'
                  ? 'Health'
                  : 'Notice';
              final urgent = bulletin['is_urgent'] == true ? 'Urgent: ' : '';
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildBulletinCard(
                  '$urgent$prefix - ${bulletin['title'] ?? ''}',
                  bulletin['body']?.toString() ?? '',
                ),
              );
            }).toList(),
          );
        },
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
            leading: Icon(Icons.phone_outlined, color: BccColors.primaryForest),
            title: Text('BCC Call Centre'),
            subtitle: Text('+263 2922 75011 / 75012'),
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
              // Frosted Notification Bell Pill with green dot indicator
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
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
                    Positioned(
                      top: 10,
                      right: 12,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: BccColors.accentLime,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
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
                _isBalanceVisible ? '$activeCount Active Faults' : '••••••••',
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
                    backgroundColor: BccColors.accentLimeSoft.withOpacity(0.85),
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
              color: Colors.black.withOpacity(0.18),
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
                              color: Colors.white.withOpacity(0.3),
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
                : Colors.white.withOpacity(0.12),
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
            color: Colors.black.withOpacity(0.04),
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
            const Text(
              'Recent Reports',
              style: TextStyle(
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
                  color: Colors.black.withOpacity(0.03),
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

            // Reference & Status Pill
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  item.referenceNumber,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: BccColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                _buildStatusPill(item.status),
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
                  : Colors.white.withOpacity(0.6),
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
                    : Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBulletinCard(String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: BccColors.scaffoldBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BccColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: BccColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            desc,
            style: const TextStyle(fontSize: 12, color: BccColors.textMuted),
          ),
        ],
      ),
    );
  }
}
