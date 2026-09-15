import React from 'react';

export default function ResolutionGaugeCard() {
  return (
    <div style={styles.card}>
      <h4 style={styles.title}>Resolution Performance</h4>

      {/* SVG Semi-Circle Gauge */}
      <div style={styles.gaugeWrapper}>
        <svg viewBox="0 0 200 110" style={styles.svgGauge}>
          {/* Background Track Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#EBF0F5"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* In Progress Segment */}
          <path
            d="M 20 100 A 80 80 0 0 1 155 45"
            fill="none"
            stroke="#A8D06B"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Resolved Segment */}
          <path
            d="M 20 100 A 80 80 0 0 1 115 22"
            fill="none"
            stroke="#0C3827"
            strokeWidth="20"
            strokeLinecap="round"
          />
        </svg>

        <div style={styles.centerMetric}>
          <span style={styles.bigPercent}>78%</span>
          <span style={styles.metricSub}>SLA Met</span>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legendRow}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#0C3827' }} />
          <span>Resolved</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#A8D06B' }} />
          <span>In Progress</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.dot, backgroundColor: '#EBF0F5' }} />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '22px',
    padding: '22px',
    border: '1px solid #EBF0F5',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '220px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1E293B',
    alignSelf: 'flex-start',
  },
  gaugeWrapper: {
    position: 'relative',
    width: '180px',
    height: '100px',
    display: 'flex',
    justifyContent: 'center',
  },
  svgGauge: {
    width: '100%',
    height: '100%',
  },
  centerMetric: {
    position: 'absolute',
    bottom: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  bigPercent: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: '1',
  },
  metricSub: {
    fontSize: '11px',
    color: '#64748B',
    fontWeight: '600',
    marginTop: '2px',
  },
  legendRow: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#64748B',
    fontWeight: '600',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};
