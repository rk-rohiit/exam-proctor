import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import { VIOLATION_LABELS, VIOLATION_ICONS } from '../utils/constants';

interface StudentStatus { studentId: string; name: string; email: string; violationCount: number; suspicionScore: number; status: string; lastSeen?: number; }
interface AlertItem { alertId: string; studentId: string; studentName: string; type: string; severity: string; violationCount: number; maxViolations: number; timestamp: Date; autoSubmitted: boolean; }

export default function LiveMonitorPage() {
  const { examId } = useParams<{ examId: string }>();
  const { socket, joinAdminRoom } = useSocket();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!examId) return;
    Promise.all([
      api.get(`/exams/${examId}`),
      api.get(`/sessions/exam/${examId}`),
    ]).then(([examRes, sessRes]) => {
      setExam(examRes.data.exam);
      const atts = sessRes.data.attempts;
      setAttempts(atts);
      setStudents(atts.map((a: any) => ({
        studentId: a.student._id,
        name: a.student.name,
        email: a.student.email,
        violationCount: a.violationCount,
        suspicionScore: a.suspicionScore,
        status: a.status,
      })));
    }).catch(console.error);
  }, [examId]);

  useEffect(() => {
    if (!examId) return;
    joinAdminRoom(examId);
  }, [examId, joinAdminRoom]);

  useEffect(() => {
    if (!socket) return;
    const handleViolation = (data: AlertItem) => {
      setAlerts(prev => [data, ...prev].slice(0, 50));
      setStudents(prev => prev.map(s =>
        s.studentId === data.studentId ? { ...s, violationCount: data.violationCount } : s
      ));
    };
    const handleStatus = (data: any) => {
      setStudents(prev => prev.map(s =>
        s.studentId === data.studentId ? { ...s, lastSeen: data.timestamp } : s
      ));
    };
    socket.on('violation:received', handleViolation);
    socket.on('student:status', handleStatus);
    return () => {
      socket.off('violation:received', handleViolation);
      socket.off('student:status', handleStatus);
    };
  }, [socket]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="page-content">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>👁 Live Monitor</h1>
            <p className="text-muted text-sm">{exam?.title || 'Loading...'} · {students.length} students</p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/admin')}>← Dashboard</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          {/* Students Grid */}
          <div>
            <div className="card-header mb-2"><span className="card-title">👥 Active Students ({students.filter(s => s.status === 'active').length})</span></div>
            <div className="student-grid">
              {students.map(s => {
                const isOnline = s.lastSeen && (Date.now() - s.lastSeen) < 15000;
                const violationColor = s.violationCount >= (exam?.maxViolations || 3) ? 'var(--danger)' : s.violationCount > 0 ? 'var(--warning)' : 'var(--success)';
                return (
                  <div key={s.studentId} className="student-card" onClick={() => navigate(`/admin/exams/${examId}/sessions`)}>
                    <div className="student-card-avatar">{s.name[0].toUpperCase()}</div>
                    <div className="student-card-name">{s.name}</div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      {s.status === 'active' ? (
                        <><span className="student-status-badge" /><span className="text-xs" style={{ color: 'var(--success)' }}>Active</span></>
                      ) : (
                        <span className="badge badge-warning text-xs">{s.status}</span>
                      )}
                    </div>
                    <div className="student-card-violations" style={{ color: violationColor }}>
                      {s.violationCount} violation{s.violationCount !== 1 ? 's' : ''}
                    </div>
                    <div className="progress-bar-container mt-1">
                      <div className="progress-bar" style={{ width: `${Math.min(100, (s.violationCount / (exam?.maxViolations || 3)) * 100)}%`, background: violationColor }} />
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <span className="empty-icon">👥</span>
                  <div className="empty-title">No students yet</div>
                  <p className="empty-text">Students will appear here when they join the exam.</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Alert Feed */}
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '80px' }}>
            <div className="card-header">
              <span className="card-title">🚨 Live Alerts</span>
              <span className="badge badge-danger">{alerts.length}</span>
            </div>
            <div className="alert-feed">
              {alerts.map((a, i) => (
                <div key={i} className={`alert-item alert-item-${a.severity?.toLowerCase()}`}>
                  <span className="alert-item-icon">{VIOLATION_ICONS[a.type] || '⚠️'}</span>
                  <div className="alert-item-content">
                    <div className="alert-item-name">{a.studentName || 'Student'}</div>
                    <div className="alert-item-msg">{VIOLATION_LABELS[a.type] || a.type}</div>
                    <div className="alert-item-time">{new Date(a.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <span className={`badge ${a.severity === 'HIGH' ? 'badge-danger' : a.severity === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                    {a.violationCount}/{a.maxViolations}
                  </span>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <span className="empty-icon">✅</span>
                  <div className="empty-title">No alerts yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
