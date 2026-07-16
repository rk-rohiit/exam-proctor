// noiseDetection.ts — Microphone / noise detection using Web Audio API

export interface NoiseDetectionResult {
  noiseLevel: number; // 0–100 RMS level
  voiceDetected: boolean;
  sustained: boolean; // true if loud noise sustained > threshold time
}

const NOISE_THRESHOLD = 20;       // RMS threshold to count as "noise"
const SUSTAINED_DURATION_MS = 2000; // Must sustain for 2 seconds to flag

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let stream: MediaStream | null = null;
let noiseStartTime: number | null = null;
let initialized = false;

export async function initNoiseDetection(): Promise<boolean> {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    initialized = true;
    console.log('[ML] Noise detection initialized');
    return true;
  } catch (err) {
    console.warn('[ML] Microphone access denied:', err);
    return false;
  }
}

export function detectNoise(): NoiseDetectionResult {
  if (!initialized || !analyser) {
    return { noiseLevel: 0, voiceDetected: false, sustained: false };
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  // Calculate RMS (root mean square) of the frequency data
  const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / bufferLength);
  const noiseLevel = Math.min(100, (rms / 128) * 100);

  const voiceDetected = noiseLevel > NOISE_THRESHOLD;

  // Track sustained noise
  let sustained = false;
  if (voiceDetected) {
    if (noiseStartTime === null) noiseStartTime = Date.now();
    else if (Date.now() - noiseStartTime > SUSTAINED_DURATION_MS) {
      sustained = true;
      noiseStartTime = null; // reset
    }
  } else {
    noiseStartTime = null;
  }

  return { noiseLevel, voiceDetected, sustained };
}

export function stopNoiseDetection() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  microphone = null;
  initialized = false;
  noiseStartTime = null;
}
