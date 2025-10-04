// Journal Routes
const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { isLoggedIn } = require('../middleware/auth');

// Create new journal entry
router.post('/messages', isLoggedIn, journalController.createEntry);

// Get specific journal entry
router.get('/entries/:id', isLoggedIn, journalController.getEntry);

// Delete journal entry
router.delete('/messages/:id', isLoggedIn, journalController.deleteEntry);

module.exports = router;
