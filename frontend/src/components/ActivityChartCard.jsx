import React from 'react';

export default function ActivityChartCard() {
  return (
    <div style={styles.card}>
      <h4 style={styles.title}>Weekly report volume</h4>
      <p style={styles.message}>
        Historical totals are unavailable. This view will be populated when the reporting service is configured.
      </p>
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#FFFFFF', borderRadius: '22px', padding: '22px', border: '1px solid #EBF0F5', minHeight: '180px' },
  title: { fontSize: '14px', fontWeight: '700', color: '#1E293B' },
  message: { color: '#64748B', fontSize: '13px', lineHeight: 1.5, marginTop: '24px' },
};
