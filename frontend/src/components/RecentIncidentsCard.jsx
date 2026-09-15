import React from 'react';
import { Droplet, AlertTriangle, AlertOctagon, Lightbulb, Plus } from 'lucide-react';

export default function RecentIncidentsCard({ incidents, onSelectIncident, onNewIncident }) {
  const getIcon = (type) => {
    switch (type) {
      case 'WaterLeak':
        return <Droplet size={16} color="#0288D1" />;
      case 'SewerBurst':
        return <AlertTriangle size={16} color="#D32F2F" />;
      case 'RoadDamage':
        return <AlertOctagon size={16} color="#3949AB" />;
      case 'StreetLight':
        return <Lightbulb size={16} color="#F57F17" />;
      default:
        return <AlertTriangle size={16} color="#E53935" />;
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h4 style={styles.title}>Incident Queue</h4>
        <button style={styles.addBtn} onClick={onNewIncident}>
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>

      <div style={styles.list}>
        {incidents.slice(0, 4).map((inc) => (
          <div
            key={inc.id}
            style={styles.itemRow}
            onClick={() => onSelectIncident(inc)}
          >
            <div style={styles.iconCircle}>
              {getIcon(inc.incident_type)}
            </div>
            <div style={styles.itemDetails}>
              <span style={styles.itemTitle}>{inc.description?.slice(0, 32)}...</span>
              <span style={styles.itemSub}>{inc.address?.split(',')[0]} • {inc.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '22px',
    padding: '22px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '230px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1E293B',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#0C3827',
    border: '1px solid #CBD5E1',
    borderRadius: '16px',
    padding: '4px 10px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 4px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  itemTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#1E293B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemSub: {
    fontSize: '11px',
    color: '#64748B',
  },
};
