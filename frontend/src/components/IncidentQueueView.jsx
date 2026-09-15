import React, { useState } from 'react';
import {
  Search,
  Filter,
  Droplet,
  AlertTriangle,
  AlertOctagon,
  Lightbulb,
  Clock,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  MapPin
} from 'lucide-react';

export default function IncidentQueueView({ incidents, onSelectIncident }) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const categories = [
    { key: 'All', label: 'All Categories' },
    { key: 'WaterLeak', label: 'Water Leaks' },
    { key: 'SewerBurst', label: 'Sewer Bursts' },
    { key: 'RoadDamage', label: 'Road Damage' },
    { key: 'StreetLight', label: 'Street Lights' },
    { key: 'Ambulance', label: 'Medical / Fire' },
  ];

  const statuses = ['All', 'New', 'Assigned', 'InProgress', 'Resolved'];

  const filtered = incidents.filter((item) => {
    const matchesType = selectedType === 'All' || item.incident_type === selectedType;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.reference_number?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.address?.toLowerCase().includes(q) ||
      item.reporter_name?.toLowerCase().includes(q);

    return matchesType && matchesStatus && matchesSearch;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'WaterLeak': return <Droplet size={16} color="#0288D1" />;
      case 'SewerBurst': return <AlertTriangle size={16} color="#D32F2F" />;
      case 'RoadDamage': return <AlertOctagon size={16} color="#3949AB" />;
      case 'StreetLight': return <Lightbulb size={16} color="#F57F17" />;
      default: return <AlertTriangle size={16} color="#E53935" />;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'New':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'Assigned':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'InProgress':
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' };
      case 'Resolved':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Incident Queue</h2>
          <p style={styles.subtitle}>
            Comprehensive log of all citizen reported faults, emergencies, and infrastructure tickets across Bulawayo.
          </p>
        </div>
        <div style={styles.countBadge}>
          <span>{filtered.length} matching tickets</span>
        </div>
      </div>

      {/* Filter Row */}
      <div style={styles.controlsRow}>
        {/* Search */}
        <div style={styles.searchBox}>
          <Search size={18} color="#94A3B8" />
          <input
            type="text"
            placeholder="Filter by ref code, suburb, citizen or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Category Pills */}
        <div style={styles.pillGroup}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              style={selectedType === cat.key ? styles.pillActive : styles.pill}
              onClick={() => setSelectedType(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div style={styles.statusSelectWrapper}>
          <Filter size={15} color="#64748B" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={styles.statusSelect}
          >
            {statuses.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div style={styles.tableCard}>
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={36} color="#94A3B8" />
            <h4 style={styles.emptyTitle}>No incidents found</h4>
            <p style={styles.emptyDesc}>Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Reference & Category</th>
                <th style={styles.th}>Description & Location</th>
                <th style={styles.th}>Reporter</th>
                <th style={styles.th}>Assigned Crew</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Time Logged</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const badge = getStatusStyle(item.status);
                return (
                  <tr
                    key={item.id}
                    style={styles.tableRow}
                    onClick={() => onSelectIncident(item)}
                  >
                    {/* Reference & Icon */}
                    <td style={styles.td}>
                      <div style={styles.refCell}>
                        <div style={styles.iconCircle}>{getTypeIcon(item.incident_type)}</div>
                        <div>
                          <span style={styles.refText}>{item.reference_number}</span>
                          {item.is_emergency && (
                            <span style={styles.emergencyTag}>CRITICAL</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Description & Address */}
                    <td style={styles.td}>
                      <div style={styles.descCell}>
                        <strong style={styles.descText}>{item.description}</strong>
                        <div style={styles.addressRow}>
                          <MapPin size={13} color="#64748B" />
                          <span>{item.address || 'Bulawayo General Ward'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Reporter */}
                    <td style={styles.td}>
                      <span style={styles.reporterName}>
                        {item.reporter_name || 'Citizen Report'}
                      </span>
                      {item.reporter_phone && (
                        <span style={styles.reporterPhone}>{item.reporter_phone}</span>
                      )}
                    </td>

                    {/* Assigned Crew */}
                    <td style={styles.td}>
                      <span style={styles.crewText}>
                        {item.assigned_to_name || 'Unassigned'}
                      </span>
                      <span style={styles.deptText}>
                        {item.department || 'Engineering'}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td style={styles.td}>
                      <div style={styles.timeCell}>
                        <Clock size={13} color="#94A3B8" />
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recent'}
                        </span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td style={styles.td}>
                      <button style={styles.actionBtn}>
                        <span>Manage</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
  countBadge: {
    backgroundColor: '#E8F5E9',
    color: '#16A34A',
    fontWeight: '700',
    fontSize: '12px',
    padding: '6px 14px',
    borderRadius: '16px',
    border: '1px solid #BBF7D0',
  },
  controlsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '8px 14px',
    flex: '1 1 280px',
    maxWidth: '400px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    color: '#1E293B',
  },
  pillGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillActive: {
    backgroundColor: '#0C3827',
    border: '1px solid #0C3827',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  statusSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '6px 12px',
  },
  statusSelect: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
  },
  th: {
    padding: '14px 18px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid #F1F5F9',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '14px 18px',
    verticalAlign: 'middle',
  },
  refCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refText: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0C3827',
    display: 'block',
  },
  emergencyTag: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: '#FEE2E2',
    color: '#E53935',
    padding: '1px 6px',
    borderRadius: '8px',
    display: 'inline-block',
    marginTop: '2px',
  },
  descCell: {
    maxWidth: '320px',
  },
  descText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1E293B',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11.5px',
    color: '#64748B',
    marginTop: '2px',
  },
  reporterName: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#1E293B',
    display: 'block',
  },
  reporterPhone: {
    fontSize: '11px',
    color: '#64748B',
  },
  crewText: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#1E293B',
    display: 'block',
  },
  deptText: {
    fontSize: '11px',
    color: '#64748B',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid transparent',
    display: 'inline-block',
  },
  timeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#64748B',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#0C3827',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '48px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyDesc: {
    fontSize: '13px',
    color: '#64748B',
  },
};
