const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// POST /api/quiz/generate - Generate quiz from video content
router.post('/generate', authenticateToken, async (req, res) => {
  const { videoId, level } = req.body;

  if (!videoId || !level) {
    return res.status(400).json({ error: 'videoId and level are required' });
  }

  if (!['easy', 'medium', 'hard'].includes(level)) {
    return res.status(400).json({ error: 'Level must be easy, medium, or hard' });
  }

  const db = getDb();
  const video = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(videoId, req.user.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const questionCount = level === 'easy' ? 10 : level === 'medium' ? 15 : 20;

  const levelInstructions = {
    easy: 'Create straightforward questions testing basic recall and understanding. Questions should be clear and direct.',
    medium: 'Create questions that test comprehension and application. Include scenario-based questions.',
    hard: 'Create challenging questions testing deep understanding, analysis, and critical thinking. Include complex multi-part concepts.'
  };

  try {
    const prompt = `You are an expert quiz creator. Based on the following educational content, generate exactly ${questionCount} multiple choice questions at ${level.toUpperCase()} difficulty level.

${levelInstructions[level]}

EDUCATIONAL CONTENT:
${video.content}

Generate exactly ${questionCount} MCQ questions. Return ONLY a valid JSON array (no markdown, no extra text) in this exact format:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Rules:
- "correct" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
- All 4 options must be plausible
- Questions must be directly from the provided content
- No duplicate questions
- Return ONLY the JSON array, nothing else`;

    const grokResponse = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    let rawContent = grokResponse.data.choices[0].message.content.trim();
    
    // Clean up potential markdown code blocks
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extract JSON array
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No valid JSON array found in response');

    const questions = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format');
    }

    // Save quiz to DB
    const quizResult = db.prepare(
      'INSERT INTO quizzes (video_id, user_id, level, questions) VALUES (?, ?, ?, ?)'
    ).run(videoId, req.user.id, level, JSON.stringify(questions));

    res.json({
      quizId: quizResult.lastInsertRowid,
      level,
      questionCount: questions.length,
      questions,
      videoTitle: video.title
    });

  } catch (error) {
    console.error('Quiz generation error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid GROQ API key' });
    }

    res.status(500).json({
      error: 'Failed to generate quiz',
      details: error.message
    });
  }
});

// POST /api/quiz/submit - Submit quiz attempt
router.post('/submit', authenticateToken, (req, res) => {
  const { quizId, answers, timeTaken } = req.body;

  if (!quizId || !answers || timeTaken === undefined) {
    return res.status(400).json({ error: 'quizId, answers, and timeTaken are required' });
  }

  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(quizId, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const video = db.prepare('SELECT title FROM videos WHERE id = ?').get(quiz.video_id);
  const questions = JSON.parse(quiz.questions);

  // Calculate score
  let score = 0;
  const detailedResults = questions.map((q, idx) => {
    const userAnswer = answers[idx] !== undefined ? parseInt(answers[idx]) : -1;
    const isCorrect = userAnswer === q.correct;
    if (isCorrect) score++;
    return {
      question: q.question,
      options: q.options,
      userAnswer,
      correct: q.correct,
      isCorrect,
      explanation: q.explanation
    };
  });

  // Save attempt
  const attemptResult = db.prepare(
    `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, total, time_taken, level, video_title)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    quizId,
    req.user.id,
    JSON.stringify(answers),
    score,
    questions.length,
    timeTaken,
    quiz.level,
    video?.title || 'Unknown'
  );

  res.json({
    attemptId: attemptResult.lastInsertRowid,
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
    results: detailedResults,
    level: quiz.level,
    videoTitle: video?.title || 'Unknown',
    timeTaken
  });
});

// GET /api/quiz/attempts - Get all quiz attempts for user
router.get('/attempts', authenticateToken, (req, res) => {
  const db = getDb();
  const attempts = db.prepare(
    `SELECT qa.*, q.video_id FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     WHERE qa.user_id = ?
     ORDER BY qa.created_at DESC`
  ).all(req.user.id);

  res.json({ attempts });
});

// GET /api/quiz/attempt/:id - Get specific attempt details
router.get('/attempt/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const attempt = db.prepare(
    'SELECT qa.*, q.questions FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.id = ? AND qa.user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const questions = JSON.parse(attempt.questions);
  const answers = JSON.parse(attempt.answers);

  const results = questions.map((q, idx) => {
    const userAnswer = answers[idx] !== undefined ? parseInt(answers[idx]) : -1;
    return {
      question: q.question,
      options: q.options,
      userAnswer,
      correct: q.correct,
      isCorrect: userAnswer === q.correct,
      explanation: q.explanation
    };
  });

  res.json({ attempt: { ...attempt, results } });
});

// GET /api/quiz/performance - Performance analytics
router.get('/performance', authenticateToken, (req, res) => {
  const db = getDb();

  const attempts = db.prepare(
    'SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  if (attempts.length === 0) {
    return res.json({ performance: null, attempts: [] });
  }

  const totalAttempts = attempts.length;
  const avgScore = attempts.reduce((sum, a) => sum + (a.score / a.total * 100), 0) / totalAttempts;
  const bestScore = Math.max(...attempts.map(a => a.score / a.total * 100));
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);

  // By level
  const byLevel = { easy: [], medium: [], hard: [] };
  attempts.forEach(a => {
    if (byLevel[a.level]) byLevel[a.level].push((a.score / a.total) * 100);
  });

  const levelStats = {};
  Object.entries(byLevel).forEach(([level, scores]) => {
    levelStats[level] = {
      count: scores.length,
      avg: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
      best: scores.length ? Math.max(...scores) : 0
    };
  });

  // Recent trend (last 10)
  const trend = attempts.slice(0, 10).reverse().map((a, i) => ({
    index: i + 1,
    score: Math.round((a.score / a.total) * 100),
    level: a.level,
    title: a.video_title,
    date: a.created_at
  }));

  res.json({
    performance: {
      totalAttempts,
      avgScore: Math.round(avgScore),
      bestScore: Math.round(bestScore),
      totalQuestions,
      totalCorrect,
      accuracy: Math.round((totalCorrect / totalQuestions) * 100),
      levelStats,
      trend
    },
    attempts: attempts.slice(0, 20)
  });
});

module.exports = router;