import React from 'react';

export default function ResolutionGaugeCard() {
  return (
    <div style={styles.card}>
      <h4 style={styles.title}>Resolution and SLA performance</h4>
      <p style={styles.message}>
        SLA targets and verified resolution metrics have not been configured. No performance percentage is available.
      </p>
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#FFFFFF', borderRadius: '22px', padding: '22px', border: '1px solid #EBF0F5', minHeight: '180px' },
  title: { fontSize: '14px', fontWeight: '700', color: '#1E293B' },
  message: { color: '#64748B', fontSize: '13px', lineHeight: 1.5, marginTop: '24px' },
};
