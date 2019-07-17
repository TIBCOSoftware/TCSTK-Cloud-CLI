// File to manage the CLI Interaction
import arg from 'arg';

const propFileName = 'tibco-cloud.properties';

function parseArgumentsIntoOptions(rawArgs) {
    //TODO: Add a non interactive verbose option
    //TODO: Provide the template and the name of a new app in-line
    const args = arg(
        {
            '--debug': Boolean,
            '-d': '--debug',
            '--template': String,
            '-t': '--template'

        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        template: args['--template'] || '',
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
        console.log('Options: ', options);
        console.log('   Task: '+ options.task);
        console.log('Project Root: ' + appRoot);
        console.log('Current Working Directory: ' + cwdir);
        console.log('__dirname: ' + __dirname);
        console.log('__filename: ' + __filename);
    }
    var projectManagementMode = true;
    if(options.task == 'new' || options.task == 'new-starter'){
        options.task = 'new-starter';
        var projectManagementMode = false;

    }else {

        // Test if tibco-cloud.properties exists
        const fs = require("fs");
        if (!fs.existsSync(cwdir + '/' + propFileName)) {
            console.log('No TIBCO Cloud Properties file found...');
            var cif = await askMultipleChoiceQuestionCLI('What would you like to do ? ', ['Create New Cloud Starter', 'Create New tibco-cloud.properties file', 'Nothing']);
            // var cif = 'YES';
            switch (cif) {
                case 'Create New tibco-cloud.properties file':
                    fs.copyFileSync(__dirname + '/template/tibco-cloud.properties', cwdir + '/' + propFileName);
                    require(__dirname + '/manage-project');
                    // Select Tenant
                    await updateTenant(propFileName);
                    // Get the AppName Automatically from the package.json
                    try {
                        if(fs.existsSync('package.json')) {
                            let rawdata = fs.readFileSync('package.json');
                            let jsonp = JSON.parse(rawdata);
                            // console.log(jsonp);
                            // console.log(jsonp.name);
                            addOrUpdateProperty(propFileName, 'App_Name', jsonp.name);
                        } else {
                            log('INFO', 'No Package.json file found...');
                        }
                    } catch (e) {
                        console.log(e)
                    }
                    // Client ID
                    log('INFO', 'Get yout client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)');
                    var cid = await askQuestion('What is your Client ID ?');
                    addOrUpdateProperty(propFileName, 'CloudLogin.clientID', cid);
                    // Username & Password (obfuscate)
                    var email = await askQuestion('What is your User Name (Email) ?');
                    addOrUpdateProperty(propFileName, 'CloudLogin.email', email);
                    log('INFO', 'Your password will be obfuscated, but is not unbreakable (press enter to skip and enter manually later)');
                    var pass = await askQuestion('What is your Password ?', 'password');
                    addOrUpdateProperty(propFileName, 'CloudLogin.pass', obfuscatePW(pass));
                    break;
                case 'Create New Cloud Starter':
                    console.log('Creating new Cloud starter...');
                    // Use different Gulp file to create a new cloud starter
                    options.task = 'new-starter';
                    projectManagementMode = false;
                    break;
                default:
                    console.log('Not creating properties file, Exiting...');
                    process.exit();

            }
        } else {
            if (options.debug) {
                console.log(propFileName + ' found...');
            }
        }
    }

    // Start the specified Gulp Task
    var gulp = require('gulp');
    if(projectManagementMode) {
        require(__dirname + '/manage-project');
    }else{
        require(__dirname + '/manage-application');
    }
    // TODO: pass in commandline options
    // TODO: Maybe call run here to prevent two times asking of PW on new file
    console.log('TASK: ' + options.task);
    if (options.task == '') {
        gulp.series('default')();
    } else {
        if (options.task == 'help') {
            options.task = 'help-tcli';
        }
        gulp.series(options.task)();
    }
}

const inquirerC = require('inquirer');
// function to ask a question
async function askMultipleChoiceQuestionCLI(question, options) {
    var re = 'result';
    await inquirerC.prompt([{
        type: 'list',
        name: 'result',
        message: question,
        choices: options,
        filter: function (val) {
            return val;
        }
    }]).then((answers) => {
        //logO(DEBUG, answers);
        re = answers.result;
    });
    return re;
}


