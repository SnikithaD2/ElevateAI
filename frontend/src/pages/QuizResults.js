import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function QuizResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const data = location.state;

  if (!data) {
    navigate('/home');
    return null;
  }

  const { score, total, percentage, results, level, videoTitle, timeTaken, attemptId } = data;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getGrade = (pct) => {
    if (pct >= 90) return { grade: 'A+', color: 'var(--success)', msg: '🏆 Outstanding!' };
    if (pct >= 80) return { grade: 'A', color: 'var(--success)', msg: '⭐ Excellent!' };
    if (pct >= 70) return { grade: 'B', color: '#22d3ee', msg: '👍 Good job!' };
    if (pct >= 60) return { grade: 'C', color: 'var(--warning)', msg: '📚 Keep practicing!' };
    return { grade: 'D', color: 'var(--danger)', msg: '💪 Try again!' };
  };

  const gradeInfo = getGrade(percentage);
  const wrong = total - score;

  const pieData = [
    { name: 'Correct', value: score },
    { name: 'Wrong', value: wrong },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  const questionsByResult = (results || []).map((r, i) => ({ q: i + 1, correct: r.isCorrect ? 1 : 0 }));

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">📊 Quiz Results</h1>
        <p className="page-subtitle">{videoTitle} • <span style={{ textTransform: 'capitalize' }}>{level}</span> Level</p>
      </div>

      <div className="page-body">
        {/* Hero Score */}
        <div className="result-hero fade-in">
          <div className="result-score">{percentage}%</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: gradeInfo.color, marginBottom: 8 }}>
            Grade: {gradeInfo.grade}
          </div>
          <div className="result-label">{gradeInfo.msg}</div>
          <div className="result-badges">
            <div className="result-badge">✅ {score} Correct</div>
            <div className="result-badge">❌ {wrong} Wrong</div>
            <div className="result-badge">📝 {total} Questions</div>
            <div className="result-badge">⏱️ {formatTime(timeTaken)}</div>
            <div className="result-badge" style={{ textTransform: 'capitalize' }}>🎯 {level} Level</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2 mb-6">
          <div className="card">
            <div className="section-title">Score Breakdown</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} />
                <span className="text-sm text-secondary">Correct ({score})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
                <span className="text-sm text-secondary">Wrong ({wrong})</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title">Question-by-Question Performance</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={questionsByResult} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="q" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  formatter={(val) => [val === 1 ? 'Correct ✅' : 'Wrong ❌', 'Result']}
                />
                <Bar dataKey="correct" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                  {questionsByResult.map((entry, idx) => (
                    <Cell key={idx} fill={entry.correct ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <button className="btn-primary" style={{ width: 'auto', padding: '11px 24px' }} onClick={() => navigate('/home')}>
            📹 Upload New Video
          </button>
          <button className="btn-secondary" onClick={() => navigate('/tests')}>
            📝 View All Tests
          </button>
        </div>

        {/* Detailed Review */}
        <div className="card">
          <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>📋 Detailed Review</div>
            <button className="btn-ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show Less ↑' : 'Show All ↓'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(results || []).slice(0, showAll ? undefined : 5).map((r, i) => (
              <div key={i} style={{
                background: 'var(--bg-secondary)',
                border: `1px solid ${r.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 'var(--radius)',
                padding: 20
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{r.isCorrect ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Q{i + 1}. {r.question}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {r.options.map((opt, oi) => (
                    <div key={oi} style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                      background:
                        oi === r.correct ? 'var(--success-soft)' :
                        oi === r.userAnswer && !r.isCorrect ? 'var(--danger-soft)' :
                        'transparent',
                      color:
                        oi === r.correct ? 'var(--success)' :
                        oi === r.userAnswer && !r.isCorrect ? 'var(--danger)' :
                        'var(--text-secondary)',
                      border: `1px solid ${
                        oi === r.correct ? 'rgba(16,185,129,0.3)' :
                        oi === r.userAnswer && !r.isCorrect ? 'rgba(239,68,68,0.3)' :
                        'transparent'
                      }`
                    }}>
                      {oi === r.correct && '✅ '}{oi === r.userAnswer && !r.isCorrect && '❌ '}
                      {String.fromCharCode(65 + oi)}. {opt.replace(/^[A-D]\.\s?/, '')}
                    </div>
                  ))}
                </div>

                {r.explanation && (
                  <div style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--accent)'
                  }}>
                    💡 {r.explanation}
                  </div>
                )}
              </div>
            ))}

            {!showAll && results?.length > 5 && (
              <button className="btn-ghost" onClick={() => setShowAll(true)} style={{ textAlign: 'center' }}>
                Show {results.length - 5} more questions ↓
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}