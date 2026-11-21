import React from 'react';

export default function ResponseTimerCard() {
  return (
    <div style={styles.card}>
      <span style={styles.label}>Emergency response</span>
      <p style={styles.message}>
        No response timer is active. A submitted report is not evidence of dispatcher acknowledgement or unit dispatch.
      </p>
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#081C15', borderRadius: '22px', padding: '22px', color: '#FFFFFF', minHeight: '180px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#E2E8F0' },
  message: { color: '#CBD5E1', fontSize: '13px', lineHeight: 1.5, marginTop: '24px' },
};
