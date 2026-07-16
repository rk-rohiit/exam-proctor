import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function FaceEnrollPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'detecting' | 'done'>('loading');
  const [faceFound, setFaceFound] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('Video play interrupted:', err);
        });
      }
      setStatus('ready');
    };
    init().catch(err => { toast.error('Camera/model error: ' + err.message); });
    return () => {
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
      setFaceFound(!!det);
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  const handleEnroll = useCallback(async () => {
    if (!videoRef.current || !faceFound) return;
    setEnrolling(true);
    try {
      const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!det) { toast.error('No face detected. Try again.'); return; }
      await api.put('/auth/face-enroll', { faceDescriptor: Array.from(det.descriptor) });
      updateUser({ faceEnrolled: true });
      toast.success('Face enrolled successfully!');
      setStatus('done');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      toast.error('Enrollment failed: ' + err.message);
    } finally {
      setEnrolling(false);
    }
  }, [faceFound, navigate, updateUser]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <span className="auth-logo-icon">🔍</span>
          <div className="auth-logo-title">Face Enrollment</div>
          <div className="auth-logo-sub">Required for exam proctoring</div>
        </div>
        <div className="face-enrollment">
          <div className="face-preview">
            <video ref={videoRef} className="face-preview-video" autoPlay muted playsInline />
            <div className="face-overlay">
              <div className="face-guide" style={{ borderColor: faceFound ? '#10b981' : '#6366f1' }} />
            </div>
          </div>
          <div style={{ color: faceFound ? '#10b981' : '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
            {status === 'loading' ? '⏳ Loading face models...' :
             status === 'done' ? '✅ Enrolled successfully!' :
             faceFound ? '✅ Face detected — ready to enroll' : '👤 Position your face in the frame'}
          </div>
          <p className="text-muted text-sm" style={{ textAlign: 'center' }}>
            Your face is used to verify your identity during exams. This data is stored securely.
          </p>
          <button
            id="enroll-btn"
            className="btn btn-primary btn-lg w-full"
            onClick={handleEnroll}
            disabled={!faceFound || enrolling || status !== 'ready'}
          >
            {enrolling ? 'Enrolling...' : '📷 Capture & Enroll Face'}
          </button>
          <button className="btn btn-ghost w-full" onClick={() => navigate('/')}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
