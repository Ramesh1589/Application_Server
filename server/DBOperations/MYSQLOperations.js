const FILE_NAME = ' MySQLOperations.js ';
var dummyData;
const fs = require('fs');
const mysql = require('mysql');
const appconfig = require('../appconfig');
const config = appconfig.readconfig();
const Q = require('q');
const moment = require('moment');
var cronJob = require('cron').CronJob;
var LoggingDir = config.server.LoggingDir;
if(LoggingDir == undefined)
LoggingDir = "./logs/";

if ( !fs.existsSync( LoggingDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( LoggingDir );
}
const FifoArray = require('fifo-array');
var queryRespArray = new FifoArray(100);
queryRespArray.max = config.server.QueryRespCount || 100; 


var currntdate = moment(new Date()).format("YYYYMMDD");
var logDir = LoggingDir + currntdate;

if ( !fs.existsSync( logDir ) ) {
	// Create the directory if it does not exist
	fs.mkdirSync( logDir );
}

var queryRespfilename = logDir + "/" + currntdate + "_queryResp.log";

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
	queryRespfilename = logDir + "/" + currntdate + "_queryResp.log";
}

//Module wise logging
// const DBlogger = require('../logger.js');


// var logger = new DBlogger();
// logger.initialize("MySQLOperations", 'error');

const dbconfig = {
    host: config.db.server,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    multipleStatements: true
};

var connection;

function handleDisconnect() {
    try {
        const FUNC_NAME = " handleDisconnect() ";
        connection = mysql.createConnection(dbconfig); // Recreate the connection, since
        connection.connect(function (err) {              // The server is either down
            if (err) {                                     // or restarting (takes a while sometimes).
                console.log(err.message + FUNC_NAME);
                setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
            } else {
                console.log("Database Connected with ID " + connection.threadId);
              
            }                                     // to avoid a hot loop, and to allow our node script to
        });                                     // process asynchronous requests in the meantime.
        // If you're also serving http, display a 503 error.
        connection.on('error', function (err) {
            handleDisconnect(); 
            console.log(err + FUNC_NAME);
            if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' ) { // Connection to the MySQL server is usually
                handleDisconnect();                         // lost due to either server restart, or a
            } else {                                      // connnection idle timeout (the wait_timeout
                throw err;                                  // server variable configures this)
            }
        });
        
    } catch (err) {
        console.log(err.message + FUNC_NAME);
       
    }
};

   handleDisconnect();
    var heartBeatMysql = function(){
        var currntdatetime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
        console.log(currntdatetime + " heartBeatMysql() called");
        var FUNC_NAME = " heartBeatMysql()";
        try{
        var query = "select 1;";
        connection.query(query, function (err, rows, fields) {
                    if (err) {
                        console.log(err.message + FUNC_NAME);                    
                    }                
                });
        }catch(err){
            console.log(err.message + FUNC_NAME);
        }
    }
    setInterval(heartBeatMysql,30*60*1000);

module.exports = {
    executequery: function (query) {
        const FUNC_NAME = " executequery() ";
        var logObj = {};
        logObj.timestamp = moment(new Date()).format("YYYY-DD-MM HH:mm:ss:ms");
        try {                        
            var deferred = Q.defer();
            var result = {};
            logObj.query = query;
            connection.query(query, function (err, rows, fields) {
                if (err) {
                   
                    logObj.response = err.message;
                    queryRespArray.push(logObj);
                    fs.appendFile(queryRespfilename, JSON.stringify(logObj) + "\n", function (err) {
                        if (err) console.log(err.message);
                    });
                    deferred.reject(err);
                }
                else {                    
                    logObj.response = rows;
                    queryRespArray.push(logObj);
                    fs.appendFile(queryRespfilename, JSON.stringify(logObj) + "\n", function (err) {
                        if (err) console.log(err.message);
                    });
                    deferred.resolve(rows);
                }
            });
            return deferred.promise;
        } catch (err) {
            console.log(err.message + FUNC_NAME);
           
        }
    },

   

};