module.exports = function(app, passport, db) {
  // this allows delete button to work
  const { ObjectId } = require('mongodb');
  
  // normal routes ===============================================================

  // redirect home page to auth page or render auth page directly
  app.get('/', function(req, res) {
    // Option 1: Redirect to auth page
    res.redirect('/auth');
    
    // Option 2: Or render auth page directly
    // res.render('auth.ejs', { 
    //   message: req.flash('loginMessage') || req.flash('signupMessage') 
    // });
  });

  // combined auth page (login + signup)
  app.get('/auth', function(req, res) {
    res.render('auth.ejs', { 
      message: req.flash('loginMessage') || req.flash('signupMessage'),
      activeTab: req.query.tab || 'login' // This allows you to control which tab is active
    });
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
    res.redirect('/auth');
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
  });

  app.delete('/messages/:id', (req, res) => {
    db.collection('messages').deleteOne(
      { _id: new ObjectId(req.params.id) },
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error deleting message');
        }
        res.send('Entry deleted!');
      }
    );
  });

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // redirect old login route to auth page
  app.get('/login', function(req, res) {
    res.redirect('/auth?tab=login');
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/auth?tab=login', // redirect back to auth page with login tab active
    failureFlash : true // allow flash messages
  }));

  // SIGNUP =================================
  // redirect old signup route to auth page
  app.get('/signup', function(req, res) {
    res.redirect('/auth?tab=signup');
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/auth?tab=signup', // redirect back to auth page with signup tab active
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

  res.redirect('/auth');
}