import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/shared/Navbar';
import toast from 'react-hot-toast';

interface Question { text: string; options: string[]; correctAnswer: number; marks: number; }

const emptyQuestion = (): Question => ({ text: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 });

export default function CreateExamPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', duration: 60, maxViolations: 3 });
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const updateQ = (i: number, field: string, value: any) => {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(qs => qs.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.options]; opts[oi] = value;
      return { ...q, options: opts };
    }));
  };

  const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion()]);
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      toast.error('Fill in all question texts and options'); return;
    }
    setSaving(true);
    try {
      await api.post('/exams', { ...form, questions });
      toast.success('Exam created!');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="page-content">
        <div className="flex items-center justify-between mb-3">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create New Exam</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/admin')}>← Back</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card mb-3">
            <div className="card-header"><span className="card-title">📋 Exam Details</span></div>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Exam Title *</label>
                <input className="form-input" placeholder="e.g. Data Structures Midterm" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Optional exam description..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration (minutes) *</label>
                  <input type="number" className="form-input" min={5} max={300} value={form.duration} onChange={e => setForm(f => ({...f, duration: +e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Violations before Auto-Submit</label>
                  <input type="number" className="form-input" min={1} max={10} value={form.maxViolations} onChange={e => setForm(f => ({...f, maxViolations: +e.target.value}))} />
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="mb-3">
            {questions.map((q, qi) => (
              <div key={qi} className="card mb-2">
                <div className="card-header">
                  <span className="card-title">Question {qi + 1}</span>
                  {questions.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(qi)}>Remove</button>}
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Question Text *</label>
                    <textarea className="form-textarea" rows={2} placeholder="Enter your question..." value={q.text} onChange={e => updateQ(qi, 'text', e.target.value)} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="form-group">
                        <label className="form-label" style={{ color: q.correctAnswer === oi ? 'var(--success)' : undefined }}>
                          Option {String.fromCharCode(65 + oi)} {q.correctAnswer === oi ? '✓ Correct' : ''}
                        </label>
                        <div className="flex gap-1">
                          <input className="form-input" placeholder={`Option ${String.fromCharCode(65+oi)}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} required />
                          <button type="button" className={`btn btn-sm ${q.correctAnswer === oi ? 'btn-success' : 'btn-ghost'}`} onClick={() => updateQ(qi, 'correctAnswer', oi)} title="Mark as correct">✓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-group" style={{ width: 120 }}>
                    <label className="form-label">Marks</label>
                    <input type="number" className="form-input" min={1} max={10} value={q.marks} onChange={e => updateQ(qi, 'marks', +e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary w-full" onClick={addQuestion}>+ Add Question</button>
          </div>

          <div className="flex gap-2 justify-between">
            <span className="text-muted text-sm">{questions.length} question(s) · {questions.reduce((s,q) => s+q.marks,0)} total marks</span>
            <div className="flex gap-1">
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : '🚀 Create Exam'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
