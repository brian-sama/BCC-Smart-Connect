import React, { useState } from 'react';
import { X, ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { bccApi } from '../services/api';

const STAFF_ROLES = ['Administrator', 'Dispatcher', 'Communications'];

export default function LoginModal({ isOpen, onClose, onLogin, fullScreen = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await bccApi.login(email.trim(), password);
      if (!STAFF_ROLES.includes(data.user?.role)) {
        bccApi.logout();
        setError('Access denied. This portal is restricted to authorized BCC staff accounts.');
        return;
      }
      onLogin({
        name: `${data.user.first_name ?? ''} ${data.user.last_name ?? ''}`.trim() || data.user.email,
        role: data.user.role,
        email: data.user.email,
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={fullScreen ? styles.fullScreenWrap : styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerTitleRow}>
            <div style={styles.logoBadge}>
              <ShieldCheck size={22} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={styles.title}>BCC Staff Sign In</h3>
              <p style={styles.subtitle}>Bulawayo City Council Dispatch &amp; Emergency Portal</p>
            </div>
          </div>
          {!fullScreen && onClose && (
            <button style={styles.closeBtn} onClick={onClose} type="button">
              <X size={18} color="#64748B" />
            </button>
          )}
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}
          <div style={styles.field}>
            <label style={styles.label}>Staff Username or Email</label>
            <div style={styles.inputWrapper}>
              <User size={16} color="#94A3B8" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="admin or dispatcher@bcc.gov.zw"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="#94A3B8" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            <span>{loading ? 'Authenticating...' : 'Sign In to Staff Console'}</span>
          </button>
        </form>

        <p style={styles.noteText}>
          Staff accounts can only be created by the Superadmin. Contact BCC IT for access.
        </p>
      </div>
    </div>
  );
}

const styles = {
  fullScreenWrap: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #0D3B1E 0%, #1B5E20 55%, #0F172A 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 24px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #F1F5F9',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#1B5E20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0F172A',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#64748B',
  },
  closeBtn: {
    background: '#F1F5F9',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  form: {
    padding: '22px 24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  input: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    fontSize: '14px',
    color: '#0F172A',
  },
  errorBox: {
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    fontSize: '13px',
    border: '1px solid #FECACA',
  },
  submitBtn: {
    marginTop: '4px',
    padding: '13px 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1B5E20',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  noteText: {
    margin: 0,
    padding: '0 24px 22px',
    fontSize: '12px',
    color: '#64748B',
    textAlign: 'center',
  },
};
