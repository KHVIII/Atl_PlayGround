
// Loads functions from modules
// Uses express, a web framework
// https://expressjs.com/ 
var express          = require('express');
// This starts express, now its' functionality can be used
// through app
var app              = express();

const {check, validationResult} = require('express-validator');

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

//this is for socket and passport sharing the same session with user object.
var passportSocketIO = require('passport.socketio');

// Load Redis session storage for express
// No clue what that means but it requires Redis to also
// be loaded and I don't see it here, maybe indirectly?
// Redis
// https://en.wikipedia.org/wiki/Redis

//var redis = require('redis');
var RedisStore       = require('connect-redis')(session);
//var redisClient = redis.createClient();
// https://github.com/NodeRedis/node-redis
//var sessionStore = new RedisStore({host:'127.0.0.1:8080'});


// This one is currently depracted, it is used to make
// http calls 
var request          = require('request');
// For parsing http request bodies
var bodyParser       = require('body-parser');
//	mysql database module 
var mysql            = require('mysql');

var mySQLStore = require('connect-mysql')(session),
    sqlStoreOptions = {
      config: {
        user: 'root',
        password: 'atlantis2020',
        database: 'Eager'
      },
      cleanup: true
    };
var sessionStore = new mySQLStore(sqlStoreOptions);

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

//handling user file uploads (pro pic upload)
var formidable = require('formidable');


//csv writer for survey
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const surveyCsvWriter = createCsvWriter({
  path:'public/survey.csv',
  header: [
    {id:'id',title:'id'},
    {id:'environment',title:'environment'},
    {id:'enjoy',title:'enjoy'},
    {id:'career',title:'career'},
    {id:'contribution',title:'contribution'}
  ],
  append: true
});

//objects to csv
const objectsToCSV = require('objects-to-csv');



