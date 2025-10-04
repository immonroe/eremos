// Profile Routes
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const bookmarkController = require('../controllers/bookmarkController');
const activityController = require('../controllers/activityController');
const { isLoggedIn } = require('../middleware/auth');

// Profile page with search
router.get('/profile', isLoggedIn, profileController.getProfile);

// Bookmark routes
router.get('/bookmarks', isLoggedIn, bookmarkController.getBookmarks);
router.post('/entries/:id/toggle-bookmark', isLoggedIn, bookmarkController.toggleBookmark);

// Activity page
router.get('/activity', isLoggedIn, activityController.getActivity);

module.exports = router;
