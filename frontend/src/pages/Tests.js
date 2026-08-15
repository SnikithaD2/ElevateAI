// Tests.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { API } from '../context/AuthContext';

// ── Helpers ─────────────────────────────────────────────────────
const LEVEL_META = {
  easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  emoji: '😊' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '🤔' },
  hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  emoji: '🔥' },
};

function scoreColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreEmoji(pct) {
  if (pct >= 90) return '🌟';
  if (pct >= 80) return '🎉';
  if (pct >= 60) return '👍';
  if (pct >= 40) return '📚';
  return '💪';
}

function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Radial score ring ────────────────────────────────────────────
function ScoreRing({ pct, size = 140 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = scoreColor(pct);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{pct}%</text>
      <text x="60" y="74" textAnchor="middle" fontSize="11" fill="var(--text-muted)">score</text>
    </svg>
  );
}

// ── Mini horizontal bar ──────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ── Level badge ──────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════
// ANALYSIS VIEW
// ══════════════════════════════════════════════════════════════════
function AnalysisView({ attemptId, onBack }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all'); // all | correct | wrong

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get(`/api/quiz/attempt/${attemptId}`);
        setDetail(res.data.attempt);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load attempt');
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <div style={{ color: 'var(--text-muted)' }}>Loading analysis...</div>
    </div>
  );

  if (error) return (
    <div className="error-msg" style={{ margin: 20 }}>⚠️ {error}</div>
  );

  const { results, score, total, level, video_title, time_taken, created_at } = detail;
  const pct    = Math.round((score / total) * 100);
  const correct  = results.filter(r => r.isCorrect).length;
  const wrong    = results.filter(r => !r.isCorrect).length;
  const skipped  = results.filter(r => r.userAnswer === -1).length;

  const filtered = filter === 'correct' ? results.filter(r => r.isCorrect)
                 : filter === 'wrong'   ? results.filter(r => !r.isCorrect)
                 : results;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 10,
          padding: '8px 16px', cursor: 'pointer', fontSize: 14,
          fontWeight: 600, marginBottom: 24, transition: 'all 0.2s'
        }}
      >
        ← Back to Tests
      </button>

      {/* Header card */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 20, padding: 28, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Score ring */}
          <ScoreRing pct={pct} size={130} />

          {/* Meta info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              {scoreEmoji(pct)} {video_title || 'Quiz'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <LevelBadge level={level} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                📅 {formatDate(created_at)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                ⏱ {formatTime(time_taken)}
              </span>
            </div>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Correct',  val: correct, color: '#22c55e' },
                { label: 'Wrong',    val: wrong,   color: '#ef4444' },
                { label: 'Skipped',  val: skipped, color: '#6b7280' },
                { label: 'Total',    val: total,   color: 'var(--accent)' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '8px 16px', borderRadius: 12,
                  background: `${s.color}14`, border: `1px solid ${s.color}40`,
                  textAlign: 'center', minWidth: 70,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini breakdown bars */}
          <div style={{ minWidth: 200, flex: 1 }}>
            {[
              { label: 'Correct',  val: correct, color: '#22c55e' },
              { label: 'Wrong',    val: wrong,   color: '#ef4444' },
              { label: 'Skipped',  val: skipped, color: '#6b7280' },
            ].map(b => (
              <div key={b.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: b.color }}>{b.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.val}/{total}</span>
                </div>
                <MiniBar value={b.val} max={total} color={b.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance message */}
      <div style={{
        padding: '14px 20px', borderRadius: 14, marginBottom: 24,
        background: `${scoreColor(pct)}14`,
        border: `1px solid ${scoreColor(pct)}40`,
        color: scoreColor(pct), fontWeight: 700, fontSize: 15
      }}>
        {pct >= 90 ? '🌟 Outstanding! You mastered this topic.'
         : pct >= 80 ? '🎉 Great job! Strong performance.'
         : pct >= 60 ? '👍 Good effort! Review the wrong answers below.'
         : pct >= 40 ? '📚 Keep going! Study the explanations and retry.'
         : '💪 Don\'t give up! Go through each explanation carefully.'}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all',     label: `All (${total})` },
          { key: 'correct', label: `✅ Correct (${correct})` },
          { key: 'wrong',   label: `❌ Wrong (${wrong})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f.key ? 'var(--accent-soft)' : 'transparent',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((r, i) => {
          const qIndex = results.indexOf(r);
          const isSkipped = r.userAnswer === -1;
          return (
            <div key={i} style={{
              background: 'var(--bg-secondary)',
              border: `1px solid ${r.isCorrect ? '#22c55e40' : isSkipped ? 'var(--border)' : '#ef444440'}`,
              borderRadius: 16, padding: 22,
              borderLeft: `4px solid ${r.isCorrect ? '#22c55e' : isSkipped ? '#6b7280' : '#ef4444'}`,
            }}>
              {/* Question header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.5, flex: 1 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 8 }}>Q{qIndex + 1}.</span>
                  {r.question}
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: r.isCorrect ? 'rgba(34,197,94,0.15)' : isSkipped ? 'rgba(107,114,128,0.15)' : 'rgba(239,68,68,0.15)',
                  color: r.isCorrect ? '#22c55e' : isSkipped ? '#6b7280' : '#ef4444',
                  border: `1px solid ${r.isCorrect ? '#22c55e40' : isSkipped ? '#6b728040' : '#ef444440'}`
                }}>
                  {r.isCorrect ? '✅ Correct' : isSkipped ? '⏭ Skipped' : '❌ Wrong'}
                </span>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {r.options.map((opt, oi) => {
                  const isCorrectOpt = oi === r.correct;
                  const isUserOpt    = oi === r.userAnswer;
                  let bg = 'var(--bg-primary, transparent)';
                  let border = 'var(--border)';
                  let color = 'var(--text-secondary)';
                  let icon = null;

                  if (isCorrectOpt) {
                    bg = 'rgba(34,197,94,0.1)'; border = '#22c55e60'; color = '#22c55e'; icon = '✓';
                  } else if (isUserOpt && !isCorrectOpt) {
                    bg = 'rgba(239,68,68,0.1)'; border = '#ef444460'; color = '#ef4444'; icon = '✗';
                  }

                  return (
                    <div key={oi} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10,
                      background: bg, border: `1px solid ${border}`,
                      color, fontWeight: isCorrectOpt || isUserOpt ? 600 : 400,
                      fontSize: 14,
                    }}>
                      {icon && <span style={{ fontWeight: 800, fontSize: 14, minWidth: 16 }}>{icon}</span>}
                      <span>{opt}</span>
                      {isCorrectOpt && isUserOpt && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22c55e' }}>Your answer ✓</span>
                      )}
                      {isCorrectOpt && !isUserOpt && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22c55e' }}>Correct answer</span>
                      )}
                      {isUserOpt && !isCorrectOpt && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ef4444' }}>Your answer</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {r.explanation && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', marginRight: 6 }}>💡 Explanation:</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TESTS LIST VIEW
// ══════════════════════════════════════════════════════════════════
export default function Tests() {
  const [attempts, setAttempts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortBy, setSortBy]         = useState('date'); // date | score | level

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/api/quiz/attempts');
        setAttempts(res.data.attempts || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load tests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // If an attempt is selected, show analysis
  if (selectedId) {
    return (
      <AppLayout>
        <div className="page-header">
          <h1 className="page-title">🔍 Test Analysis</h1>
          <p className="page-subtitle">Detailed breakdown of your attempt</p>
        </div>
        <div className="page-body">
          <AnalysisView attemptId={selectedId} onBack={() => setSelectedId(null)} />
        </div>
      </AppLayout>
    );
  }

  // Filter + sort
  let displayed = [...attempts];

  if (search.trim()) {
    const q = search.toLowerCase();
    displayed = displayed.filter(a => (a.video_title || '').toLowerCase().includes(q));
  }

  if (levelFilter !== 'all') {
    displayed = displayed.filter(a => a.level === levelFilter);
  }

  if (sortBy === 'score') {
    displayed.sort((a, b) => (b.score / b.total) - (a.score / a.total));
  } else if (sortBy === 'level') {
    const order = { easy: 0, medium: 1, hard: 2 };
    displayed.sort((a, b) => (order[a.level] || 0) - (order[b.level] || 0));
  }
  // default: date (already sorted by backend)

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts
    ? Math.round(attempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / totalAttempts)
    : 0;
  const passCount = attempts.filter(a => (a.score / a.total) >= 0.6).length;

  if (loading) return (
    <AppLayout>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div style={{ color: 'var(--text-muted)' }}>Loading your tests...</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">📋 My Tests</h1>
        <p className="page-subtitle">All your quiz attempts — click any test to see full analysis</p>
      </div>

      <div className="page-body">
        {error && <div className="error-msg" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        {attempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No tests taken yet</div>
            <p style={{ color: 'var(--text-muted)' }}>Upload a video on the Home page and take a quiz to see your results here.</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              {[
                { icon: '📝', label: 'Total Tests',   value: totalAttempts },
                { icon: '📊', label: 'Average Score', value: `${avgScore}%` },
                { icon: '✅', label: 'Passed (≥60%)', value: passCount },
                { icon: '❌', label: 'Need Review',   value: totalAttempts - passCount },
              ].map(s => (
                <div key={s.label} style={{
                  flex: '1 1 120px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 14, padding: '18px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 20,
              flexWrap: 'wrap', alignItems: 'center'
            }}>
              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Search by video title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 14px',
                  color: 'var(--text-primary)', fontSize: 14,
                  outline: 'none', fontFamily: 'var(--font-body)',
                }}
              />

              {/* Level filter */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'easy', 'medium', 'hard'].map(l => {
                  const m = LEVEL_META[l];
                  const active = levelFilter === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setLevelFilter(l)}
                      style={{
                        padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        border: `1px solid ${active ? (m?.color || 'var(--accent)') : 'var(--border)'}`,
                        background: active ? (m ? m.bg : 'var(--accent-soft)') : 'transparent',
                        color: active ? (m?.color || 'var(--accent)') : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {l === 'all' ? 'All' : `${m.emoji} ${l.charAt(0).toUpperCase() + l.slice(1)}`}
                    </button>
                  );
                })}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 12px',
                  color: 'var(--text-primary)', fontSize: 13,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="date">Sort: Latest</option>
                <option value="score">Sort: Best Score</option>
                <option value="level">Sort: Difficulty</option>
              </select>
            </div>

            {/* Results count */}
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Showing {displayed.length} of {totalAttempts} test{totalAttempts !== 1 ? 's' : ''}
            </div>

            {/* Test cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayed.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tests match your filters.
                </div>
              ) : (
                displayed.map((a, i) => {
                  const pct = Math.round((a.score / a.total) * 100);
                  const color = scoreColor(pct);
                  return (
                    <div
                      key={a.id || i}
                      onClick={() => setSelectedId(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 20,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 16, padding: '18px 22px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        flexWrap: 'wrap',
                        borderLeft: `4px solid ${color}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      {/* Score circle */}
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `${color}18`, border: `2px solid ${color}60`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>
                          {scoreEmoji(pct)} {a.video_title || 'Untitled Quiz'}
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <LevelBadge level={a.level} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            📅 {formatDate(a.created_at)}
                          </span>
                          {a.time_taken && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              ⏱ {formatTime(a.time_taken)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score bar */}
                      <div style={{ minWidth: 140 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.score}/{a.total} correct</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: color, borderRadius: 99,
                            transition: 'width 0.8s ease'
                          }} />
                        </div>
                      </div>

                      {/* Arrow */}
                      <div style={{
                        fontSize: 18, color: 'var(--text-muted)',
                        transition: 'transform 0.2s', flexShrink: 0,
                      }}>
                        →
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}