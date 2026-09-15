import React from 'react';
import { Siren, Send } from 'lucide-react';

export default function PriorityEmergencyCard({ incident, onSelectIncident }) {
  const current = incident || {
    reference_number: 'BCC-20260904-E001',
    incident_type: 'Ambulance',
    description: 'Road traffic collision on Khami Road near Kelvin North.',
    address: 'Khami Road, Ward 11',
    created_at: '2026-09-04T21:40:00.000Z',
  };

  return (
    <div style={styles.card}>
      <div>
        <div style={styles.badgeRow}>
          <div style={styles.pulseDot} />
          <span style={styles.badgeText}>URGENT DISPATCH CALL</span>
        </div>
        <h3 style={styles.title}>{current.description}</h3>
        <p style={styles.subtext}>{current.address} • Reference: {current.reference_number}</p>
      </div>

      <button style={styles.actionBtn} onClick={() => onSelectIncident(current)}>
        <Siren size={18} />
        <span>Deploy Field Crew</span>
      </button>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '22px',
    padding: '24px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '230px',
  },
  badgeRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FEE2E2',
    padding: '4px 10px',
    borderRadius: '20px',
    marginBottom: '12px',
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#E53935',
  },
  badgeText: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#E53935',
    letterSpacing: '0.4px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: '1.35',
    marginBottom: '6px',
  },
  subtext: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: '500',
  },
  actionBtn: {
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    padding: '14px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13.5px',
    fontWeight: '700',
    boxShadow: '0 6px 18px rgba(12, 56, 39, 0.2)',
    transition: 'all 0.2s ease',
  },
};
