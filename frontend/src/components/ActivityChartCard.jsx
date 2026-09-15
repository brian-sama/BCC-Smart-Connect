import React from 'react';

export default function ActivityChartCard() {
  const days = [
    { day: 'M', value: 45, full: 80 },
    { day: 'T', value: 65, full: 90 },
    { day: 'W', value: 75, full: 95 },
    { day: 'T', value: 85, full: 100 },
    { day: 'F', value: 55, full: 70 },
    { day: 'S', value: 60, full: 85 },
    { day: 'S', value: 50, full: 75 },
  ];

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h4 style={styles.title}>Weekly Fault Volume</h4>
        <span style={styles.badge}>Last 7 Days</span>
      </div>

      <div style={styles.chartContainer}>
        {days.map((item, idx) => {
          const isHighest = item.value === 85;
          return (
            <div key={idx} style={styles.barColumn}>
              {/* Outer pill track */}
              <div style={styles.pillTrack}>
                {/* Inner progress fill */}
                <div
                  style={{
                    ...styles.pillFill,
                    height: `${item.value}%`,
                    backgroundColor: isHighest ? '#0C3827' : '#2D6A4F',
                  }}
                >
                  <div style={styles.pillDot} />
                </div>
              </div>
              <span style={styles.dayLabel}>{item.day}</span>
            </div>
          );
        })}
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
    minHeight: '230px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    padding: '3px 8px',
    borderRadius: '8px',
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '140px',
    padding: '0 4px',
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    height: '100%',
    justifyContent: 'flex-end',
  },
  pillTrack: {
    width: '32px',
    height: '110px',
    backgroundColor: '#F1F5F9',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  pillFill: {
    width: '100%',
    borderRadius: '20px',
    transition: 'height 0.4s ease',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '6px',
    boxSizing: 'border-box',
  },
  pillDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
  },
  dayLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748B',
  },
};
