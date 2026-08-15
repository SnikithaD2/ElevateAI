import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { API } from '../context/AuthContext';

export default function Quiz() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [selectedLevel, setSelectedLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState(null);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const { videoId, title } = state || {};

  useEffect(() => {
    if (!videoId) navigate('/home');
  }, [videoId, navigate]);

  const handleGenerateQuiz = async () => {
    if (!selectedLevel) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/api/quiz/generate', { videoId, level: selectedLevel });
      setQuestions(res.data.questions);
      setQuizId(res.data.quizId);
      setStarted(true);
      setStartTime(Date.now());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex) => {
    setAnswers(prev => ({ ...prev, [currentQ]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    try {
      const res = await API.post('/api/quiz/submit', {
        quizId,
        answers,
        timeTaken
      });
      navigate('/quiz/results', { state: res.data });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
    }
  };

  const levels = [
    { id: 'easy', label: '😊 Easy', desc: '10 questions • Basic recall', color: '#22c55e' },
    { id: 'medium', label: '🤔 Medium', desc: '15 questions • Comprehension', color: '#f59e0b' },
    { id: 'hard', label: '🔥 Hard', desc: '20 questions • Deep analysis', color: '#ef4444' },
  ];

  // Level selection screen
  if (!started) {
    return (
      <AppLayout>
        <div className="page-header">
          <h1 className="page-title">🎯 Generate Quiz</h1>
          <p className="page-subtitle">{title}</p>
        </div>
        <div className="page-body">
          {error && <div className="error-msg" style={{ marginBottom: 20 }}>⚠️ {error}</div>}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Select Difficulty Level</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {levels.map(level => (
                <div
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  style={{
                    flex: 1,
                    padding: '20px',
                    borderRadius: 'var(--radius)',
                    border: `2px solid ${selectedLevel === level.id ? level.color : 'var(--border)'}`,
                    background: selectedLevel === level.id ? `${level.color}15` : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{level.label.split(' ')[0]}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{level.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-secondary text-sm">{level.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleGenerateQuiz}
            disabled={!selectedLevel || loading}
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? '⏳ Generating Quiz...' : '🚀 Start Quiz'}
          </button>
        </div>
      </AppLayout>
    );
  }

  // Quiz screen
  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">🎯 {title}</h1>
        <p className="page-subtitle">
          Question {currentQ + 1} of {questions.length} • {selectedLevel.toUpperCase()} • {answeredCount} answered
        </p>
      </div>
      <div className="page-body">
        {error && <div className="error-msg" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        {/* Progress bar */}
        <div className="progress-bar" style={{ marginBottom: 24 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Question card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 20, lineHeight: 1.5 }}>
            Q{currentQ + 1}. {q.question}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {q.options.map((option, i) => (
              <div
                key={i}
                onClick={() => handleAnswer(i)}
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius)',
                  border: `2px solid ${answers[currentQ] === i ? 'var(--accent)' : 'var(--border)'}`,
                  background: answers[currentQ] === i ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: answers[currentQ] === i ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: answers[currentQ] === i ? 600 : 400
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={handlePrev}
            disabled={currentQ === 0}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
            {questions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: answers[i] !== undefined ? 'var(--accent)' : 'var(--bg-secondary)',
                  border: `1px solid ${i === currentQ ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: answers[i] !== undefined ? 'white' : 'var(--text-muted)'
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {currentQ === questions.length - 1 ? (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={answeredCount < questions.length}
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              ✅ Submit
            </button>
          ) : (
            <button className="btn-secondary" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>

        {answeredCount < questions.length && currentQ === questions.length - 1 && (
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 12 }}>
            ⚠️ Please answer all questions before submitting ({questions.length - answeredCount} remaining)
          </p>
        )}
      </div>
    </AppLayout>
  );
}