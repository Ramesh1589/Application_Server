//CR5206
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const router = require('express').Router();
const path = require('path');

const APIcalllogger = require('morgan');
const morgon_json = require('morgan-json');
const moment = require('moment');
var cronJob = require('cron').CronJob;

const appconfig = require('./server/appconfig');
const config = appconfig.readconfig();
var port = config.server.port;
var LoggingDir = config.server.LoggingDir;

if(LoggingDir == undefined)
LoggingDir = "./logs/";

if ( !fs.existsSync( LoggingDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( LoggingDir );
}

if(port == undefined)
port = "12162";

console.log("Serve running on port:" + port);
//var port = 1337;

var app = express();

app.set('json spaces',2);
// app.set('superSecret',""); //Secrete Variable. You can get it from config.

//Log all api calls
var currntdate = moment(new Date()).format("YYYY-MM-DD");
var logDir = LoggingDir + currntdate;
if ( !fs.existsSync( logDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( logDir );
}
var logfilename = logDir + "/" + currntdate + "_access.log";
var accesslog = fs.createWriteStream(logfilename,{flags:'a'});
const api_log_format = morgon_json(':date[web] :method :url :remote-addr :status :res[content-length] bytes :response-time ms');
app.use(APIcalllogger(api_log_format,{stream:accesslog}));

//change date wise logfile
var loginJob = new cronJob({
	cronTime : '10 00 00 * * *',	
    onTick : updateLogFile,
    start : true,
    timezone : 'Asia/Kolkata'
});

function updateLogFile(){
	currntdate = moment(new Date()).format("YYYYMMDD");
	logDir = LoggingDir + currntdate;
	if ( !fs.existsSync( logDir ) ) {
		// Create the directory if it does not exist
		fs.mkdirSync( logDir );
	}
	
	logfilename = logDir + "/" + currntdate + "_access.log";	
}

//Use Body parser so we get info from Post and/or URL Parameters. 
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());



//Allowing Cross reference for data sharing.
app.use( function(req,res,next){
	res.header("Access-Control-Allow-Origin","*");	
	res.header("Access-Control-Allow-Headers","Origin,X-Requested-With, Content-Type, Accept");
	next();
});


//API Handler
var APIHandler = require('./server/APIHandler');
//Authenticate User
var Authenticate = require('./server/auth-check');
 app.post('/api/login', APIHandler.userLogin);
//  app.post('/api/changepassword', APIHandler.changePassword);
//  app.post('/api/updatepassword', APIHandler.updatePassword);

 
app.listen(port,'0.0.0.0');
console.log("server started");

