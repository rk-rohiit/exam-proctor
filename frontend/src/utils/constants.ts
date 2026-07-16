export const VIOLATION_LABELS: Record<string, string> = {
  NO_FACE: 'No Face Detected',
  MULTIPLE_FACES: 'Multiple Faces',
  NOISE_DETECTED: 'Noise Detected',
  GAZE_AWAY: 'Looking Away',
  TAB_SWITCH: 'Tab Switched',
  FULLSCREEN_EXIT: 'Fullscreen Exited',
  COPY_PASTE: 'Copy/Paste',
  RIGHT_CLICK: 'Right Click',
};

export const VIOLATION_SEVERITY_COLORS: Record<string, string> = {
  LOW: '#f59e0b',
  MEDIUM: '#f97316',
  HIGH: '#ef4444',
};

export const VIOLATION_ICONS: Record<string, string> = {
  NO_FACE: '👤',
  MULTIPLE_FACES: '👥',
  NOISE_DETECTED: '🔊',
  GAZE_AWAY: '👁️',
  TAB_SWITCH: '🔄',
  FULLSCREEN_EXIT: '🖥️',
  COPY_PASTE: '📋',
  RIGHT_CLICK: '🖱️',
};
