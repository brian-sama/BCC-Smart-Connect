import React, { useState } from 'react';
import { Users, Phone, MapPin, CheckCircle, Clock, Shield, Wrench, Siren } from 'lucide-react';

export default function FieldTeamsView({ teams, incidents, onSelectIncident }) {
  const [selectedDept, setSelectedDept] = useState('All');

  const depts = ['All', 'Engineering Services', 'Health Services', 'Emergency & Fire Services'];

  const filteredTeams = teams.filter((t) => {
    if (selectedDept === 'All') return true;
    return t.department === selectedDept;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'On Site':
        return { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' };
      case 'Dispatched':
        return { bg: '#E0F2FE', text: '#0369A1', dot: '#0284C7' };
      case 'Available':
        return { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' };
      default:
        return { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Field Teams & Rapid Dispatch</h2>
          <p style={styles.subtitle}>
            Active Bulawayo City Council municipal crews, technicians, ambulances, and road repair gangs.
          </p>
        </div>
        <div style={styles.filterPills}>
          {depts.map((d) => (
            <button
              key={d}
              style={selectedDept === d ? styles.pillActive : styles.pill}
              onClick={() => setSelectedDept(d)}
            >
              {d === 'All' ? 'All Divisions' : d.replace('Services', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Crew Cards */}
      <div style={styles.grid}>
        {filteredTeams.map((team) => {
          const badge = getStatusBadge(team.status);
          const activeIncident = team.activeTicket || team.active_ticket
            ? incidents.find(
                (i) => i.reference_number === (team.activeTicket || team.active_ticket)
              )
            : null;

          return (
            <div key={team.id} style={styles.card}>
              <div style={styles.cardTop}>
                <img
                  src={
                    team.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'
                  }
                  alt={team.name}
                  style={styles.avatar}
                />
                <div style={styles.teamInfo}>
                  <h4 style={styles.teamName}>{team.name}</h4>
                  <span style={styles.teamRole}>{team.role}</span>
                  <span style={styles.teamDept}>{team.department}</span>
                </div>
                <div
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: badge.bg,
                    color: badge.text,
                  }}
                >
                  <span
                    style={{ ...styles.statusDot, backgroundColor: badge.dot }}
                  />
                  <span>{team.status}</span>
                </div>
              </div>

              <hr style={styles.divider} />

              {/* Active Assignment */}
              <div style={styles.assignmentBox}>
                <span style={styles.assignmentLabel}>Active Work Assignment:</span>
                {team.activeTicket || team.active_ticket ? (
                  <div style={styles.ticketBox}>
                    <div>
                      <strong style={styles.ticketRef}>
                        {team.activeTicket || team.active_ticket}
                      </strong>
                      <p style={styles.ticketDesc}>
                        {activeIncident?.description || 'Active response underway in ward.'}
                      </p>
                    </div>
                    {activeIncident && (
                      <button
                        style={styles.viewTicketBtn}
                        onClick={() => onSelectIncident(activeIncident)}
                      >
                        View Ticket
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={styles.standbyText}>
                    Ready on standby • No active dispatch
                  </span>
                )}
              </div>

              {/* Contact Footer */}
              <div style={styles.cardFooter}>
                {team.phone ? (
                  <a href={`tel:${team.phone}`} style={styles.phoneBtn}>
                    <Phone size={14} />
                    <span>Call Crew ({team.phone})</span>
                  </a>
                ) : (
                  <span style={styles.standbyText}>No verified crew contact available</span>
                )}
              </div>
            </div>
          );
        })}
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
    flexWrap: 'wrap',
    gap: '12px',
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
  filterPills: {
    display: 'flex',
    gap: '8px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '22px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '14px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    position: 'relative',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    objectFit: 'cover',
    border: '2px solid #E2E8F0',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1E293B',
    margin: '0 0 2px 0',
  },
  teamRole: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0C3827',
    display: 'block',
  },
  teamDept: {
    fontSize: '11px',
    color: '#64748B',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #F1F5F9',
    margin: '0',
  },
  assignmentBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  assignmentLabel: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#64748B',
  },
  ticketBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #E2E8F0',
  },
  ticketRef: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0C3827',
  },
  ticketDesc: {
    fontSize: '11.5px',
    color: '#64748B',
    margin: '2px 0 0 0',
    maxWidth: '220px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  viewTicketBtn: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#0C3827',
    cursor: 'pointer',
  },
  standbyText: {
    fontSize: '12px',
    color: '#16A34A',
    fontWeight: '600',
    padding: '4px 0',
  },
  cardFooter: {
    paddingTop: '6px',
  },
  phoneBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0C3827',
    textDecoration: 'none',
    backgroundColor: '#E8F5E9',
    padding: '6px 12px',
    borderRadius: '10px',
  },
};
