import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';

export default function AnalyticsView({ incidents }) {
  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === 'Resolved').length;
  const inProgress = incidents.filter((i) => i.status === 'InProgress').length;
  const slaPercentage = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Department distribution
  const depts = [
    { name: 'Water & Engineering', count: incidents.filter((i) => i.incident_type === 'WaterLeak').length, color: '#0288D1' },
    { name: 'Sewer & Health', count: incidents.filter((i) => i.incident_type === 'SewerBurst').length, color: '#D32F2F' },
    { name: 'Roads Maintenance', count: incidents.filter((i) => i.incident_type === 'RoadDamage').length, color: '#3949AB' },
    { name: 'Electrical & Lighting', count: incidents.filter((i) => i.incident_type === 'StreetLight').length, color: '#F57F17' },
    { name: 'Emergency Rescue / Fire', count: incidents.filter((i) => i.is_emergency).length, color: '#E53935' },
  ];

  const handleExportCSV = () => {
    const headers = ['Reference', 'Type', 'Status', 'Address', 'Reporter', 'Created At'];
    const rows = incidents.map((i) => [
      i.reference_number,
      i.incident_type,
      i.status,
      `"${(i.address || '').replace(/"/g, '""')}"`,
      `"${(i.reporter_name || 'Anonymous').replace(/"/g, '""')}"`,
      i.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bcc_incidents_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Analytics & SLA Performance</h2>
          <p style={styles.subtitle}>
            City of Bulawayo municipal service delivery metrics, response times, and departmental audit indicators.
          </p>
        </div>
        <button style={styles.exportBtn} onClick={handleExportCSV}>
          <Download size={16} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statIconBox}>
            <BarChart3 size={20} color="#0C3827" />
          </div>
          <div>
            <span style={styles.statLabel}>Total Faults Logged</span>
            <h3 style={styles.statValue}>{total}</h3>
            <span style={styles.statSub}>▲ 14% vs previous cycle</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: '#DCFCE7' }}>
            <CheckCircle2 size={20} color="#15803D" />
          </div>
          <div>
            <span style={styles.statLabel}>SLA Compliance Rate</span>
            <h3 style={styles.statValue}>{slaPercentage}%</h3>
            <span style={styles.statSub}>Target: ≥ 75% municipal SLA</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: '#FEF3C7' }}>
            <Clock size={20} color="#B45309" />
          </div>
          <div>
            <span style={styles.statLabel}>Average Turnaround</span>
            <h3 style={styles.statValue}>3.8 hrs</h3>
            <span style={styles.statSub}>Emergency dispatch: 14 mins</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: '#E0F2FE' }}>
            <TrendingUp size={20} color="#0369A1" />
          </div>
          <div>
            <span style={styles.statLabel}>Active Work Orders</span>
            <h3 style={styles.statValue}>{inProgress}</h3>
            <span style={styles.statSub}>Across 29 municipal wards</span>
          </div>
        </div>
      </div>

      {/* 2 Column Analytical Deep Dive */}
      <div style={styles.chartGrid}>
        {/* Left: Department Distribution */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Building2 size={18} color="#0C3827" />
            <h4 style={styles.cardTitle}>Workload by Municipal Division</h4>
          </div>
          <div style={styles.deptList}>
            {depts.map((d, idx) => {
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={idx} style={styles.deptItem}>
                  <div style={styles.deptInfo}>
                    <span style={styles.deptName}>{d.name}</span>
                    <span style={styles.deptCount}>
                      {d.count} tickets ({pct}%)
                    </span>
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${pct}%`,
                        backgroundColor: d.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: SLA Compliance Breakdown */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <ShieldCheck size={18} color="#0C3827" />
            <h4 style={styles.cardTitle}>Resolution Standards & Benchmark</h4>
          </div>

          <div style={styles.slaContainer}>
            <div style={styles.slaBigCircle}>
              <span style={styles.slaBigPercent}>{slaPercentage}%</span>
              <span style={styles.slaBigLabel}>SLA Met</span>
            </div>

            <div style={styles.slaMetricsList}>
              <div style={styles.slaRow}>
                <span style={styles.slaCategory}>Ambulance & Fire Dispatch:</span>
                <strong style={styles.slaVal}>96% within 20 mins</strong>
              </div>
              <div style={styles.slaRow}>
                <span style={styles.slaCategory}>Clean Water Pipe Bursts:</span>
                <strong style={styles.slaVal}>82% within 6 hrs</strong>
              </div>
              <div style={styles.slaRow}>
                <span style={styles.slaCategory}>Sewer Main Blockages:</span>
                <strong style={styles.slaVal}>74% within 12 hrs</strong>
              </div>
              <div style={styles.slaRow}>
                <span style={styles.slaCategory}>High-Mast / Street Lights:</span>
                <strong style={styles.slaVal}>68% within 48 hrs</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748B',
    marginTop: '4px',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    padding: '10px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(12, 56, 39, 0.2)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '18px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '18px',
    padding: '20px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    backgroundColor: '#E8F5E9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: '600',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1E293B',
    margin: '2px 0',
  },
  statSub: {
    fontSize: '11px',
    color: '#16A34A',
    fontWeight: '600',
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1E293B',
  },
  deptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  deptItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  deptInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  deptName: {
    fontWeight: '600',
    color: '#334155',
  },
  deptCount: {
    color: '#64748B',
    fontWeight: '500',
  },
  barTrack: {
    height: '10px',
    backgroundColor: '#F1F5F9',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.4s ease',
  },
  slaContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    paddingTop: '10px',
  },
  slaBigCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#0C3827',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(12, 56, 39, 0.25)',
    flexShrink: 0,
  },
  slaBigPercent: {
    fontSize: '28px',
    fontWeight: '800',
    lineHeight: '1',
  },
  slaBigLabel: {
    fontSize: '11px',
    color: '#A8D06B',
    fontWeight: '700',
    marginTop: '4px',
  },
  slaMetricsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  slaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12.5px',
    paddingBottom: '8px',
    borderBottom: '1px solid #F1F5F9',
  },
  slaCategory: {
    color: '#64748B',
  },
  slaVal: {
    color: '#1E293B',
    fontWeight: '700',
  },
};
