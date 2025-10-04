// Journal Controller
const { ObjectId } = require('mongodb');
const { getAIReflection } = require('../services/aiService');

module.exports = {
    // Create new journal entry
    createEntry: async (req, res) => {
        const currentEntryText = req.body.entryText;
        const userId = req.user._id;

        // Basic validation
        if (!currentEntryText || currentEntryText.trim() === "") {
            req.flash('error', 'Journal entry cannot be empty.');
            return res.redirect('/profile');
        }

        let aiReflectionText = "Reflection generation failed or pending...";

        try {
            // Get historical entries for context (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const historicalEntries = await req.db.collection('messages')
                .find({
                    createdBy: userId,
                    createdAt: { $gte: thirtyDaysAgo }
                })
                .sort({ createdAt: 1 })
                .limit(10)
                .toArray();

            // Map historical entries for AI service
            const mappedHistoricalEntries = historicalEntries.map(entry => ({
                ...entry,
                combinedText: `${entry.text || ''} ${entry.aiReflection || ''}`.trim()
            }));

            // Get AI reflection
            aiReflectionText = await getAIReflection(currentEntryText, mappedHistoricalEntries);

        } catch (aiError) {
            console.error('Error getting AI reflection:', aiError);
            aiReflectionText = "AI reflection temporarily unavailable. Your entry has been saved.";
        }

        // Create new entry
        const newEntry = {
            text: currentEntryText,
            aiReflection: aiReflectionText,
            createdBy: userId,
            createdAt: new Date(),
            isBookmarked: false
        };

        try {
            await req.db.collection('messages').insertOne(newEntry);
            req.flash('success', 'Journal entry saved successfully!');
        } catch (dbError) {
            console.error('Error saving entry:', dbError);
            req.flash('error', 'Failed to save journal entry. Please try again.');
        }

        res.redirect('/profile');
    },

    // Get specific journal entry
    getEntry: async (req, res) => {
        try {
            const entryId = req.params.id;
            if (!ObjectId.isValid(entryId)) {
                req.flash('error', 'Invalid entry ID.');
                return res.redirect('/profile');
            }

            const entry = await req.db.collection('messages').findOne({
                _id: new ObjectId(entryId),
                createdBy: req.user._id
            });

            if (!entry) {
                req.flash('error', 'Entry not found.');
                return res.redirect('/profile');
            }

            res.render('entry.ejs', {
                title: 'Eremos - Entry Details',
                user: req.user,
                entry: {
                    ...entry,
                    displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : 'Unknown Date',
                    displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'
                }
            });

        } catch (error) {
            console.error('Error fetching entry:', error);
            req.flash('error', 'Error loading entry.');
            res.redirect('/profile');
        }
    },

    // Delete journal entry
    deleteEntry: (req, res) => {
        const entryId = req.params.id;
        if (!ObjectId.isValid(entryId)) {
            return res.status(400).json({ message: 'Invalid entry ID format.' });
        }

        req.db.collection('messages').deleteOne({
            _id: new ObjectId(entryId),
            createdBy: req.user._id
        }, (err, result) => {
            if (err) {
                console.error('Error deleting entry:', err);
                return res.status(500).json({ message: 'Error deleting entry.' });
            }

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Entry not found or not authorized.' });
            }

            res.json({ message: 'Entry deleted successfully.' });
        });
    }
};
