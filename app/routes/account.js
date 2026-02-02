// Account routes (e.g. delete account)
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/account/delete', isLoggedIn, accountController.getDeleteAccountPage);
router.post('/account/delete', isLoggedIn, accountController.postDeleteAccount);

module.exports = router;
