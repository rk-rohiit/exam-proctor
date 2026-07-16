// ml/index.ts — Central ML Orchestrator
// Initializes all detection modules and runs the detection loop

import * as faceapi from 'face-api.js';
import { loadFaceModels, detectFaces } from './faceDetection';
import { initNoiseDetection, detectNoise, stopNoiseDetection } from './noiseDetection';
import { estimateHeadPose, checkGazeSustained } from './headMovement';
import { initTabSwitchDetection, stopTabSwitchDetection } from './tabSwitch';
import { initScreenChangeDetection, stopScreenChangeDetection, requestFullscreen } from './screenChange';
import { violationManager, type ViolationEvent } from './violationManager';

export type { ViolationEvent, ViolationType, ViolationSeverity } from './violationManager';

export interface ProctoringConfig {
  maxViolations: number;
  videoElement: HTMLVideoElement;
  onViolation: (event: ViolationEvent, count: number, max: number) => void;
  onAutoSubmit: (violations: ViolationEvent[]) => void;
  onStatusUpdate?: (status: ProctoringStatus) => void;
}

export interface ProctoringStatus {
  modelsLoaded: boolean;
  cameraActive: boolean;
  micActive: boolean;
  facesDetected: number;
  noiseLevel: number;
  gazeDirection: string;
  violationCount: number;
}

let detectionInterval: ReturnType<typeof setInterval> | null = null;
let config: ProctoringConfig | null = null;
let status: ProctoringStatus = {
  modelsLoaded: false,
  cameraActive: false,
  micActive: false,
  facesDetected: 0,
  noiseLevel: 0,
  gazeDirection: 'center',
  violationCount: 0,
};

export async function startProctoring(cfg: ProctoringConfig): Promise<void> {
  config = cfg;
  status.modelsLoaded = false;

  // Configure violation manager
  violationManager.configure({
    maxViolations: cfg.maxViolations,
    onViolation: (event, count, max) => {
      status.violationCount = count;
      cfg.onViolation(event, count, max);
    },
    onAutoSubmit: cfg.onAutoSubmit,
  });

  try {
    // 1. Load face-api.js models
    await loadFaceModels();
    status.modelsLoaded = true;

    // 2. Init microphone
    const micOk = await initNoiseDetection();
    status.micActive = micOk;

    // 3. Init tab switch detection
    initTabSwitchDetection(() => {
      violationManager.reportViolation('TAB_SWITCH', 'HIGH', { timestamp: Date.now() });
    });

    // 4. Init screen change detection
    initScreenChangeDetection((type) => {
      const severityMap = {
        FULLSCREEN_EXIT: 'HIGH' as const,
        COPY_PASTE: 'MEDIUM' as const,
        RIGHT_CLICK: 'LOW' as const,
      };
      violationManager.reportViolation(type, severityMap[type]);
    });

    // 5. Request fullscreen
    try {
      await requestFullscreen();
    } catch {
      console.warn('[ML] Could not enter fullscreen automatically');
    }

    status.cameraActive = true;

    // 6. Start detection loop (every 200ms)
    detectionInterval = setInterval(runDetectionLoop, 200);

    console.log('[ML] Proctoring started ✅');
  } catch (err) {
    console.error('[ML] Failed to start proctoring:', err);
    throw err;
  }
}

async function runDetectionLoop() {
  if (!config || violationManager.isTerminated()) {
    stopProctoring();
    return;
  }

  const video = config.videoElement;
  if (!video || video.readyState < 2) return;

  try {
    // --- Face Detection ---
    const { result: faceResult, noFaceTooLong } = await detectFaces(video);
    status.facesDetected = faceResult.facesCount;

    if (noFaceTooLong) {
      violationManager.reportViolation('NO_FACE', 'HIGH', { duration: '3s' });
    }

    if (faceResult.multipleFaces) {
      violationManager.reportViolation('MULTIPLE_FACES', 'HIGH', {
        count: faceResult.facesCount,
      });
    }

    // --- Head Movement / Gaze Detection (only if face detected) ---
    if (faceResult.facesCount === 1) {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks();

      if (detections) {
        const pose = estimateHeadPose(detections.landmarks);
        status.gazeDirection = pose.gazeDirection;

        const gazeSustained = checkGazeSustained(pose.lookingAway);
        if (gazeSustained) {
          violationManager.reportViolation('GAZE_AWAY', 'MEDIUM', {
            direction: pose.gazeDirection,
            yaw: Math.round(pose.yaw),
            pitch: Math.round(pose.pitch),
          });
        }
      }
    }

    // --- Noise Detection ---
    const noiseResult = detectNoise();
    status.noiseLevel = noiseResult.noiseLevel;

    if (noiseResult.sustained) {
      violationManager.reportViolation('NOISE_DETECTED', 'MEDIUM', {
        noiseLevel: Math.round(noiseResult.noiseLevel),
      });
    }

    // Broadcast status update
    if (config.onStatusUpdate) {
      config.onStatusUpdate({ ...status });
    }
  } catch (err) {
    // Silently continue on individual frame errors
  }
}

export function stopProctoring() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  stopNoiseDetection();
  stopTabSwitchDetection();
  stopScreenChangeDetection();
  violationManager.reset();
  config = null;
  console.log('[ML] Proctoring stopped');
}

export function getViolationLog(): ViolationEvent[] {
  return violationManager.getViolations();
}

export function getProctoringStatus(): ProctoringStatus {
  return { ...status };
}
