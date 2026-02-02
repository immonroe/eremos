// Settings routes
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/settings', isLoggedIn, settingsController.getSettings);
router.post('/settings', isLoggedIn, settingsController.postSettings);

module.exports = router;
