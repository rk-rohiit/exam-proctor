import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useProctor } from '../hooks/useProctor';
import api from '../utils/api';
import WebcamView from '../components/student/WebcamView';
import ViolationWarning from '../components/student/ViolationWarning';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  text: string;
  options: string[];
  marks: number;
}

interface Exam {
  _id: string;
  title: string;
  duration: number;
  questions: Question[];
  maxViolations: number;
}

export default function ExamRoomPage() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const { socket, joinStudentRoom } = useSocket();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [proctorStarted, setProcStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Handle auto-submit
  const handleAutoSubmit = useCallback(async () => {
    if (!attempt) return;
    setTerminated(true);
    setTerminationReason('Maximum violations exceeded — exam auto-submitted');
    try {
      await api.post(`/sessions/${attempt._id}/submit`);
    } catch (err) {
      console.error('Auto-submit error:', err);
    }
    // Redirect after a short delay
    setTimeout(() => navigate(`/results/${attempt._id}`), 3000);
  }, [attempt, navigate]);

  const {
    videoRef,
    status: procStatus,
    violationCount,
    currentWarning,
    startProctorSession,
    stopProctorSession,
  } = useProctor({
    attemptId: attempt?._id || '',
    examId: examId || '',
    maxViolations: exam?.maxViolations || 3,
    onAutoSubmit: handleAutoSubmit,
  });

  // Load exam and start session
  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const [examRes, sessionRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.post('/sessions/start', { examId }),
        ]);
        const examData = examRes.data.exam;
        const attemptData = sessionRes.data.attempt;
        setExam(examData);
        setAttempt(attemptData);
        setTimeLeft(examData.duration * 60);

        // Restore saved answers
        const savedAnswers: Record<number, number> = {};
        attemptData.answers?.forEach((a: any) => {
          if (a.selectedOption !== null && a.selectedOption !== undefined) {
            savedAnswers[a.questionIndex] = a.selectedOption;
          }
        });
        setAnswers(savedAnswers);

        // Join socket room
        if (attemptData._id && user?._id) {
          joinStudentRoom(attemptData._id, user._id);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to start exam');
        navigate('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [examId, user, joinStudentRoom, navigate]);

  // Start proctoring once attempt is loaded
  useEffect(() => {
    if (attempt && exam && !proctorStarted && videoRef.current) {
      setProcStarted(true);
      setTimeout(() => startProctorSession(), 1000);
    }
  }, [attempt, exam, proctorStarted, startProctorSession, videoRef]);

  // Listen for server-side termination
  useEffect(() => {
    if (!socket) return;
    const handler = ({ reason }: { reason: string }) => {
      setTerminated(true);
      setTerminationReason(reason);
      stopProctorSession();
      setTimeout(() => navigate(`/results/${attempt?._id}`), 3000);
    };
    socket.on('exam:terminated', handler);
    return () => { socket.off('exam:terminated', handler); };
  }, [socket, attempt, navigate, stopProctorSession]);

  // Countdown timer
  useEffect(() => {
    if (!attempt || terminated) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attempt, terminated]);

  // Heartbeat to admin
  useEffect(() => {
    if (!socket || !attempt || !exam || !user) return;
    const beat = setInterval(() => {
      socket.emit('student:heartbeat', {
        studentId: user._id,
        attemptId: attempt._id,
        examId: exam._id,
      });
    }, 5000);
    return () => clearInterval(beat);
  }, [socket, attempt, exam, user]);

  const selectAnswer = useCallback(async (optionIndex: number) => {
    if (!attempt || terminated) return;
    const newAnswers = { ...answers, [currentQ]: optionIndex };
    setAnswers(newAnswers);
    try {
      await api.put(`/sessions/${attempt._id}/answer`, {
        questionIndex: currentQ,
        selectedOption: optionIndex,
      });
    } catch {/* silent */}
  }, [answers, currentQ, attempt, terminated]);

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting || terminated) return;
    setSubmitting(true);
    stopProctorSession();
    clearInterval(timerRef.current);
    try {
      await api.post(`/sessions/${attempt._id}/submit`);
      toast.success('Exam submitted!');
      navigate(`/results/${attempt._id}`);
    } catch (err: any) {
      toast.error('Submit error: ' + err.response?.data?.message);
      setSubmitting(false);
    }
  }, [attempt, submitting, terminated, stopProctorSession, navigate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span className="loading-text">Starting exam session...</span>
      </div>
    );
  }

  if (terminated) {
    return (
      <div className="terminated-page">
        <div className="terminated-icon">🚨</div>
        <h1 className="terminated-title">Exam Terminated</h1>
        <p className="terminated-text">{terminationReason}</p>
        <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>Redirecting to results...</p>
      </div>
    );
  }

  if (!exam) return null;

  const question = exam.questions[currentQ];
  const timerClass = timeLeft < 300 ? 'critical' : timeLeft < 600 ? 'warning' : '';
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="exam-room">
      {/* Header */}
      <div className="exam-header">
        <div>
          <div className="exam-title">📚 {exam.title}</div>
          <div className="text-xs text-muted">{answeredCount}/{exam.questions.length} answered</div>
        </div>
        <div className={`exam-timer ${timerClass}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <div className="flex gap-1 items-center">
          {procStatus?.modelsLoaded ? (
            <span className="badge badge-success">🤖 AI Active</span>
          ) : (
            <span className="badge badge-warning">⏳ Loading AI...</span>
          )}
          <button
            id="submit-exam-btn"
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '✅ Submit Exam'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="exam-body">
        {/* Question Panel */}
        <div className="question-panel">
          {/* Question Navigation */}
          <div className="question-nav">
            {exam.questions.map((_, i) => (
              <button
                key={i}
                className={`question-nav-btn ${i === currentQ ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQ(i)}
                title={`Question ${i + 1}${answers[i] !== undefined ? ' (answered)' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question Card */}
          <div className="question-card" key={currentQ}>
            <div className="question-number">
              Question {currentQ + 1} of {exam.questions.length} · {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </div>
            <div className="question-text">{question.text}</div>

            <div className="options-list">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  id={`option-${currentQ}-${i}`}
                  className={`option-item ${answers[currentQ] === i ? 'selected' : ''}`}
                  onClick={() => selectAnswer(i)}
                >
                  <div className="option-radio">
                    {answers[currentQ] === i && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                  </div>
                  <span className="option-label">
                    <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
            >
              ← Previous
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentQ(q => Math.min(exam.questions.length - 1, q + 1))}
              disabled={currentQ === exam.questions.length - 1}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <WebcamView
            videoRef={videoRef}
            facesDetected={procStatus?.facesDetected ?? 0}
            noiseLevel={procStatus?.noiseLevel ?? 0}
            gazeDirection={procStatus?.gazeDirection ?? 'center'}
            violationCount={violationCount}
            maxViolations={exam.maxViolations}
          />

          {/* Proctoring Status */}
          <div className="card">
            <div className="card-header"><span className="card-title">🤖 AI Proctoring</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Face Models</span>
                <span style={{ color: procStatus?.modelsLoaded ? 'var(--success)' : 'var(--warning)' }}>
                  {procStatus?.modelsLoaded ? '✅ Loaded' : '⏳ Loading'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Camera</span>
                <span style={{ color: procStatus?.cameraActive ? 'var(--success)' : 'var(--danger)' }}>
                  {procStatus?.cameraActive ? '✅ Active' : '❌ Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Microphone</span>
                <span style={{ color: procStatus?.micActive ? 'var(--success)' : 'var(--warning)' }}>
                  {procStatus?.micActive ? '✅ Active' : '⚠️ No access'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Gaze</span>
                <span className="monospace" style={{ fontSize: '0.75rem', color: procStatus?.gazeDirection === 'center' ? 'var(--success)' : 'var(--warning)' }}>
                  {procStatus?.gazeDirection ?? 'center'}
                </span>
              </div>
              <div className="divider" style={{ margin: '0.25rem 0' }} />
              <div className="flex justify-between text-sm">
                <span className="text-muted">Violations</span>
                <span style={{ color: violationCount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                  {violationCount} / {exam.maxViolations}
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(violationCount / exam.maxViolations) * 100}%`,
                    background: violationCount >= exam.maxViolations
                      ? 'var(--danger)'
                      : violationCount >= Math.floor(exam.maxViolations / 2)
                      ? 'var(--warning)'
                      : undefined,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Rules reminder */}
          <div className="card">
            <div className="card-header"><span className="card-title">📋 Rules</span></div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <li>👤 Keep face visible in camera</li>
              <li>🔇 Stay in a quiet environment</li>
              <li>👀 Keep eyes on the screen</li>
              <li>🖥 Do not switch tabs/windows</li>
              <li>⛔ No copy/paste or right-click</li>
              <li style={{ color: 'var(--danger)', fontWeight: 600 }}>🚨 Auto-submit at {exam.maxViolations} violations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Violation Warning Popup */}
      {currentWarning && (
        <ViolationWarning
          type={currentWarning.type}
          message={currentWarning.message}
          count={violationCount}
          max={exam.maxViolations}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
