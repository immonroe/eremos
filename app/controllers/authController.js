// Authentication Controller
const passport = require('passport');

module.exports = {
    // Get authentication page
    getAuthPage: (req, res) => {
        res.render('auth.ejs', {
            message: req.flash('loginMessage') || req.flash('signupMessage'),
            activeTab: req.query.tab || 'login'
        });
    },

    // Redirect root to auth
    redirectToAuth: (req, res) => {
        res.redirect('/auth');
    },

    // Get login page (redirect to auth with login tab)
    getLoginPage: (req, res) => {
        res.redirect('/auth?tab=login');
    },

    // Handle login
    postLogin: passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/auth?tab=login',
        failureFlash: true
    }),

    // Get signup page (redirect to auth with signup tab)
    getSignupPage: (req, res) => {
        res.redirect('/auth?tab=signup');
    },

    // Handle signup
    postSignup: passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/auth?tab=signup',
        failureFlash: true
    }),

    // Handle logout
    getLogout: (req, res, next) => {
        console.log("Attempting logout (sync assumption)...");
        if (!req.isAuthenticated()) {
            console.log("User not authenticated, redirecting.");
            return res.redirect('/auth');
        }

        req.logout();
        console.log("Called req.logout() directly.");

        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                console.error("Error destroying session during logout:", destroyErr);
                // Still try to redirect even if session destroy fails
            }
            console.log("Session destroyed (or destroy attempt finished).");
            res.clearCookie('connect.sid');
            res.redirect('/auth');
        });
    },

    // Unlink local account
    unlinkLocal: (req, res) => {
        const user = req.user;
        user.local.email = undefined;
        user.local.password = undefined;
        user.save((err) => {
            res.redirect('/profile');
        });
    }
};
