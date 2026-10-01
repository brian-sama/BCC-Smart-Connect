import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Plus,
  Copy,
  Radio,
  Droplets
} from 'lucide-react';
import { bccApi } from '../services/api';

export default function WhatsAppChannelsModal({ isOpen, onClose }) {
  const [channels, setChannels] = useState([]);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadChannels() {
      setIsLoading(true);
      try {
        const data = await bccApi.getWhatsAppChannels();
        if (isMounted) {
          setChannels(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load WhatsApp channels:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadChannels();
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredChannels = channels.filter((c) => {
    const matchesCat =
      filterCategory === 'All'
        ? true
        : c.category.toLowerCase() === filterCategory.toLowerCase();

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.ward && c.ward.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q));

    return matchesCat && matchesSearch;
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <MessageCircle size={22} color="#25D366" />
            </div>
            <div>
              <h3 style={styles.title}>WhatsApp Communication Hub</h3>
              <p style={styles.subtitle}>
                Official City of Bulawayo Channel, Customer Care (0784 136 505), Meter Readings (0713 347 319) & Ward Groups
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search by Ward (e.g. Ward 1, Cowdray Park, Suburbs)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.tabPills}>
            {['All', 'Channel', 'Support', 'MeterReading', 'WardGroup'].map((cat) => (
              <button
                key={cat}
                style={filterCategory === cat ? styles.tabPillActive : styles.tabPill}
                onClick={() => setFilterCategory(cat)}
              >
                {cat === 'All'
                  ? 'All Links'
                  : cat === 'Channel'
                  ? 'Official Channel'
                  : cat === 'Support'
                  ? 'Customer Care (0784 136 505)'
                  : cat === 'MeterReading'
                  ? 'Meter Readings (0713 347 319)'
                  : 'Ward Groups'}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div style={styles.bodyList}>
          {isLoading ? (
            <div style={styles.loadingBox}>
              <p style={{ color: '#64748B', fontSize: '13px' }}>Loading verified WhatsApp channels...</p>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div style={styles.emptyBox}>
              <MessageCircle size={36} color="#CBD5E1" />
              <p style={styles.emptyTitle}>No matching WhatsApp groups found</p>
              <p style={styles.emptySubtitle}>Try searching for another ward number or suburb name.</p>
            </div>
          ) : (
            filteredChannels.map((item) => {
              const isSupport = item.category === 'Support';
              const isMeterReading = item.category === 'MeterReading';
              const isChannel = item.category === 'Channel';

              return (
                <div key={item.id} style={styles.channelCard}>
                  <div style={styles.channelCardLeft}>
                    <div
                      style={{
                        ...styles.channelIconBox,
                        backgroundColor: isSupport
                          ? '#FEF2F2'
                          : isMeterReading
                          ? '#E0F2FE'
                          : isChannel
                          ? '#F0FDF4'
                          : '#F8FAFC',
                      }}
                    >
                      {isSupport ? (
                        <PhoneCall size={20} color="#DC2626" />
                      ) : isMeterReading ? (
                        <Droplets size={20} color="#0284C7" />
                      ) : isChannel ? (
                        <Radio size={20} color="#16A34A" />
                      ) : (
                        <Users size={20} color="#0C3827" />
                      )}
                    </div>
                    <div style={styles.channelInfo}>
                      <div style={styles.channelTitleRow}>
                        <h4 style={styles.channelName}>{item.name}</h4>
                        {item.is_official && (
                          <span style={styles.verifiedBadge}>
                            <ShieldCheck size={12} color="#16A34A" />
                            <span>Official BCC</span>
                          </span>
                        )}
                        <span style={styles.scopeBadge}>
                          {item.ward || 'All Wards'}
                        </span>
                      </div>
                      <p style={styles.channelDesc}>{item.description}</p>
                      <div style={styles.channelMetaRow}>
                        <span style={styles.membersCount}>
                          👥 {item.member_count_approx || 'Active'}
                        </span>
                        {item.phone_number && (
                          <span style={styles.phoneTag}>📞 {item.phone_number}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={styles.channelActions}>
                    <button
                      style={styles.copyLinkBtn}
                      onClick={() => handleCopyLink(item.id, item.invite_url)}
                      title="Copy Invite Link"
                    >
                      {copiedId === item.id ? (
                        <>
                          <CheckCircle2 size={13} color="#16A34A" />
                          <span style={{ color: '#16A34A' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.joinBtn}
                    >
                      <span>{isSupport ? 'Chat Customer Care' : isMeterReading ? 'Send Readings' : isChannel ? 'Follow Channel' : 'Join Group'}</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerNote}>
            <span>🔒 All links are officially administered and verified by the City of Bulawayo.</span>
          </div>
          <button style={styles.closeFooterBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 25, 47, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '740px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
  },
  header: {
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #EBF0F5',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#E8F5E9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0C3827',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748B',
    margin: 0,
    marginTop: '2px',
  },
  closeBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#F1F5F9',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  filterBar: {
    padding: '14px 24px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#F8FAFC',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#FFFFFF',
    padding: '8px 14px',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
  },
  tabPills: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
  },
  tabPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748B',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabPillActive: {
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: '#0C3827',
    border: '1px solid #0C3827',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  bodyList: {
    padding: '18px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  channelCard: {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    transition: 'all 0.15s ease',
  },
  channelCardLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    flex: 1,
  },
  channelIconBox: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  channelInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  channelTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  channelName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1E293B',
    margin: 0,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10.5px',
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  scopeBadge: {
    fontSize: '10.5px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  channelDesc: {
    fontSize: '12px',
    color: '#64748B',
    margin: 0,
    lineHeight: 1.4,
  },
  channelMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '2px',
  },
  membersCount: {
    fontSize: '11px',
    color: '#059669',
    fontWeight: '600',
  },
  phoneTag: {
    fontSize: '11px',
    color: '#64748B',
    fontWeight: '500',
  },
  channelActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  copyLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 12px',
    borderRadius: '10px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  joinBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#25D366',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '700',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
  },
  emptyBox: {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
  },
  emptyTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#334155',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid #EBF0F5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  footerNote: {
    fontSize: '11.5px',
    color: '#64748B',
  },
  closeFooterBtn: {
    padding: '8px 20px',
    borderRadius: '10px',
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    fontSize: '12.5px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
  },
};
