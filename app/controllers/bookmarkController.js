// Bookmark Controller
const { ObjectId } = require('mongodb');

module.exports = {
    // Toggle bookmark for an entry
    toggleBookmark: async (req, res) => {
        const entryId = req.params.id;
        const userId = req.user._id;

        if (!ObjectId.isValid(entryId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid entry ID format.' 
            });
        }

        try {
            const entry = await req.db.collection('messages').findOne({
                _id: new ObjectId(entryId),
                createdBy: userId
            });

            if (!entry) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Entry not found.' 
                });
            }

            const newBookmarkStatus = !entry.isBookmarked;

            await req.db.collection('messages').updateOne(
                { _id: new ObjectId(entryId) },
                { $set: { isBookmarked: newBookmarkStatus } }
            );

            res.json({
                success: true,
                message: newBookmarkStatus ? 'Entry bookmarked successfully.' : 'Bookmark removed successfully.',
                isBookmarked: newBookmarkStatus
            });

        } catch (error) {
            console.error('Error toggling bookmark:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error updating bookmark.' 
            });
        }
    },

    // Get all bookmarked entries
    getBookmarks: async (req, res) => {
        const userId = req.user._id;
        const searchTerm = req.query.q;

        let filter = { 
            createdBy: userId,
            isBookmarked: true 
        };
        let sortOptions = { createdAt: -1 };
        let projectionOptions = {};

        if (searchTerm && searchTerm.trim() !== "") {
            const trimmedSearchTerm = searchTerm.trim();
            filter.$text = { $search: trimmedSearchTerm };
            projectionOptions.score = { $meta: "textScore" };
            sortOptions = { score: { $meta: "textScore" } };
            console.log(`Searching bookmarks for user ${userId} with term: "${trimmedSearchTerm}"`);
        } else {
            console.log(`Fetching all bookmarked entries for user ${userId}`);
        }

        try {
            const result = await req.db.collection('messages').find(filter)
                .project(projectionOptions)
                .sort(sortOptions)
                .toArray();

            const formattedEntries = result.map(entry => ({
                ...entry,
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : 'Unknown Date',
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'
            }));

            res.render('bookmarks.ejs', {
                title: 'Eremos - Bookmarks',
                user: req.user,
                messages: formattedEntries,
                searchTerm: searchTerm,
                error: req.flash('error'),
                success: req.flash('success')
            });

        } catch (error) {
            console.error("Error fetching bookmarked entries:", error);
            req.flash('error', 'Could not load bookmarked entries.');
            res.redirect('/profile');
        }
    }
};
