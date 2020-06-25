var express    = require('express');
var app        = express();
var http       = require('http').Server(app);
var io         = require('socket.io').listen(http);
var pg         = require('pg');
//var bodyParser = require('body-parser');

//app.use('/',        express.static(__dirname + '/booted'));
app.use('/old',     express.static(__dirname + '/newpub'));
//app.use('/images',  express.static(__dirname + '/newpub/images'));
//app.use('/scripts', express.static(__dirname + '/newpub/scripts'));
//app.use('/styles',  express.static(__dirname + '/newpub/css'));
app.use('/images',  express.static(__dirname + '/images'));

app.set('view engine', 'ejs');
app.use('views',    express.static(__dirname + '/booted/views'));

app.get('/', function(req, res) {
  res.render('booted/views/pages/index');
});

var config = {
  user: 'postgres', //env var: PGUSER
  database: 'postgres', //env var: PGDATABASE
  password: 'ThisIsForTheLab', //env var: PGPASSWORD
  host: 'localhost', // Server hosting the postgres database
  port: 5432, //env var: PGPORT
};

var trueAnswers = ["no_threat","no_threat","no_threat",
  "no_threat","no_threat","threat","no_threat","threat",
  "no_threat","no_threat","threat","threat","no_threat",
  "threat","threat","no_threat","no_threat","no_threat",
  "no_threat","no_threat","threat","no_threat","no_threat",
  "threat","no_threat","threat","no_threat","threat",
  "threat","no_threat","no_threat"];

/*var client = new pg.Client(config);
client.connect(function(err) {
  if (err) {
    console.log("ERROR creating client");
    throw err;
  }
  // initialize the tables if needed
  client.query({
    text: "CREATE TABLE IF NOT EXISTS auth (userID SERIAL, fbID int, email varchar(255) NOT NULL, password varchar(255) NOT NULL, PRIMARY KEY (userID))",
  }, function (err, result) {
    if (err) {
      console.log("ERROR creating auth");
      throw err;
    }
  });

  var str = "";
  for (var i = 0; i < trueAnswers.length; ++i)
    str += "a" + i + " varchar(16), "; // answers for each image
  for (var i = 0; i < trueAnswers.length; ++i)
    str += "t" + i + " int, ";         // times for each image

  client.query({
    text: "CREATE TABLE IF NOT EXISTS  " + 
            " sessions (" + 
              "userID int," + str + "finished boolean DEFAULT false, survey boolean, interest int, education int, zip int)",
  }, function (err, result) {
    if (err) {
      console.log("ERROR creating sessions");
      throw err;
    }
  });
});*/
 


http.listen(8080, function(){
  console.log('listening on *:8080');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});