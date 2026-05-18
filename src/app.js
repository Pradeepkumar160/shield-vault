require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const config = require('./config/config');

// Initialize database (creates tables + default admin)
require('./config/database');

const app = express();

// Ensure all required directories exist
const dirs = ['uploads', 'encrypted', 'quarantine', 'data'];
dirs.forEach(dir => {
  const p = path.join(__dirname, '..', dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  const { isScannerAvailable } = require('./services/scanService');
  res.json({
    status: 'ok',
    app: 'ShieldVault',
    version: '1.0.0',
    scannerOnline: isScannerAvailable(),
    timestamp: new Date().toISOString()
  });
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: err.field || 'File type not allowed' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Serve dashboard for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.port, () => {
  logger.success(`ShieldVault running on http://localhost:${config.port}`);
  logger.info('Default login: admin / admin123');
});
