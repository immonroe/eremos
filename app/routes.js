module.exports = function(app, passport, db) {

// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
      db.collection('messages').find({ createdBy: req.user._id }).toArray((err, result) => {
        if (err) return console.log(err)
    
        res.render('profile.ejs', {
          user: req.user,
          messages: result
        });
      });
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout(() => {
          console.log('User has logged out!')
        });
        res.redirect('/');
    });

// journal entry routes ===============================================================

    app.post('/messages', (req, res) => {

      const now = new Date();

      db.collection('messages').save({
        question1: req.body.question1, 
        question2: req.body.question2, 
        question3: req.body.question3, 
        question4: req.body.question4, 
        createdBy: req.user._id,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
    }, (err, result) => {
        if (err) return console.log(err)
        console.log('Journal entry saved to database')
        res.redirect('/profile')
      })
    })

    app.delete('/messages', (req, res) => {
      const messageId = req.body._id;
      
      db.collection('messages').deleteOne({ _id: new ObjectId(messageId) }, (err, result) => {
        if (err) {
          return res.status(500).send('Error deleting message');
        }
        console.log('Message deleted');
        res.send('Entry deleted!');
      });
    });

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
