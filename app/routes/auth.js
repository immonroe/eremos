// Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Root redirect
router.get('/', authController.redirectToAuth);

// Auth page
router.get('/auth', authController.getAuthPage);

// Login routes
router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);

// Signup routes
router.get('/signup', authController.getSignupPage);
router.post('/signup', authController.postSignup);

// Logout
router.get('/logout', authController.getLogout);

// Unlink local account
router.get('/unlink/local', authController.unlinkLocal);

module.exports = router;