var DEV              = false;
const fs = require('fs');
const { resolve } = require('path');
const e = require('express');
const { transformAuthInfo } = require('passport');
// This is needed to allow the website itself to log in to 
// the MYSQL database
var db_config = {
 host: '128.238.25.39',
 user: 'ba_server',
 password: 'jaw021HB$n)',
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
app.use('/css',     express.static(__dirname + '/booted/css'));
app.use('/propics', express.static(__dirname + '/public/propics')); //user uploaded pro pic
app.use('/socket.io',express.static(__dirname + '/node_modules/socket.io'))

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
    sql: "SELECT * FROM `auth` WHERE `email` = ? OR 'name' = ?",
    values: [email, req.body.name]
  }, function(err, rows) {
      if (err)
        return done(err);

      if (rows[0]){ //user exists
        if (rows[0].name == req.body.name) {
          return done(null, false, req.flash('err', 'That name is already taken.'));
        } else {
          return done(null, false, req.flash('err', 'That email is already taken.'));
        }
      }

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
          var currentdate = new Date(); 
          var datetime = currentdate.getUTCDate() + "/" + (currentdate.getUTCMonth()+1)  + "/" + currentdate.getUTCFullYear();
          connection.query({
            sql: "INSERT INTO userInfo (id, email, gender, name, birthday, reg_date, recent_log_in) VALUES (?, ?, ?, ?, ?, ?, ?)",
            values: [newUser.id, email, req.body.pronoun, newUser.name, req.body.birthday, datetime, datetime]
          }, function(err, rows) {
            if (err) throw err;
          });
          fs.mkdir('./public/datasets/user'+newUser.id, function(err){
            if (err){
              console.log("error when fs creating a folder for sign up user: " + err);
              throw(err);
            } else {
              const browsingDataWriter = createCsvWriter({
                path:'public/datasets/user'+newUser.id+'/navigationData_user'+newUser.id+".csv",
                header: [
                  {id:'time',title:'Time (UTC)'},
                  {id:'action',title:'Action'},
                  {id:'detail',title:'Detail'},
                  {id:'notes',title:'Notes'},
                ],
              });

              detailedDateTime = currentdate.getUTCDate() + "_" + (currentdate.getUTCMonth()+1)  + "_" + currentdate.getUTCFullYear() + " @ "  + currentdate.getUTCHours() + ":"  + currentdate.getUTCMinutes() + ":" + currentdate.getUTCSeconds();
              let data = [
                {
                  time: detailedDateTime,
                  action: "Sign-Up",
                  detail: "",
                  notes: ""
                }
              ];
              browsingDataWriter.writeRecords(data).then(()=>{
                console.log("successfully created navigationData csv and recorded down sign up time.");
              });

              console.log("poggers");
            }
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
          var currentdate = new Date(); 
          var datetime = currentdate.getUTCDate() + "/" + (currentdate.getUTCMonth()+1)  + "/" + currentdate.getUTCFullYear() + " @ "  + currentdate.getUTCHours() + ":"  + currentdate.getUTCMinutes() + ":" + currentdate.getUTCSeconds();
          
          connection.query({
            sql:'UPDATE userInfo SET recent_log_in = ? WHERE id = ?',
            values: [datetime,user.id]
          }, function (err, rows) {
            if (err){
              console.log('User Log in updating recent-log-in error: ' + err);
              return done(null, user);
            } else {
              testId = user.id;
              return done(null, user);
            }
          });
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
  if (req.isAuthenticated() == 1) {
    res.redirect('/profile');
  } else {
    res.redirect('/index');
  }
});

// First string sprcifies the target of the
// request





app.get('/callback', function(req, res) {
  res.redirect(req.session.lastPage || '/index'); //go to the last page, if no last page recorded for some reason, we default to going to About page. 
});


app.get('/index', function(req, res) { //this will be the 'About' page
  req.session.lastPage = '/index';
  if (req.isAuthenticated()) {
    dataLogger(req.user.id,"move","about");
    res.render('pages/index', {
      id: req.user.id,
      auth: req.isAuthenticated(),
      page: 3
    });
  } else {
    res.render('pages/index', {
      id: -1,
      auth: req.isAuthenticated(),
      page: 3
    });
  }
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
  if (req.isAuthenticated()) {
    dataLogger(req.user.id,"move","past_studies");
    res.render('pages/past_studies', {
      id: req.user.id,
      auth: req.isAuthenticated(),
      page: 2
    });
  } else {
    res.render('pages/past_studies', {
      id: -1,
      auth: req.isAuthenticated(),
      page: 2
    });
  }
});


app.get('/contact', function(req, res) { //This will be the 'Contacts' Page
  req.session.lastPage = '/contact';
  if (req.isAuthenticated()) {
    dataLogger(req.user.id,"move","contact");
    res.render('pages/contact', {
      id: req.user.id,
      auth: req.isAuthenticated(),
      page: 4
    });
  } else {
    res.render('pages/contact', {
      id: -1,
      auth: req.isAuthenticated(),
      page: 4
    });
  }
});

//------------------------------------------------------------------------------------Tagging

app.get('/tag', mustBeLoggedIn, function(req, res) { //this will be the 'TAG' Page UNDER PROFILE ONLY ACCESSIBLE IF AUTHENTICATED
  req.session.lastPage = '/tag';                      //not implemented YET
  


  connection.query({
    sql: "SELECT * FROM userInfo WHERE id = ?",
    values: [req.user.id]
  }, function(err,rows){
    if (err)
    {
      console.log('Error while retriving pics_done from auth \n' + err);
      return (err);
    }
    else
    {
      if ( rows[0].tutorial_completion == 0) {
        dataLogger(req.user.id,"move","tag_tutorial");
        res.render('pages/tag_tutorial',{
          id: req.user.id,
          auth: req.isAuthenticated(),
          page: 0,
          pic: 'img1',
          errmsg: req.flash('err')
        });
      } else {
        let curr_pic_name = "img" + (rows[0].pics_done+1);
        dataLogger(req.user.id,"move","tag",curr_pic_name);
        res.render('pages/tag_test', {
          id: req.user.id,
          auth: req.isAuthenticated(),
          page: 0,
          pic: curr_pic_name,
          errmsg: req.flash('err'),
          id: req.user.id
        });
      }
    }
  });


});

app.get('/supersecrettutorialfinish', mustBeLoggedIn, function(req,res) {
  connection.query({
    sql: 'UPDATE userInfo SET tutorial_completion = 1 WHERE id = ? ',
    values: [req.user.id]
  }, function(err,rows){
    if (err) {
      console.log('Error while updating user"s finished tutorial status in mysql: ' + err);
      return (err);
    } else {
      res.redirect('/tag');
    }
  });
});

app.post('/tag', mustBeLoggedIn, function(req,res) {
  if (!JSON.parse(req.body.tag_list)) 
  {
    console.log('User attempts to pass in illegal JSON');
    res.redirect('/logout'); 
  }

  let tag_list = JSON.parse(req.body.tag_list);
  //checks for legal tag_list, if not, log user out 
  if (( !(Array.isArray(tag_list)) ) || tag_list.length >= 500) {
    console.log('User attempts to pass in illegal JSON');
    console.log(tag_list);
    res.redirect('/logout'); 
  }
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
            sql:"UPDATE userInfo SET tags_done = tags_done + " + tag_list.length + ", pics_done = pics_done + 1 WHERE id = ?",
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
  req.session.lastPage = '/signup';
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
  successRedirect: '/edit',
  failureRedirect: '/signup',
  failureFlash: true
}));


