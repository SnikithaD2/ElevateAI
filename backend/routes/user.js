const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');

// GET /api/user/me
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos WHERE user_id = ?').get(req.user.id);
  const quizCount  = db.prepare('SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?').get(req.user.id);

  res.json({ user, stats: { videos: videoCount.count, quizzes: quizCount.count } });
});

// PUT /api/user/me — update name (and email if provided)
router.put('/me', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  if (!name || name.trim().length < 2)
    return res.status(400).json({ error: 'Name must be at least 2 characters' });

  const db = getDb();

  // Check email uniqueness if email is being changed
  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), req.user.id);
    if (existing) return res.status(409).json({ error: 'Email already in use by another account' });
    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.trim().toLowerCase(), req.user.id);
  } else {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
  }

  res.json({ message: 'Profile updated successfully' });
});

// DELETE /api/user/me — delete account
router.delete('/me', authenticateToken, (req, res) => {
  const db = getDb();
  // Cascades will handle videos, quizzes, attempts (if foreign keys are ON)
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ message: 'Account deleted successfully' });
});

// GET /api/user/profile (alias)
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos WHERE user_id = ?').get(req.user.id);
  const quizCount  = db.prepare('SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?').get(req.user.id);

  res.json({ user, stats: { videos: videoCount.count, quizzes: quizCount.count } });
});

// PUT /api/user/profile (alias)
router.put('/profile', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2)
    return res.status(400).json({ error: 'Name must be at least 2 characters' });

  const db = getDb();
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
  res.json({ message: 'Profile updated successfully' });
});

// PUT /api/user/password
// Accepts both "currentPassword" and "oldPassword" so both frontend and backend match
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, oldPassword, newPassword } = req.body;
  const current = currentPassword || oldPassword; // support both field names

  if (!current || !newPassword)
    return res.status(400).json({ error: 'Current and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(current, user.password);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hashed = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;