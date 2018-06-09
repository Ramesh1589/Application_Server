const jwt = require('jsonwebtoken');
var global = require('./global.js');
const jwtAuthLog = require('./Logger.js');
const fs = require('fs');
var cronJob = require('cron').CronJob;
const moment = require('moment');
const appconfig = require('./appconfig');
const config = appconfig.readconfig();
var LoggingDir = config.server.LoggingDir;

if(LoggingDir == undefined)
LoggingDir = "./logs/";
if ( !fs.existsSync( LoggingDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( LoggingDir );
}
var currntdate = moment(new Date()).format("YYYYMMDD");
var logDir = LoggingDir + currntdate;
if ( !fs.existsSync( logDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( logDir );
}
var jwtAuthCheckLog = logDir + "/" + currntdate + "_jwtAuthCheck.log";
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
	jwtAuthCheckLog = logDir + "/" + currntdate + "_jwtAuthCheck.log";
}
module.exports = function(req, res,next){
    var token;
    var responseData = {};
    responseData.status = -1;    
    var logData = {};
    logData.errMessage = "Unauthorized Access.";
    logData.remoteAdd = req._remoteAddress;
    logData.jwtToken = token;
    logData.timestamp = moment(new Date()).format("YYYY-DD-MM HH:mm:ss:ms");
    try {
        token = req.headers.authorization;
        if(token == undefined){
            fs.appendFile(jwtAuthCheckLog, JSON.stringify(logData) + "\n", function (err) {
                if (err) console.log(err.message);
            });
            responseData[global.message] = "Authentication Failed.";            
            return res.status(500).json(responseData);        
        }
        var decode = jwt.verify(token, global.JWT_SECRET);
        var nIndex = global.jwtTokens.indexOf(token);
        if(nIndex < 0){            
            responseData[global.message] = "Authentication Failed.";            
            fs.appendFile(jwtAuthCheckLog, JSON.stringify(logData) + "\n", function (err) {
                if (err) console.log(err.message);
            });
            return res.status(500).json(responseData);        
        }      
        next();
    }catch(error) {
        var nIndex = global.jwtTokens.indexOf(token);
        if(nIndex > 0){
            global.jwtTokens.splice(nIndex,1);
        }        
        responseData[global.message] = "Authentication Failed.";            
        fs.appendFile(jwtAuthCheckLog, JSON.stringify(logData) + "\n", function (err) {
            if (err) console.log(err.message);
        });
        return res.status(500).json(responseData);       
    }   
};