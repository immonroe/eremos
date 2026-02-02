// Profile Controller
module.exports = {
    // Get user profile with search and pagination
    getProfile: async (req, res) => {
        const userId = req.user._id;
        const searchTerm = req.query.q;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));

        let filter = { createdBy: userId };
        let sortOptions = { createdAt: -1 };
        let projectionOptions = {};

        if (searchTerm && searchTerm.trim() !== "") {
            const trimmedSearchTerm = searchTerm.trim();
            filter.$text = { $search: trimmedSearchTerm };
            projectionOptions.score = { $meta: "textScore" };
            sortOptions = { score: { $meta: "textScore" } };
        }

        try {
            const collection = req.db.collection('messages');
            const totalEntries = await collection.countDocuments(filter);
            const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
            const currentPage = Math.min(page, totalPages);
            const skip = (currentPage - 1) * limit;

            const result = await collection.find(filter)
                .project(projectionOptions)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .toArray();

            const messageIds = result.map(m => m._id);
            const bookmarks = await req.db.collection('bookmarks').find({
                userId,
                messageId: { $in: messageIds }
            }).toArray();
            const bookmarkedIds = new Set(bookmarks.map(b => b.messageId.toString()));

            const formattedEntries = result.map(entry => ({
                ...entry,
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time,
                isBookmarked: bookmarkedIds.has(entry._id.toString())
            }));

            res.render('profile.ejs', {
                title: 'Eremos - Journal',
                user: req.user,
                messages: formattedEntries,
                searchTerm: searchTerm || '',
                totalEntries,
                totalPages,
                currentPage,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (err) {
            console.error("Error fetching profile entries:", err);
            req.flash('error', 'Could not load journal entries.');
            res.redirect('/profile');
        }
    },

    // Fragment for infinite scroll: returns HTML for next page of entries
    getProfileEntriesFragment: async (req, res) => {
        const userId = req.user._id;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(20, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));

        try {
            const collection = req.db.collection('messages');
            const filter = { createdBy: userId };
            const totalEntries = await collection.countDocuments(filter);
            const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
            const currentPage = Math.min(page, totalPages);
            const skip = (currentPage - 1) * limit;

            const result = await collection.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const messageIds = result.map(m => m._id);
            const bookmarks = await req.db.collection('bookmarks').find({
                userId,
                messageId: { $in: messageIds }
            }).toArray();
            const bookmarkedIds = new Set(bookmarks.map(b => b.messageId.toString()));

            const messages = result.map(entry => ({
                ...entry,
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time,
                isBookmarked: bookmarkedIds.has(entry._id.toString())
            }));

            const hasMore = currentPage < totalPages;
            const nextPage = hasMore ? currentPage + 1 : '';

            res.render('partials/_entries-fragment', {
                messages,
                hasMore,
                nextPage,
                listType: 'profile'
            });
        } catch (err) {
            console.error("Error fetching profile entries fragment:", err);
            res.status(500).send('');
        }
    }
};
