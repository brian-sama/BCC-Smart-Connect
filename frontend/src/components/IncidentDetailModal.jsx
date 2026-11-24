import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Clock, MapPin, Phone, Compass, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { bccApi } from '../services/api';

export default function IncidentDetailModal({ incident, onClose, onUpdateStatus }) {
  const [status, setStatus] = useState(incident.status);
  const [department, setDepartment] = useState(incident.department || 'Engineering Services');
  const [assignedTo, setAssignedTo] = useState(incident.assigned_to_name || '');
  const [notes, setNotes] = useState(incident.resolution_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    if (incident.photo_url) {
      setPhotoLoading(true);
      bccApi
        .getIncidentPhotoBlobUrl(incident.id)
        .then((url) => {
          objectUrl = url;
          if (active) setPhotoSrc(url);
        })
        .catch(() => {
          if (active) setPhotoSrc(null);
        })
        .finally(() => {
          if (active) setPhotoLoading(false);
        });
    } else {
      setPhotoSrc(null);
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [incident.id, incident.photo_url]);

  const hasCoords = incident.lat != null && incident.lng != null && !Number.isNaN(Number(incident.lat)) && !Number.isNaN(Number(incident.lng));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateStatus(incident.id, {
        status,
        department,
        assigned_to_name: assignedTo,
        resolution_notes: status === 'Resolved' ? (notes || 'Completed and verified by BCC crew.') : null,
      });
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.refCode}>{incident.reference_number}</span>
            <h3 style={styles.title}>{incident.description}</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {/* Content */}
        <div style={styles.body}>
          {/* Metadata Grid */}
          <div style={styles.metaGrid}>
            <div style={styles.metaItem}>
              <MapPin size={16} color="#0C3827" />
              <div>
                <span style={styles.metaLabel}>Location / Suburb</span>
                <p style={styles.metaValue}>{incident.address}</p>
              </div>
            </div>

            <div style={styles.metaItem}>
              <Phone size={16} color="#0C3827" />
              <div>
                <span style={styles.metaLabel}>Reporter Contact</span>
                <p style={styles.metaValue}>
                  {incident.reporter_name || 'Anonymous'} ({incident.reporter_phone || 'No phone provided'})
                </p>
              </div>
            </div>

            <div style={styles.metaItem}>
              <Clock size={16} color="#0C3827" />
              <div>
                <span style={styles.metaLabel}>Reported Time</span>
                <p style={styles.metaValue}>{new Date(incident.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div style={styles.metaItem}>
              <AlertTriangle size={16} color={incident.is_emergency ? '#E53935' : '#0C3827'} />
              <div>
                <span style={styles.metaLabel}>Priority Level</span>
                <p style={styles.metaValue}>
                  {incident.is_emergency ? 'CRITICAL EMERGENCY' : 'Standard Civic Fault'}
                </p>
              </div>
            </div>

            <div style={{ ...styles.metaItem, gridColumn: '1 / -1' }}>
              <Compass size={16} color="#0C3827" />
              <div style={{ flex: 1 }}>
                <span style={styles.metaLabel}>GIS Coordinates (WGS84 / PostGIS)</span>
                {hasCoords ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span style={{ ...styles.metaValue, fontFamily: 'monospace' }}>
                      Lat: {Number(incident.lat).toFixed(6)}, Lng: {Number(incident.lng).toFixed(6)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${Number(incident.lat)},${Number(incident.lng)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', fontWeight: 700, color: '#1B5E20', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <p style={styles.metaValue}>No GIS coordinates recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Attached Photo Evidence */}
          <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ImageIcon size={16} color="#0C3827" />
              <span style={styles.metaLabel}>Attached Photo Evidence</span>
            </div>
            {photoLoading ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Loading photo evidence...</p>
            ) : photoSrc ? (
              <a href={photoSrc} target="_blank" rel="noreferrer" title="Open full image">
                <img
                  src={photoSrc}
                  alt="Incident evidence"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #CBD5E1', display: 'block' }}
                />
              </a>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                {incident.photo_url ? 'Photo attached, but file is no longer available on ephemeral storage.' : 'No photo was attached to this report.'}
              </p>
            )}
          </div>

          <hr style={styles.divider} />

          {/* Action Form */}
          <h4 style={styles.formTitle}>Dispatcher Action & Assignment</h4>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Incident Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={styles.select}
              >
                <option value="New">New (Logged)</option>
                <option value="Assigned">Assigned</option>
                <option value="InProgress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Responsible Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={styles.select}
              >
                <option value="Engineering Services">Engineering Services (Water & Roads)</option>
                <option value="Health Services">Health Services (Sewer & Refuse)</option>
                <option value="Emergency & Fire Services">Emergency & Fire Services</option>
                <option value="Electrical Services">Electrical Services (Streetlights)</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Assign Crew / Technician</label>
            <input
              type="text"
              placeholder="e.g. Eng. N. Dube (Water Team Alpha)"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={styles.input}
            />
          </div>

          {status === 'Resolved' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Resolution Notes & Proof of Repair</label>
              <textarea
                placeholder="Enter details of repair work done, parts replaced, and verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={styles.textarea}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            <CheckCircle size={16} />
            <span>{isSaving ? 'Updating...' : 'Save & Update Dispatch'}</span>
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
    padding: '24px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid #EBF0F5',
  },
  refCode: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#0C3827',
    backgroundColor: '#E8F5E9',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  title: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#1E293B',
    marginTop: '6px',
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
  body: {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  metaItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: '11px',
    color: '#64748B',
    fontWeight: '600',
    display: 'block',
  },
  metaValue: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1E293B',
    marginTop: '2px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #EBF0F5',
    margin: '4px 0',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0C3827',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    color: '#1E293B',
    outline: 'none',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    color: '#1E293B',
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    color: '#1E293B',
    outline: 'none',
    fontFamily: 'inherit',
  },
  footer: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid #EBF0F5',
    backgroundColor: '#FAFAFA',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#0C3827',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
