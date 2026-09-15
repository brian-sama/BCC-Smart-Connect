import React, { useState } from 'react';
import { X, Send, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BroadcastModal({ onClose, onSendBroadcast }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('All');
  const [targetWard, setTargetWard] = useState('Cowdray Park (Ward 28)');
  const [isSent, setIsSent] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!title || !body) return;
    onSendBroadcast({
      title,
      body,
      target_type: targetType,
      target_ward: targetType === 'Zone' ? targetWard : 'All Bulawayo Wards',
    });
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <Radio size={20} color="#0C3827" />
            <h3 style={styles.title}>Send Public Municipal Alert</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {isSent ? (
          <div style={styles.successBox}>
            <CheckCircle2 size={48} color="#16A34A" />
            <h4 style={styles.successTitle}>Broadcast Transmitted!</h4>
            <p style={styles.successDesc}>
              Emergency bulletin queued and broadcasted to citizen devices via Push & SMS gateway.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Broadcast Title</label>
              <input
                type="text"
                placeholder="e.g. Criterion Water Works Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Audience Scope</label>
              <div style={styles.scopeRow}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="scope"
                    checked={targetType === 'All'}
                    onChange={() => setTargetType('All')}
                  />
                  <span>All Bulawayo Residents</span>
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="scope"
                    checked={targetType === 'Zone'}
                    onChange={() => setTargetType('Zone')}
                  />
                  <span>Specific Suburb / Ward</span>
                </label>
              </div>
            </div>

            {targetType === 'Zone' && (
              <div style={styles.field}>
                <label style={styles.label}>Target Suburb / Ward</label>
                <select
                  value={targetWard}
                  onChange={(e) => setTargetWard(e.target.value)}
                  style={styles.select}
                >
                  <option value="Cowdray Park (Ward 28)">Cowdray Park (Ward 28)</option>
                  <option value="Nkulumane (Wards 20-23)">Nkulumane (Wards 20-23)</option>
                  <option value="Bradfield & Hillside (Ward 4)">Bradfield & Hillside (Ward 4)</option>
                  <option value="Luveve & Magwegwe (Wards 14-16)">Luveve & Magwegwe (Wards 14-16)</option>
                  <option value="Pumula North & South (Wards 17, 19)">Pumula North & South (Wards 17, 19)</option>
                  <option value="City Centre & Suburbs (Ward 1)">City Centre & Suburbs (Ward 1)</option>
                </select>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Broadcast Message Body</label>
              <textarea
                placeholder="Type the full advisory message to be pushed to citizens..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                style={styles.textarea}
              />
            </div>

            <div style={styles.footer}>
              <button type="button" style={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" style={styles.sendBtn}>
                <Send size={16} />
                <span>Transmit Broadcast</span>
              </button>
            </div>
          </form>
        )}
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
    maxWidth: '560px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #EBF0F5',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0C3827',
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
  form: {
    padding: '24px',
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
    fontWeight: '700',
    color: '#334155',
  },
  scopeRow: {
    display: 'flex',
    gap: '18px',
    padding: '6px 0',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none',
  },
  textarea: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748B',
  },
  sendBtn: {
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
  successBox: {
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '12px',
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0C3827',
  },
  successDesc: {
    fontSize: '13px',
    color: '#64748B',
    maxWidth: '380px',
  },
};
