import React from 'react';
import { Search, Bell, Mail, Radio, MessageCircle, LogOut } from 'lucide-react';

export default function TopBar({
  searchQuery,
  onSearchChange,
  onOpenBroadcast,
  onOpenMap,
  onOpenWhatsApp,
  currentUser,
  onLogout,
}) {
  const user = currentUser || { name: 'Staff User', role: 'Dispatcher' };
  const isAdmin = user.role === 'Administrator';
  const canDispatch = isAdmin || user.role === 'Dispatcher';
  const canComms = isAdmin || user.role === 'Communications';

  return (
    <header style={styles.header}>
      {/* Search Input */}
      <div style={styles.searchWrapper}>
        <Search size={18} color="#94A3B8" />
        <input
          type="text"
          placeholder="Search incidents, reference code, citizen, suburb..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Right Controls */}
      <div style={styles.rightGroup}>
        {/* Live Status Pill */}
        <div style={styles.liveIndicator}>
          <Radio size={14} color="#16A34A" />
          <span style={styles.liveText}>Live Cloud Sync</span>
        </div>

        {/* WhatsApp Hub Button (Communications & Administrator only) */}
        {canComms && (
          <button
            style={{ ...styles.iconBtn, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}
            onClick={onOpenWhatsApp}
            title="WhatsApp Channels & Ward Groups"
          >
            <MessageCircle size={18} color="#25D366" />
          </button>
        )}

        {/* Broadcast Button (Communications & Administrator only) */}
        {canComms && (
          <button style={styles.iconBtn} onClick={onOpenBroadcast} title="Send Broadcast Alert">
            <Mail size={18} color="#64748B" />
          </button>
        )}

        {/* Live Map Button (Dispatcher & Administrator only) */}
        {canDispatch && (
          <button style={styles.iconBtn} onClick={onOpenMap} title="Active Incident Map">
            <Bell size={18} color="#64748B" />
            <span style={styles.notificationDot} />
          </button>
        )}

        {/* User Profile */}
        <div style={styles.profileBox}>
          <div style={styles.avatarInitials}>
            {(user.name || 'S').slice(0, 1).toUpperCase()}
          </div>
          <div style={styles.profileText}>
            <span style={styles.profileName}>{user.name}</span>
            <span style={styles.profileRole}>{user.role}</span>
          </div>
        </div>

        {/* Clean Logout Button */}
        <button
          style={{ ...styles.iconBtn, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={17} color="#DC2626" />
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '76px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #EBF0F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#F4F6F9',
    borderRadius: '14px',
    padding: '10px 16px',
    width: '380px',
    border: '1px solid #E2E8F0',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#1E293B',
    width: '100%',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#E8F5E9',
    color: '#16A34A',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  liveText: {
    fontSize: '12px',
    fontWeight: '700',
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '8px',
    height: '8px',
    backgroundColor: '#E53935',
    borderRadius: '50%',
    border: '1.5px solid #FFFFFF',
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingLeft: '8px',
  },
  avatarInitials: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
  },
  profileName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: '1.2',
  },
  profileRole: {
    fontSize: '11px',
    color: '#64748B',
  },
};
