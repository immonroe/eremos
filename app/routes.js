const { ObjectId } = require('mongodb');
const { getAIReflection } = require('./services/aiService');

module.exports = function(app, passport, db) {

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
                    ...entry, // spread op
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
    });


    // journal entry routes ===============================================================

    // POST new entry
    app.post('/messages', isLoggedIn, async (req, res) => {
        const currentEntryText = req.body.entryText;
        const userId = req.user._id;

        // Basic validation
        if (!currentEntryText || currentEntryText.trim() === "") {
            req.flash('error', 'Journal entry cannot be empty.');
            return res.redirect('/profile');
        }

        let aiReflectionText = "Reflection generation failed or pending...";

        try {
            // 2. Fetch Historical Entries (~ last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(new Date().getDate() - 30);

            const historyCursor = db.collection('messages').find({
                createdBy: userId,
                createdAt: { $gte: thirtyDaysAgo } // Query based on creation date
             })
                .sort({ createdAt: 1 })
                .project({ text: 1, createdAt: 1, _id: 0 });

            const historicalEntriesFromDB = await historyCursor.toArray(); // Execute the query

            console.log(`Fetched ${historicalEntriesFromDB.length} historical entries for AI context.`);

            const formattedHistory = historicalEntriesFromDB.map(entry => ({
                combinedText: entry.text || "", // Use 'text' field, provide default empty string
                createdAt: entry.createdAt
            }));

            console.log("Requesting AI reflection...");
            aiReflectionText = await getAIReflection(currentEntryText, formattedHistory);
            console.log("AI reflection received.");

            // defining messages table in db
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
            res.redirect('/profile');

        } catch (err) {
            console.error("Error processing new entry:", err);
            req.flash('error', 'Failed to save entry or get reflection. Please try again.');
             try {
                 const fallbackEntryDoc = {
                     text: currentEntryText,
                     createdBy: userId,
                     aiReflection: "AI reflection generation failed.", // Specific error message so easier to trace issue
                     createdAt: new Date()
                 };
                 await db.collection('messages').insertOne(fallbackEntryDoc);
                 console.log("Saved entry with AI failure notice.");
                 res.redirect('/profile');
            } catch (saveErr) {
                 console.error("Failed to save fallback entry:", saveErr);
                 res.redirect('/profile');
            }
        }
    });

    app.get('/entries/:id', isLoggedIn, async (req, res) => {
         try {
             const entryId = req.params.id;
             if (!ObjectId.isValid(entryId)) {
                 req.flash('error', 'Invalid entry ID format.');
                 return res.redirect('/profile');
             }

             const entry = await db.collection('messages').findOne({
                 _id: new ObjectId(entryId),
                 createdBy: req.user._id
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
                 displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                 displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
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
        if (!ObjectId.isValid(entryId)) {
             return res.status(400).json({ message: 'Invalid entry ID format.' });
        }

        db.collection('messages').deleteOne(
            { _id: new ObjectId(entryId), createdBy: req.user._id },
            (err, result) => {
                if (err) {
                    console.error("Error deleting entry:", err);
                    return res.status(500).json({ message: 'Error deleting entry.' });
                }
                if (result.deletedCount === 0) {
                     return res.status(404).json({ message: 'Entry not found or permission denied.' });
                }
                console.log(`Entry ${entryId} deleted by user ${req.user._id}`);
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
                createdBy: userId
            });

            if (!entry) {
                return res.status(404).json({ success: false, message: 'Entry not found or permission denied.' });
            }

            const newBookmarkStatus = !entry.isBookmarked;

            const updateResult = await db.collection('messages').updateOne(
                { _id: new ObjectId(entryId), createdBy: userId },
                { $set: { isBookmarked: newBookmarkStatus } }
            );

            if (updateResult.modifiedCount === 1) {
                console.log(`Entry ${entryId} bookmark status toggled to ${newBookmarkStatus} by user ${userId}`);
                res.status(200).json({ success: true, isBookmarked: newBookmarkStatus });
            } else {
                // Helps trace issue bc errors sometimes ddon't even show
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
        let sortOptions = { createdAt: -1 }; 
        let projectionOptions = {}; 

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
                ...entry, // spread operator
                displayDate: entry.createdAt ? entry.createdAt.toLocaleDateString() : entry.date,
                displayTime: entry.createdAt ? entry.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time
            }));

            res.render('bookmarks.ejs', {
                user: req.user,
                messages: formattedEntries,
                searchTerm: searchTerm,
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
    
    // Enhanced route to fetch data for activity charts
    app.get('/activity', isLoggedIn, async (req, res) => {
        try {
            const userId = req.user._id;
            
            // yoink all user's journal entries
            const messages = await db.collection('messages').find({ createdBy: userId })
                .sort({ createdAt: -1 })
                .toArray();
                
            // Calculate entry counts by day of week
            const dayOfWeekData = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
            messages.forEach(msg => {
                if (msg.createdAt) {
                    const day = new Date(msg.createdAt).getDay();
                    dayOfWeekData[day]++;
                }
            });
            
            // Calculate entries per month (last 6 months - may need to shorten this but idk)
            const today = new Date();
            const monthLabels = [];
            const monthData = [];
            
            for (let i = 5; i >= 0; i--) {
                const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthName = month.toLocaleString('default', { month: 'short' });
                monthLabels.push(monthName);
                
                const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                
                const count = messages.filter(msg => {
                    if (!msg.createdAt) return false;
                    const date = new Date(msg.createdAt);
                    return date >= monthStart && date <= monthEnd;
                }).length;
                
                monthData.push(count);
            }
            
            // Calculate entry length over time (last 10 entries - don't want to pull too much data for demo day)
            const recentMessages = messages.slice(0, Math.min(10, messages.length)).reverse();
            const entryLengths = recentMessages.map(msg => msg.text ? msg.text.length : 0);
            const entryDates = recentMessages.map(msg => {
                if (!msg.createdAt) return 'Unknown';
                const date = new Date(msg.createdAt);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            
            const bookmarkedCount = messages.filter(msg => msg.isBookmarked).length;
            const totalEntries = messages.length;
            
            let avgEntriesPerWeek = 0;
            if (messages.length > 0) {
                const oldestEntry = messages.length > 0 ? new Date(messages[messages.length - 1].createdAt) : new Date();
                const diffTime = Math.abs(today - oldestEntry);
                const diffWeeks = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
                avgEntriesPerWeek = (totalEntries / diffWeeks).toFixed(1);
            }
            
            // Calculate streak data (consecutive days with entries - also mindful of multiple entries per day edge case)
            const streakData = calculateStreakData(messages);
            
            const chartData = {
                dayOfWeekData,
                monthLabels,
                monthData,
                entryLengths,
                entryDates,
                bookmarkedCount,
                totalEntries,
                avgEntriesPerWeek,
                streakData
            };
            
            console.log('Chart data being sent to template:', JSON.stringify(chartData, null, 2));
            
            const hasData = totalEntries > 0;
            if (!hasData) {
                console.log('No journal entries found for user. Using sample data for charts.');
                // In case bug where things don't show - demo day needs data lol
                chartData.dayOfWeekData = [1, 2, 3, 2, 4, 3, 2];
                chartData.monthData = [2, 3, 5, 4, 6, 3];
                chartData.entryLengths = [100, 150, 200, 180, 250];
                chartData.entryDates = ['Jan 1', 'Jan 5', 'Jan 10', 'Jan 15', 'Jan 20'];
            }
            
            res.render('activity', { 
                title: 'Activity Dashboard',
                user: req.user,
                chartData: chartData,
                hasData: hasData
            });
        } catch (err) {
            console.error('Error loading activity page:', err);
            // In case bug where things don't show
            const fallbackData = {
                dayOfWeekData: [1, 2, 3, 2, 4, 3, 2],
                monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                monthData: [2, 3, 5, 4, 6, 3],
                entryLengths: [100, 150, 200, 180, 250],
                entryDates: ['Jan 1', 'Jan 5', 'Jan 10', 'Jan 15', 'Jan 20'],
                bookmarkedCount: 3,
                totalEntries: 10,
                avgEntriesPerWeek: 2.5,
                streakData: { currentStreak: 2, longestStreak: 5 }
            };
            
            res.render('activity', { 
                title: 'Activity Dashboard',
                user: req.user,
                chartData: fallbackData,
                hasData: false,
                error: 'There was an error loading your activity data. Showing sample data instead.'
            });
        }
    });

    // Helper function to calculate streak data
    function calculateStreakData(messages) {
        if (messages.length === 0) return { currentStreak: 0, longestStreak: 0 };
        
        const sortedMsgs = [...messages].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Get unique dates (considers weird intraction if you put more than one entry per day)
        const uniqueDates = new Set();
        sortedMsgs.forEach(msg => {
            if (msg.createdAt) {
                const date = new Date(msg.createdAt);
                uniqueDates.add(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
            }
        });
        
        // Convert to array of Date objects
        const dates = Array.from(uniqueDates).map(dateStr => {
            const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
            return new Date(year, month - 1, day);
        }).sort((a, b) => b - a);
        
        let currentStreak = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mostRecentDate = dates.length > 0 ? dates[0] : null;
        if (!mostRecentDate) return { currentStreak: 0, longestStreak: 0 };
        
        mostRecentDate.setHours(0, 0, 0, 0);
        
        const hasEntryToday = mostRecentDate.getTime() === today.getTime();
        if (!hasEntryToday) {
            // Check if there was an entry yesterday to maintain streak - similar to longest consecutive sequence leetcode question!
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (mostRecentDate.getTime() !== yesterday.getTime()) {
                currentStreak = 0;
            }
        }
        
        if (currentStreak > 0) {
            for (let i = 1; i < dates.length; i++) {
                const current = dates[i];
                const prev = dates[i - 1];
                
                current.setHours(0, 0, 0, 0);
                prev.setHours(0, 0, 0, 0);
                
                const diffDays = Math.round((prev - current) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        let longestStreak = currentStreak;
        let tempStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const current = dates[i];
            const prev = dates[i - 1];
            
            current.setHours(0, 0, 0, 0);
            prev.setHours(0, 0, 0, 0);
            
            const diffDays = Math.round((prev - current) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                tempStreak++;
            } else {
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 1;
            }
        }
        
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }
        
        return { currentStreak, longestStreak };
    }

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