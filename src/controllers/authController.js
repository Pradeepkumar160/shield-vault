const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const config = require('../config/config');
const logger = require('../utils/logger');

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  logger.info('User logged in', { username });
  res.json({ success: true, token, username: user.username, role: user.role });
};

exports.register = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'user');

  logger.info('New user registered', { username });
  res.status(201).json({ success: true, message: 'Account created. Please log in.' });
};

exports.getMe = (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
};
