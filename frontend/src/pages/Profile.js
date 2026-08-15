import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { API } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const LEVEL_META = {
  easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  emoji: '😊' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '🤔' },
  hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  emoji: '🔥' },
};

// ── Avatar initials ──────────────────────────────────────────────
function Avatar({ name, size = 80 }) {
  const initials = (name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    ['#6366f1', '#818cf8'],
    ['#06b6d4', '#22d3ee'],
    ['#8b5cf6', '#a78bfa'],
    ['#ec4899', '#f472b6'],
    ['#f59e0b', '#fbbf24'],
  ];
  const pick = colors[(name || 'U').charCodeAt(0) % colors.length];

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${pick[0]}, ${pick[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
      flexShrink: 0, letterSpacing: 1,
      boxShadow: `0 4px 20px ${pick[0]}60`,
    }}>
      {initials}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      flex: '1 1 130px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Radial progress ──────────────────────────────────────────────
function RadialProgress({ pct, color, label, size = 80 }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="35" cy="35" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="35" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Achievement badge ────────────────────────────────────────────
function Achievement({ icon, title, desc, unlocked }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderRadius: 14,
      background: unlocked ? 'var(--accent-soft)' : 'var(--bg-secondary)',
      border: `1px solid ${unlocked ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
      opacity: unlocked ? 1 : 0.5,
      transition: 'all 0.2s',
    }}>
      <div style={{ fontSize: 28, filter: unlocked ? 'none' : 'grayscale(1)' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: unlocked ? 'var(--accent)' : 'var(--text-muted)' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      {unlocked && (
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700,
          color: 'var(--accent)', background: 'var(--accent-soft)',
          padding: '3px 10px', borderRadius: 20,
          border: '1px solid rgba(99,102,241,0.3)'
        }}>
          Unlocked
        </span>
      )}
    </div>
  );
}

// ── Input field ──────────────────────────────────────────────────
function InputField({ label, value, onChange, type = 'text', disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          background: disabled ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: '11px 14px',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          fontSize: 14, outline: 'none',
          fontFamily: 'var(--font-body)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ══════════════════════════════════════════════════════════════════
export default function Profile() {
  const [user, setUser]           = useState(null);
  const [perf, setPerf]           = useState(null);
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState('overview'); // overview | settings
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');

  // Edit fields
  const [editName, setEditName]   = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [oldPass, setOldPass]     = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [perfRes, videosRes] = await Promise.all([
          API.get('/api/quiz/performance'),
          API.get('/api/video/list'),
        ]);
        setPerf(perfRes.data.performance);
        setVideos(videosRes.data.videos || []);

        // Try to get user info from token or a /api/user/me endpoint
        try {
          const userRes = await API.get('/api/user/me');
          setUser(userRes.data.user || userRes.data);
          setEditName(userRes.data.user?.name || userRes.data?.name || '');
          setEditEmail(userRes.data.user?.email || userRes.data?.email || '');
        } catch {
          // Fallback: parse from localStorage token if available
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setUser({ name: payload.name || payload.username || 'User', email: payload.email || '' });
              setEditName(payload.name || payload.username || '');
              setEditEmail(payload.email || '');
            } catch { setUser({ name: 'User', email: '' }); }
          } else {
            setUser({ name: 'User', email: '' });
          }
        }
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Computed achievements ──────────────────────────────────────
  const totalAttempts  = perf?.totalAttempts || 0;
  const avgScore       = perf?.avgScore      || 0;
  const bestScore      = perf?.bestScore     || 0;
  const hardAttempts   = perf?.levelStats?.hard?.count || 0;
  const totalVideos    = videos.length;
  const perfectScores  = perf ? (perf.trend || []).filter(t => t.score === 100).length : 0;

  const achievements = [
    { icon: '🎯', title: 'First Quiz',       desc: 'Complete your first quiz',              unlocked: totalAttempts >= 1 },
    { icon: '📚', title: 'Studious',         desc: 'Complete 5 quizzes',                    unlocked: totalAttempts >= 5 },
    { icon: '🏆', title: 'Quiz Master',      desc: 'Complete 20 quizzes',                   unlocked: totalAttempts >= 20 },
    { icon: '🌟', title: 'Perfect Score',    desc: 'Score 100% on a quiz',                  unlocked: bestScore === 100 || perfectScores > 0 },
    { icon: '🔥', title: 'Hard Mode',        desc: 'Complete a hard difficulty quiz',        unlocked: hardAttempts >= 1 },
    { icon: '💪', title: 'Hard Grinder',     desc: 'Complete 5 hard quizzes',               unlocked: hardAttempts >= 5 },
    { icon: '🎬', title: 'Content Creator',  desc: 'Upload 3 videos',                       unlocked: totalVideos >= 3 },
    { icon: '📈', title: 'High Achiever',    desc: 'Maintain 80%+ average score',           unlocked: avgScore >= 80 },
    { icon: '⚡', title: 'Speed Runner',     desc: 'Complete a quiz in under 3 minutes',    unlocked: (perf?.trend || []).some(t => t.time_taken && t.time_taken < 180) },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) return (
    <AppLayout>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div style={{ color: 'var(--text-muted)' }}>Loading profile...</div>
      </div>
    </AppLayout>
  );

  // ── Save profile handler ───────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) return setSaveMsg('❌ Name cannot be empty.');
    setSaving(true); setSaveMsg('');
    try {
      await API.put('/api/user/me', { name: editName.trim(), email: editEmail.trim() });
      setUser(prev => ({ ...prev, name: editName, email: editEmail }));
      setSaveMsg('✅ Profile updated!');
    } catch (e) {
      setSaveMsg(e.response?.data?.error || '❌ Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPass || !newPass || !confirmPass) return setSaveMsg('❌ Fill all password fields.');
    if (newPass !== confirmPass) return setSaveMsg('❌ New passwords do not match.');
    if (newPass.length < 6) return setSaveMsg('❌ Password must be at least 6 characters.');
    setSaving(true); setSaveMsg('');
    try {
      await API.put('/api/user/password', { oldPassword: oldPass, newPassword: newPass });
      setSaveMsg('✅ Password changed successfully!');
      setOldPass(''); setNewPass(''); setConfirmPass('');
    } catch (e) {
      setSaveMsg(e.response?.data?.error || '❌ Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">👤 Profile</h1>
        <p className="page-subtitle">Your account, stats and achievements</p>
      </div>

      <div className="page-body">
        {error && <div className="error-msg" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        {/* ── Profile hero card ── */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 32px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <Avatar name={user?.name} size={80} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>{user?.email || ''}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                🎓 Student
              </span>
              {user?.created_at && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  📅 Joined {formatDate(user.created_at)}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Quizzes', value: totalAttempts },
              { label: 'Videos',  value: totalVideos   },
              { label: 'Badges',  value: `${unlockedCount}/${achievements.length}` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['overview', 'achievements', 'settings'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSaveMsg(''); }}
              style={{
                padding: '8px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
                background: tab === t ? 'var(--accent-soft)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
              }}
            >
              {t === 'overview' ? '📊 Overview' : t === 'achievements' ? '🏅 Achievements' : '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatCard icon="🎯" label="Avg Score"      value={perf ? `${avgScore}%` : '—'}       color={perf ? scoreColor(avgScore) : undefined} />
              <StatCard icon="🏆" label="Best Score"     value={perf ? `${bestScore}%` : '—'}      color={perf ? scoreColor(bestScore) : undefined} />
              <StatCard icon="📝" label="Total Quizzes"  value={totalAttempts} />
              <StatCard icon="✅" label="Accuracy"       value={perf ? `${perf.accuracy}%` : '—'}  color={perf ? scoreColor(perf.accuracy) : undefined} />
              <StatCard icon="🎬" label="Videos Uploaded" value={totalVideos} />
            </div>

            {/* Performance by difficulty */}
            {perf && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🎯 Performance by Difficulty</div>
                <div style={{ display: 'flex', gap: 32, justifyContent: 'space-around', flexWrap: 'wrap' }}>
                  {['easy', 'medium', 'hard'].map(lvl => {
                    const s = perf.levelStats?.[lvl] || { avg: 0, count: 0, best: 0 };
                    const m = LEVEL_META[lvl];
                    return (
                      <div key={lvl} style={{ textAlign: 'center' }}>
                        <RadialProgress pct={Math.round(s.avg)} color={m.color} label={`${m.emoji} ${lvl}`} size={85} />
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          {s.count} attempt{s.count !== 1 ? 's' : ''} · Best {Math.round(s.best)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent videos */}
            {videos.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🎬 Recent Videos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videos.slice(0, 5).map((v, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 12,
                      background: 'var(--bg-primary, rgba(0,0,0,0.15))',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 22 }}>🎬</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{v.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(v.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!perf && (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 16,
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No quiz data yet</div>
                <div style={{ color: 'var(--text-muted)' }}>Take some quizzes to see your performance stats here.</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ ACHIEVEMENTS TAB ══════════ */}
        {tab === 'achievements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 20px', marginBottom: 8,
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>🏅 Your Badges</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {unlockedCount} of {achievements.length} unlocked
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ minWidth: 200 }}>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(unlockedCount / achievements.length) * 100}%`,
                    background: 'var(--accent)', borderRadius: 99,
                    transition: 'width 1s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {Math.round((unlockedCount / achievements.length) * 100)}% complete
                </div>
              </div>
            </div>

            {/* Unlocked first */}
            {[...achievements].sort((a, b) => b.unlocked - a.unlocked).map((ach, i) => (
              <Achievement key={i} {...ach} />
            ))}
          </div>
        )}

        {/* ══════════ SETTINGS TAB ══════════ */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Save message */}
            {saveMsg && (
              <div style={{
                padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${saveMsg.startsWith('✅') ? '#22c55e40' : '#ef444440'}`,
                color: saveMsg.startsWith('✅') ? '#22c55e' : '#ef4444',
              }}>
                {saveMsg}
              </div>
            )}

            {/* Edit profile */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>✏️ Edit Profile</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InputField
                  label="Full Name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
                <InputField
                  label="Email Address"
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                />
                <button
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ width: 'auto', padding: '11px 28px', alignSelf: 'flex-start' }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>

            {/* Change password */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🔒 Change Password</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InputField
                  label="Current Password"
                  type="password"
                  value={oldPass}
                  onChange={e => setOldPass(e.target.value)}
                />
                <InputField
                  label="New Password"
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
                <InputField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                />
                <button
                  className="btn-primary"
                  onClick={handleChangePassword}
                  disabled={saving}
                  style={{ width: 'auto', padding: '11px 28px', alignSelf: 'flex-start' }}
                >
                  {saving ? '⏳ Updating...' : '🔒 Update Password'}
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#ef4444', marginBottom: 8 }}>⚠️ Danger Zone</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Deleting your account is permanent and cannot be undone. All your videos, quizzes, and progress will be lost.
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This will permanently delete your account and all data.')) {
                    API.delete('/api/user/me')
                      .then(() => { localStorage.clear(); window.location.href = '/login'; })
                      .catch(e => setSaveMsg(e.response?.data?.error || '❌ Failed to delete account.'));
                  }
                }}
                style={{
                  padding: '10px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                🗑️ Delete My Account
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}