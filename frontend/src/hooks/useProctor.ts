import { useRef, useCallback, useState } from 'react';
import { startProctoring, stopProctoring, getViolationLog, type ProctoringStatus, type ViolationEvent } from '../ml';
import api from '../utils/api';

interface UseProctoringConfig {
  attemptId: string;
  examId: string;
  maxViolations: number;
  onAutoSubmit: () => void;
}

export function useProctor(cfg: UseProctoringConfig) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ProctoringStatus | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [currentWarning, setCurrentWarning] = useState<ViolationEvent | null>(null);

  const handleViolation = useCallback(async (event: ViolationEvent, count: number, _max: number) => {
    setViolationCount(count);
    setCurrentWarning(event);

    // Clear warning after 4 seconds
    setTimeout(() => setCurrentWarning(null), 4000);

    // Report to backend
    try {
      await api.post(`/sessions/${cfg.attemptId}/violation`, {
        type: event.type,
        severity: event.severity,
        metadata: event.metadata,
      });
    } catch (err) {
      console.error('Failed to report violation:', err);
    }
  }, [cfg.attemptId]);

  const handleAutoSubmit = useCallback(async (violations: ViolationEvent[]) => {
    console.log('[PROCTOR] Auto-submitting due to', violations.length, 'violations');
    cfg.onAutoSubmit();
  }, [cfg]);

  const startProctorSession = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await startProctoring({
        maxViolations: cfg.maxViolations,
        videoElement: videoRef.current,
        onViolation: handleViolation,
        onAutoSubmit: handleAutoSubmit,
        onStatusUpdate: setStatus,
      });
    } catch (err) {
      console.error('Proctoring failed to start:', err);
    }
  }, [cfg.maxViolations, handleViolation, handleAutoSubmit]);

  const stopProctorSession = useCallback(() => {
    stopProctoring();
  }, []);

  return { videoRef, status, violationCount, currentWarning, startProctorSession, stopProctorSession, getViolationLog };
}
