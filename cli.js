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
            '-t': '--template',
            '--createCP': Boolean,
            '-c': '--createCP',
            '--help': Boolean,
            '-h':'--help'

        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        template: args['--template'] || '',
        debug: args['--debug'] || false,
        help: args['--help'] || false,
        createCP: args['--createCP'] || false,
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
    if(options.help){
        helptcli();
        process.exit(0);
        //TODO: Reuse Help Function
        //options.task = 'help-tcli';
    }
    var projectManagementMode = true;
    if(options.task == 'new' || options.task == 'new-starter'){
        options.task = 'new-starter';
        var projectManagementMode = false;

    }else {

        // Test if tibco-cloud.properties exists
        const fs = require("file-system");
        if (!fs.existsSync(cwdir + '/' + propFileName) || options.createCP) {
            var cif = '';
            if(!options.createCP) {
                console.log('No TIBCO Cloud Properties file found...');
                var cif = await askMultipleChoiceQuestionCLI('What would you like to do ? ', ['Create New Cloud Starter', 'Create New tibco-cloud.properties file', 'Nothing']);
            }else{
                cif = 'Create New tibco-cloud.properties file';
            }

            switch (cif) {
                case 'Create New tibco-cloud.properties file':
                    fs.copyFileSync(__dirname + '/template/tibco-cloud.properties', cwdir + '/' + propFileName);
                    require(__dirname + '/manage-project');
                    // Select Tenant
                    await updateRegion(propFileName);
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
                    //Add used template to property file
                    if(options.template){
                        addOrUpdateProperty(propFileName, 'App_Type', options.template);
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
                    if(pass != '') {
                        addOrUpdateProperty(propFileName, 'CloudLogin.pass', obfuscatePW(pass));
                    }
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

    if(!options.createCP) {
        // Start the specified Gulp Task
        var gulp = require('gulp');
        if (projectManagementMode) {
            require(__dirname + '/manage-project');
        } else {
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

// Display commandline usage
function helptcli() {
        /*
        console.log('GULP DETAILS:');
        var cwdir = process.cwd();
        run('gulp --version  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');*/
        // TODO: Display the version from generic config
        console.log('Cloud CLI) Usage: tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)');
        console.log('Note: When you run "tcli" as a loose command it will bring you in an interactive menu based on context.');
        console.log('new: Create new Cloud starter. Usage] tcli new <name> [--template(-t)] <template-to-use>');
        console.log('   --debug: Display debug information.');
        console.log('--createCP: Create a new tibco-cloud.properties file.');
        console.log('    --help: display this help ');
        console.log('These are the available TIBCO CLOUD CLI Tasks:');
        // run('gulp -T  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
        const cliTaskConfigCLI = require('./config-cli-task.json');
        var cTsks = cliTaskConfigCLI.cliTasks;
        for(var cliTask in cTsks){
            if(cTsks[cliTask].enabled && !cTsks[cliTask].internal) {
                var str = cliTask;
                var x = 20 - cliTask.length;
                for (var i = 0; i < x; i++){
                    str = ' ' + str;
                }
                console.log('\x1b[34m%s\x1b[0m', str + ':' , ' ' + cTsks[cliTask].description);
            }
            // gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')');
        }
}
