
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

//nodemailer for mailing forgotten passwords
var nodemailer = require('nodemailer');

//async.waterfall for password recovery
var async = require('async');

//native crypto for token generation
var crypto = require('crypto');

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
app.use('/scripts', express.static(__dirname + '/newpub/scripts')); 
//app.use('/styles',  express.static(__dirname + '/newpub/css'));
app.use('/images',  express.static(__dirname + '/newpub/images'));
app.use('/360images', express.static(__dirname + '/newpub/360images')) //this handles serving file from directory to server. 
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
    user.name = rows[0].name; 
    user.pics_done = rows[0].pics_done;
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
        newUser.name = req.body.name;

        connection.query({
            sql: "INSERT INTO auth (email, password, name) values (?, ?, ?)",
            values: [email, newUser.password, newUser.name]
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
          user.name     = rows[0].name;
          user.pics_done = rows[0].pics_done;
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

app.get('/profile', mustBeLoggedIn, function(req, res) { //this will be the 'Profile' Page ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/profile';
  res.render('pages/profile', {
    auth: req.isAuthenticated(),
    page: 1,
    errmsg:req.flash('err'),
    name: req.user.name
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


app.get('/contact', function(req, res) { //This will be the 'Contacts' Page
  req.session.lastPage = '/contact';
  res.render('pages/contact', {
    auth: req.isAuthenticated(),
    page: 3
  });
});

//------------------------------------------------------------------------------------Tagging

app.get('/tag', mustBeLoggedIn, function(req, res) { //this will be the 'TAG' Page UNDER PROFILE ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/tag';                      //not implemented YET



  connection.query({
    sql: "SELECT * FROM auth WHERE id = ?",
    values: [req.user.id]
  }, function(err,rows){
    if (err)
    {
      console.log('Error while retriving pics_done from auth \n' + err);
      return (err);
    }
    else
    {
      let curr_pic_name = "img" + (rows[0].pics_done+1);
      res.render('pages/tag_test', {
        auth: req.isAuthenticated(),
        page: 1,
        pic: curr_pic_name,
        errmsg: req.flash('err'),
      });
    }
  })


});

app.post('/tag', mustBeLoggedIn, function(req,res) {
  var tag_list = JSON.parse(req.body.tag_list);
  console.log(tag_list);
  console.log(req.body.pic + typeof req.body.pic);
  console.log('user id: ' + req.user.id );
  console.log(req.body.time);
  //res.redirect('/tag');

  connection.query({ //first mysql check if user id already exists with the picture name
    sql: "SELECT * FROM tagRecords WHERE id = ? AND pic_name = ?", 
    values: [req.user.id,req.body.pic]
  }, function(err, rows) {
    //connection.end();
    if (err)
    {
      console.log('beep boop, error' + err);
      return (err);
    }

    if (rows.length) //if user already tagged the image
    {
      console.log('beep boop, user tried to retag.');
      req.flash('err', 'User already tagged this image');
      res.redirect('/tag');
    }
    //we now update tagRecords table
    else { 
      connection.query({
        sql: "INSERT INTO tagRecords (id, time, pic_name, tags) VALUES (?, ?, ?, ?)", //the tagRecords have 4 columns: id -> INT PRIMARY KEY user id, time -> STR time of recording in UTC, pic_name -> STR file name of the tagged pic, tags -> JSON json file containing the tags in the format of [[name1,x1,y1],[name2,x2,y2]...]  
        values: [req.user.id, req.body.time, req.body.pic, req.body.tag_list]
      }, function (err, rows) {
        if (err)
        {
          console.log("tag insertion error: \n " + err);
          return err;
        }
        else{
          connection.query({
            sql:"UPDATE auth SET pics_done = pics_done + 1 WHERE id = ?",
            values:[req.user.id]
          }, function (err,rows){
            if (err)
            {
              console.log("auth table pic done update error: \n" + err);
              return err;
            }
            else
            {
              console.log("New tag inserted. User Id: " + req.user.id + "\nPicture Name: " + req.body.pic + "\n Time submitted: " + req.body.time + "\n");
              req.flash('err', 'Tags Successfully submitted!')
              res.redirect('/tag');
            }
          });
        }
      });
    }
  });
});


//------------------------------------------------------------------------LOGIN, SIGNUP, and LOGOUT

app.get('/login', alreadyLoggedIn, function(req, res) {
  res.render('pages/login', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: -1
  });
});

app.post('/login', passport.authenticate('local-login', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}));


app.get('/signup', alreadyLoggedIn, function(req, res) {
  res.render('pages/signup', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: -1
  });
});

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


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


//------------------------------------------RESET-PASSWORD-FROM-EMAIL------------------------
//first, user goes to forgot, it renders a form that would POST their email information.
app.get('/forgot', alreadyLoggedIn, function(req,res) { 
  res.render('pages/forgot', {
    auth: req.isAuthenticated(),
    errmsg: req.flash('err'),
    page: -1
    
  });
});

// this is where the posted email information is handled. If the email exists in database, a token with 1h validity is generated and sent to that email. This token and validity is stored inside auth table in mysql.
// http://sahatyalkabov.com/how-to-implement-password-reset-in-nodejs/
app.post('/forgot', function(req, res, next) {
  async.waterfall([ //using waterfall to handle nested callbacks
    function(done) { //generate a temporary token
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token); //passes the token 
      });
    },

    function(token, done) { //token catches token
      connection.query({ //first mysql check if email exists
        sql: 'SELECT * FROM auth WHERE email = ?',
        values: [req.body.email]
      }, function(err, rows) {
        //connection.end();
        if (err)
          return (err);

        if (!rows.length)
        {
          req.flash('err', 'No user found associated with email.');
          res.redirect('/forgot');
        }
        else { //if email exists, we do another mysql connection this time to update the user row with the generated token and its validity.
         // Correct user and password
          var user = new Object();
          user.id       = rows[0].id;
          user.email    = rows[0].email;
          user.password = rows[0].password;
          user.name     = rows[0].name;
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour validity
        
          connection.query({ //
            sql: "UPDATE auth set resetPasswordToken =? , resetPasswordExpires =? WHERE id =?",
            values: [user.resetPasswordToken, user.resetPasswordExpires, user.id]
          }, function(err, rows) {
            if (err) throw err;
          });
          
          
          done(err, token, user); //pass the token and the user
        }
      });
    },
    function(token, user, done) { //token cataches token, user catches email
      console.log(user); //console logs down who requested a password recovery.
      var smtpTransport = nodemailer.createTransport({ //set up mail info
        service: 'gmail',
        auth: {
          user: 'BrooklynAtlantisRecovery@gmail.com',
          pass: 'Sugarelephant@213240'
        }
      });
      var mailOptions = { //edit mailing content and receiver
        to: user.email,
        from: 'BrooklynAtlantisRecovery@gmail.com',
        subject: 'Brooklyn Atlantis Account Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) { //sending the mail with the token attached link
        req.flash('err', 'An e-mail has been sent to ' + user.email + ' with further instructions.'); //flash stating completion of the email sending.
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot'); //refresh page with flash
  });
});


//This is the second part where user clicks on the link sent on the email with the token 
app.get('/reset/:token', alreadyLoggedIn, function(req,res) {
  req.session.lastPage = '/login'; //if this fails, we go back to login page.

  connection.query({ //check the owner of the token and whether it has expired. 
    sql: 'SELECT * FROM auth WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
    values: [req.params.token, Date.now()]
  }, function(err, rows) {
    //connection.end();
    if (err)
      return done(err);

    if (!rows.length)
    {
      req.flash('err', 'The link is either invalid or has expires, please try again.');
      res.redirect("/login");
    }
    else {
    // Correct user and password
        var user = new Object();
        user.id       = rows[0].id;
        user.email    = rows[0].email;
        user.password = rows[0].password;
        user.name     = rows[0].name;
        res.render('pages/reset', { //if link is valid, direct user to reset.ejs form where they POST new password info.
          name: user.name, 
          errmsg: req.flash('err')
        });
    
    }
  });
});


app.post('/reset/:token', function(req, res) { //submitted reset form, we test the token again to see if it's expired, if not then we chage the password in mysql and redirect user back to login.
  req.session.lastPage = '/login';
  async.waterfall([
    function(done) {
      connection.query({
        sql: 'SELECT * FROM auth WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
        values: [req.params.token, Date.now()]
      }, function(err, rows) {
        //connection.end();
        if (err)
          throw err;
    
        if (!rows.length)
        {
          req.flash('err', 'The link is either invalid or has expires, please try again.');
          res.redirect("/login");
          throw err;
        }
        else {
          var user = new Object();
          user.id       = rows[0].id;
          user.email = rows[0].email;
          user.password = bcrypt.hashSync(req.body.password);
          user.name = rows[0].name;
          connection.query({
            sql: "UPDATE auth set password = ?, resetPasswordToken = null , resetPasswordExpires = null WHERE id =?",
            values: [user.password,user.id]
          }, function(err, rows) {
            if (err) throw err;
          });
          console.log("Password updated for" + user.name);
        }
        done(err,user);
      });
    },

    function(user, done) {
      console.log(user);
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'BrooklynAtlantisRecovery@gmail.com',
          pass: 'Sugarelephant@213240'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'BrooklynAtlantisRecovery@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('err', 'Success! Your password has been changed, please log in with your new password.');
        done(err,'done');
      });
    }
  ], function(err) {
    res.redirect('/login');
  });
});
//-----------------------------------------------Editing Profile-------------
app.get('/edit', mustBeLoggedIn, function(req,res) {
  res.render('pages/edit', {
    name: req.user.name,
    email: req.user.email,
    errmsg: req.flash('err'),
    auth: req.isAuthenticated(),
    page:1
  })
});

