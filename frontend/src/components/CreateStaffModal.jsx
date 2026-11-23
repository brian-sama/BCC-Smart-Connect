import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, Shield, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { bccApi } from '../services/api';

export default function CreateStaffModal({ isOpen, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Dispatcher');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const data = await bccApi.createStaffAccount({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        role,
        password,
      });
      setSuccessMsg(`Created ${data.user.role} account for ${data.user.email}`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to create staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <div style={styles.badge}>
              <UserPlus size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={styles.title}>Create Staff Account</h3>
              <p style={styles.subtitle}>Superadmin Provisioning (BCC Authorized Personnel Only)</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} color="#64748B" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}
          {successMsg && (
            <div style={styles.successBox}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>First Name</label>
              <div style={styles.inputWrap}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={styles.input}
                  placeholder="Sipho"
                  required
                />
              </div>
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Last Name</label>
              <div style={styles.inputWrap}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={styles.input}
                  placeholder="Moyo"
                  required
                />
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Staff Email / Username</label>
            <div style={styles.inputWrap}>
              <Mail size={16} color="#94A3B8" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="staff@bcc.gov.zw"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Staff Role</label>
              <div style={styles.inputWrap}>
                <Shield size={16} color="#94A3B8" />
                <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.input}>
                  <option value="Dispatcher">Dispatcher</option>
                  <option value="Communications">Communications</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Phone (optional)</label>
              <div style={styles.inputWrap}>
                <Phone size={16} color="#94A3B8" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                  placeholder="0772..."
                />
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Initial Password (min 8 chars)</label>
            <div style={styles.inputWrap}>
              <Lock size={16} color="#94A3B8" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
            <span>{loading ? 'Creating Staff Account...' : 'Create Staff Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
  },
  modal: {
    backgroundColor: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  header: {
    padding: '22px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottom: '1px solid #F1F5F9',
  },
  headerRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  badge: {
    width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#1B5E20',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748B' },
  closeBtn: {
    background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  form: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#334155' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
    borderRadius: '12px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC',
  },
  input: {
    border: 'none', outline: 'none', background: 'transparent', width: '100%',
    fontSize: '14px', color: '#0F172A',
  },
  errorBox: {
    padding: '10px 12px', borderRadius: '10px', backgroundColor: '#FEF2F2',
    color: '#B91C1C', fontSize: '13px', border: '1px solid #FECACA',
  },
  successBox: {
    padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F0FDF4',
    color: '#166534', fontSize: '13px', border: '1px solid #BBF7D0',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  submitBtn: {
    marginTop: '4px', padding: '12px 16px', borderRadius: '12px', border: 'none',
    backgroundColor: '#1B5E20', color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
};
