// Account Controller - delete account and related data
const User = require('../models/user');

module.exports = {
    // Show delete-account confirmation page
    getDeleteAccountPage: (req, res) => {
        res.render('account-delete.ejs', {
            title: 'Eremos - Delete Account',
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    },

    // Delete account and all user data (requires confirmation)
    postDeleteAccount: async (req, res) => {
        const confirmText = (req.body.confirmText || '').trim().toUpperCase();
        const confirmCheckbox = req.body.confirmCheckbox === 'true' || req.body.confirmCheckbox === true;

        if (confirmText !== 'DELETE' || !confirmCheckbox) {
            req.flash('error', 'To delete your account, you must check the box and type DELETE in the box.');
            return res.redirect('/account/delete');
        }

        const userId = req.user._id;

        try {
            // Delete all messages (journal entries) for this user
            await req.db.collection('messages').deleteMany({ createdBy: userId });

            // Delete user
            await User.findByIdAndDelete(userId);

            req.logout((err) => {
                if (err) {
                    console.error('Logout error after account delete:', err);
                }
                req.session.destroy(() => {
                    res.clearCookie('connect.sid');
                    res.redirect('/?accountDeleted=1');
                });
            });
        } catch (err) {
            console.error('Error deleting account:', err);
            req.flash('error', 'Could not delete your account. Please try again.');
            res.redirect('/account/delete');
        }
    }
};
