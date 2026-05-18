const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', auth, ctrl.getMe);

module.exports = router;
