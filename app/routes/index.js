// Main Route Aggregator
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const journalRoutes = require('./journal');
const profileRoutes = require('./profile');

// Use route modules
router.use('/', authRoutes);
router.use('/', journalRoutes);
router.use('/', profileRoutes);

module.exports = router;
