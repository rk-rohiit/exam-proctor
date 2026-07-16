// violationManager.ts — Central violation counter & auto-submit controller

export type ViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'NOISE_DETECTED'
  | 'GAZE_AWAY'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'COPY_PASTE'
  | 'RIGHT_CLICK';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ViolationEvent {
  type: ViolationType;
  severity: ViolationSeverity;
  timestamp: Date;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ViolationManagerConfig {
  maxViolations: number;
  onViolation: (event: ViolationEvent, count: number, max: number) => void;
  onAutoSubmit: (violations: ViolationEvent[]) => void;
}

const VIOLATION_MESSAGES: Record<ViolationType, string> = {
  NO_FACE: 'No face detected in camera',
  MULTIPLE_FACES: 'Multiple faces detected',
  NOISE_DETECTED: 'Suspicious noise or voice detected',
  GAZE_AWAY: 'Looking away from screen',
  TAB_SWITCH: 'Tab or window switched',
  FULLSCREEN_EXIT: 'Exited fullscreen mode',
  COPY_PASTE: 'Copy or paste action detected',
  RIGHT_CLICK: 'Right-click action detected',
};

// Cooldown per type to prevent duplicate rapid firing (ms)
const VIOLATION_COOLDOWN: Partial<Record<ViolationType, number>> = {
  NO_FACE: 4000,
  GAZE_AWAY: 3000,
  NOISE_DETECTED: 4000,
  MULTIPLE_FACES: 3000,
};

class ViolationManager {
  private violations: ViolationEvent[] = [];
  private lastViolationTime: Partial<Record<ViolationType, number>> = {};
  private config: ViolationManagerConfig | null = null;
  private terminated = false;

  configure(config: ViolationManagerConfig) {
    this.config = config;
    this.violations = [];
    this.lastViolationTime = {};
    this.terminated = false;
  }

  reportViolation(
    type: ViolationType,
    severity: ViolationSeverity = 'MEDIUM',
    metadata?: Record<string, unknown>
  ): boolean {
    if (this.terminated || !this.config) return false;

    // Cooldown check
    const now = Date.now();
    const cooldown = VIOLATION_COOLDOWN[type];
    if (cooldown && this.lastViolationTime[type]) {
      if (now - (this.lastViolationTime[type] as number) < cooldown) {
        return false; // Skip — in cooldown
      }
    }
    this.lastViolationTime[type] = now;

    const event: ViolationEvent = {
      type,
      severity,
      timestamp: new Date(),
      message: VIOLATION_MESSAGES[type],
      metadata,
    };

    this.violations.push(event);
    const count = this.violations.length;
    const max = this.config.maxViolations;

    // Notify parent
    this.config.onViolation(event, count, max);

    // Auto-submit if threshold reached
    if (count >= max) {
      this.terminated = true;
      this.config.onAutoSubmit([...this.violations]);
    }

    return true;
  }

  getViolations(): ViolationEvent[] {
    return [...this.violations];
  }

  getCount(): number {
    return this.violations.length;
  }

  reset() {
    this.violations = [];
    this.lastViolationTime = {};
    this.terminated = false;
  }

  isTerminated(): boolean {
    return this.terminated;
  }
}

export const violationManager = new ViolationManager();
