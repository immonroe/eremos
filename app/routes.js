const { ObjectId } = require('mongodb'); // For handling MongoDB ObjectIDs
const { getAIReflection } = require('./services/aiService');

module.exports = function(app, passport, db) { // db is the native MongoDB connection object

    // normal routes ===============================================================
    // refactored index/signup/login ejs files into one auth file
    app.get('/', function(req, res) {
        res.redirect('/auth');
    });

    app.get('/auth', function(req, res) {
        res.render('auth.ejs', {
            message: req.flash('loginMessage') || req.flash('signupMessage'),
            activeTab: req.query.tab || 'login'
        });
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
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

        db.collection('messages').find(filter)
            .project(projectionOptions)
            .sort(sortOptions)
            .toArray((err, result) => {
                if (err) {
                    console.error("Error fetching profile entries:", err);
                    req.flash('error', 'Could not load journal entries.');
                    return res.redirect('/profile');
                }
                const formattedEntries = result.map(entry => ({
                    ...entry, // Keep existing entry data
                    displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                    displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
                }));
                res.render('profile.ejs', {
                    user: req.user,
                    messages: formattedEntries,
                    searchTerm: searchTerm, 
                    error: req.flash('error'),
                    success: req.flash('success')
                });
            });
    });

    // LOGOUT ==============================
    // routes.js - Logout attempt assuming synchronous req.logout due to bug not allowing me to log out of session
    app.get('/logout', function(req, res, next) {
        console.log("Attempting logout (sync assumption)...");
        if (!req.isAuthenticated()) {
            console.log("User not authenticated, redirecting.");
            return res.redirect('/auth');
        }

        // Call req.logout directly
        req.logout();
        console.log("Called req.logout() directly.");

        // session destruction
        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                console.error("Error destroying session during logout:", destroyErr);
                // Still try to redirect even if session destroy fails
            }
            console.log("Session destroyed (or destroy attempt finished).");
            res.clearCookie('connect.sid');
            res.redirect('/auth');
        });
    });


    // journal entry routes ===============================================================

    // POST new entry
    app.post('/messages', isLoggedIn, async (req, res) => { // Added isLoggedIn and async
        // 1. Get current entry text (assuming input name="entryText" in profile.ejs form)
        const currentEntryText = req.body.entryText;
        const userId = req.user._id; // Get user ID from authenticated session

        // Basic validation
        if (!currentEntryText || currentEntryText.trim() === "") {
            req.flash('error', 'Journal entry cannot be empty.');
            return res.redirect('/profile');
        }

        let aiReflectionText = "Reflection generation failed or pending...";

        try {
            // 2. Fetch Historical Entries (~ last 30 days) using native driver
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(new Date().getDate() - 30);

            const historyCursor = db.collection('messages').find({
                createdBy: userId,
                createdAt: { $gte: thirtyDaysAgo } // Query based on creation date
             })
                .sort({ createdAt: 1 }) // Oldest first within the period
                .project({ text: 1, createdAt: 1, _id: 0 });

            const historicalEntriesFromDB = await historyCursor.toArray(); // Execute the query

            console.log(`Fetched ${historicalEntriesFromDB.length} historical entries for AI context.`);

            const formattedHistory = historicalEntriesFromDB.map(entry => ({
                combinedText: entry.text || "", // Use 'text' field, provide default empty string
                createdAt: entry.createdAt
            }));

            // 3. Call the AI Service
            console.log("Requesting AI reflection...");
            aiReflectionText = await getAIReflection(currentEntryText, formattedHistory);
            console.log("AI reflection received.");

            // 4. Save the NEW Entry using native driver's insertOne
            const newEntryDoc = {
                text: currentEntryText,   
                aiReflection: aiReflectionText, 
                createdBy: userId,               
                createdAt: new Date()             
            };

            const insertResult = await db.collection('messages').insertOne(newEntryDoc);

            if (insertResult.insertedCount === 1) {
                console.log('Journal entry with reflection saved successfully.');
                req.flash('success', 'Journal entry saved successfully!');
            } else {
                 throw new Error("Failed to insert new entry into database (insertedCount not 1).");
            }
            res.redirect('/profile'); // Redirect back to the profile page

        } catch (err) {
            console.error("Error processing new entry:", err);
            req.flash('error', 'Failed to save entry or get reflection. Please try again.');
             try {
                 const fallbackEntryDoc = {
                     text: currentEntryText,
                     createdBy: userId,
                     aiReflection: "AI reflection generation failed.", // Specific error message
                     createdAt: new Date()
                 };
                 await db.collection('messages').insertOne(fallbackEntryDoc);
                 console.log("Saved entry with AI failure notice.");
                 res.redirect('/profile'); // Redirect after saving fallback
            } catch (saveErr) {
                 console.error("Failed to save fallback entry:", saveErr);
                 res.redirect('/profile'); // Still redirect if fallback save fails too
            }
        }
    });

    app.get('/entries/:id', isLoggedIn, async (req, res) => {
         try {
             const entryId = req.params.id;
             // Validate ObjectId format before querying
             if (!ObjectId.isValid(entryId)) {
                 req.flash('error', 'Invalid entry ID format.');
                 return res.redirect('/profile');
             }

             // Fetch using native driver, ensuring user owns it
             const entry = await db.collection('messages').findOne({
                 _id: new ObjectId(entryId),
                 createdBy: req.user._id // Check ownership
             });

             if (!entry) {
                 req.flash('error', 'Entry not found or permission denied.');
                 return res.redirect('/profile');
             }

             // Render the entry detail view (create views/entry.ejs)
             res.render('entry.ejs', {
                 user: req.user,
                 entry: entry,
                 // Pass formatted date/time for display
                 displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date, // Fallback for older entries
                 displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time // Fallback
             });
         } catch (err) {
            console.error("Error fetching single entry:", err);
            req.flash('error', 'Could not load entry details.');
            res.redirect('/profile');
         }
     });


    // DELETE entry - Updated to check ownership and send JSON response
    app.delete('/messages/:id', isLoggedIn, (req, res) => {
        const entryId = req.params.id;
        // Basic validation for ObjectId
        if (!ObjectId.isValid(entryId)) {
             // Send JSON error response for client-side JS
             return res.status(400).json({ message: 'Invalid entry ID format.' });
        }

        db.collection('messages').deleteOne(
            // Match _id AND ensure the logged-in user created the entry
            { _id: new ObjectId(entryId), createdBy: req.user._id },
            (err, result) => {
                if (err) {
                    console.error("Error deleting entry:", err);
                    return res.status(500).json({ message: 'Error deleting entry.' });
                }
                // Check if a document was actually deleted
                if (result.deletedCount === 0) {
                     // Could be because ID doesn't exist OR user doesn't own it
                     return res.status(404).json({ message: 'Entry not found or permission denied.' });
                }
                console.log(`Entry ${entryId} deleted by user ${req.user._id}`);
                // Send success JSON response
                res.status(200).json({ message: 'Entry deleted successfully!' });
            }
        );
    });

    // bookmark routes ===============================================================

    // POST - Toggle Bookmark Status for an Entry - tested in Postman for bookmark toggle
    app.post('/entries/:id/toggle-bookmark', isLoggedIn, async (req, res) => {
        const entryId = req.params.id;
        const userId = req.user._id;

        if (!ObjectId.isValid(entryId)) {
            return res.status(400).json({ success: false, message: 'Invalid entry ID format.' });
        }

        try {
            const entry = await db.collection('messages').findOne({
                _id: new ObjectId(entryId),
                createdBy: userId // Ensure ownership to prevent other users for getting access to bookmarks
            });

            if (!entry) {
                return res.status(404).json({ success: false, message: 'Entry not found or permission denied.' });
            }

            const newBookmarkStatus = !entry.isBookmarked; // Toggle boolean (defaults to true if undefined)

            // Update DB entry
            const updateResult = await db.collection('messages').updateOne(
                { _id: new ObjectId(entryId), createdBy: userId },
                { $set: { isBookmarked: newBookmarkStatus } }
            );

            if (updateResult.modifiedCount === 1) {
                console.log(`Entry ${entryId} bookmark status toggled to ${newBookmarkStatus} by user ${userId}`);
                res.status(200).json({ success: true, isBookmarked: newBookmarkStatus });
            } else {
                // This might happen if the entry was found but update failed unexpectedly - easy to trace issues in console
                 console.log(`Entry ${entryId} found but bookmark toggle failed for user ${userId}.`);
                 res.status(500).json({ success: false, message: 'Failed to update bookmark status.' });
            }

        } catch (err) {
            console.error("Error toggling bookmark:", err);
            res.status(500).json({ success: false, message: 'Server error while toggling bookmark.' });
        }
    });

    // GET - Display Bookmarked Entries Page
    app.get('/bookmarks', isLoggedIn, async (req, res) => {
        const userId = req.user._id;
        const searchTerm = req.query.q;

        let filter = { createdBy: userId, isBookmarked: true };
        let sortOptions = { createdAt: -1 }; // Default sort
        let projectionOptions = {}; // Default projection

        // Modify filter/projection/sort if searching
        if (searchTerm && searchTerm.trim() !== "") {
            const trimmedSearchTerm = searchTerm.trim();
            filter.$text = { $search: trimmedSearchTerm };
            projectionOptions.score = { $meta: "textScore" };
            sortOptions = { score: { $meta: "textScore" } };
            console.log(`Searching bookmarks for user ${userId} with term: "${trimmedSearchTerm}"`);
        } else {
            console.log(`Fetching all bookmarks for user ${userId}`);
        }

        try {
            const bookmarkedEntries = await db.collection('messages').find(filter)
                .project(projectionOptions)
                .sort(sortOptions)
                .toArray();

            const formattedEntries = bookmarkedEntries.map(entry => ({
                ...entry, // Keep existing entry data
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
            }));

            res.render('bookmarks.ejs', {
                user: req.user,
                messages: formattedEntries,
                searchTerm: searchTerm, // Pass term back to view
                error: req.flash('error'),
                success: req.flash('success')
            });

        } catch (err) {
            console.error("Error fetching bookmarked entries:", err);
            req.flash('error', 'Could not load bookmarked entries.');
            res.redirect('/profile');
        }
    });

    // activity routes ===============================================================
    
    app.get('/activity', isLoggedIn, async (req, res) => {
        try {
            res.render('activity', { 
                title: 'Activity Dashboard',
                user: req.user
            });
        } catch (err) {
            console.error('Error loading activity page:', err);
            res.redirect('/profile'); // Redirect to dashboard or another page on error
        }
    });

    // =============================================================================
    // AUTHENTICATE (Keep existing passport routes)
    // =============================================================================
    // LOGIN
    app.get('/login', function(req, res) { res.redirect('/auth?tab=login'); });
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile',
        failureRedirect : '/auth?tab=login',
        failureFlash : true
    }));

    // SIGNUP
    app.get('/signup', function(req, res) { res.redirect('/auth?tab=signup'); });
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile',
        failureRedirect : '/auth?tab=signup',
        failureFlash : true
    }));

    // UNLINK LOCAL (Keep as is - assumes User model has .save())
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user = req.user;
        user.local.email = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            if (err) { console.error("Error unlinking account:", err); }
            res.redirect('/profile');
        });
    });
};

// route middleware to ensure user is logged in (Keep as is)
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/auth');
}