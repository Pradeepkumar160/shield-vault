const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { encryptFile, decryptFile } = require('../services/encryptionService');
const { scanFile, isScannerAvailable } = require('../services/scanService');
const { generateSignedUrl, verifySignedUrl } = require('../services/signedUrlService');
const { sendWebhook } = require('../services/webhookService');
const logger = require('../utils/logger');

const encryptedDir = path.join(__dirname, '../../encrypted');
const quarantineDir = path.join(__dirname, '../../quarantine');
const uploadDir = path.join(__dirname, '../../uploads');

[encryptedDir, quarantineDir, uploadDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// POST /api/files/upload
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUuid = uuidv4();
  const uploadedPath = req.file.path;
  const encryptedPath = path.join(encryptedDir, req.file.filename + '.enc');

  // Insert initial record
  db.prepare(`
    INSERT INTO files (uuid, original_name, stored_name, mime_type, size, status, uploaded_by)
    VALUES (?, ?, ?, ?, ?, 'scanning', ?)
  `).run(fileUuid, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user?.username || 'anonymous');

  db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'upload', ?)`)
    .run(fileUuid, `File received: ${req.file.originalname}`);

  try {
    // 1. Encrypt file
    logger.info('Encrypting file', { uuid: fileUuid, file: req.file.originalname });
    await encryptFile(uploadedPath, encryptedPath);
    db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'encrypted', 'AES-256-CBC encryption complete')`)
      .run(fileUuid);

    // 2. Scan file
    logger.info('Scanning file with ClamAV', { uuid: fileUuid });
    const scanResult = await scanFile(uploadedPath);
    const scannedAt = new Date().toISOString();

    db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'scanned', ?)`)
      .run(fileUuid, scanResult.demoMode ? 'Demo scan (ClamAV unavailable) - marked clean' : `ClamAV scan complete. Infected: ${scanResult.isInfected}`);

    if (scanResult.isInfected) {
      // Move to quarantine
      const quarantinePath = path.join(quarantineDir, req.file.filename);
      fs.renameSync(uploadedPath, quarantinePath);

      db.prepare(`UPDATE files SET status='infected', viruses=?, scanned_at=? WHERE uuid=?`)
        .run(JSON.stringify(scanResult.viruses), scannedAt, fileUuid);

      db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'quarantined', ?)`)
        .run(fileUuid, `Viruses: ${scanResult.viruses.join(', ')}`);

      await sendWebhook({ uuid: fileUuid, filename: req.file.originalname, status: 'infected', viruses: scanResult.viruses });

      logger.warn('Infected file quarantined', { uuid: fileUuid, viruses: scanResult.viruses });

      return res.status(400).json({
        success: false,
        message: 'File is infected and has been quarantined',
        uuid: fileUuid,
        viruses: scanResult.viruses
      });
    }

    // Clean file: remove raw upload (encrypted version retained)
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

    // 3. Generate signed URL
    const signedUrlData = generateSignedUrl(req.file.filename + '.enc');

    db.prepare(`UPDATE files SET status='clean', encrypted_path=?, signed_url=?, scanned_at=? WHERE uuid=?`)
      .run(encryptedPath, signedUrlData.url, scannedAt, fileUuid);

    db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'ready', ?)`)
      .run(fileUuid, `Signed URL generated, expires: ${signedUrlData.expires}`);

    // 4. Webhook
    await sendWebhook({ uuid: fileUuid, filename: req.file.originalname, status: 'clean' });

    logger.success('File processed successfully', { uuid: fileUuid });

    return res.json({
      success: true,
      message: 'File uploaded, scanned, and encrypted successfully',
      uuid: fileUuid,
      originalName: req.file.originalname,
      size: req.file.size,
      status: 'clean',
      demoMode: scanResult.demoMode,
      download: signedUrlData,
    });

  } catch (err) {
    logger.error('Upload processing failed', { error: err.message, uuid: fileUuid });
    db.prepare(`UPDATE files SET status='error' WHERE uuid=?`).run(fileUuid);
    db.prepare(`INSERT INTO scan_logs (file_uuid, event, detail) VALUES (?, 'error', ?)`)
      .run(fileUuid, err.message);

    // Cleanup
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

    return res.status(500).json({ success: false, message: 'Processing failed: ' + err.message });
  }
};

// GET /api/files/download/:filename
exports.downloadFile = async (req, res) => {
  const { filename } = req.params;
  const { expires, signature } = req.query;

  if (!verifySignedUrl(filename, expires, signature)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired download link' });
  }

  const filePath = path.join(encryptedDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.download(filePath);
};

// GET /api/files/list
exports.listFiles = (req, res) => {
  const files = db.prepare(`
    SELECT uuid, original_name, mime_type, size, status, viruses, uploaded_by, created_at, scanned_at
    FROM files ORDER BY created_at DESC LIMIT 100
  `).all();

  res.json({ success: true, files });
};

// GET /api/files/:uuid
exports.getFile = (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE uuid = ?').get(req.params.uuid);
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });

  const logs = db.prepare('SELECT event, detail, created_at FROM scan_logs WHERE file_uuid = ? ORDER BY created_at ASC').all(req.params.uuid);

  res.json({ success: true, file, logs });
};

// DELETE /api/files/:uuid
exports.deleteFile = (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE uuid = ?').get(req.params.uuid);
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });

  // Delete physical files
  if (file.encrypted_path && fs.existsSync(file.encrypted_path)) {
    fs.unlinkSync(file.encrypted_path);
  }

  db.prepare('DELETE FROM scan_logs WHERE file_uuid = ?').run(req.params.uuid);
  db.prepare('DELETE FROM files WHERE uuid = ?').run(req.params.uuid);

  logger.info('File deleted', { uuid: req.params.uuid });
  res.json({ success: true, message: 'File deleted' });
};

// GET /api/files/stats
exports.getStats = (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM files').get();
  const clean = db.prepare("SELECT COUNT(*) as count FROM files WHERE status='clean'").get();
  const infected = db.prepare("SELECT COUNT(*) as count FROM files WHERE status='infected'").get();
  const scanning = db.prepare("SELECT COUNT(*) as count FROM files WHERE status='scanning'").get();
  const totalSize = db.prepare('SELECT SUM(size) as total FROM files').get();
  const recentActivity = db.prepare(`
    SELECT f.original_name, f.status, sl.event, sl.detail, sl.created_at
    FROM scan_logs sl JOIN files f ON f.uuid = sl.file_uuid
    ORDER BY sl.created_at DESC LIMIT 10
  `).all();

  res.json({
    success: true,
    stats: {
      total: total.count,
      clean: clean.count,
      infected: infected.count,
      scanning: scanning.count,
      totalSizeBytes: totalSize.total || 0,
      scannerOnline: isScannerAvailable(),
    },
    recentActivity
  });
};

// POST /api/files/regenerate-url/:uuid
exports.regenerateUrl = (req, res) => {
  const file = db.prepare("SELECT * FROM files WHERE uuid = ? AND status = 'clean'").get(req.params.uuid);
  if (!file) return res.status(404).json({ success: false, message: 'File not found or not clean' });

  const signedUrlData = generateSignedUrl(file.stored_name + '.enc');
  db.prepare('UPDATE files SET signed_url = ? WHERE uuid = ?').run(signedUrlData.url, req.params.uuid);

  res.json({ success: true, download: signedUrlData });
};
