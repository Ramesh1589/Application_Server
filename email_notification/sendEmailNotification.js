// all require modules
process.env.NODE_CONFIG_DIR  = "D:\\FTWorks\\WebSiteDocs\\server\\email_notification\\config";
var http = require('http');
var fs = require("fs");
var config = require('config');
var AWS = require('aws-sdk');

//read Template File
var templateFile = __dirname + '\\emailTemplateMaster.json';
var data = fs.readFileSync(templateFile, "utf8");
var templates = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));

var Email_Templates = {};
templates.templates.forEach(function (element) {
    Email_Templates[element.TemplateName] = element;
});


// all environments
var failedMsg = "";

AWS.config.update({ accessKeyId: 'AKIAJNP5ND2E3E2BIIEA', secretAccessKey: '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' });

function uploadToS3(filename, callback) {
    fs.readFile(filename, function (err, data) {
        if (err) { callback(true, err); }

        var base64data = new Buffer(data, 'binary');

        var s3 = new AWS.S3();
        s3.putObject({
            Bucket: 'billing-pdf-files',
            Key: filename,
            Body: base64data
            //ACL: 'public-read'
        }, function (resp) {
            console.log(arguments);
            console.log(resp);
            callback(false, arguments);
            console.log('Successfully uploaded package.');
        });
        // s3.deleteObject({ Key: 'google1.pdf', Bucket: 'billing-pdf-files' }, function (err, data) {
        //     if (err) {
        //         console.log('There was an error deleting your photo: ', err.message);
        //     }
        //     console.log('Successfully deleted photo.');
        //     //viewAlbum(albumName);
        // });

    });
}

// for communication with BLS
function sendDataToEmailService(url, postData, callback) {

    var msg = "";
    const options = {
        hostname: config.get('EmailService.host'),
        port: config.get('EmailService.port'),
        path: url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {

        // if (res.statusCode !== 200) {
        //     return callback(true, res.statusCode + '|' + res.statusMessage);
        // }
        res.on('data', (chunk) => {
            msg += chunk;
        });
        res.on('end', () => {
            return callback(false, msg);
        });
    });

    req.on('error', (e) => {
        return callback(true, e.message);
    });

    // write data to request body
    req.write(JSON.stringify(postData));
    //req.write(postData);
    req.end();

}

function createEmailTemplate(emailBody, values) {
    // console.log(emailBody);
    for (var key in values) {
        var replace = new RegExp(key, "g");
        // console.log(replace);
        emailBody = emailBody.replace(replace, values[key]);
    }
    // console.log(emailBody);
    return emailBody;
}

function getTemplate(templateId) {
    return Email_Templates[templateId];
}
// POST: receive heartbeat data

function sendEmail(JSONData,emailBody)
{    
        console.log("To:" + JSONData.emailParamDto.sTo + " Cc:" + JSONData.emailParamDto.sCc + " sBcc:" + JSONData.emailParamDto.sBcc + " Subject:" + JSONData.emailParamDto.sSubject);
        JSONData.emailParamDto.sBody = emailBody;
        //Add Register Serivce Call
        sendDataToEmailService(config.get('EmailService.sendNotificationUrl'), JSONData, function (err, Emailresp) {
            // console.log(Emailresp);
            if (err) {
                console.log(err.message + FUNC_NAME);
                console.error(failedMsg);
                process.exit(1);
            }
            else {
                console.log(JSON.parse(Emailresp).message);
                process.exit(0);
            }                       //TODO: add response to database
            return;
    });
}

function sendEmailNotification() {

    //process.argv[2]  is template id
    const FUNC_NAME = " sendEmailNotification()";
    try {
        var emailBody = "";
        var postData = "";
        var JSONData = "";
        switch (process.argv[2]) {
            case "T1-EOD_Report": {
                //process.argv[3]  is customer id & //process.argv[4]  is segment group id
                failedMsg = "Failed to send email to CustomerId " + process.argv[3] + " and SegmentGroupId " + process.argv[4];

                var mysql = require('mysql');
                var connection = mysql.createConnection({
                    host: config.get('Database.host'),
                    user: config.get('Database.user'),
                    password: config.get('Database.password'),
                    database: config.get('Database.database')
                });

                // database connection 
                connection.connect(function (err) {
                    if (err) {
                        console.error('error connecting: ' + err.message);
                        console.error(failedMsg);
                        process.exit(1);
                        return;
                    }
                    // console.log('connected as id ' + connection.threadId);
                });


                if (process.argv.length < 5) {
                    console.log("insufficient number of arguments");
                    console.error(failedMsg);
                    process.exit(1);
                    return;
                }

                var templateObj = getTemplate(process.argv[2]);                
                if (templateObj == undefined) {
                    console.log("Email template not found.");
                    console.error(failedMsg);
                    process.exit(1);
                    return;
                }
                var query = templateObj.StoredProcedureName;
                query = query.replace(/<CustomerId>/g, process.argv[3]);
                query = query.replace(/<SegmentGroupId>/g, process.argv[4]);

                connection.query(query, function (error, results, fields) {
                    if (error) {
                        console.log(error.message + FUNC_NAME);
                        console.error(failedMsg);
                        process.exit(1);
                    }
                    else {
                        emailBody = createEmailTemplate(templateObj.body, results[0][0]);
                        postData = fs.readFileSync(__dirname + "\\testreq.json");
                        JSONData = JSON.parse(postData);                        
                        JSONData.emailParamDto.sTo = results[0][0]['#TOEmailIdList#'];
                        JSONData.emailParamDto.sCc = results[0][0]['#CCEmailIdList#'];
                        JSONData.emailParamDto.sSubject = results[0][0]['#SubjectText#'];
                        JSONData.emailParamDto.sBcc = templateObj.Bcc;  //odin voicecast support

                        sendEmail(JSONData,emailBody);
                    }
                });
            }
            break;

            case "T2-FORGOT_PASSWORD":
            {
                //process.argv[3]  is To & //process.argv[4]  verification link;
                failedMsg = "Failed to send password reset email.";
                if (process.argv.length < 5) {
                    console.log("insufficient number of arguments");
                    console.error(failedMsg);
                    process.exit(1);
                    return;
                }                
                var templateObj = getTemplate(process.argv[2]);
                if (templateObj == undefined) {
                    console.log("Email template not found.");
                    console.error(failedMsg);
                    process.exit(1);
                    return;
                }
                emailBody = templateObj.body.replace(/#VerificationLink#/g, process.argv[4]);
                postData = fs.readFileSync(__dirname + "\\testreq.json");
                JSONData = JSON.parse(postData);

                JSONData.emailParamDto.sTo = process.argv[3];                
                JSONData.emailParamDto.sSubject = templateObj.subject;
                JSONData.emailParamDto.sBcc = templateObj.Bcc;  //odin voicecast support
                sendEmail(JSONData,emailBody);
            }
            break;

            default: {
                console.log("Invalid template.");
                process.exit(1);
                return;
            }
        };
        
    }
    catch (err) {
        console.log(err.message + FUNC_NAME);
        process.exit(1);
    }
};