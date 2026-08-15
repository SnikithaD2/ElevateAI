import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { API } from '../context/AuthContext';

// ── Mini bar chart ──────────────────────────────────────────────
function BarChart({ data, height = 120 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{d.value}%</span>
          <div
            style={{
              width: '100%',
              height: `${(d.value / max) * 80}%`,
              minHeight: 4,
              borderRadius: '4px 4px 0 0',
              background: d.color || 'var(--accent)',
              transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)',
              position: 'relative',
              cursor: 'default',
            }}
            title={`${d.label}: ${d.value}%`}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart ─────────────────────────────────────────────────
function DonutChart({ percentage, size = 100, color = '#6366f1', label }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-primary)">{percentage}%</text>
      </svg>
      {label && <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>}
    </div>
  );
}

// ── Sparkline ───────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 40, color = '#6366f1' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(' ').at(-1).split(',')[0]} cy={pts.split(' ').at(-1).split(',')[1]} r="3.5" fill={color} />
    </svg>
  );
}

// ── Level badge ─────────────────────────────────────────────────
const LEVEL_META = {
  easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   emoji: '😊' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🤔' },
  hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '🔥' },
};

function LevelBadge({ level }) {
  const m = LEVEL_META[level] || LEVEL_META.easy;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: m.color, background: m.bg, border: `1px solid ${m.color}40`
    }}>
      {m.emoji} {level?.toUpperCase()}
    </span>
  );
}

// ── Score chip ──────────────────────────────────────────────────
function ScoreChip({ pct }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{
      fontWeight: 800, fontSize: 15, color,
      background: `${color}18`, padding: '2px 10px', borderRadius: 8,
      border: `1px solid ${color}40`
    }}>
      {pct}%
    </span>
  );
}

