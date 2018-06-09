var fs = require('fs');
module.exports = {
    readconfig : function () {
        try {
            var configFile = 'config.json';
            var data = fs.readFileSync(configFile, "utf8");
            var config = JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
            return config;          
        } catch (err) {
            console.error(err);
             throw new Error("Config file not found....");
        }
    }
}