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
    
        const totalSpent = result.reduce((sum, msg) => sum + Number(msg.price || 0), 0)
    
        // Ran into bug where monthly budget was not live updating
        db.collection('users').findOne({ _id: req.user._id }, (err, userDoc) => {
          if (err) return console.log(err)
    
          res.render('profile.ejs', {
            user: userDoc,
            messages: result,
            totalSpent: totalSpent
          })
        })
      })
    })    

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout(() => {
          console.log('User has logged out!')
        });
        res.redirect('/');
    });

// message board routes ===============================================================

    app.post('/messages', (req, res) => {
      db.collection('messages').save(
        {name: req.body.name, 
          item: req.body.item, 
          price: req.body.price, 
          type: req.body.type, 
          date: req.body.date, 
          // msg: req.body.msg,
          createdBy: req.user._id,
          // thumbUp: 0, 
          // thumbDown:0
    }, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/profile')
      })
    })

    // creates the budget
    app.post('/setBudget', isLoggedIn, (req, res) => {
      const budget = Number(req.body.budget)
    
      db.collection('users').updateOne(
        { _id: req.user._id },
        { $set: { 'budget': budget } },
        (err, result) => {
          if (err) return console.log(err)
          console.log(`Updated monthly budget to $${budget}`)
          res.redirect('/profile')
        }
      )
    })

    // app.put('/messages/upvote', (req, res) => {
    //   db.collection('messages')
    //   .findOneAndUpdate({name: req.body.name, msg: req.body.msg}, {
    //     $set: {
    //       thumbUp:req.body.thumbUp + 1
    //     }
    //   }, {
    //     sort: {_id: -1},
    //     upsert: true
    //   }, (err, result) => {
    //     if (err) return res.send(err)
    //     res.send(result)
    //   })
    // })

    // app.put('/messages/downvote', (req, res) => {
    //   db.collection('messages')
    //   .findOneAndUpdate({name: req.body.name, msg: req.body.msg}, {
    //     $set: {
    //       thumbUp:req.body.thumbUp - 1
    //     }
    //   }, {
    //     sort: {_id: -1},
    //     upsert: true
    //   }, (err, result) => {
    //     if (err) return res.send(err)
    //     res.send(result)
    //   })
    // })

    app.delete('/messages', (req, res) => {
      console.log('DELETE request body:', req.body)
      // Do I need to include all keys in delete request? Reference profile.ejs file for items
      db.collection('messages').findOneAndDelete({name: req.body.name, item: req.body.item}, (err, result) => {
        if (err) return res.status(500).send(err)
        if (!result.value) return res.status(404).send('Message not found.')
        res.send('Message deleted!')
      })
    })

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
