// faceDetection.ts — Face presence & multiple-face detection using face-api.js
import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  facesCount: number;
  noFaceDetected: boolean;
  multipleFaces: boolean;
  faceDescriptor: Float32Array | null;
}

let modelsLoaded = false;
let noFaceStartTime: number | null = null;
const NO_FACE_THRESHOLD_MS = 3000;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
  console.log('[ML] Face models loaded');
}

export async function detectFaces(
  videoEl: HTMLVideoElement
): Promise<{ result: FaceDetectionResult; noFaceTooLong: boolean }> {
  if (!modelsLoaded) {
    return {
      result: { facesCount: 0, noFaceDetected: true, multipleFaces: false, faceDescriptor: null },
      noFaceTooLong: false,
    };
  }

  const detections = await faceapi
    .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const facesCount = detections.length;
  const noFaceDetected = facesCount === 0;
  const multipleFaces = facesCount > 1;
  const faceDescriptor = facesCount > 0 ? detections[0].descriptor : null;

  // Track how long no face has been visible
  let noFaceTooLong = false;
  if (noFaceDetected) {
    if (noFaceStartTime === null) noFaceStartTime = Date.now();
    else if (Date.now() - noFaceStartTime > NO_FACE_THRESHOLD_MS) {
      noFaceTooLong = true;
      noFaceStartTime = null; // reset so it fires again after another 3s absence
    }
  } else {
    noFaceStartTime = null;
  }

  return {
    result: { facesCount, noFaceDetected, multipleFaces, faceDescriptor },
    noFaceTooLong,
  };
}

export function resetNoFaceTimer() {
  noFaceStartTime = null;
}