//app.post('/edit_name', function(req,res))


//------------------------------------------------Change Password (this is when I am already logged in) ------------------------------------
app.get('/change_password', mustBeLoggedIn, function(req,res) {
  res.render('pages/reset', {
    name: req.user.name, 
    errmsg: req.flash('err')
  })
});

app.post('/change_password', mustBeLoggedIn, function(req,res){
  hashedPassword = bcrypt.hashSync(req.body.password);


  connection.query({
    sql: "UPDATE auth set password = ?, resetPasswordToken = null , resetPasswordExpires = null WHERE id =?",
    values: [hashedPassword,req.user.id]
  }, function(err, rows) {
  if (err) throw err;
  });

  console.log("Password updated for" + req.user.name);

    req.flash('err','Password Updated!');
    res.redirect('/profile');
  });


//---------------------------------------------------------------------------THIS SECTION IS ALL THREAT OR NO THREAT DEMO, USED FOR PAST STUDIES DEMO ONLY, NO DATA SHOULD BE STORED.
app.get('/practice', function(req, res, next) {
  if (req.session.lastPage == '/participate') {
    req.session.lastPage = '/practice';
  }
  return next();
}, function(req, res) {
  res.render('pages/practice', {
    auth: 1
  });
});

app.get('/pre_platform', function(req, res) {
  res.render('pages/pre_platform', {
    auth: 1
  });
});

app.get('/platform', function(req, res) {
  res.render('pages/platform', {
    auth: 1
  });
});

//------------------------------LEGACY FACEBOOK STUFF-----------------
/*
app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

app.get('/auth/facebook/callback?', 
  passport.authenticate('facebook', {
    successRedirect: '/callback',
    failureRedirect: '/'
  }));
*/

//-----------------------------UNUSED PAGES TO BE USED LATER


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
    
    /*
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
    */
  });
  res.redirect('/past_studies');
});

app.post('/platform', function(req, res) {

  /*
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
  */
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