const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLoginRequest } = require('../validators/authValidator');

router.post('/login', validateLoginRequest, authController.login);

module.exports = router;
