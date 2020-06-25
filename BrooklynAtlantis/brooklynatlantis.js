
// Loads functions from modules
// Uses express, a web framework
// https://expressjs.com/ 
var express          = require('express');
// This starts express, now its' functionality can be used
// through app
var app              = express();

// Start the server and send it the express object
// This needs a listening part
// https://stackoverflow.com/a/38063557
var http             = require('http').Server(app);
var io               = require('socket.io').listen(http);

// Utilities for working with filesystems
var path             = require('path');

// Authentication module
// http://www.passportjs.org/
var passport         = require('passport');
// Userna,e and password authentication 
var LocalStrategy    = require('passport-local').Strategy;
// Authentication with facebook
var FacebookStrategy = require('passport-facebook').Strategy;

// Middleware for transfering data between the client and the
// server
var cookieParser     = require('cookie-parser');
var session          = require('express-session');

// Load Redis session storage for express
// No clue what that means but it requires Redis to also
// be loaded and I don't see it here, maybe indirectly?
// Redis
// https://en.wikipedia.org/wiki/Redis
var RedisStore       = require('connect-redis')(session);

// This one is currently depracted, it is used to make
// http calls 
var request          = require('request');
// For parsing http request bodies
var bodyParser       = require('body-parser');
//	mysql database module 
var mysql            = require('mysql');

// Password hashing utilities
var bcrypt           = require('bcrypt-nodejs');

// Session "area" for storing messages
var flash            = require('connect-flash');

var DEV              = false;

// This is needed to allow the website itself to log in to 
// the MYSQL database
var db_config = {
 host: '127.0.0.1',
 user: 'root',
 password: 'atlantis2020',
 database: 'Eager',
};

var fb_config = {
  clientID     : '229260064152476',
  clientSecret : '57b4f20cb7baa069e67171fb752e10e6',
  callbackURL  : 'http://cb.engineering.nyu.edu/auth/facebook/callback',
  passReqToCallback: true,
  profileFields: ['id', 'emails', 'name']
};

var connection;

// Connection pool is a cache of database connections,
// https://en.wikipedia.org/wiki/Connection_pool
// https://www.npmjs.com/package/mysql#pool-options
var pool = mysql.createPool(db_config);

// Object "connection" with a member "query"
// 	that is a function - this btw. is some wrapper
//  that is available online (can't find the source) in many places in literally
// 	the same or almost the same form
connection = {
    query: function () {
		// Prototype represents some class-like inheritance
		// hierarhy implementation,
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
		// slice() - will slice from index supplied with arguments,
		// 		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
		// and call will redirect this to whatever was supplied by the arguments,
		//		https://stackoverflow.com/questions/7056925/how-does-array-prototype-slice-call-work
		// So basically this part allows to run slice on an arbitrary iterable from an arbitrary point
        var queryArgs = Array.prototype.slice.call(arguments),
			// Array
            events = [],
			// Object
            eventNameIndex = {};
		// https://medium.com/@mhagemann/create-a-mysql-database-middleware-with-node-js-8-and-async-await-6984a09d49f4
        pool.getConnection(function (err, conn) {
            if (err) {
				// I suspect this will execute code corresponding
				// to various custom error types
                if (eventNameIndex.error) {
                    eventNameIndex.error();
                }
            }
			// If no error
            if (conn) {
				// Run connection.query() with queryArgs applied on conn
				// This is supposed to just use the connection in some way
				// Basically run query() with queryArgs and this pointing to conn
                var q = conn.query.apply(conn, queryArgs);
                q.on('end', function () {
					// Release connection back to the pool
                    conn.release();
                });
				// Run the function on every element in events,
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
				// ---- No idea what is the rest here ----
				// run on with args and this pointing to query q
                events.forEach(function (args) {
                    q.on.apply(q, args);
                });
            }
        });
		// Returns an object made on a spot with a member on that is a function
        return {
            on: function (eventName, callback) {
				// arguments will be object that is this for call and any other arguments
				// Rest to me looks like adding a new event to event array and callback object
				// to collective object with member/key being the event name
                events.push(Array.prototype.slice.call(arguments));
                eventNameIndex[eventName] = callback;
                return this;
            }
        };
    }
};

function handleDisconnect() {
  connection = mysql.createConnection(db_config);

  connection.connect(function(err) { 
    if(err) { 
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); 
    }  
  });                                    

  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

setTimeout(function() {
  connection.query({
    sql: "SELECT 1"
  });
}, 5000);

handleDisconnect();

