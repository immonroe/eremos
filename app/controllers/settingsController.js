// Settings Controller - user preferences (e.g. AI opt-out)
const User = require('../models/user');

module.exports = {
    getSettings: (req, res) => {
        const aiReflections = req.user.preferences && req.user.preferences.aiReflections !== false;
        res.render('settings.ejs', {
            title: 'Eremos - Settings',
            user: req.user,
            aiReflections,
            error: req.flash('error'),
            success: req.flash('success')
        });
    },

    postSettings: async (req, res) => {
        const aiReflections = req.body.aiReflections === 'true' || req.body.aiReflections === 'on';
        try {
            if (!req.user.preferences) req.user.preferences = {};
            req.user.preferences.aiReflections = aiReflections;
            await req.user.save();
            req.flash('success', 'Settings saved.');
        } catch (err) {
            console.error('Error saving settings:', err);
            req.flash('error', 'Could not save settings.');
        }
        res.redirect('/settings');
    }
};
