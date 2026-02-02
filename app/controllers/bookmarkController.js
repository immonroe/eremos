// Bookmark Controller - bookmarks stored in dedicated `bookmarks` collection
const { ObjectId } = require('mongodb');

const BOOKMARKS_COLLECTION = 'bookmarks';

module.exports = {
    // Toggle bookmark: add or remove document in bookmarks collection
    toggleBookmark: async (req, res) => {
        const entryId = req.params.id;
        const userId = req.user._id;
        const userIdObj = userId instanceof ObjectId ? userId : new ObjectId(userId.toString());

        if (!ObjectId.isValid(entryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entry ID format.'
            });
        }

        const messageIdObj = new ObjectId(entryId);

        try {
            const entry = await req.db.collection('messages').findOne({
                _id: messageIdObj,
                createdBy: userIdObj
            });

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message: 'Entry not found.'
                });
            }

            const bookmarks = req.db.collection(BOOKMARKS_COLLECTION);
            const existing = await bookmarks.findOne({ userId: userIdObj, messageId: messageIdObj });

            let isBookmarked;
            if (existing) {
                await bookmarks.deleteOne({ userId: userIdObj, messageId: messageIdObj });
                isBookmarked = false;
            } else {
                await bookmarks.insertOne({
                    userId: userIdObj,
                    messageId: messageIdObj,
                    createdAt: new Date()
                });
                isBookmarked = true;
            }

            res.json({
                success: true,
                message: isBookmarked ? 'Entry bookmarked successfully.' : 'Bookmark removed successfully.',
                isBookmarked
            });
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating bookmark.'
            });
        }
    },

    // Get bookmarked entries (paginated, default 10 per page)
    getBookmarks: async (req, res) => {
        const userId = req.user._id;
        const userIdObj = userId instanceof ObjectId ? userId : new ObjectId(userId.toString());
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));

        try {
            const bookmarksColl = req.db.collection(BOOKMARKS_COLLECTION);
            const messagesColl = req.db.collection('messages');

            const bookmarksList = await bookmarksColl
                .find({ userId: userIdObj })
                .sort({ createdAt: -1 })
                .toArray();

            let messageIds = bookmarksList.map(b => b.messageId);

            const legacyBookmarked = await messagesColl
                .find({
                    createdBy: userIdObj,
                    isBookmarked: true
                })
                .project({ _id: 1 })
                .toArray();

            const fromNew = new Set(messageIds.map(id => id.toString()));
            for (const m of legacyBookmarked) {
                if (!fromNew.has(m._id.toString())) {
                    messageIds.push(m._id);
                }
            }

            const totalEntries = messageIds.length;
            const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
            const currentPage = Math.min(page, totalPages);
            const start = (currentPage - 1) * limit;
            const pageIds = messageIds.slice(start, start + limit);

            if (pageIds.length === 0) {
                return res.render('bookmarks.ejs', {
                    title: 'Eremos - Bookmarks',
                    user: req.user,
                    messages: [],
                    searchTerm: '',
                    totalEntries: totalEntries,
                    totalPages,
                    currentPage,
                    error: req.flash('error'),
                    success: req.flash('success')
                });
            }

            const messages = await messagesColl.find({
                _id: { $in: pageIds },
                createdBy: userIdObj
            }).toArray();

            const byId = new Map(messages.map(m => [m._id.toString(), m]));
            const ordered = pageIds.map(id => byId.get((id instanceof ObjectId ? id : new ObjectId(id)).toString())).filter(Boolean);

            const formattedEntries = ordered.map(entry => ({
                ...entry,
                isBookmarked: true,
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : 'Unknown Date',
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'
            }));

            res.render('bookmarks.ejs', {
                title: 'Eremos - Bookmarks',
                user: req.user,
                messages: formattedEntries,
                searchTerm: req.query.q || '',
                totalEntries,
                totalPages,
                currentPage,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error("Error fetching bookmarked entries:", error);
            req.flash('error', 'Could not load bookmarked entries.');
            res.redirect('/profile');
        }
    },

    // Fragment for infinite scroll: returns HTML for next page of bookmarks
    getBookmarksFragment: async (req, res) => {
        const userId = req.user._id;
        const userIdObj = userId instanceof ObjectId ? userId : new ObjectId(userId.toString());
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(20, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));

        try {
            const bookmarksColl = req.db.collection(BOOKMARKS_COLLECTION);
            const messagesColl = req.db.collection('messages');

            const bookmarksList = await bookmarksColl
                .find({ userId: userIdObj })
                .sort({ createdAt: -1 })
                .toArray();

            let messageIds = bookmarksList.map(b => b.messageId);

            const legacyBookmarked = await messagesColl
                .find({ createdBy: userIdObj, isBookmarked: true })
                .project({ _id: 1 })
                .toArray();

            const fromNew = new Set(messageIds.map(id => id.toString()));
            for (const m of legacyBookmarked) {
                if (!fromNew.has(m._id.toString())) messageIds.push(m._id);
            }

            const totalEntries = messageIds.length;
            const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
            const currentPage = Math.min(page, totalPages);
            const start = (currentPage - 1) * limit;
            const pageIds = messageIds.slice(start, start + limit);

            if (pageIds.length === 0) {
                return res.render('partials/_entries-fragment', {
                    messages: [],
                    hasMore: false,
                    nextPage: '',
                    listType: 'bookmarks'
                });
            }

            const messages = await messagesColl.find({
                _id: { $in: pageIds },
                createdBy: userIdObj
            }).toArray();

            const byId = new Map(messages.map(m => [m._id.toString(), m]));
            const ordered = pageIds.map(id => byId.get((id instanceof ObjectId ? id : new ObjectId(id)).toString())).filter(Boolean);

            const formattedEntries = ordered.map(entry => ({
                ...entry,
                isBookmarked: true,
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : 'Unknown Date',
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'
            }));

            const hasMore = currentPage < totalPages;
            const nextPage = hasMore ? currentPage + 1 : '';

            res.render('partials/_entries-fragment', {
                messages: formattedEntries,
                hasMore,
                nextPage,
                listType: 'bookmarks'
            });
        } catch (error) {
            console.error("Error fetching bookmarks fragment:", error);
            res.status(500).send('');
        }
    }
};