// app.use - binding application-level middleware to app object
// https://expressjs.com/en/guide/using-middleware.html
app.use(cookieParser());
app.use(flash());

// Creates an object RedisStore with host - localhost
// https://github.com/NodeRedis/node-redis
// host: IP address of the REdis server, this may have to be changed?
// Yeah, this may be why I can't do anything aside from localhost 
var sessionStore = new RedisStore({host: '127.0.0.1'});

// Middleware for parsing incoming request bodies
// https://github.com/expressjs/body-parser
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: false }));

// https://en.wikipedia.org/wiki/Session_(computer_science)
// https://github.com/expressjs/session
app.use(session({
  // String used to compute the hash
  secret: 'c813be3ca54af9bb3328e6e7212024a4fa627d15bd138de2ef78a32b7163db4f',
  // If the session was not modified, don't save it back to the session store 
  resave: false,
  // Do not save a new session that was not modified
  saveUninitialized: false,
  //store: sessionStore,
  // Cookie settings (one cookie per user)
  cookie: {
	// This means the cookie will be kept for a week
    maxAge: 7 * 24 * 60 * 60 * 1000,
	// This cookie is only available for the server
	// https://latesthackingnews.com/2017/07/03/what-is-httponly-cookie/
    httpOnly: true,
	// Transmit cookies through both secure and not secure channels
	// https://en.wikipedia.org/wiki/Secure_cookie
	// https://owasp.org/www-community/controls/SecureFlag
    secure: false
  }
}));

//app.use('/',        express.static(__dirname + '/booted'));
//app.use('/old',     express.static(__dirname + '/newpub'));
//app.use('/images',  express.static(__dirname + '/newpub/images'));

// To point out where the static files are
// https://www.tutorialspoint.com/expressjs/expressjs_static_files.htm
app.use('/scripts', express.static(__dirname + '/newpub/scripts')); //whenever /scripts is used we know it's the newpub scripts
//app.use('/styles',  express.static(__dirname + '/newpub/css'));
app.use('/images',  express.static(__dirname + '/newpub/images'));
app.use('/css',     express.static(__dirname + '/booted/css'))

// Templeates for HTML files automatically turned into HTML 
// at runtime
// https://expressjs.com/en/guide/using-template-engines.html
app.set('views',    path.join(__dirname, '/booted/views'));  //app.get now gets the templates from this directory. 
app.set('view engine', 'ejs'); //app.get now only needs name of the file (ejs file)

// To maintain a session with user ceedentials through cookies
// here only by storing the user ID
// http://www.passportjs.org/docs/configure/
passport.serializeUser(function(user, done) {
	done(null, user.id);
});
/*passport.deserializeUser(function(user, done) {
  done(null, user);
});
*/
// Retrieved serialized user data
// https://lavalite.org/blog/passport-serialize-and-deserialize-in-nodejs
passport.deserializeUser(function(id, done) {
  //connection.connect();
  // Find in the database
  // https://www.w3schools.com/nodejs/nodejs_mysql_select.asp
  connection.query({
    sql: "SELECT * FROM auth WHERE id = ?",
    values: [id]
  }, function(err, rows) {
    //connection.end();
	// More generic form of js object
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
    var user = new Object();
    user.id = rows[0].id;
    user.email = rows[0].email;
    /*if (rows[0].fbID) {  //in case user has facebook linked
      user.facebook = {
        email : rows[0].email,
        token : rows[0].fbToken,
        name  : rows[0].fbName,
        id    : rows[0].fbID
      };
    }*/
    done(err, user);
  });
});

// I'm leaving the querrying details for now
// Signing up with passport and mysql
passport.use('local-signup', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback : true
}, 
function(req, email, password, done) {
  //connection.connect();
  connection.query({
    sql: 'SELECT * FROM `auth` WHERE `email` = ?',
    values: [email]
  }, function(err, rows) {
      if (err)
        return done(err);

      if (rows[0]) //user exists
        return done(null, false, req.flash('err', 'That email is already taken.'));

      else { //user does not exist
        var newUser = new Object();
        newUser.email = email;
        newUser.password = bcrypt.hashSync(password);

        connection.query({
            sql: "INSERT INTO auth (email, password) values (?, ?)",
            values: [email, newUser.password]
        }, function(err, rows) {
          if (err) throw err;
          newUser.id = rows.insertId;
          //connection.end();'
          var terms = req.session.terms? 1:0;
          connection.query({
            sql: "INSERT INTO experiment (id, consent) VALUES (?, ?)",
            values: [newUser.id, terms]
          }, function(err, rows) {
            if (err) throw err;
          });

          return done(null, newUser);
        });

      }
  });
}));

passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, function(req, email, password, done) {
    //connection.connect();
    connection.query({
      sql: 'SELECT * FROM auth WHERE email = ?',
      values: [email]
    }, function(err, rows) {
      //connection.end();
      if (err)
        return done(err);

      if (!rows.length)
        return done(null, false, req.flash('err', 'No user found.'));

      else {
        if (rows[0].password == null) { // this email is being used by facebook
          return done(null, false, req.flash('err', 'This email is linked to a Facebook account. Please continue with Facebook.'));
        }
        if (!bcrypt.compareSync(password, rows[0].password))
          return done(null, false, req.flash('err', 'Incorrect password entered.'));
        else {
		  // Correct user and password
          var user = new Object();
          user.id       = rows[0].id;
          user.email    = rows[0].email;
          user.password = rows[0].password;
		  return done(null, user);
        }
      }
    });
}));


//TO DO - this is not mine (AT) - I think we should 
// drop the facebook login for now
passport.use(new FacebookStrategy(fb_config,
  function(req, token, refreshToken, profile, done) {
    process.nextTick(function() {
      connection.query({
        sql: 'SELECT * FROM auth WHERE fbID = ?',
        values: [profile.id]
      }, function(err, rows) {
        if (err)
          return done(err);

        if (rows[0]) {
          var user = new Object();
          user.id  = rows[0].id;
          user.facebook = {
            email : rows[0].email,
            token : rows[0].fbToken,
            name  : rows[0].fbName,
            id    : rows[0].fbID
          };
          
          return done(null, user);
        }

        else { // user has not used facebook with our app
          var newUser = new Object();
          fbEmail = profile.emails? profile.emails[0].value : null;
          //if the user denied email access, just dont have an email for the user.
          newUser.facebook = {
            email: fbEmail,
            token: token,
            name:  profile.name.givenName + ' ' + profile.name.familyName,
            id:    profile.id
          };

          connection.query({ // but if their email has been used with our app
            sql: 'SELECT * FROM auth WHERE email = ?',
            values: [newUser.facebook.email]
          }, function(err, rows) {
            if (err) 
              throw err;

            if (rows[0]) { // then we will link the accounts together
              newUser.id = rows[0].id;
              connection.query({
                sql: 'UPDATE auth SET fbID = ?, fbToken = ?, fbName = ? WHERE email = ?',
                values: [newUser.facebook.id,
                         newUser.facebook.token,
                         newUser.facebook.name,
                         newUser.facebook.email]
              }, function(err, rows) {
                if (err) 
                  throw err;
                return done(null, newUser);
              });
            }
            else { // otherwise, we create a new user
              connection.query({
                sql: "INSERT INTO auth (email, fbID, fbToken, fbName) values (?, ?, ?, ?)",
                values: [newUser.facebook.email,
                         newUser.facebook.id,
                         newUser.facebook.token,
                         newUser.facebook.name]
              }, function(err, rows) {
                if (err)
                  throw err;
                newUser.id = rows.insertId;

                var terms = req.session.terms? 1:0;
                connection.query({
                  sql: "INSERT INTO experiment (id, consent) VALUES (?, ?)",
                  values: [newUser.id, terms]
                }, function(err, rows) {
                  if (err)
                    throw err;
                });

                return done(null, newUser);
              });
            }
          });
        }
      });
    });
  }));


//initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Functions that describe responses to
// clients usage of the browser
// https://expressjs.com/en/guide/routing.html

// Client reaching the home page
app.get('/', function(req, res) {
  req.session.lastPage = '/index';
  res.render('pages/index', {
    auth: req.isAuthenticated(),
    page: 0 //the page thing is used to tell the header which section should be highlighted AKA which page we are currently on
  });
});

// First string sprcifies the target of the
// request





app.get('/callback', function(req, res) {
  res.redirect(req.session.lastPage || '/index'); //go to the last page, if no last page recorded for some reason, we default to going to About page. 
});


app.get('/index', function(req, res) { //this will be the 'About' page
  req.session.lastPage = '/index';
  res.render('pages/index', {
    auth: req.isAuthenticated(),
    page: 0
  });
});

app.get('')

app.get('/profile', mustBeLoggedIn, function(req, res) { //this will be the 'Profile' Page ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/profile';
  res.render('pages/profile', {
    auth: req.isAuthenticated(),
    page: 1
  });
});

