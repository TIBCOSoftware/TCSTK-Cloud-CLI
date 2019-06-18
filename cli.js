// File to manage the CLI Interaction
import arg from 'arg';

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
        task: args._[0]
    };
}

// const runGulpTask = require('run-gulp-task');
// Main function
export function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    var appRoot = process.env.PWD;
    var cwdir = process.cwd();
    if (options.debug) {
        console.log(options);
        console.log('Project Root: ' + appRoot);
        console.log('Current Working Directory: ' + cwdir);
        console.log('__dirname: ' + __dirname);
        console.log('__filename: ' + __filename);
    }
    // Test if tibco-cloud.properties exists
    const fs = require("fs");
    if (!fs.existsSync(cwdir + '/tibco-cloud.properties')) {
        console.log('No TIBCO Cloud Propeties file found, creating initial one...');
        fs.copyFileSync(__dirname + '/template/tibco-cloud.properties', cwdir + '/tibco-cloud.properties');
        // TODO: Ask questions about the cloud prop file:
        // Which tenant to use
        // Client ID
        // Username & Password (obfuscate)
        // Get the AppName Automatically from the package.json
    } else {
        if(options.debug){
            console.log('tibco-cloud.properties found...');
        }
    }

    var gulp = require('gulp');
    require(__dirname + '/gulpfile');
    checkPW();
    promptGulp(__dirname, appRoot);
    // gulp.series('default')();
    // TODO: Change this to pass the commandline option

}
