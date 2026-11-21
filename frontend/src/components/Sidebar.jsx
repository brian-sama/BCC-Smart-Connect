import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  BarChart3,
  Users,
  BellRing,
  Settings,
  HelpCircle,
  LogOut,
  Smartphone,
  ShieldAlert,
  MessageCircle
} from 'lucide-react';

export default function Sidebar({ currentTab, onSelectTab, onOpenMap, onOpenBroadcast, onOpenWhatsApp }) {
  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandRow}>
        <div style={styles.logoBadge}>
          <img src="/bcc-logo.jpg" alt="City of Bulawayo Crest" style={styles.logoImg} />
        </div>
        <div>
          <h2 style={styles.brandTitle}>BCC SmartConnect</h2>
          <p style={styles.brandSubtitle}>City of Bulawayo</p>
        </div>
      </div>

      {/* Main Menu */}
      <div style={styles.menuGroup}>
        <span style={styles.groupLabel}>MENU</span>
        <nav style={styles.navList}>
          <button
            style={currentTab === 'dashboard' ? styles.navItemActive : styles.navItem}
            onClick={() => onSelectTab('dashboard')}
          >
            {currentTab === 'dashboard' && <span style={styles.activeIndicator} />}
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>

          <button
            style={currentTab === 'map' ? styles.navItemActive : styles.navItem}
            onClick={() => onOpenMap()}
          >
            <MapPin size={19} />
            <span>Live GIS Map</span>
            <span style={styles.pillBadge}>LIVE</span>
          </button>

          <button
            style={currentTab === 'incidents' ? styles.navItemActive : styles.navItem}
            onClick={() => onSelectTab('incidents')}
          >
            {currentTab === 'incidents' && <span style={styles.activeIndicator} />}
            <ClipboardList size={19} />
            <span>Incident Queue</span>
          </button>

          <button
            style={currentTab === 'analytics' ? styles.navItemActive : styles.navItem}
            onClick={() => onSelectTab('analytics')}
          >
            {currentTab === 'analytics' && <span style={styles.activeIndicator} />}
            <BarChart3 size={19} />
            <span>Analytics & SLA</span>
          </button>

          <button
            style={currentTab === 'teams' ? styles.navItemActive : styles.navItem}
            onClick={() => onSelectTab('teams')}
          >
            {currentTab === 'teams' && <span style={styles.activeIndicator} />}
            <Users size={19} />
            <span>Field Teams</span>
          </button>
        </nav>
      </div>

      {/* General Settings */}
      <div style={styles.menuGroup}>
        <span style={styles.groupLabel}>COMMUNICATION & SYSTEM</span>
        <nav style={styles.navList}>
          <button style={styles.navItem} onClick={() => onOpenBroadcast()}>
            <BellRing size={19} />
            <span>Notice Draft</span>
          </button>

          <button
            style={{ ...styles.navItem, color: '#166534', backgroundColor: '#F0FDF4' }}
            onClick={() => onOpenWhatsApp && onOpenWhatsApp()}
          >
            <MessageCircle size={19} color="#25D366" />
            <span style={{ fontWeight: '700' }}>Verified Contacts</span>
          </button>

          <button style={styles.navItem} onClick={() => onSelectTab('analytics')}>
            <Settings size={19} />
            <span>System Status</span>
          </button>

          <button
            style={styles.navItem}
            onClick={() => onOpenWhatsApp && onOpenWhatsApp()}
          >
            <HelpCircle size={19} />
            <span>Contact directory</span>
          </button>

          <button style={styles.navItem} onClick={() => onSelectTab('login')}>
            <LogOut size={19} />
            <span>Switch Staff / Sign In</span>
          </button>
        </nav>
      </div>

      {/* Bottom Promo Card (Matching reference design) */}
      <div style={styles.mobileAppCard}>
        <div style={styles.appCardHeader}>
          <div style={styles.phoneIconBox}>
            <Smartphone size={16} color="#A8D06B" />
          </div>
          <div>
            <h4 style={styles.appCardTitle}>Citizen Mobile App</h4>
            <p style={styles.appCardDesc}>Flutter citizen reporter</p>
          </div>
        </div>
        <button
          style={styles.appDownloadBtn}
          onClick={() => alert('Launch the mobile app via Flutter: cd mobile && flutter run')}
        >
          Open App Guide
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #EBF0F5',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid #F1F5F9',
  },
  logoBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #D4AF37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(12, 56, 39, 0.12)',
    overflow: 'hidden',
    padding: '2px',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  brandTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0C3827',
    letterSpacing: '-0.3px',
  },
  brandSubtitle: {
    fontSize: '11px',
    color: '#7E8B9B',
    fontWeight: '500',
  },
  menuGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  groupLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: '0.8px',
    paddingLeft: '12px',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '12px',
    color: '#64748B',
    fontSize: '13.5px',
    fontWeight: '600',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '12px',
    backgroundColor: '#F0F7F4',
    color: '#0C3827',
    fontSize: '13.5px',
    fontWeight: '700',
    position: 'relative',
    width: '100%',
    textAlign: 'left',
  },
  activeIndicator: {
    position: 'absolute',
    left: '-18px',
    top: '6px',
    bottom: '6px',
    width: '4px',
    backgroundColor: '#0C3827',
    borderRadius: '0 4px 4px 0',
  },
  pillBadge: {
    marginLeft: 'auto',
    fontSize: '9.5px',
    fontWeight: '800',
    backgroundColor: '#E53935',
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '10px',
    letterSpacing: '0.5px',
  },
  mobileAppCard: {
    marginTop: 'auto',
    backgroundColor: '#082117',
    borderRadius: '18px',
    padding: '16px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 8px 24px rgba(8, 33, 23, 0.25)',
  },
  appCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  phoneIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appCardTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appCardDesc: {
    fontSize: '11px',
    color: '#A8D06B',
  },
  appDownloadBtn: {
    backgroundColor: '#0C3827',
    color: '#A8D06B',
    border: '1px solid rgba(168, 208, 107, 0.3)',
    borderRadius: '12px',
    padding: '9px',
    fontSize: '12px',
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
};