app.get('/logout', function(req, res){
  dataLogger(req.user.id,"logout");
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
        
        res.render('pages/reset', { //if link is valid, direct user to reset.ejs form where they POST new password info.
          email: rows[0].email, 
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
  connection.query({
    sql: 'SELECT * FROM userInfo WHERE id = ?',
    values: [req.user.id]
  }, function(err,rows){
    if (err){
      console.log('Editing User Info Error: ' + err);
      return (err);
    }
    else {
      delete rows[0]['id'];
      console.log(rows[0]);
      let infoObj = JSON.stringify(rows[0]);
      dataLogger(req.user.id,"move","edit");
      if (!req.session.lastPage == '/signup') {
        console.log(req.session.lastPage);
        res.render('pages/edit', {
          id: req.user.id,
          page: -1,
          auth: 1,
          errmsg: req.flash('err'),
          first_time: 0,
          info: infoObj //JSON array containing all current user info
        });
      } else {
        res.render('pages/edit', {
          id: req.user.id,
          page: -1,
          auth: 1,
          errmsg: req.flash('err'),
          first_time: 1,
          info: infoObj //JSON array containing all current user info
        });
      }
    }
  });
});



app.post('/edit', function(req,res) {
  console.log(req.body.newBio);
  console.log(req.body.newOccupation);
  connection.query({
    sql:'UPDATE userInfo SET bio = ?, occupation = ?, education = ?, lives_in = ?, is_from = ?, phone = ?, public_email = ? WHERE id = ?',
    values: [req.body.newBio, req.body.newOccupation, req.body.newEducation, req.body.newLives_in, req.body.newIs_from, req.body.newPhone, req.body.newPublic_email, req.user.id]
  }, function(err, rows) {
    if (err){
      console.log('User update information into SQL POST method error: ' + err);
      return (err);
    } else {
      req.flash('err', 'Public Profile Updated Successfully');
      res.redirect('/profile');
    }

  })
});


//------------------------------------------------Change Password (this is when I am already logged in) ------------------------------------
app.get('/change_password', mustBeLoggedIn, function(req,res) {
  dataLogger(req.user.id,"move","change_password");
  res.render('pages/reset', {
    id: req.user.id,
    email: req.user.email, 
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



//------------------------------------------------Profile Stuff -------------------------------------------------------------
//https://github.com/harshittpandey/friendreq-system/blob/master/views/


//this will be the 'Profile' Page ONLY ACCESSIBLE IF AUTHENTICATED
app.get('/profile', mustBeLoggedIn, function(req, res) { 
  let lastPage = req.session.lastPage;
  req.session.lastPage = '/profile';
  connection.query({ 
    sql: "SELECT * FROM userInfo WHERE id = ?",
    values:[req.user.id]  
  }, function(err, rows){
    if (err){ 
      console.log('Error when getting auth column in profile' + err);
      return(err);
    //no error, load the page with user uploaded picture, if no pictures were uploaded, the value for pic will be 'default.jpg'
    } else {
      delete rows[0]['id'];
      delete rows[0]['email'];
      let profile_pic = rows[0].profile_picture;
      delete rows[0].profile_picture;
      console.log(rows[0]);
      let infoObj = JSON.stringify(rows[0]);

      dataLogger(req.user.id,"move","profile");
      if (rows[0].tutorial_completion == 0) {
        res.render('pages/profile_v2', {
          id: req.user.id,
          auth: req.isAuthenticated(),
          page: 1,
          errmsg:req.flash('err'),
          pic: profile_pic,
          info: infoObj, //user public information
          first_time: 2 //this means user has not even done tutorial yet
        });
      } else if (rows[0].pics_done == 0) {
        res.render('pages/profile_v2', {
          id: req.user.id,
          auth: req.isAuthenticated(),
          page: 1,
          errmsg:req.flash('err'),
          pic: profile_pic,
          info: infoObj, //user public information
          first_time: 1 //this means user has not done real tutorials yet
        });
      } else {
        res.render('pages/profile_v2', {
          id: req.user.id,
          auth: req.isAuthenticated(),
          page: 1,
          errmsg:req.flash('err'),
          pic: profile_pic,
          info: infoObj, //user public information
          first_time: 0
        });
      }
    }
  });

  /*
  let getTop10 = new Promise (function(resolve, reject){
    connection.query({
      sql:"SELECT * FROM userInfo ORDER BY tags_done DESC LIMIT 10",
      values:[]
    }, function(err,rows){
      if (err){
        console.log('Profile getting scoreboard from mysql error' + err);
        return (err);
      } else {
        console.log(rows);
        var top10JSON = JSON.stringify(rows);
        console.log(top10JSON);
        resolve(top10JSON);
      }
    });
  });

  //mysql query to get profile_picture

  getTop10.then(function(JSON10){
    connection.query({ 
      sql: "SELECT * FROM userInfo WHERE id = ?",
      values:[req.user.id]  
    }, function(err, rows){
      //if the mysql query is giving back an error for some reason (should not happen since already logged in), we ignore user profile picture and render the page with default profile picture
      if (err){ 
        console.log('Error when getting auth column in profile' + err);
        res.render('pages/profile', {
          auth: req.isAuthenticated(),
          page: 1,
          errmsg:req.flash('err'),
          name: req.user.name,
          pic: 'default.jpg',
          lbArray: JSON10
        });
      
      //no error, load the page with user uploaded picture, if no pictures were uploaded, the value for pic will be 'default.jpg'
      } else {
        res.render('pages/profile', {
          auth: req.isAuthenticated(),
          page: 1,
          errmsg:req.flash('err'),
          name: req.user.name,
          pic: rows[0].profile_picture,
          lbArray: JSON10
        });
      }
    });
  });
  */

});

//this is for processing the profile picture the user will send to the server
app.post('/upload_propic', mustBeLoggedIn, function(req,res){
  //have a promise to generate a token and this token will be used for the filename. The reason for this is so if user uploads two pictures back to back, with the same name, no errors occur between deletion and replacement.
  //a better solution could be done in async fashion, but this works and it's good practice to not let user name our files.
  dataLogger(req.user.id,"upload_pro_pic");

  let generateToken = new Promise (function(resolve,reject){
    crypto.randomBytes(20, function(err, buf) {
      var token = buf.toString('hex');
      resolve(token);
    });
  });

  //use the promise 
  generateToken.then(function(token){
    //use formidable to process our form 
    var newfilename;
    var form = new formidable.IncomingForm();
    form.parse(req);
    var reqPath= path.join(__dirname, '../');
    
    //this function is ran before the file is stored server-side.
    //check the extension only, no need further validation
    form.on('fileBegin', function(name, file){ 
      if(!file.name || file.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
      //outer mysql query before file is added onto server to check if the user already have a profile picture on record in mysql.
      connection.query({
        sql: "SELECT * FROM userInfo WHERE id = ?",
        values: [req.user.id]
      }, function(err, rows) {
        if (err) {
          console.log('checking user propic mysql error' + err);
          req.flash('err','Something went wrong, please try again later.');
          res.redirect('/profile');
          reject();
        }
        else { 
          //if the user does have a prev pro pic, we delete the file
          if (! (rows[0].profile_picture === 'default.jpg')) {  
            fs.unlink(reqPath+'BrooklynAtlantis/public/propics/' + rows[0].profile_picture, function (err, stats){
              if (err) {
                console.log('Error at deleting user previous pic' + err);
                req.flash('err','Something went wrong, please try again later.');
                res.redirect('/profile');
                reject();
              }
            });
          }
          //if the user does not have a previous profile picture, we don't do anything here
        }
      }); 
  
      //after mysql is set up, we tell formidable the path and the name of our file through file.path, the var newfilename is only for us to keep record
      file.path = reqPath + 'BrooklynAtlantis/public/propics/' + req.user.id + '_' + token + '_' + file.name;
      newfilename = req.user.id + '_' + token + '_'+ file.name;
      } else {
        //this happens when extension check fails AKA user uploads something bad.
        console.log(file.name + ' is not allowed');
        req.flash('err','Only jpg,png,jpeg,gif files are accepted, please try again.')
        res.redirect('/profile');
        reject();
      }
    });
    
    //this function runs when the file is uploaded to the server
    form.on('file', function(name, file) {
      //we update the mysql query with the new picture name that is uploaded.
      connection.query({
        sql: "UPDATE userInfo SET profile_picture = ? WHERE id = ?",
        values: [newfilename, req.user.id]
      }, function(err, rows) {
        if (err) { 
          console.log('Error changing the user pro pic record after pro pic upload' + err);
          req.flash('err','Error on mysql updating with new profile picture');
          res.redirect('/profile');
          reject();
        }else{
          fs.chmodSync(file.path, '666'); //this command make the file read-write only (cannot execute) by default 
          req.flash('err', 'Profile Picture Successfully Updated!');
          res.redirect('/profile');
        }
      });
    });
  });
  
  /*
  deletePreviousProfPic.then(function(){
    form.on('fileBegin', function(name, file){
      if(!file.name || file.name.match(/\.(jpg|jpeg|png)$/i)) {
        file.path = reqPath + 'BrooklynAtlantis/public/propics/' + req.user.id + '_' + file.name;
        newfilename = req.user.id +'_'+ file.name;
        resolve();
      }
      else {
        console.log(part.filename + ' is not allowed');
        reject();
      }
    });
  }).then(function(){
    console.log('new file name:' + newfilename);
    connection.query({
      sql: "UPDATE auth SET profile_picture = ? WHERE id = ?",
      values: [newfilename, req.user.id]
    }, function(err, rows) {
      if (err) {
        console.log('Error changing the user pro pic record after pro pic upload' + err);
        return (err);
      }else{
        resolve();
      }
    });
  }).then(function(){
    form.on('file', function(name, file) {
      req.flash('err', 'Prof Pic Successfully Uploaded');
      res.redirect('/profile');
    });
  });
  */
});

//---------------------------------------------------------------------------Community - Searching / Getting Other People's Profile---------------------------------------

const leaderBoardPositionMax = 10; //how many rows in the leaderboard
app.get('/community', mustBeLoggedIn, function(req,res){
  res.redirect('/community.1');
});

app.get('/community-ownRank',mustBeLoggedIn, function(req,res){
  let userRank;
  let userPage; 
  let getUserRank = new Promise(function(resolve,reject){
    connection.query({
      sql:'SELECT x.id, x.position, x.name FROM (SELECT userInfo.id, userInfo.name, @rownum := @rownum + 1 AS position FROM userInfo JOIN (SELECT @rownum := 0) r ORDER BY userInfo.tags_done DESC) x WHERE x.id = ?',
      values:[req.user.id]
    }, function(err,rows){
      if (err){
        console.log('error when trying to get position at own rank: ' + err);
        reject(err);
      } else {
        userRank = parseInt(rows[0].position);
        userPage = Math.ceil(userRank/leaderBoardPositionMax);
        console.log('rank: ' + userRank + ', page: ' + userPage);
        resolve();
      }
    });
  });

  getUserRank.then(function(){
    dataLogger(req.user.id,"check_own_rank");
    res.redirect('/community.'+userPage);
  })
})


app.get('/community.:pageNum', mustBeLoggedIn, [
  //use express-validator to validate and sanitise req.parameter.otherUsername
  check('pageNum').isNumeric()
], function(req, res){
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    //fails validation
    res.redirect('/community');
    //return res.status(400).json({ errors: errors.array() });
    
  } else{
    //pass validation
    let page_index = req.params.pageNum - 1;
    let currPageNumber = req.params.pageNum;
    let totalPageNumber;
    let x = leaderBoardPositionMax; //how many entries in each page of the leaderboard
    
    //first get how many entries in the leaderboard, and then calculate out the totalPageNumber
    let getEntries = new Promise(function(resolve,reject){
      connection.query({
        sql:'SELECT COUNT(*) FROM userInfo',
        values:[]
      }, function(err, rows){
        if (err){
          console.log('error at getting amount of rows from userInfo for leaderboard: ' + err);
          reject(err);
        } else {
          totalPageNumber = Math.ceil(rows[0]['COUNT(*)'] / x);
          resolve();
        }
      });
    });
    
    //then check that the user's requested page number is legal, if so, we pass that page's content
    getEntries.then(function(){
      if (currPageNumber < 1 ){
        req.flash('err','Invalid Page Number!');
        res.redirect('/community.1');
      } else if (currPageNumber > totalPageNumber){
        req.flash('err','Invalid Page Number!');
        res.redirect('/community.'+totalPageNumber);
      } else {
        connection.query({
          sql:'SELECT * FROM userInfo ORDER BY tags_done DESC LIMIT ?, ?',
          values:[page_index*x, x]
        }, function(err,rows){
          if (err){
            console.log('Profile getting scoreboard from mysql error' + err);
            reject (err);
          } else {
            for (let i = 0; i < rows.length; ++i){
              let obj = rows[i];
              delete obj.email;
            }
            var XJSON = JSON.stringify(rows);
            console.log(XJSON);

            dataLogger(req.user.id,"move","leaderboard",currPageNumber);
            res.render('pages/leaderboard', {
              auth: req.isAuthenticated(),
              page: 5,
              errmsg:req.flash('err'),
              id: req.user.id,
              lbArray: XJSON,
              max_page: totalPageNumber,
              curr_page: currPageNumber,
              lb_size: x
            });
          }
        });
      }
    });
  }
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

/*
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
*/

app.post('/survey', function(req, res) {
  process.nextTick(function() {
    /*
    var result = {
      interest:  req.body.interest? parseInt(req.body.interest): null,
      education: req.body.education? parseInt(req.body.education): null,
      zip:       req.body.zip? parseInt(req.body.zip): null,
      getresult: req.body.getresult? 1:0,
      futurehelp:req.body.futurehelp? 1:0
    }*/
    surveyCsvWriter
      .writeRecords([{
        id: req.user.id,
        environment: req.body.environment,
        enjoy: req.body.enjoy, 
        career: req.body.career,
        easy: req.body.easy,
        contribution: req.body.contribution
      }])
      .then(()=> console.log('boom, survey written'));

    dataLogger(req.user.id,"survey_completion");
    /*
    connection.query({
      sql: "INSERT INTO survey (`id`, `environment`, `enjoy`, `career`, `easy`, `contribution`) VALUES (?, ?, ?, ?, ?, ?)",
      values: [
        req.user.id,
        req.body.environment,
        req.body.enjoy,
        req.body.career,
        req.body.easy,
        req.body.contribution
      ]
    }, function(err, rows) {
      if (err) throw err;
    });*/

  });
  res.redirect('/tag');
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

app.post('/exitDataLogger', function(req,res){
  console.log("in the exit data logger pog");
  if (typeof(req.body.pageName) == "string") {
    dataLogger(req.user.id,"exit",req.body.pageName);
  }
});

//this is the server side data logger for writing a user's action into their csv file in their datasets folder
function dataLogger(user_id, event_action,event_detail = "",event_notes = "") {

  if ( (isNaN(user_id)) || (!fs.existsSync("./public/datasets/user"+user_id))) {
    console.log("error when data logger is checking for user id or user datasets folder validity");
    return;
  }
  const browsingDataWriter = createCsvWriter({
    path:'public/datasets/user'+user_id+'/navigationData_user'+user_id+".csv",
    header: [
      {id:'time',title:'Time (UTC)'},
      {id:'action',title:'Action'},
      {id:'detail',title:'Detail'},
      {id:'notes',title:'Notes'},
    ],
    append: true
  });
  let currentdate = new Date();
  detailedDateTime = currentdate.getUTCDate() + "_" + (currentdate.getUTCMonth()+1)  + "_" + currentdate.getUTCFullYear() + " @ "  + currentdate.getUTCHours() + ":"  + currentdate.getUTCMinutes() + ":" + currentdate.getUTCSeconds() + ":" + currentdate.getUTCMilliseconds();
  let data = [
    {
      time: detailedDateTime,
      action: event_action,
      detail: event_detail,
      notes: event_notes
    }
  ];
  browsingDataWriter.writeRecords(data).then(()=>{
    console.log("successfully created navigationData csv and recorded down sign up time.");
  });
}

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

/*
io.use(passportSocketIO.authorize({
  key: 'connect.sid',
  secret: 'c813be3ca54af9bb3328e6e7212024a4fa627d15bd138de2ef78a32b7163db4f',
  store: sessionStore,
  passport: passport,
  cookieParser: cookieParser,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}));


function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');
 
  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);

}
 
function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);
 
  // We use this callback to log all of our failed connections.
  accept(null, false);
 

  // see: http://socket.io/docs/client-api/#socket > error-object
} 
*/

io.on('connection', function(socket){
  console.log('a user connected');

  
  socket.on('join', function(data){
    console.log(data);
    socket.emit('messages', 'communication established.');
    console.log('established one connection.');
  })

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  // for /signup signup.ejs name check function
  socket.on('checkRepeatName',function(data){
    let lookForName = new Promise (function(resolve,reject){
      console.log('checking originality of the name: ' + data);
      connection.query({
        sql:'SELECT * FROM auth WHERE name = ?',
        values: [data]
      }, function(err,rows){
        if (err) {
          console.log('Error when searching for name: ' + err);
          reject(err);
        } else if (rows.length) { //name already exists
          reject();
        } else { //name is original
          socket.emit('isNameOriginal',true);
          resolve();
        }
      });
    });

    lookForName.catch(function(){
      socket.emit('isNameOriginal',false);
    })
  })

  // for /community leaderboard.ejs search function
  socket.on('search', function(data){
    console.log('leaderboard' + ' searching for ' + data );
    let lookForUser = new Promise (function(resolve,reject){
      connection.query({
        sql:'SELECT * FROM userInfo WHERE name = ?',
        values: [data]
      }, function(err,rows){
        if (err) {
          console.log('Error when searching for name: ' + err);
          reject(err);
        } else if (!rows.length){ //no name in DB
          reject();
        } else { //name exists in DB THIS ASSUMES NAMES ARE UNIQUE
          socket.emit('searchFound',rows[0]);
          resolve();
        }
      });
    });

    lookForUser.catch(function(err){
      socket.emit('searchNotFound', 'NOT FOUND');
    });
  });

/*-----------------------------------------------------------------------------------------
  // for /tag trajectory data collection when user SUBMITS
  //data is an object with 2 attributes in the format of 
    /*
    {
      info: {id: INT, pic: STR, timeStamp: STR},
      data: [{
        time:
        pitch:
        yaw:
        hfov:
      }, {
        time:
        pitch:
        ...
        ...
      }, ...]
    }
    */
  socket.on('createTagSubmitted', function(socketData){
    let dataObject = socketData.data; //trajectory
    let specialDataObject = socketData.specialData; //event

    function trajectory(data) {
      if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" || typeof(data.info.timeStamp) != "string") {
        console.log("something is wrong with trajectory tracking id or picname")
        return;
      }
  
      console.log("TAG SUBMITTED, RECORDING DOWN DATA RN.");
      let filename = "trajectory_submitted_user"+data.info.id + "_" + data.info.pic + ".csv";
      let filepath = "./public/datasets/user"+data.info.id;
      if (fs.existsSync(filepath) && !fs.existsSync(filepath+"/"+filename) ) { //if the folder for the user exists and the submitted data has not been established already
        //console.log(data.data);
        console.log("\n"+ typeof(data.data));
  
        const surveyCsvWriter = createCsvWriter({
          path: "public/datasets/user"+data.info.id+"/"+filename,
          header: [
            {id:'time',title:'time'},
            {id:'pitch',title:'pitch'},
            {id:'yaw',title:'yaw'},
            {id:'hfov',title:'hfov'},
            {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
          ],
        });
  
        surveyCsvWriter.writeRecords(data.data).then(() => {
          console.log('Data has been collected for a user submitted trajectory');
        }, (err) => {
          console.log('ERROR WHEN COLLECTING DATA BY A USER SUBMITTED TRAJECTORY');
          console.log(err);
        });
      } 
    }

    function event(data) {
      if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" || typeof(data.info.timeStamp) != "string") {
        console.log("something is wrong with trajectory tracking id or picname or timestamp");
        return;
      }
  
      console.log("TAG SUBMITTED, RECORDING DOWN EVENTS RN.");
      let filename = "event_submitted_user"+data.info.id + "_" + data.info.pic + ".csv";
      let filepath = "./public/datasets/user"+data.info.id;
      if (fs.existsSync(filepath) && !fs.existsSync(filepath+"/"+filename) ) { //if the folder for the user exists and the submitted data has not been established already
        //console.log(data.data);
        console.log("\n"+ typeof(data.data));
  
        const surveyCsvWriter = createCsvWriter({
          path: "public/datasets/user"+data.info.id+"/"+filename,
          header: [
            {id:'time',title:'time'},
            {id:'action',title:'action'},
            {id:'description',title:'description'},
            {id:'action_pitch',title:'action_pitch'},
            {id:'action_yaw',title:'action_yaw'},
            {id:'viewer_center_pitch',title:'viewer_center_pitch'},
            {id:'viewer_center_yaw',title:'viewer_center_yaw'},
            {id:'viewer_hfov', title:'viewer_hfov'},
            {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
          ],
        });
  
        surveyCsvWriter.writeRecords(data.data).then(() => {
          console.log('Data has been collected for a user submitted event');
        }, (err) => {
          console.log('ERROR WHEN COLLECTING DATA BY A USER SUBMITTED EVENT');
          console.log(err);
        });
      }
    }
    trajectory(dataObject);
    event(specialDataObject);
    dataLogger(dataObject.info.id,'exit','tag','tag submitted for ' + dataObject.info.pic);

  });
  /*socket.on('createTagSubmittedTrajectory', function(data){
    if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" || typeof(data.info.timeStamp) != "string") {
      console.log("something is wrong with trajectory tracking id or picname")
      return;
    }

    console.log("TAG SUBMITTED, RECORDING DOWN DATA RN.");
    let filename = "trajectory_submitted_user"+data.info.id + "_" + data.info.pic + ".csv";
    let filepath = "./public/datasets/user"+data.info.id;
    if (fs.existsSync(filepath) && !fs.existsSync(filepath+"/"+filename) ) { //if the folder for the user exists and the submitted data has not been established already
      //console.log(data.data);
      console.log("\n"+ typeof(data.data));

      const surveyCsvWriter = createCsvWriter({
        path: "public/datasets/user"+data.info.id+"/"+filename,
        header: [
          {id:'time',title:'time'},
          {id:'pitch',title:'pitch'},
          {id:'yaw',title:'yaw'},
          {id:'hfov',title:'hfov'},
          {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
        ],
      });

      surveyCsvWriter.writeRecords(data.data).then(() => {
        console.log('Data has been collected for a user submitted trajectory');
      }, (err) => {
        console.log('ERROR WHEN COLLECTING DATA BY A USER SUBMITTED TRAJECTORY');
        console.log(err);
      });

    }
  }); */

  // for /tag trajectory data collection when user DOES NOT SUBMIT
  socket.on('createTagUnsubmittedTrajectory', function(data){
    if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" || typeof(data.info.timeStamp) != "string") {
      console.log("something is wrong with trajectory tracking id or picname")
      return;
    }
    console.log("TAG NOT SUBMITTED, RECORDING DOWN DATA RN.");
    let filename = "trajectory_unsubmitted_user"+data.info.id + "_" + data.info.pic;
    let repeat = 0;
    let filepath = "./public/datasets/user"+data.info.id;

    const maxRepeat = 10; //number of files we'd store for unsubmitted attempts, set to -1 for no limit

    if (fs.existsSync(filepath)) { //if folder exists
      console.log("folder exists!");
      let createFile = function FileRecursion() {
        console.log("recursion running");
        if (!fs.existsSync(filepath+"/"+filename+"_attempt"+repeat+".csv") ) { //if the file does not exist
          //console.log(data.data);
          console.log("\n"+ typeof(data.data));

          const surveyCsvWriter = createCsvWriter({
            path: "public/datasets/user"+data.info.id+"/"+filename+"_attempt"+repeat+".csv",
            header: [
              {id:'time',title:'time'},
              {id:'pitch',title:'pitch'},
              {id:'yaw',title:'yaw'},
              {id:'hfov',title:'hfov'},
              {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
            ],
          });

          surveyCsvWriter.writeRecords(data.data).then(() => {
            console.log('Data has been collected for a user not submitted trajectory');
          }, (err) => {
            console.log('ERROR WHEN COLLECTING DATA BY A USER NOT SUBMITTED TRAJECTORY');
            console.log(err);
          });
        } else { //if the file does exists AKA not the first time user does not submit his results.
          if (maxRepeat == -1 || repeat < maxRepeat) {
            repeat += 1;
            FileRecursion();
          } else {
            console.log("bruh");
            return;
          }
        }
      }
      createFile();
    }
  });

  /*------------------------------------------------------------------------------------*/ 
  //data is an object with 2 attributes in the format of 
    /*
    {
      info: {id: INT, pic: STR, timeStamp: STR},
      data: [{
        time:
        action:
        description:
        action_pitch:
        action_yaw:
        viewer_center_pitch:
        viewer_center_yaw:
        viewer_hfov:
      }, {
        time:
        action:
        ...
        ...
      }, ...]
    }
    */

  // for /tag event data collection when user SUBMITS
  /*
  socket.on('createTagSubmittedEvent', function(data){
    if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" || typeof(data.info.timeStamp) != "string") {
      console.log("something is wrong with trajectory tracking id or picname or timestamp");
      return;
    }

    console.log("TAG SUBMITTED, RECORDING DOWN EVENTS RN.");
    let filename = "event_submitted_user"+data.info.id + "_" + data.info.pic + ".csv";
    let filepath = "./public/datasets/user"+data.info.id;
    if (fs.existsSync(filepath) && !fs.existsSync(filepath+"/"+filename) ) { //if the folder for the user exists and the submitted data has not been established already
      //console.log(data.data);
      console.log("\n"+ typeof(data.data));

      const surveyCsvWriter = createCsvWriter({
        path: "public/datasets/user"+data.info.id+"/"+filename,
        header: [
          {id:'time',title:'time'},
          {id:'action',title:'action'},
          {id:'description',title:'description'},
          {id:'action_pitch',title:'action_pitch'},
          {id:'action_yaw',title:'action_yaw'},
          {id:'viewer_center_pitch',title:'viewer_center_pitch'},
          {id:'viewer_center_yaw',title:'viewer_center_yaw'},
          {id:'viewer_hfov', title:'viewer_hfov'},
          {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
        ],
      });

      surveyCsvWriter.writeRecords(data.data).then(() => {
        console.log('Data has been collected for a user submitted event');
      }, (err) => {
        console.log('ERROR WHEN COLLECTING DATA BY A USER SUBMITTED EVENT');
        console.log(err);
      });
    }
  }); */

  //for /tag event collection when user does not submit
  socket.on('createTagUnsubmittedEvent', function(data){
    if (typeof(data.info.id) != "number" || typeof(data.info.pic) != "string" ) {
      console.log("something is wrong with trajectory tracking id or picname")
      return;
    }
    console.log("TAG NOT SUBMITTED, RECORDING DOWN EVENT RN.");
    let filename = "event_unsubmitted_user"+data.info.id + "_" + data.info.pic;
    let repeat = 0;
    let filepath = "./public/datasets/user"+data.info.id;

    const maxRepeat = 10; //number of files we'd store for unsubmitted attempts, set to -1 for no limit

    if (fs.existsSync(filepath)) { //if folder exists
      console.log("folder exists!");
      let createFile = function FileRecursion() {
        console.log("recursion running");
        if (!fs.existsSync(filepath+"/"+filename+"_attempt"+repeat+".csv") ) { //if the file does not exist
          //console.log(data.data);
          console.log("\n"+ typeof(data.data));

          const surveyCsvWriter = createCsvWriter({
            path: "public/datasets/user"+data.info.id+"/"+filename+"_attempt"+repeat+".csv",
            header: [
              {id:'time',title:'time'},
              {id:'action',title:'action'},
              {id:'description',title:'description'},
              {id:'action_pitch',title:'action_pitch'},
              {id:'action_yaw',title:'action_yaw'},
              {id:'viewer_center_pitch',title:'viewer_center_pitch'},
              {id:'viewer_center_yaw',title:'viewer_center_yaw'},
              {id:'viewer_hfov', title:'viewer_hfov'},
              {id:'not_usable', title:"user"+data.info.id+"_"+data.info.pic + "_" + data.info.timeStamp}
            ],
          });

          surveyCsvWriter.writeRecords(data.data).then(() => {
            console.log('Data has been collected for a user not submitted event');
          }, (err) => {
            console.log('ERROR WHEN COLLECTING DATA BY A USER NOT SUBMITTED EVENT');
            console.log(err);
          });
        } else { //if the file does exists AKA not the first time user does not submit his results.
          if (maxRepeat == -1 || repeat < maxRepeat) {
            repeat += 1;
            FileRecursion();
          } else {
            console.log("bruh");
            return;
          }
        }
      }
      createFile();
    }
  });

  //for dataLogger socket method
  socket.on('dataLogger', function(data){
    //data: [id,action,details,notes]
    console.log('poggers, we on socket datalogger');
    dataLogger(data[0],data[1],data[2],data[3]);
  });

});

http.listen(8080, function(){
  console.log('listening on *:8080');
});