app.get('/tag', mustBeLoggedIn, function(req, res) { //this will be the 'TAG' Page UNDER PROFILE ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/tag';                      //not implemented YET
  res.render('pages/tag', {
    auth: req.isAuthenticated(),
    page: -1
  });
});

app.get('/edit', mustBeLoggedIn, function(req, res) { //this will be the 'Profile' Page UNDER PROFILE ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/edit';                     //not implemented YET
  res.render('pages/edit', {
    auth: req.isAuthenticated(),
    page: -1
  });
});

app.get('/participate', alreadyLoggedIn, function(req, res) { //this will be the 'Participate' Page ONLY ACCESSIBLE IF NOT AUTHENTICATED
  req.session.lastPage = '/participate';
  res.render('pages/participate', {
    auth: req.isAuthenticated(),
    page: 1
  });
});

/*  
  //conset and consent_form are not currently under use. 
app.get('/consent', function(req, res) {
  req.session.lastPage = '/consent';
  res.render('pages/consent', {
    auth: req.isAuthenticated(),
    page: 1
  });
});

app.get('/consent_form', mustBeLoggedIn, function(req, res) {
  res.render('pages/consent_form', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: 1
  });
}); */

app.get('/past_studies', function(req, res) { //This will be the 'Past Studies' Page
  req.session.lastPage = '/past_studies';
  res.render('pages/past_studies', {
    auth: req.isAuthenticated(),
    page: 2
  });
});

app.get('/contacts', function(req, res) { //This will be the 'Contacts' Page
  req.session.lastPage = '/contacts';
  res.render('pages/contacts', {
    auth: req.isAuthenticated(),
    page: 3
  });
});


app.get('/practice', function(req, res, next) {
  if (req.session.lastPage == '/participate') {
    req.session.lastPage = '/practice';
  }
  return next();
}, mustBeLoggedIn, hasNotCompleted, function(req, res) {
  res.render('pages/practice', {
    auth: req.isAuthenticated()
  });
});

app.get('/pre_platform', mustBeLoggedIn, hasNotCompleted, function(req, res) {
  res.render('pages/pre_platform', {
    auth: req.isAuthenticated()
  });
});

app.get('/platform', mustBeLoggedIn, hasNotCompleted, function(req, res) {
  res.render('pages/platform', {
    auth: req.isAuthenticated()
  });
});

app.get('/login', alreadyLoggedIn, function(req, res) {
  res.render('pages/login', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: -1
  });
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/auth/facebook/callback?', 
  passport.authenticate('facebook', {
    successRedirect: '/callback',
    failureRedirect: '/'
  }));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/signup', alreadyLoggedIn, function(req, res) {
  res.render('pages/signup', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: -1
  });
});

app.get('/survey', mustBeLoggedIn, function(req, res) {
  res.render('pages/survey', {
    auth: req.isAuthenticated(),
    a1: ['Not at all', 'Not so much', 'Neutral', 'Somewhat', 'Very much'],
    a2: ['High school diploma or less','Associate\'s degree','Bachelor\'s degree','Graduate or professional degree','Prefer not to answer'],
    page: 1
  });
});

app.get('/thanks', function(req, res) {
  res.render('pages/thanks', {
    auth: req.isAuthenticated(),
    page: 1
  });
});

// POST request - for the server to store certain data
// https://en.wikipedia.org/wiki/POST_(HTTP)
// Need to collect all these entries in the database
app.post('/signup', alreadyLoggedIn, function(req, res, next) {
  if (!(req.body.password == req.body.confirm)) {
    req.flash('err', 'Passwords do not match.');
    res.redirect('/signup');
  }
  else {
    req.session.terms = req.body.terms;
    return next();
  }
},passport.authenticate('local-signup', {
  successRedirect: '/profile',
  failureRedirect: '/signup',
  failureFlash: true
}));

app.post('/login', passport.authenticate('local-login', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}));

app.post('/consent', function(req, res) {
  var terms = req.body.terms? 1:0;
  connection.query({
    sql: "UPDATE experiment SET consent=? WHERE id=?",
    values: [terms, req.user.id]
  }, function(err, rows) {
    if (err) throw err;
  });
  res.redirect(req.session.lastPage);
});

