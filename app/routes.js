const { ObjectId } = require('mongodb'); // For handling MongoDB ObjectIDs
const { getAIReflection } = require('./services/aiService');

module.exports = function(app, passport, db) { // db is the native MongoDB connection object

    // normal routes ===============================================================
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
        db.collection('messages').find({ createdBy: req.user._id })
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .toArray((err, result) => { // Use toArray to get results
                if (err) {
                    console.error("Error fetching profile entries:", err);
                    req.flash('error', 'Could not load journal entries.');
                    return res.redirect('/profile'); // Prevent rendering if error occurs
                }

                const formattedEntries = result.map(entry => ({
                    ...entry, //spread operator
                    // Use createdAt if available, otherwise fallback to old fields
                    displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                    displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
                }));

                res.render('profile.ejs', {
                    user: req.user,
                    messages: formattedEntries, // Pass potentially formatted entries
                    error: req.flash('error'), // Pass flash messages from redirects
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

    // POST new entry - MAJOR UPDATE FOR SINGLE INPUT & AI
    app.post('/messages', isLoggedIn, async (req, res) => { // Added isLoggedIn and async
        // 1. Get current entry text (assuming input name="entryText" in profile.ejs form)
        const currentEntryText = req.body.entryText;
        const userId = req.user._id; // Get user ID from authenticated session

        // Basic validation
        if (!currentEntryText || currentEntryText.trim() === "") {
            req.flash('error', 'Journal entry cannot be empty.');
            return res.redirect('/profile');
        }

        let aiReflectionText = "Reflection generation failed or pending..."; // Default value

        try {
            // 2. Fetch Historical Entries (~ last 30 days) using native driver
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(new Date().getDate() - 30);

            const historyCursor = db.collection('messages').find({
                createdBy: userId,
                createdAt: { $gte: thirtyDaysAgo } // Query based on creation date
             })
                .sort({ createdAt: 1 }) // Oldest first within the period
                // Project only needed fields. Ensure 'text' is the correct field name.
                .project({ text: 1, createdAt: 1, _id: 0 });

            const historicalEntriesFromDB = await historyCursor.toArray(); // Execute the query

            console.log(`Fetched ${historicalEntriesFromDB.length} historical entries for AI context.`);

            // Map history for the AI service (expects 'combinedText' based on our AI prompt)
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
                text: currentEntryText,           // Save the single entry text field
                aiReflection: aiReflectionText,    // Save the AI's response
                createdBy: userId,                // Link to the user
                createdAt: new Date()             // Add timestamp for sorting/querying
                // Ensure old fields like question1, date, time are NOT saved here anymore
            };

            const insertResult = await db.collection('messages').insertOne(newEntryDoc);

            if (insertResult.insertedCount === 1) {
                console.log('Journal entry with reflection saved successfully.');
                req.flash('success', 'Journal entry saved successfully!');
            } else {
                 // This case should ideally not happen if insertOne doesn't throw, but good practice
                 throw new Error("Failed to insert new entry into database (insertedCount not 1).");
            }
            res.redirect('/profile'); // Redirect back to the profile page

        } catch (err) {
            console.error("Error processing new entry:", err);
            req.flash('error', 'Failed to save entry or get reflection. Please try again.');
            // Optional: Attempt to save entry even if AI/DB fails, marking reflection as failed
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

     // GET single entry detail page (NEW ROUTE)
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