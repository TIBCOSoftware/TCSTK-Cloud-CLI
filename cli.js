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
export function cli(args) {
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
        // TODO: Hier verder, we hebben de functie om properties te kunnen updaten...
        // addOrUpdateProperty ('tibco-cloud.properties' , 'Use_Debug' , now);

        // TODO: Ask questions about the cloud prop file:
        // Which tenant to use
        // Client ID
        // Username & Password (obfuscate)
        // Get the AppName Automatically from the package.json
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
