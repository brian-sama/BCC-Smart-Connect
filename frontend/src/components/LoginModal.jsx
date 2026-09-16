import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';
import { bccApi } from '../services/api';

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await bccApi.login(email, password);
      onLogin({
        name: `${data.user.first_name} ${data.user.last_name}`,
        role: data.user.role,
        email: data.user.email,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await bccApi.register(firstName, lastName, email, password);
      onLogin({
        name: `${data.user.first_name} ${data.user.last_name}`,
        role: data.user.role,
        email: data.user.email,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
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
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}
            <div style={styles.field}>
              <label style={styles.label}>Official Staff Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} color="#94A3B8" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  placeholder="dispatcher@cityofbulawayo.co.zw"
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
                  required
                />
              </div>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              <span>{loading ? 'Authenticating...' : 'Authenticate & Access Console'}</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}
            <div style={{ ...styles.field, flexDirection: 'row', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>First Name</label>
                <div style={styles.inputWrapper}>
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
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Last Name</label>
                <div style={styles.inputWrapper}>
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
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} color="#94A3B8" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  placeholder="you@cityofbulawayo.co.zw"
                  required
                />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password (min 8 chars)</label>
              <div style={styles.inputWrapper}>
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
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              <span>{loading ? 'Creating Account...' : 'Create Staff Account'}</span>
            </button>
          </form>
        )}

        <p style={styles.noteText}>
          All portal access is restricted to authorised BCC staff only.
        </p>
      </div>
    </div>
  );
}

const styles = {
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
    maxWidth: '460px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBadge: {
    width: '42px', height: '42px',
    borderRadius: '12px',
    backgroundColor: '#0C3827',
    border: '1px solid #D4AF37',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 18px rgba(12, 56, 39, 0.18)',
  },
  title: { fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { fontSize: '11.5px', color: '#64748B', margin: '2px 0 0 0' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  tabs: { display: 'flex', borderBottom: '1px solid #F1F5F9' },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'none',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94A3B8',
    cursor: 'pointer',
  },
  tabActive: {
    color: '#0C3827',
    borderBottom: '2px solid #0C3827',
  },
  form: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '12.5px',
    fontWeight: '600',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#334155' },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: '12px',
    padding: '10px 14px',
  },
  input: {
    border: 'none', outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px', color: '#1E293B', width: '100%',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #0C3827 0%, #134E37 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '14px',
    padding: '13px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 6px 16px rgba(12, 56, 39, 0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  noteText: {
    fontSize: '11px',
    color: '#94A3B8',
    textAlign: 'center',
    padding: '12px 24px 20px',
    margin: 0,
  },
};
