const FILE_NAME = ' logging.js ';

const log4js = require('log4js');
var moment = require('moment');

const fs = require('fs');
//Added for writing logs in JSON format(Custom layout  https://github.com/nomiddlename/log4js-node/blob/master/docs/layouts.md)
log4js.addLayout('json', function (config) {
    return function (logEvent) { return JSON.stringify(logEvent) + config.separator; }
});


//fetch logging configuaration from config file and if not available then start with default config.
var appconfig = require('./appconfig');
var configuration = appconfig.readconfig();

if (configuration.LoggingConf != undefined)
    configuration.LoggingConf = {
        appenders: {
            out: { type: 'file', filename: 'out.log', layout: { type: 'json', separator: ',' } }
        },
        categories: {
            default: { appenders: ['out'], level: 'error' }
        }
    };

//create date wise for logging.
var LoggingDir = configuration.server.LoggingDir;
if(LoggingDir == undefined)
LoggingDir = "./logs/";


var currntdate = moment(new Date()).format("YYYY-MM-DD");
var logDir = LoggingDir + currntdate;

if (!fs.existsSync(logDir)) {
    // Create the directory if it does not exist
    fs.mkdirSync(logDir);
}
var defaultLog = logDir + "/" + currntdate + "_out.log";


//create date wise for logging.
configuration.LoggingConf.appenders.out.filename = defaultLog;
log4js.configure(configuration.LoggingConf);

var defaultLogger = log4js.getLogger('out');

module.exports = moduleWiseLog;


function moduleWiseLog() {
    var _module = "";
    var _level = "error";
    var _logger;

    //Logger instance for perticular module is created and logging level is set.
    function initialize(module, level) {
        const FUNC_NAME = " moduleWiseLog.initialize() ";
        try {            
            if (module != undefined) {
                _module = module;
                var logFileName = logDir + "/" + currntdate + "_" + _module + "_out.log";
                if (level != undefined)
                    _level = level;

                configuration.LoggingConf.appenders[module] = { type: 'file', filename: logFileName, layout: { type: 'json', separator: ',' } };
                configuration.LoggingConf.categories[module] = { appenders: [module], level: level };
                log4js.configure(configuration.LoggingConf);
                _logger = log4js.getLogger(_module);
            }
            else {
                //Failed to create log file for unkown module.
                defaultLogger.error("Failed to create log file for unkown module." + FUNC_NAME + FILE_NAME)
            }
        } catch (err) {
            defaultLogger.fatal(err.message + FUNC_NAME + FILE_NAME);
        }

    }

    //set logging level dynamically for run time debuging.
    function setLevel(level) {
        const FUNC_NAME = " moduleWiseLog.setLevel() ";
        try {            
            _level = level;
            _logger.level = level;
        } catch (err) {
            defaultLogger.fatal(err.message + FUNC_NAME + FILE_NAME);
        }
    }

    //write logs module wise.
    function writeLog(msg, data, level) {
        const FUNC_NAME = " moduleWiseLog.writeLog() ";
        try {            
            switch (level) {
                case 'debug': {
                    _logger.debug(msg, data);
                    // console.log(_module + " debug:" + msg + " data:" + data);
                } break;
                case 'info': {
                    if (_level == 'trace') {
                        _logger.trace(msg, data);
                        // console.log(_module +  " trace:" + msg + " data:" + data);
                    }
                    else {
                        _logger.info(msg);
                        // console.log(_module +  " info:" + msg + " data:" + data);
                    }
                    
                } break;
                case 'warn': {
                    _logger.warn(msg);
                    // console.log(_module +  " warn:" + msg);
                } break;
                case 'error': {
                    _logger.error(msg);
                    console.log(_module +  " error:" + msg);
                } break;
                case 'fatal': {
                    _logger.fatal(msg);
                    console.log(_module +  " fatal:" + msg);
                } break;
                default: {
                    _logger.error(msg);
                    // console.log(_module +  " default:" + msg);
                }
            }
        } catch (err) {
            defaultLogger.fatal(err.message + FUNC_NAME + FILE_NAME);
        }
    }

    //write to default log
    function writeToDefaultLog(msg, data, level) {
        const FUNC_NAME = " moduleWiseLog.writeLog() ";
        try {            
            defaultLogger.fatal(msg);
        } catch (err) {
            defaultLogger.fatal(err.message + FUNC_NAME + FILE_NAME);
        }
    }

    return {
        initialize: initialize,
        setLevel: setLevel,
        writeLog: writeLog,
        writeToDefaultLog: writeToDefaultLog
    }
}