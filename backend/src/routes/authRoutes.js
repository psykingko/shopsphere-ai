const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLoginRequest } = require('../validators/authValidator');
const { requireAuthentication } = require('../middleware/authentication');

router.post('/login', validateLoginRequest, authController.login);
router.get('/session', requireAuthentication, authController.session);
router.post('/logout', authController.logout);

module.exports = router;
