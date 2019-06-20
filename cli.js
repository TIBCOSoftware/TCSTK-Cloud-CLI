// File to manage the CLI Interaction
import arg from 'arg';
const propFileName = 'tibco-cloud.properties';

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--debug': Boolean,
            '-d': '--debug'
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        debug: args['--debug'] || false,
        task: args._[0] || ''
    };
}

// Main function
export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    var appRoot = process.env.PWD;
    var cwdir = process.cwd();
    if (options.debug) {
        console.log('Options: ' , options);
        console.log('Project Root: ' + appRoot);
        console.log('Current Working Directory: ' + cwdir);
        console.log('__dirname: ' + __dirname);
        console.log('__filename: ' + __filename);
    }

    // Test if tibco-cloud.properties exists
    const fs = require("fs");
    if (!fs.existsSync(cwdir + '/' + propFileName)) {
        console.log('No TIBCO Cloud Properties file found, creating an initial one...');
        fs.copyFileSync(__dirname + '/template/tibco-cloud.properties', cwdir + '/' + propFileName);
        require(__dirname + '/gulpfile');
        // Select Tenant
        await updateTenant(propFileName);
        // Get the AppName Automatically from the package.json
        try {
            let rawdata = fs.readFileSync('package.json');
            let jsonp = JSON.parse(rawdata);
            // console.log(jsonp);
            // console.log(jsonp.name);
            addOrUpdateProperty(propFileName, 'App_Name', jsonp.name);
        } catch (e) {
            console.log(e)
        }
        // Client ID
        log('INFO' , 'Get yout client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)');
        var cid = await askQuestion ('What is your Client ID ?');
        addOrUpdateProperty(propFileName, 'CloudLogin.clientID', cid);
        // Username & Password (obfuscate)
        var email = await askQuestion ('What is your User Name (Email) ?');
        addOrUpdateProperty(propFileName, 'CloudLogin.email', email);
        log('INFO' , 'Your password will be obfuscated, but is not unbreakable (press enter to skip and enter manually later)');
        var pass = await askQuestion ('What is your Password ?', 'password');
        addOrUpdateProperty(propFileName, 'CloudLogin.pass', obfuscatePW(pass));
    } else {
        if(options.debug){
            console.log(propFileName + ' found...');
        }
    }
    // Start the specified Gulp Task
    var gulp = require('gulp');
    require(__dirname + '/gulpfile');

    // TODO: pass in commandline options
    if(options.task == ''){
        gulp.series('default')();
    } else {
        gulp.series(options.task)();
    }
}



