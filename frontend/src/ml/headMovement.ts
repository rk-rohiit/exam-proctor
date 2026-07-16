// headMovement.ts — Head pose & gaze direction estimation from face landmarks
import * as faceapi from 'face-api.js';

export interface HeadPoseResult {
  yaw: number;    // left/right rotation in degrees
  pitch: number;  // up/down rotation in degrees
  lookingAway: boolean;
  gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down';
}

const YAW_THRESHOLD = 28;    // degrees
const PITCH_THRESHOLD = 22;  // degrees
const GAZE_SUSTAINED_MS = 2000;

let gazeAwayStartTime: number | null = null;

export function estimateHeadPose(landmarks: faceapi.FaceLandmarks68): HeadPoseResult {
  const positions = landmarks.positions;

  // Key landmark indices for 68-point model
  const noseTip = positions[30];
  const leftEyeOuter = positions[36];
  const rightEyeOuter = positions[45];
  const chinBottom = positions[8];
  const foreheadProxy = positions[27]; // bridge of nose as forehead proxy

  // --- Yaw (left/right) ---
  // Compare nose tip x position relative to eye center
  const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeWidth = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
  const noseOffsetX = noseTip.x - eyeCenterX;
  const yaw = (noseOffsetX / eyeWidth) * 90; // rough degree estimation

  // --- Pitch (up/down) ---
  // Compare nose tip y relative to midpoint of eyes and chin
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const faceHeight = Math.abs(chinBottom.y - foreheadProxy.y);
  const noseMidY = (eyeCenterY + chinBottom.y) / 2;
  const noseOffsetY = noseTip.y - noseMidY;
  const pitch = (noseOffsetY / faceHeight) * 90;

  // --- Determine gaze direction ---
  let gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down' = 'center';
  const absYaw = Math.abs(yaw);
  const absPitch = Math.abs(pitch);

  if (absYaw > YAW_THRESHOLD) {
    gazeDirection = yaw > 0 ? 'right' : 'left';
  } else if (absPitch > PITCH_THRESHOLD) {
    gazeDirection = pitch > 0 ? 'down' : 'up';
  }

  const lookingAway = gazeDirection !== 'center';

  return { yaw, pitch, lookingAway, gazeDirection };
}

export function checkGazeSustained(lookingAway: boolean): boolean {
  if (lookingAway) {
    if (gazeAwayStartTime === null) gazeAwayStartTime = Date.now();
    else if (Date.now() - gazeAwayStartTime > GAZE_SUSTAINED_MS) {
      gazeAwayStartTime = null; // reset so it can fire again
      return true;
    }
  } else {
    gazeAwayStartTime = null;
  }
  return false;
}

export function resetGazeTimer() {
  gazeAwayStartTime = null;
}
