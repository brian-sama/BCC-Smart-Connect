import React from 'react';
import { UserPlus } from 'lucide-react';

export default function FieldTeamsCard({ teams }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'On Site':
        return { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' };
      case 'En Route':
        return { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' };
      default:
        return { bg: '#EDE7F6', text: '#6A1B9A', border: '#D1C4E9' };
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h4 style={styles.title}>Field Response Teams</h4>
        <button style={styles.addBtn} onClick={() => alert('Add Field Crew Member')}>
          <UserPlus size={13} />
          <span>+ Add Member</span>
        </button>
      </div>

      <div style={styles.memberList}>
        {!teams || teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B', fontSize: '12.5px' }}>
            No field response teams active in database.
          </div>
        ) : (
          teams.map((member) => {
            const pill = getStatusStyle(member.status);
            return (
              <div key={member.id} style={styles.memberRow}>
                <img src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'} alt={member.name} style={styles.avatar} />
                <div style={styles.memberInfo}>
                  <span style={styles.name}>{member.name}</span>
                  <span style={styles.role}>{member.role}</span>
                </div>
                <span
                  style={{
                    ...styles.statusPill,
                    backgroundColor: pill.bg,
                    color: pill.text,
                    borderColor: pill.border,
                  }}
                >
                  {member.status}
                </span>
              </div>
            );
          })
        )}
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
    minHeight: '220px',
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
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  memberInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  name: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1E293B',
  },
  role: {
    fontSize: '11px',
    color: '#64748B',
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '14px',
    border: '1px solid transparent',
  },
};
