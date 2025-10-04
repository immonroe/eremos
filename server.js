// server.js

// set up ======================================================================
// get all the tools we need
require('dotenv').config();
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 3000;
const MongoClient = require('mongodb').MongoClient
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
// read cookies
var cookieParser = require('cookie-parser');
// see things coming from forms
var bodyParser   = require('body-parser');
var session      = require('express-session');
var configDB = require('./config/database.js');

var db // This variable will now hold the native MongoDB db object

// configuration ===============================================================
mongoose.connect(configDB.url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(mongooseConnection => {
        // Get the native MongoDB database object from the Mongoose connection
        db = mongooseConnection.connection.db;
        console.log('Successfully connected to MongoDB via Mongoose!');
        
        // Make database available to routes via middleware
        app.use((req, res, next) => {
            req.db = db;
            next();
        });
        
        // Use the new route structure
        const routes = require('./app/routes');
        app.use('/', routes);
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')) // Using public folders


app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
    secret: 'rcbootcamp2025a', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


// launch ======================================================================
app.listen(port, '0.0.0.0', () => {
    console.log('The magic happens on port ' + port);
});