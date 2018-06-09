
const FILE_NAME = ' APIHandler.js ';
// const DBConnection = require('./DBOperations/MySQLOperations');  //Database operations 
var dummyData;
const dbService = require('./callDatabaseService.js');  //Database operations 
const global = require('./global.js');
const md5 = require('md5');
const md5File = require('md5-file')
const moment = require('moment');
const jwt = require('jsonwebtoken');
const randomstring = require('randomstring');
const arrayUniq = require('array-uniq');
var multer = require('multer');
var exec = require('child_process').exec;
var fs = require('fs');
var client = require('scp2');
// var needle = require('needle');
var FormData = require('form-data');
var http = require('http');
var path = require('path');
var mime = require('mime');

module.exports = {   

    userLogin: function (request, response) {
        const FUNC_NAME = " userLogin() ";
        var responseData = {};
        responseData.status = 1;
        try {
            var user = request.body[global.userName];
            var pass = request.body[global.userPassword];
            var password = global.SALT + pass;
            password = md5(password);
            if(user == undefined || pass == undefined){
                responseData[global.message] = "Invalid username or password";
                responseData.status = -1;
                response.status(300).send(responseData);
                return;
            }
            var requestData = {};
            requestData.user = user;   //Temporary
            dbService.callDBService("login", requestData).then(function (resp) {
                var userData = JSON.parse(resp)[0];
                if (userData != undefined && userData.sPassword == password) {
                    var currntdatetime = moment(new Date()).format("YYYYMMDDHHmmssms");
                    var sessionID = user + currntdatetime + global.SALT;
                    sessionID = md5(sessionID);
                    jwtToken = jwt.sign(request.body, global.JWT_SECRET, { expiresIn: '5h' });
                    responseData[global.sessionId] = sessionID;
                    responseData[global.jwtToken] = jwtToken;
                    responseData[global.userName] = userData.sUserName;
                    responseData.role = userData.nRole;
                    responseData.company = userData.sCompanyName;
                    responseData.nFacilityOnOff = userData.nFacilityOnOff;
                    responseData.nIsDownloadUploadOnOff = userData.nIsDownloadUploadOnOff;
                    responseData.nIsCustomTemplate = userData.nIsCustomTemplate;
                    responseData[global.message] = "Login Successful";
                    global.jwtTokens.push(jwtToken);
                    //Mapping SessionId With Customer ID
                    global.session[sessionID] = userData.nCustomerId;
                } else {
                    responseData.status = -1;
                    responseData[global.message] = "Invalid username or password";
                    // console.log("Invalid password");
                }
                response.status(200).send(responseData);
            }).catch(function (err) {
                responseData.status = -1;
                responseData[global.message] = "something went wrong while login, Please try again.";
                response.status(300).send(responseData);
                console.log(err.message + FUNC_NAME);
            })
        } catch (err) {
            responseData.status = -1;
            responseData[global.message] = "something went wrong while login, Please try again.";
            response.status(300).send(responseData);
            console.log(err.message + FUNC_NAME);
            // logger.writeLog(err.message + FUNC_NAME + FILE_NAME, dummyData, 'fatal');
        }
    },

    userLogout: function (request, response) {
        const FUNC_NAME = " userLogout() ";
        var responseData = {};
        responseData.status = 1;
        try {
            // console.log("API Call received");
            var sessionId = request.body.requestData[global.sessionId];
            if(sessionId != undefined){
                delete global.session[sessionId];
            }
            var jwtToken = request.headers.authorization;	
            var nIndex = global.jwtTokens.indexOf(jwtToken);
            if(nIndex >= 0){
                global.jwtTokens.splice(nIndex,1);
            }
            responseData[global.message] = "Successfully logged out."
            response.status(200).send(responseData);            
            
        } catch (err) {
            responseData.status = -1;
            responseData[global.message] = "something went wrong while logout, Please try again.";
            response.status(300).send(responseData);
            console.log(err.message + FUNC_NAME);
            // logger.writeLog(err.message + FUNC_NAME + FILE_NAME, dummyData, 'fatal');
        }
    },
	
	   //Forgot Password
    forgotPassword: function (request, response) {
        const FUNC_NAME = " forgotPassword() ";
        var responseData = {};
        responseData.status = 1;
        try {
        //    console.log(request.body);
            var email = request.body.email;
          
            if (email == undefined || email == '') {
                responseData[global.message] = "Invalid Email Address.";
                responseData.status = -1;
                response.status(300).send(responseData);
                return;
            }
            var requestData = {};
            requestData.email = email;
            // console.log("API Call received");              

            dbService.callDBService("forgotPassword", requestData).then(function (resp) {
                if (JSON.parse(resp).length > 0) {
                    var userData = JSON.parse(resp)[0];
                    var tempPassword = randomstring.generate(8);

                    //send email notification
                    var currntdatetime = moment(new Date()).format("YYYYMMDDHHmmssms");
                    var resetID = email + currntdatetime + global.SALT;
                    resetID = md5(resetID);
                    var resetLink = global.PASSWORD_RESET_LINK + resetID;
                   // console.log(resetLink);
			//local Path of file 
                  var command = 'node ' + 'd:\\App\\WebSite\\server\\email_notification\\sendEmailNotification.js "T2-FORGOT_PASSWORD" ' + '"' + email + '" "' + resetLink + '"';
                   // console.log(command);
                    exec(command,
                        function (error, stdout, stderr) {
                                if (error !== null) {
                                    // console.log('exec error: ' + error);
                                    responseData.status = -1;
                                    responseData[global.message] = "Something went wrong while password reset, Please try again.";
                                    response.status(300).send(responseData);
                                    console.log(err.message + FUNC_NAME);
                                }
                                else {                                    
                                    responseData[global.message] = "Password verification link has been sent to your email id.";                   
                                    response.status(300).send(responseData);                                    
                                    global.forgotPasswordMap[resetID] = {};
                                    global.forgotPasswordMap[resetID].tempPassword = tempPassword;
                                    global.forgotPasswordMap[resetID].currntDateTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
                                    global.forgotPasswordMap[resetID].userId = email;
                                    global.forgotPasswordMap[resetID].customerId = userData.nCustomerId;
                                }
                        });

                    
                } else {
                    responseData[global.message] = "Email does not exist.";
                    responseData.status = -1;
                    response.status(300).send(responseData);
                    return;
                }

            }).catch(function (err) {
                responseData.status = -1;
                responseData[global.message] = "Something went wrong while password reset, Please try again.";
                response.status(300).send(responseData);
                console.log(err.message + FUNC_NAME);
            })

        } catch (err) {
            responseData.status = -1;
            responseData[global.message] = "Something went wrong while password reset, Please try again.";
            response.status(300).send(responseData);
            console.log(err.message + FUNC_NAME);
          
        }
    },

    passwordReset: function (request, response) {
        const FUNC_NAME = " passwordReset() ";        
        try {
            // console.log("API Call received");                                   
            var resetID = request.query.id;            
            var passwordResetData = global.forgotPasswordMap[resetID];
            if(passwordResetData == undefined || passwordResetData == {}){
                response.send("Failed to reset the password. Please try again.")
            }
            var requestData = {};
            requestData.customerID = passwordResetData.customerId;
            requestData.userName = passwordResetData.userId;
            var newPass = global.SALT + passwordResetData.tempPassword;
            var newPass = md5(newPass);            
            requestData.newPass = newPass;

            dbService.callDBService("updatepassword", requestData).then(function (resp) {
                response.send("Your password is set to " + passwordResetData.tempPassword + ". Kindly change the password as soon as login.");                                
            }).catch(function (err) {
                response.send("Failed to reset the password. Please try again.");
            });
        } catch (err) {
            response.send("Failed to reset the password. Please try again.")
            console.log(err.message + FUNC_NAME);
            // logger.writeLog(err.message + FUNC_NAME + FILE_NAME, dummyData, 'fatal');
        }
    },
	
	

};
