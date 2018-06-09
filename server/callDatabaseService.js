const FILE_NAME = ' callWebService.js ';
var dummyData;
const http = require('http');
var https = require('https');
const moment = require('moment');
const Q = require('q');

module.exports = {
    callDBService: function (api, requestData) {
        const FUNC_NAME = "callDBService() ";
        var deferred = Q.defer();
        try {
             var requestType;
             var options = {};
            var msg = "";
            
              
                options = {
                    hostname: "localhost",
                    port: "1210",
                    path: "/api/" + api,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            
            const req = http.request(options, (res) => {
                res.on('data', (chunk) => {
                    // console.log("got data");                    
                    msg += chunk.toString('utf8');
                });
                res.on('end', () => {
                    // console.log("got end");
                    deferred.resolve(msg);
                    //return callback(false, msg);
                });                
            });
            req.on('error', (e) => {
                deferred.reject(e);
                console.log(e.message + FUNC_NAME);
            });
            req.write(JSON.stringify(requestData));
            req.end();
            return deferred.promise;
        } catch (err) {
            deferred.reject(err);
            console.log(err.message + FUNC_NAME);
            
        }
    },
};