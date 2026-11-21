import React, { useState } from 'react';
import { X, Send, Radio, CheckCircle2, MessageCircle, Copy } from 'lucide-react';

export default function BroadcastModal({ onClose, onSendBroadcast }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Water Cut');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const formatMessageForWhatsApp = () => [
    'DRAFT NOTICE - NOT APPROVED OR DISTRIBUTED',
    title || 'Notice title',
    `Category: ${category}`,
    'Audience: All wards (draft only)',
    body || 'Notice details',
  ].join(String.fromCharCode(10));

  const handleCopyWhatsApp = async () => {
    const text = formatMessageForWhatsApp();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    
    try {
      await onSendBroadcast({
        title,
        body,
        category,
        is_urgent: isUrgent,
        target_type: 'All',
        target_ward: 'All Bulawayo Wards',
      });
    } catch (err) {
      window.alert(`The notice draft was not saved: ${err.message}. Sign in as BCC staff and try again.`);
      return;
    }

    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div style={styles.iconCircle}>
              <Radio size={18} color="#0C3827" />
            </div>
            <div>
              <h3 style={styles.title}>Create notice draft</h3>
              <p style={styles.subtitle}>Saving a draft does not publish or distribute it</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} color="#64748B" />
          </button>
        </div>

        {isSent ? (
          <div style={styles.successBox}>
            <CheckCircle2 size={54} color="#16A34A" />
            <h4 style={styles.successTitle}>Draft saved</h4>
            <p style={styles.successDesc}>
              The notice is saved for review. No residents were notified and no external channel was contacted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} style={styles.form}>
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>Notice title</label>
                <input
                  type="text"
                  placeholder="e.g. Criterion Water Works Emergency Maintenance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={styles.select}
                >
                  <option value="Water Cut">Water Cut / Supply</option>
                  <option value="Roads">Roads & Drainage</option>
                  <option value="Sewer Burst">Sewer Works</option>
                  <option value="Health">Health & Sanitation</option>
                  <option value="Notice">General Notice</option>
                </select>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Audience Scope</label>
              <div style={styles.scopeRow}>
                <span style={styles.radioLabel}>All wards (draft only)</span>
                <label style={{ ...styles.radioLabel, marginLeft: 'auto' }}>
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                  />
                  <span style={{ color: isUrgent ? '#DC2626' : '#64748B', fontWeight: isUrgent ? '700' : '500' }}>
                    🚨 Flag as Urgent
                  </span>
                </label>
              </div>
            </div>

            <div style={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Draft notice body</label>
                <button
                  type="button"
                  style={styles.togglePreviewBtn}
                  onClick={() => setPreviewOpen(!previewOpen)}
                >
                  <MessageCircle size={14} color="#25D366" />
                  <span>{previewOpen ? 'Hide Draft Preview' : 'Draft Preview'}</span>
                </button>
              </div>
              <textarea
                placeholder="Write a notice draft for staff review..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={3}
                style={styles.textarea}
              />
            </div>

            {previewOpen && (
              <div style={styles.whatsappCard}>
                <div style={styles.whatsappHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={16} color="#25D366" />
                    <span style={styles.whatsappCardTitle}>Draft text preview</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={styles.copyBtn}
                      onClick={handleCopyWhatsApp}
                    >
                      <Copy size={13} />
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                </div>
                <pre style={styles.whatsappPreviewText}>{formatMessageForWhatsApp()}</pre>
              </div>
            )}

            <div style={styles.footer}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" style={styles.cancelBtn} onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" style={styles.sendBtn}>
                  <Send size={15} />
                  <span>Save Draft</span>
                </button>
              </div>
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
    padding: '20px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '620px',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
    animation: 'fadeIn 0.2s ease',
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
  iconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#E8F5E9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '16px',
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
  form: {
    padding: '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'flex',
    gap: '12px',
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
    alignItems: 'center',
    gap: '18px',
    padding: '4px 0',
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
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  togglePreviewBtn: {
    background: 'none',
    border: 'none',
    color: '#0C3827',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    padding: 0,
  },
  whatsappCard: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  whatsappHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whatsappCardTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#166534',
  },
  copyBtn: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #86EFAC',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  whatsappPreviewText: {
    fontSize: '11.5px',
    color: '#14532D',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    fontFamily: 'monospace',
    maxHeight: '120px',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #DCFCE7',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    border: 'none',
    cursor: 'pointer',
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
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(12, 56, 39, 0.25)',
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
    margin: 0,
  },
  successDesc: {
    fontSize: '13px',
    color: '#64748B',
    maxWidth: '400px',
    margin: 0,
    lineHeight: 1.5,
  },
};
