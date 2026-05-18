const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const ctrl = require('../controllers/fileController');

// All file routes require authentication except download (uses signed URL)
router.get('/stats', auth, ctrl.getStats);
router.get('/list', auth, ctrl.listFiles);
router.get('/download/:filename', ctrl.downloadFile); // signed URL auth
router.get('/:uuid', auth, ctrl.getFile);
router.post('/upload', auth, upload.single('file'), ctrl.uploadFile);
router.post('/regenerate-url/:uuid', auth, ctrl.regenerateUrl);
router.delete('/:uuid', auth, ctrl.deleteFile);

module.exports = router;
