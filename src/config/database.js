const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'shield-vault.db'));

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    status TEXT DEFAULT 'pending',
    viruses TEXT,
    encrypted_path TEXT,
    signed_url TEXT,
    uploaded_by TEXT DEFAULT 'anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scanned_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS scan_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_uuid TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert a default admin user if none exists
const bcrypt = require('bcryptjs');
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

module.exports = db;
