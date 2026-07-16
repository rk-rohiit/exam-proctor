import React, { useEffect, useState } from 'react';
import { VIOLATION_LABELS, VIOLATION_ICONS } from '../../utils/constants';

interface Props {
  type: string;
  message: string;
  count: number;
  max: number;
  onClose: () => void;
}

export default function ViolationWarning({ type, message, count, max, onClose }: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const duration = 4000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) { clearInterval(timer); onClose(); }
    }, 50);
    return () => clearInterval(timer);
  }, [onClose]);

  const isLast = count >= max;

  return (
    <div className={`violation-warning ${isLast ? 'violation-critical' : ''}`}>
      <div className="violation-warning-header">
        <span className="violation-icon">{VIOLATION_ICONS[type] || '⚠️'}</span>
        <div>
          <div className="violation-title">
            {isLast ? '🚨 EXAM TERMINATED' : `⚠️ Violation ${count}/${max}`}
          </div>
          <div className="violation-label">{VIOLATION_LABELS[type] || type}</div>
        </div>
        <button className="violation-close" onClick={onClose}>✕</button>
      </div>
      <p className="violation-message">{message}</p>
      {isLast && (
        <p className="violation-final-msg">Your exam has been automatically submitted due to repeated violations.</p>
      )}
      <div className="violation-progress">
        <div className="violation-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
