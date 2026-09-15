import React, { useState, useEffect } from 'react';
import { Pause, Play, AlertCircle } from 'lucide-react';

export default function ResponseTimerCard() {
  const [seconds, setSeconds] = useState(2294); // 00:38:14
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSec) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <span style={styles.headerLabel}>Emergency Response SLA</span>
        <span style={styles.statusBadge}>ACTIVE</span>
      </div>

      <div style={styles.timeDisplay}>
        <span style={styles.timerDigits}>{formatTime(seconds)}</span>
        <span style={styles.timerSubtitle}>Current Triage Cycle Time</span>
      </div>

      <div style={styles.controlsRow}>
        <button
          style={styles.pauseBtn}
          onClick={() => setIsRunning(!isRunning)}
          title={isRunning ? 'Pause Timer' : 'Resume Timer'}
        >
          {isRunning ? <Pause size={18} color="#081C15" /> : <Play size={18} color="#081C15" />}
        </button>

        <button
          style={styles.alertBtn}
          onClick={() => alert('SLA Timer logged. Emergency teams notified.')}
          title="Log SLA Milestone"
        >
          <AlertCircle size={18} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#081C15',
    borderRadius: '22px',
    padding: '22px',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '220px',
    boxShadow: '0 8px 24px rgba(8, 28, 21, 0.3)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#E2E8F0',
  },
  statusBadge: {
    fontSize: '9.5px',
    fontWeight: '800',
    backgroundColor: '#E53935',
    color: '#FFFFFF',
    padding: '2px 8px',
    borderRadius: '10px',
    letterSpacing: '0.6px',
  },
  timeDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '10px 0',
  },
  timerDigits: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#A8D06B',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '1px',
  },
  timerSubtitle: {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '4px',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
  },
  pauseBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#A8D06B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(168, 208, 107, 0.3)',
  },
  alertBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#E53935',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(229, 57, 53, 0.4)',
  },
};
