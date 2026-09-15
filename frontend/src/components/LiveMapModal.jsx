import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { X, MapPin } from 'lucide-react';

// Custom colored leaflet markers
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const emergencyIcon = L.divIcon({
  className: 'pulsing-beacon',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function LiveMapModal({ incidents, onClose, onSelectIncident }) {
  const bulawayoCenter = [-20.1500, 28.5800];

  const getColor = (inc) => {
    if (inc.is_emergency) return '#E53935';
    switch (inc.incident_type) {
      case 'WaterLeak': return '#0288D1';
      case 'SewerBurst': return '#D32F2F';
      case 'RoadDamage': return '#3949AB';
      case 'StreetLight': return '#F57F17';
      default: return '#0C3827';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <MapPin size={22} color="#0C3827" />
            <div>
              <h3 style={styles.title}>Bulawayo Municipal GIS Live Map</h3>
              <p style={styles.subtitle}>Real-time spatial visualization of active faults and emergencies</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {/* Map Container */}
        <div style={styles.mapWrapper}>
          <MapContainer
            center={bulawayoCenter}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {incidents.map((inc) => (
              <Marker
                key={inc.id}
                position={[inc.lat, inc.lng]}
                icon={inc.is_emergency ? emergencyIcon : createCustomIcon(getColor(inc))}
              >
                <Popup>
                  <div style={styles.popupContent}>
                    <div style={styles.popupHeader}>
                      <span style={styles.popupRef}>{inc.reference_number}</span>
                      <span style={{
                        ...styles.popupStatus,
                        backgroundColor: inc.is_emergency ? '#FEE2E2' : '#E8F5E9',
                        color: inc.is_emergency ? '#E53935' : '#16A34A',
                      }}>
                        {inc.status}
                      </span>
                    </div>
                    <strong style={styles.popupTitle}>{inc.description}</strong>
                    <p style={styles.popupAddress}>{inc.address}</p>
                    <button
                      style={styles.popupBtn}
                      onClick={() => {
                        onClose();
                        onSelectIncident(inc);
                      }}
                    >
                      Open Ticket
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
    padding: '30px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '1100px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
  },
  header: {
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #EBF0F5',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0C3827',
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748B',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  popupContent: {
    padding: '4px',
    minWidth: '180px',
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  popupRef: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#0C3827',
  },
  popupStatus: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  popupTitle: {
    fontSize: '13px',
    color: '#1E293B',
    display: 'block',
    marginBottom: '4px',
  },
  popupAddress: {
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '8px',
  },
  popupBtn: {
    backgroundColor: '#0C3827',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '700',
    width: '100%',
    cursor: 'pointer',
  },
};
