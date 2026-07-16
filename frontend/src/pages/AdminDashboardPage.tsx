import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import { VIOLATION_LABELS, VIOLATION_ICONS } from '../utils/constants';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, examsRes] = await Promise.all([
        api.get('/alerts/stats/overview'),
        api.get('/exams'),
      ]);
      setStats(statsRes.data);
      setExams(examsRes.data.exams);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    try {
      await api.delete(`/exams/${id}`);
      setExams(e => e.filter(x => x._id !== id));
    } catch { alert('Delete failed'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span className="loading-text">Loading dashboard...</span></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="page-content">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Dashboard</h1>
            <p className="text-muted text-sm">Welcome, {user?.name}!</p>
          </div>
          <button id="create-exam-btn" className="btn btn-primary" onClick={() => navigate('/admin/exams/create')}>+ Create Exam</button>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">📚</div>
            <div><div className="stat-value">{stats?.totalExams ?? 0}</div><div className="stat-label">Total Exams</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">🟢</div>
            <div><div className="stat-value">{stats?.activeAttempts ?? 0}</div><div className="stat-label">Live Sessions</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">⚠️</div>
            <div><div className="stat-value">{stats?.totalAlerts ?? 0}</div><div className="stat-label">Total Alerts</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">🔔</div>
            <div><div className="stat-value">{stats?.unacknowledged ?? 0}</div><div className="stat-label">Unacknowledged</div></div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Exams */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
              <span className="card-title">📋 My Exams</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/exams/create')}>+ New Exam</button>
            </div>
            {exams.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">📋</span><div className="empty-title">No exams yet</div><p className="empty-text">Create your first exam to get started.</p></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Title</th><th>Duration</th><th>Code</th><th>Students</th><th>Actions</th></tr></thead>
                  <tbody>
                    {exams.map(exam => (
                      <tr key={exam._id}>
                        <td><div className="font-bold">{exam.title}</div><div className="text-xs text-muted">{exam.questions?.length ?? 0} questions</div></td>
                        <td><span className="monospace">{exam.duration} min</span></td>
                        <td><span className="monospace badge badge-purple">{exam.accessCode}</span></td>
                        <td>{exam.assignedStudents?.length ?? 0}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/monitor/${exam._id}`)}>👁 Monitor</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/exams/${exam._id}/sessions`)}>Results</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteExam(exam._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <div className="card-header"><span className="card-title">🚨 Recent Alerts</span></div>
            <div className="alert-feed">
              {(stats?.recentAlerts ?? []).slice(0, 8).map((a: any) => (
                <div key={a._id} className={`alert-item alert-item-${a.severity.toLowerCase()}`}>
                  <span className="alert-item-icon">{VIOLATION_ICONS[a.type] || '⚠️'}</span>
                  <div className="alert-item-content">
                    <div className="alert-item-name">{a.student?.name}</div>
                    <div className="alert-item-msg">{VIOLATION_LABELS[a.type]}</div>
                    <div className="alert-item-time">{new Date(a.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <span className={`badge badge-${a.severity === 'HIGH' ? 'danger' : a.severity === 'MEDIUM' ? 'warning' : 'info'}`}>{a.severity}</span>
                </div>
              ))}
              {(!stats?.recentAlerts || stats.recentAlerts.length === 0) && (
                <div className="empty-state" style={{ padding: '2rem' }}><span className="empty-icon">✅</span><div className="empty-title">No alerts</div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
