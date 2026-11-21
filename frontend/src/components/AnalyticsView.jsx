import React from 'react';

export default function AnalyticsView({ incidents = [] }) {
  return (
    <section style={styles.container}>
      <h2 style={styles.title}>Operational analytics</h2>
      <p style={styles.description}>
        The API currently returns a paginated incident list, not reporting aggregates. These records cannot be treated as city-wide totals or used to calculate SLA performance.
      </p>
      <div style={styles.card}>
        <strong>{incidents.length}</strong>
        <span>Incidents in the currently loaded view</span>
        <small>Not a total for a selected reporting period. Verified aggregate metrics are unavailable.</small>
      </div>
    </section>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { fontSize: 24, fontWeight: 800, color: '#1E293B', margin: 0 },
  description: { color: '#64748B', fontSize: 13, lineHeight: 1.6, margin: 0 },
  card: { background: '#FFFFFF', border: '1px solid #EBF0F5', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 8, color: '#334155' },
};