app.post('/survey', function(req, res) {
  process.nextTick(function() {
    var result = {
      interest:  req.body.interest? parseInt(req.body.interest): null,
      education: req.body.education? parseInt(req.body.education): null,
      zip:       req.body.zip? parseInt(req.body.zip): null,
      getresult: req.body.getresult? 1:0,
      futurehelp:req.body.futurehelp? 1:0
    }

    connection.query({
      sql: "INSERT INTO survey (`id`, `interest`, `education`, `zip`, `email_results`, `email_future`) VALUES (?, ?, ?, ?, ?, ?)",
      values: [
        req.user.id,
        result.interest,
        result.education,
        result.zip,
        result.getresult,
        result.futurehelp
      ]
    }, function(err, rows) {
      if (err) throw err;
    });

    connection.query({
      sql: "UPDATE experiment SET survey=1 WHERE id=?",
      values: [req.user.id]
    }, function(err, res) {
      if (err) throw err;
    });
    //console.log(result);
  });
  res.redirect('/thanks');
});

app.post('/platform', function(req, res) {

  var answers = JSON.parse(req.body.answers);
  result = {
    sequence: JSON.parse(req.body.sequence),
    times: JSON.parse(req.body.times)
  }
  var answerIdx = [];

  for (var i = 0; i < answers.length; i++) {
    if (answers[i] == "threat")
      answerIdx.push(1);
    else if (answers[i] == "no_threat")
      answerIdx.push(2);
    else if (answers[i] == "dontknow")
      answerIdx.push(3);
    else
      answerIdx.push(0);
  }

  //building the super long sql string
  var queryString = "INSERT INTO answers (`id`, ";
  for (var i = 0; i < 30; i++) {
    queryString += '`q' + (result.sequence[i]+1) + '`, ';
  }
  queryString += '`q' + (result.sequence[30]+1) + '`) VALUES (';
  for (var i = 0; i < 31; i++) {
    queryString += '?, ';
  }
  queryString += '?)';


  var val = [req.user.id];
  val = val.concat(answerIdx);

  connection.query({
    sql: queryString,
    values: val
  }, function(err, rows) {
    if (err) throw err;
  });

  //building the super long sql string again
  var queryString = "INSERT INTO times (`id`, ";
  for (var i = 0; i < 30; i++) {
    queryString += '`q' + (result.sequence[i]+1) + '`, ';
  }
  queryString += '`q' + (result.sequence[30]+1) + '`) VALUES (';
  for (var i = 0; i < 31; i++) {
    queryString += '?, ';
  }
  queryString += '?)';

  val = [req.user.id];
  val = val.concat(result.times);

  connection.query({
    sql: queryString,
    values: val
  }, function(err, rows) {
    if (err) throw err;
  });

  connection.query({
    sql: "UPDATE experiment SET finished=1 WHERE id=?",
    values: [req.user.id]
  }, function(err, rows) {
    if (err) throw err;
  });

  connection.query({
    sql: "UPDATE experiment SET dateFinished=? WHERE id=?",
    values: [Date.now(), req.user.id]
  }, function(err, rows) {
    if (err) throw err;
  });
  res.redirect("/survey");
});


function alreadyLoggedIn(req, res, next) {
  if (req.isAuthenticated()) { // if for some reason the user goes to login or signup
    res.redirect('/index');    // while logged in already, take them to the homepage
  }
  else
    return next();
}

function mustBeLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on 
  if (req.isAuthenticated()) {
    return next();
  }

  // if they aren't redirect them to the login page
  req.flash('err', "Please log in first.");
  res.redirect('/login');
}

function hasNotCompleted(req, res, next) {
  connection.query({
    sql: "SELECT * FROM experiment WHERE id = ?",
    values: req.user.id
  }, function(err, rows) {
    if (err) throw err;

    if (!rows[0].consent) {
      req.flash('err', "In order to continue with the experiment, please agree to the terms of consent listed below.");
      res.redirect('/consent_form');
    }
    else if (DEV) {
      return next();
    }
    else if (!rows[0].finished) { // if the user has hasn't completed the experiment, carry on
      return next();
    }
    else if (!rows[0].survey) { // if they have, if they haven't done the survey, redirect them to the survey page
      res.redirect('/survey'); 
    }
    else { // if they have done the survey, redirect them to the thanks page
      res.redirect('/thanks');
    }
  });
}

var trueAnswers = ["no_threat","no_threat","no_threat",
  "no_threat","no_threat","threat","no_threat","threat",
  "no_threat","no_threat","threat","threat","no_threat",
  "threat","threat","no_threat","no_threat","no_threat",
  "no_threat","no_threat","threat","no_threat","no_threat",
  "threat","no_threat","threat","no_threat","threat",
  "threat","no_threat","no_threat"];

http.listen(8080, function(){
  console.log('listening on *:8080');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});