import React, { useState, useEffect } from 'react';
import { Plus, Radio, MapPin, AlertCircle, Siren, X, UserPlus, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatCard from './components/StatCard';
import ActivityChartCard from './components/ActivityChartCard';
import PriorityEmergencyCard from './components/PriorityEmergencyCard';
import RecentIncidentsCard from './components/RecentIncidentsCard';
import FieldTeamsCard from './components/FieldTeamsCard';
import ResolutionGaugeCard from './components/ResolutionGaugeCard';
import ResponseTimerCard from './components/ResponseTimerCard';
import LiveMapModal from './components/LiveMapModal';
import IncidentDetailModal from './components/IncidentDetailModal';
import BroadcastModal from './components/BroadcastModal';
import LoginModal from './components/LoginModal';
import CreateStaffModal from './components/CreateStaffModal';
import IncidentQueueView from './components/IncidentQueueView';
import AnalyticsView from './components/AnalyticsView';
import FieldTeamsView from './components/FieldTeamsView';
import WhatsAppChannelsModal from './components/WhatsAppChannelsModal';
import { bccApi, getSavedUser } from './services/api';

const STAFF_ROLES = ['Administrator', 'Dispatcher', 'Communications'];

// Map the stored session user (if any) to the shape the TopBar expects
function sessionUser() {
  const u = getSavedUser();
  if (!u || !STAFF_ROLES.includes(u.role)) return null;
  return { name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email, role: u.role, email: u.email ?? '' };
}

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(sessionUser);
  // Bumped after sign-in so incidents are re-fetched with the new token
  const [sessionVersion, setSessionVersion] = useState(0);
  const [emergencyBanner, setEmergencyBanner] = useState(null);
  const [dataError, setDataError] = useState('');

  // 1. Initial Data Fetch & Real-time Live Sync (only when signed in as BCC staff)
  useEffect(() => {
    if (!currentUser) return undefined;
    let isMounted = true;

    async function loadData() {
      try {
        const [fetchedIncidents, fetchedTeams] = await Promise.all([
          bccApi.getIncidents(),
          bccApi.getFieldTeams(),
        ]);
        if (isMounted) {
          setDataError('');
          if (Array.isArray(fetchedIncidents)) {
            setIncidents(fetchedIncidents);
          }
          if (Array.isArray(fetchedTeams)) {
            setTeams(fetchedTeams);
          }
        }
      } catch (err) {
        if (isMounted) setDataError('Staff sign-in is required to load operational records. No metrics are available.');
        console.error('Failed to load operational records:', err);
      }
    }

    loadData();

    // Subscribe to live cloud changes
    const unsubscribe = bccApi.subscribeToChanges({
      onNewIncident: (newInc) => {
        setIncidents((prev) => [newInc, ...prev]);
        if (newInc.is_emergency) {
          setEmergencyBanner(newInc);
        }
      },
      onUpdateIncident: (updatedInc) => {
        setIncidents((prev) =>
          prev.map((item) => (item.id === updatedInc.id ? { ...item, ...updatedInc } : item))
        );
      },
      onNewBulletin: (newBulletin) => {
        console.log('New civic bulletin announced:', newBulletin.title);
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [sessionVersion, currentUser]);

  const handleLogout = () => {
    bccApi.logout();
    setIncidents([]);
    setTeams([]);
    setCurrentTab('dashboard');
    setSelectedIncident(null);
    setIsMapOpen(false);
    setIsBroadcastOpen(false);
    setIsWhatsAppOpen(false);
    setIsCreateStaffOpen(false);
    setCurrentUser(null);
  };

  // Gate the entire Staff Portal behind the Login page until authenticated as BCC staff
  if (!currentUser) {
    return (
      <LoginModal
        isOpen={true}
        fullScreen={true}
        onLogin={(userData) => {
          setCurrentUser(userData);
          setCurrentTab('dashboard');
          setSessionVersion((v) => v + 1);
        }}
      />
    );
  }

  const isAdmin = currentUser.role === 'Administrator';
  const canDispatch = isAdmin || currentUser.role === 'Dispatcher';
  const canComms = isAdmin || currentUser.role === 'Communications';
  const activeTab =
    (!canDispatch && (currentTab === 'incidents' || currentTab === 'teams'))
      ? 'dashboard'
      : currentTab;

  // 2. Incident Update Handler (Persisted to Cloud)
  const handleUpdateStatus = async (id, updates) => {
    const previous = incidents.find((item) => item.id === id);
    // Optimistic UI update
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    // Cloud persistence — roll back and tell the dispatcher if it fails
    try {
      const saved = await bccApi.updateIncident(id, updates);
      setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, ...saved } : item)));
    } catch (err) {
      if (previous) {
        setIncidents((prev) => prev.map((item) => (item.id === id ? previous : item)));
      }
      window.alert(`The update was not saved: ${err.message}. Please sign in as BCC staff and try again.`);
    }
  };

  // 3. Send Broadcast Handler (Persisted to Cloud)
  const handleSendBroadcast = async (alertData) => {
    await bccApi.createBulletin(alertData);
  };

  // 4. Filtered Incidents based on Search
  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.reference_number?.toLowerCase().includes(q) ||
      inc.description?.toLowerCase().includes(q) ||
      inc.address?.toLowerCase().includes(q) ||
      inc.incident_type?.toLowerCase().includes(q)
    );
  });

  const inProgressCount = incidents.filter((i) => i.status === 'InProgress').length;
  const pendingCount = incidents.filter((i) => i.status === 'New' || i.status === 'Assigned').length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;

  return (
    <div style={styles.layout}>
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={activeTab}
        userRole={currentUser.role}
        onSelectTab={(tab) => {
          if (tab === 'map' && canDispatch) setIsMapOpen(true);
          else setCurrentTab(tab);
        }}
        onOpenMap={() => canDispatch && setIsMapOpen(true)}
        onOpenBroadcast={() => canComms && setIsBroadcastOpen(true)}
        onOpenWhatsApp={() => canComms && setIsWhatsAppOpen(true)}
        onOpenCreateStaff={() => isAdmin && setIsCreateStaffOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <div style={styles.mainContent}>
        {/* Top Header Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenBroadcast={() => canComms && setIsBroadcastOpen(true)}
          onOpenMap={() => canDispatch && setIsMapOpen(true)}
          onOpenWhatsApp={() => canComms && setIsWhatsAppOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Emergency Alert Banner if triggered */}
        {emergencyBanner && (
          <div style={styles.emergencyBanner}>
            <div style={styles.emergencyBannerLeft}>
              <Siren size={20} color="#FFFFFF" className="pulse-icon" />
              <span>
                <strong>EMERGENCY REPORT SUBMITTED:</strong> {emergencyBanner.description} ({emergencyBanner.address})
              </span>
            </div>
            <div style={styles.emergencyBannerRight}>
              <button
                style={styles.emergencyActionBtn}
                onClick={() => {
                  setSelectedIncident(emergencyBanner);
                  setEmergencyBanner(null);
                }}
              >
                Review report
              </button>
              <button
                style={styles.bannerCloseBtn}
                onClick={() => setEmergencyBanner(null)}
              >
                <X size={16} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Views Canvas */}
        <main style={styles.canvas}>
          {dataError && (
            <div role="alert" style={styles.dataError}>
              {dataError}
            </div>
          )}
          {activeTab === 'dashboard' && (
            <>
              {/* Dashboard Title & Actions Header */}
              <div style={styles.canvasHeader}>
                <div>
                  <h1 style={styles.canvasTitle}>Dashboard</h1>
                  <p style={styles.canvasSubtitle}>
                    Signed in as <strong>{currentUser.role}</strong> — showing tools and views authorized for your role.
                  </p>
                </div>
                <div style={styles.headerActions}>
                  {isAdmin && (
                    <button style={styles.secondaryActionBtn} onClick={() => setIsCreateStaffOpen(true)}>
                      <UserPlus size={16} />
                      <span>Create Staff</span>
                    </button>
                  )}
                  {canComms && (
                    <button style={styles.primaryActionBtn} onClick={() => setIsBroadcastOpen(true)}>
                      <Plus size={16} />
                      <span>+ Notice Draft</span>
                    </button>
                  )}
                  {canDispatch && (
                    <button style={styles.secondaryActionBtn} onClick={() => setIsMapOpen(true)}>
                      <MapPin size={16} />
                      <span>Live Map View</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ROW 1: 4 KPI Cards */}
              <div style={styles.statGrid}>
                <StatCard
                  title="Loaded incidents"
                  value={dataError ? '—' : incidents.length}
                  subtitle="Current API response only"
                  isPrimary={true}
                  onClick={() => setCurrentTab('incidents')}
                />
                <StatCard
                  title="Incidents In Progress"
                  value={dataError ? '—' : inProgressCount}
                  subtitle="In loaded incident records"
                  onClick={() => setCurrentTab('incidents')}
                />
                <StatCard
                  title="Pending Triage / New"
                  value={dataError ? '—' : pendingCount}
                  subtitle="In loaded incident records"
                  onClick={() => setCurrentTab('incidents')}
                />
                <StatCard
                  title="Resolved in loaded records"
                  value={dataError ? '—' : resolvedCount}
                  subtitle="Not a daily aggregate"
                  onClick={() => setCurrentTab('incidents')}
                />
              </div>

              {/* ROW 2: Middle Section (3 Column Grid) */}
              <div style={styles.middleGrid}>
                <ActivityChartCard />
                <PriorityEmergencyCard
                  unavailable={Boolean(dataError)}
                  incident={dataError ? null : incidents.find((i) => i.is_emergency && !['Resolved', 'Closed'].includes(i.status))}
                  onSelectIncident={setSelectedIncident}
                />
                <RecentIncidentsCard
                  incidents={filteredIncidents}
                  onSelectIncident={setSelectedIncident}
                />
              </div>

              {/* ROW 3: Bottom Section (3 Column Grid) */}
              <div style={styles.bottomGrid}>
                {canDispatch && <FieldTeamsCard teams={teams} />}
                <ResolutionGaugeCard />
                <ResponseTimerCard />
              </div>
            </>
          )}

          {/* TAB 2: Dedicated Incident Queue View (Dispatcher & Administrator only) */}
          {activeTab === 'incidents' && canDispatch && (
            <IncidentQueueView
              incidents={filteredIncidents}
              onSelectIncident={setSelectedIncident}
            />
          )}

          {/* TAB 3: Dedicated Analytics & SLA View */}
          {activeTab === 'analytics' && (
            <AnalyticsView incidents={incidents} />
          )}

          {/* TAB 4: Dedicated Field Teams View (Dispatcher & Administrator only) */}
          {activeTab === 'teams' && canDispatch && (
            <FieldTeamsView
              teams={teams}
              incidents={incidents}
              onSelectIncident={setSelectedIncident}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {isMapOpen && (
        <LiveMapModal
          incidents={incidents}
          onClose={() => setIsMapOpen(false)}
          onSelectIncident={setSelectedIncident}
        />
      )}

      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isBroadcastOpen && (
        <BroadcastModal
          onClose={() => setIsBroadcastOpen(false)}
          onSendBroadcast={handleSendBroadcast}
        />
      )}

      <WhatsAppChannelsModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />

      <CreateStaffModal
        isOpen={isCreateStaffOpen}
        onClose={() => setIsCreateStaffOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={(userData) => {
          setCurrentUser(userData);
          setSessionVersion((v) => v + 1);
        }}
      />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F4F6F9',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  emergencyBanner: {
    backgroundColor: '#E53935',
    color: '#FFFFFF',
    padding: '12px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13.5px',
    boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)',
    animation: 'fadeIn 0.3s ease',
  },
  emergencyBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  emergencyBannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  emergencyActionBtn: {
    backgroundColor: '#FFFFFF',
    color: '#E53935',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  bannerCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  canvas: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '26px',
    maxWidth: '1440px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  dataError: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #FECACA',
    background: '#FEF2F2',
    color: '#991B1B',
    fontSize: '13px',
  },
  canvasHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  canvasTitle: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: '-0.5px',
  },
  canvasSubtitle: {
    fontSize: '13px',
    color: '#64748B',
    marginTop: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  primaryActionBtn: {
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    padding: '11px 20px',
    borderRadius: '14px',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(12, 56, 39, 0.2)',
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    padding: '11px 18px',
    borderRadius: '14px',
    fontSize: '13px',
    fontWeight: '700',
    border: '1px solid #CBD5E1',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: '20px',
  },
};
