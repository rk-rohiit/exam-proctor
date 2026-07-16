import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  facesDetected: number;
  noiseLevel: number;
  gazeDirection: string;
  violationCount: number;
  maxViolations: number;
}

export default function WebcamView({ videoRef, facesDetected, noiseLevel, gazeDirection, violationCount, maxViolations }: Props) {
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.warn('Webcam play interrupted:', err);
          });
        }
      })
      .catch(console.error);

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [videoRef]);

  const statusColor = facesDetected === 1 ? '#10b981' : facesDetected === 0 ? '#ef4444' : '#f97316';
  const faceStatus = facesDetected === 0 ? 'No Face' : facesDetected === 1 ? 'Face OK' : `${facesDetected} Faces!`;

  return (
    <div className="webcam-container">
      <div className="webcam-header">
        <span className="webcam-title">📹 Camera</span>
        <span className="webcam-status" style={{ color: statusColor }}>● {faceStatus}</span>
      </div>
      <div className="webcam-wrapper">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="webcam-video"
          width={280}
          height={210}
        />
        <div className="webcam-overlay">
          <div className="webcam-info-row">
            <span className="webcam-badge">👁 {gazeDirection}</span>
            <span className="webcam-badge">🔊 {Math.round(noiseLevel)}%</span>
          </div>
        </div>
      </div>
      <div className="webcam-violations">
        <div className="violation-dots">
          {Array.from({ length: maxViolations }).map((_, i) => (
            <div
              key={i}
              className={`violation-dot ${i < violationCount ? 'violation-dot-filled' : ''}`}
              title={`Violation ${i + 1}`}
            />
          ))}
        </div>
        <span className="violation-count-text">{violationCount}/{maxViolations} violations</span>
      </div>
    </div>
  );
}
