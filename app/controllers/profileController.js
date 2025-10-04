// Profile Controller
module.exports = {
    // Get user profile with search functionality
    getProfile: (req, res) => {
        const userId = req.user._id;
        const searchTerm = req.query.q;

        let filter = { createdBy: userId };
        let sortOptions = { createdAt: -1 };
        let projectionOptions = {};

        if (searchTerm && searchTerm.trim() !== "") {
            const trimmedSearchTerm = searchTerm.trim();
            filter.$text = { $search: trimmedSearchTerm };
            projectionOptions.score = { $meta: "textScore" };
            sortOptions = { score: { $meta: "textScore" } };
            console.log(`Searching profile for user ${userId} with term: "${trimmedSearchTerm}"`);
        } else {
            console.log(`Fetching all profile entries for user ${userId}`);
        }

        req.db.collection('messages').find(filter)
            .project(projectionOptions)
            .sort(sortOptions)
            .toArray((err, result) => {
                if (err) {
                    console.error("Error fetching profile entries:", err);
                    req.flash('error', 'Could not load journal entries.');
                    return res.redirect('/profile');
                }
                const formattedEntries = result.map(entry => ({
                    ...entry, // spread op
                    displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                    displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
                }));
                res.render('profile.ejs', {
                    title: 'Eremos - Journal',
                    user: req.user,
                    messages: formattedEntries,
                    searchTerm: searchTerm,
                    error: req.flash('error'),
                    success: req.flash('success')
                });
            });
    }
};
