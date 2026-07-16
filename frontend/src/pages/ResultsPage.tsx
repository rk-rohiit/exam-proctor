import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import { VIOLATION_LABELS, VIOLATION_ICONS, VIOLATION_SEVERITY_COLORS } from '../utils/constants';

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sessions/${attemptId}`).then(r => setAttempt(r.data.attempt)).catch(console.error).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="loading-screen"><div className="spinner" /><span className="loading-text">Loading results...</span></div>;
  if (!attempt) return <div className="loading-screen"><span className="empty-icon">❌</span><div>Results not found</div></div>;

  const { exam, score, percentage, passed, violations, violationCount, suspicionScore, status, autoSubmitted, submittedAt } = attempt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="page-content">
        <div className="flex items-center justify-between mb-3">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Exam Results</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>← Dashboard</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Score Card */}
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div className="result-score">{percentage}%</div>
            <div className="result-grade" style={{ color: passed ? 'var(--success)' : 'var(--danger)' }}>
              {passed ? '✅ PASSED' : '❌ FAILED'}
            </div>
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{score}</div><div className="text-muted text-xs">Score</div></div>
              <div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{exam?.totalMarks}</div><div className="text-muted text-xs">Total Marks</div></div>
            </div>
            {autoSubmitted && (
              <div className="badge badge-danger" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                🚨 Auto-Submitted
              </div>
            )}
            {status === 'terminated' && (
              <div className="badge badge-danger" style={{ marginTop: '0.5rem', display: 'inline-flex' }}>
                🚫 Terminated
              </div>
            )}
          </div>

          {/* Proctoring Summary */}
          <div className="card">
            <div className="card-header"><span className="card-title">🤖 Proctoring Summary</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Violations</span>
                <span style={{ fontWeight: 700, color: violationCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{violationCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Suspicion Score</span>
                <span style={{ fontWeight: 700, color: suspicionScore > 50 ? 'var(--danger)' : suspicionScore > 25 ? 'var(--warning)' : 'var(--success)' }}>{suspicionScore}/100</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${suspicionScore}%`, background: suspicionScore > 50 ? 'var(--danger)' : suspicionScore > 25 ? 'var(--warning)' : undefined }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Submitted At</span>
                <span className="monospace" style={{ fontSize: '0.75rem' }}>{new Date(submittedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Exam</span>
                <span style={{ fontWeight: 600 }}>{exam?.title}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Violation Log */}
        {violations && violations.length > 0 && (
          <div className="card mt-3">
            <div className="card-header"><span className="card-title">🚨 Violation Log ({violations.length})</span></div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>#</th><th>Type</th><th>Severity</th><th>Time</th></tr></thead>
                <tbody>
                  {violations.map((v: any, i: number) => (
                    <tr key={i}>
                      <td className="monospace text-muted text-xs">{i + 1}</td>
                      <td>
                        <span style={{ marginRight: '0.5rem' }}>{VIOLATION_ICONS[v.type] || '⚠️'}</span>
                        {VIOLATION_LABELS[v.type] || v.type}
                      </td>
                      <td>
                        <span className="badge" style={{ background: VIOLATION_SEVERITY_COLORS[v.severity] + '20', color: VIOLATION_SEVERITY_COLORS[v.severity] }}>
                          {v.severity}
                        </span>
                      </td>
                      <td className="monospace text-xs text-muted">{new Date(v.timestamp).toLocaleTimeString()}</td>
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
