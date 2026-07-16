import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import toast from 'react-hot-toast';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/exams'),
      api.get(`/users/${user?._id}/results`),
    ]).then(([e, r]) => {
      setExams(e.data.exams);
      setResults(r.data.attempts);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const joinExam = async () => {
    if (!accessCode.trim()) return;
    setJoining(true);
    try {
      const { data } = await api.post('/exams/join', { accessCode });
      toast.success('Joined exam: ' + data.exam.title);
      setAccessCode('');
      const res = await api.get('/exams');
      setExams(res.data.exams);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid access code');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span className="loading-text">Loading dashboard...</span></div>;

  return (
    <div className="app-layout" style={{ flexDirection: 'column' }}>
      <Navbar />
      <div className="page-content">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Student Dashboard</h1>
            <p className="text-muted text-sm">Welcome back, {user?.name}!</p>
          </div>
          {!user?.faceEnrolled && (
            <button className="btn btn-warning" onClick={() => navigate('/face-enroll')}
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>
              ⚠️ Enroll Face
            </button>
          )}
        </div>

        {/* Join with access code */}
        <div className="card mb-3">
          <div className="card-header">
            <span className="card-title">🔑 Join Exam with Code</span>
          </div>
          <div className="flex gap-1">
            <input
              id="access-code-input"
              type="text"
              className="form-input"
              placeholder="Enter 8-character access code (e.g. ABC12345)"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button id="join-exam-btn" className="btn btn-primary" onClick={joinExam} disabled={joining}>
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>

        {/* Available exams */}
        <div className="card mb-3">
          <div className="card-header"><span className="card-title">📚 Available Exams</span></div>
          {exams.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <div className="empty-title">No exams available</div>
              <p className="empty-text">Join an exam using an access code from your instructor.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Exam</th><th>Duration</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {exams.map(exam => {
                    const attempted = results.find(r => r.exam?._id === exam._id);
                    return (
                      <tr key={exam._id}>
                        <td><div className="font-bold">{exam.title}</div><div className="text-xs text-muted">{exam.description}</div></td>
                        <td><span className="monospace">{exam.duration} min</span></td>
                        <td>
                          {attempted ? (
                            <span className={`badge ${attempted.status === 'submitted' ? 'badge-success' : 'badge-danger'}`}>
                              {attempted.status}
                            </span>
                          ) : <span className="badge badge-info">Not started</span>}
                        </td>
                        <td>
                          {!attempted ? (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${exam._id}`)}>Start Exam</button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/results/${attempted._id}`)}>View Results</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent results */}
        {results.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">📊 Recent Results</span></div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Exam</th><th>Score</th><th>Status</th><th>Violations</th><th>Submitted</th></tr></thead>
                <tbody>
                  {results.slice(0, 5).map(r => (
                    <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/results/${r._id}`)}>
                      <td className="font-bold">{r.exam?.title}</td>
                      <td><span className="monospace">{r.percentage}%</span></td>
                      <td><span className={`badge ${r.passed ? 'badge-success' : 'badge-danger'}`}>{r.passed ? 'Pass' : 'Fail'}</span></td>
                      <td><span className="monospace text-danger">{r.violationCount}</span></td>
                      <td className="text-muted text-xs">{new Date(r.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
