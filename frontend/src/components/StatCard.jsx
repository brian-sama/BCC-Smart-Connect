import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

export default function StatCard({ title, value, subtitle, isPrimary, onClick }) {
  if (isPrimary) {
    return (
      <div style={styles.primaryCard} onClick={onClick}>
        <div style={styles.headerRow}>
          <span style={styles.primaryTitle}>{title}</span>
          <div style={styles.primaryArrowBtn}>
            <ArrowUpRight size={16} color="#0C3827" />
          </div>
        </div>
        <div style={styles.valueRow}>
          <span style={styles.primaryValue}>{value}</span>
        </div>
        <div style={styles.primaryPill}>
          <TrendingUp size={13} color="#0C3827" />
          <span>{subtitle}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.whiteCard} onClick={onClick}>
      <div style={styles.headerRow}>
        <span style={styles.whiteTitle}>{title}</span>
        <div style={styles.whiteArrowBtn}>
          <ArrowUpRight size={16} color="#64748B" />
        </div>
      </div>
      <div style={styles.valueRow}>
        <span style={styles.whiteValue}>{value}</span>
      </div>
      <div style={styles.whitePill}>
        <TrendingUp size={13} color="#16A34A" />
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

const styles = {
  primaryCard: {
    backgroundColor: '#0C3827',
    borderRadius: '22px',
    padding: '24px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '160px',
    boxShadow: '0 8px 24px rgba(12, 56, 39, 0.18)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  primaryTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#D7EDB0',
  },
  primaryArrowBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#CDE77F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryValue: {
    fontSize: '38px',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: '-1px',
    margin: '12px 0',
  },
  primaryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#CDE77F',
    color: '#0C3827',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    alignSelf: 'flex-start',
  },

  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '22px',
    padding: '24px',
    border: '1px solid #EBF0F5',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '160px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  whiteTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748B',
  },
  whiteArrowBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteValue: {
    fontSize: '38px',
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: '-1px',
    margin: '12px 0',
  },
  whitePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
  },
};