// ── Stat card ───────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend }) {
  return (
    <div style={{
      background: 'var(--bg-card, var(--bg-secondary))',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 6,
      flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      {trend && <Sparkline data={trend} width={80} height={28} />}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────
function EmptyState({ onGo }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No quiz attempts yet</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Upload a video and take a quiz to see your performance analytics here.</p>
      <button className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={onGo}>
        🚀 Take Your First Quiz
      </button>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('overview'); // overview | history
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/api/quiz/performance');
        setData(res.data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ color: 'var(--text-muted)' }}>Loading your analytics...</div>
        </div>
      </div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout>
      <div className="error-msg" style={{ margin: 40 }}>⚠️ {error}</div>
    </AppLayout>
  );

  const { performance, attempts } = data || {};

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
        <p className="page-subtitle">Your learning performance at a glance</p>
      </div>

      <div className="page-body">

        {!performance ? (
          <EmptyState onGo={() => navigate('/home')} />
        ) : (
          <>
            {/* ── Stat row ── */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
              <StatCard
                icon="🎯"
                label="Average Score"
                value={`${performance.avgScore}%`}
                sub="Across all attempts"
                trend={performance.trend.map(t => t.score)}
              />
              <StatCard
                icon="🏆"
                label="Best Score"
                value={`${performance.bestScore}%`}
                sub="Personal record"
              />
              <StatCard
                icon="📝"
                label="Total Attempts"
                value={performance.totalAttempts}
                sub={`${performance.totalQuestions} questions answered`}
              />
              <StatCard
                icon="✅"
                label="Accuracy"
                value={`${performance.accuracy}%`}
                sub={`${performance.totalCorrect} correct`}
              />
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {['overview', 'history'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                    border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: tab === t ? 'var(--accent-soft)' : 'transparent',
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {t === 'overview' ? '📈 Overview' : '📋 History'}
                </button>
              ))}
            </div>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Row 1: Donut row + trend bar */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

                  {/* Difficulty breakdown */}
                  <div style={{
                    flex: '1 1 300px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 16, padding: 24,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🎯 Performance by Difficulty</div>
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'space-around', flexWrap: 'wrap' }}>
                      {['easy', 'medium', 'hard'].map(lvl => {
                        const s = performance.levelStats[lvl];
                        const m = LEVEL_META[lvl];
                        return (
                          <div key={lvl} style={{ textAlign: 'center' }}>
                            <DonutChart
                              percentage={Math.round(s.avg)}
                              color={m.color}
                              size={90}
                              label={`${m.emoji} ${lvl}`}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                              {s.count} attempt{s.count !== 1 ? 's' : ''} · Best {Math.round(s.best)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score trend */}
                  <div style={{
                    flex: '1 1 300px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 16, padding: 24,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📈 Score Trend (Last 10)</div>
                    {performance.trend.length > 0 ? (
                      <>
                        <BarChart
                          height={130}
                          data={performance.trend.map(t => ({
                            label: `#${t.index}`,
                            value: t.score,
                            color: t.score >= 80 ? '#22c55e' : t.score >= 50 ? '#f59e0b' : '#ef4444'
                          }))}
                        />
                        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                          {[['#22c55e', '≥80% Great'], ['#f59e0b', '50–79% OK'], ['#ef4444', '<50% Review']].map(([c, l]) => (
                            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trend data yet.</div>
                    )}
                  </div>
                </div>

                {/* Row 2: Level attempt distribution bar */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: 24,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📊 Attempts by Difficulty</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {['easy', 'medium', 'hard'].map(lvl => {
                      const s = performance.levelStats[lvl];
                      const m = LEVEL_META[lvl];
                      const pct = performance.totalAttempts > 0
                        ? Math.round((s.count / performance.totalAttempts) * 100) : 0;
                      return (
                        <div key={lvl}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.emoji} {lvl.charAt(0).toUpperCase() + lvl.slice(1)}</span>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.count} attempts ({pct}%)</span>
                          </div>
                          <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`, background: m.color,
                              borderRadius: 99, transition: 'width 1s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Recent 5 attempts */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: 24,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🕐 Recent Attempts</div>
                    <button
                      onClick={() => setTab('history')}
                      style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View all →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(attempts || []).slice(0, 5).map((a, i) => {
                      const pct = Math.round((a.score / a.total) * 100);
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 16,
                          padding: '12px 16px', borderRadius: 12,
                          background: 'var(--bg-primary, var(--bg-card))',
                          border: '1px solid var(--border)',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ fontSize: 22 }}>
                            {pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '📚'}
                          </div>
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                              {a.video_title || 'Unknown Video'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {a.time_taken ? ` · ${Math.floor(a.time_taken / 60)}m ${a.time_taken % 60}s` : ''}
                            </div>
                          </div>
                          <LevelBadge level={a.level} />
                          <ScoreChip pct={pct} />
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
                            {a.score}/{a.total} correct
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ HISTORY TAB ══════════ */}
            {tab === 'history' && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
                  📋 All Attempts ({(attempts || []).length})
                </div>

                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  gap: 8, padding: '10px 16px',
                  background: 'var(--bg-primary, rgba(0,0,0,0.2))',
                  borderRadius: 10, marginBottom: 8,
                  fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <span>Video</span>
                  <span>Level</span>
                  <span>Score</span>
                  <span>Correct</span>
                  <span>Date</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(attempts || []).length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No attempts yet.</div>
                  ) : (
                    (attempts || []).map((a, i) => {
                      const pct = Math.round((a.score / a.total) * 100);
                      return (
                        <div key={i} style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                          gap: 8, padding: '14px 16px',
                          borderRadius: 12,
                          background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary, rgba(255,255,255,0.02))',
                          border: '1px solid var(--border)',
                          alignItems: 'center',
                          transition: 'background 0.15s',
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{a.video_title || 'Unknown'}</div>
                            {a.time_taken && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                ⏱ {Math.floor(a.time_taken / 60)}m {a.time_taken % 60}s
                              </div>
                            )}
                          </div>
                          <div><LevelBadge level={a.level} /></div>
                          <div><ScoreChip pct={pct} /></div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.score}/{a.total}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </AppLayout>
  );
}