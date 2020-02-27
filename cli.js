// File to manage the CLI Interaction
require('./build/common-functions');
import arg from 'arg';

let propFileName;
const version = require('./package.json').version;

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
            '-h': '--help',
            '--version': Boolean,
            '-v': '--version',
            '--update': Boolean,
            '-u': '--update',
            '--propfile': String,
            '-p': '--propfile',
            '--multiple': Boolean,
            '-m': '--multiple',
            '--multipleFile': String,
            '-f': '--multipleFile',
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
        version: args['--version'] || false,
        update: args['--update'] || false,
        propfile: args['--propfile'] || 'tibco-cloud.properties',
        doMultiple: args['--multiple'] || false,
        multipleFile: args['--multipleFile'] || 'manage-multiple-cloud-starters.properties',
        task: args._[0] || ''
    };
}

const isWindows = process.platform == 'win32';

// Main function
export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    const appRoot = process.env.PWD;
    const cwdir = process.cwd();
    propFileName = options.propfile;
    setPropFileName(propFileName);
    setMultipleFileName(options.multipleFile);
    if (options.debug) {
        console.log(' Options: ', options);
        console.log('    Task: ' + options.task);
        console.log('PropFile: ' + options.propfile);
        console.log('Project Root: ' + appRoot);
        console.log('Current Working Directory: ' + cwdir);
        console.log('__dirname: ' + __dirname);
        console.log('__filename: ' + __filename);
        console.log(' Platform: ' + process.platform);
        console.log('isWindows: ' + isWindows);
        console.log('doMultiple: ' + options.doMultiple);
        console.log('multipleFile: ' + options.multipleFile);

    }
    if (options.help) {
        helptcli();
        process.exit(0);
        //options.task = 'help-tcli';
    }

    if (options.doMultiple) {
        var gulp = require('gulp');
        require(__dirname + '/manage-multiple');
        gulp.series('run-multiple')();
        // process.exit(0);
    }

    if (options.version) {
        console.log('TIBCO Cloud CLI Version: ' + require('./package.json').version);
        process.exit(0);
    }
    if (options.update) {
        // console.log('TIBCO Cloud CLI Version: ' + require('./package.json').version);
        // options.task = 'update-tcli';
        updateTCLI();
        process.exit(0);
    }


    var projectManagementMode = true;
    if (!options.doMultiple) {
        if (options.task == 'new' || options.task == 'new-starter') {
            options.task = 'new-starter';
            var projectManagementMode = false;
        } else {
            // Test if tibco-cloud.properties exists
            const fs = require("file-system");
            const tCreate = 'Create New Cloud Starter';
            const tCProp = 'Create New TIBCO Cloud properties file';
            const tManageG = 'Manage Global Cloud Connection Configuration';
            const tMultiple = 'Create New Multiple Properties file';
            const tNothing = 'Nothing';
            if (!fs.existsSync(cwdir + '/' + propFileName) || options.createCP) {
                var cif = '';
                if (!options.createCP) {
                    displayOpeningMessage();
                    console.log('\x1b[36m%s\x1b[0m', "[TIBCO Cloud Starter CLI " + version + "]");
                    console.log('No TIBCO Cloud Properties file found...');
                    var cif = await askMultipleChoiceQuestionCLI('What would you like to do ? ', [tCreate, tCProp, tMultiple, tManageG, tNothing]);
                } else {
                    cif = tCProp;
                }
                switch (cif) {
                    case tCProp:
                        // if we use a global config
                        if (getGlobalConfig()) {
                            log(INFO, 'Using Global Connection Configuration...');
                            console.log(__dirname + '/template/tibco-cloud_global.properties')
                            fs.copyFileSync(__dirname + '/template/tibco-cloud_global.properties', cwdir + '/' + propFileName);
                        } else {
                            log(INFO, 'Using Local Connection Configuration...');
                            fs.copyFileSync(__dirname + '/template/tibco-cloud.properties', cwdir + '/' + propFileName);
                            await updateRegion(propFileName);
                            await updateCloudLogin(propFileName);
                        }
                        // Get the AppName Automatically from the package.json
                        try {
                            if (fs.existsSync('package.json')) {
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
                        if (options.template) {
                            addOrUpdateProperty(propFileName, 'App_Type', options.template);
                        }
                        break;
                    case tMultiple:
                        options.task = 'create-multiple-property-file';
                        projectManagementMode = false;
                        break;
                    case tManageG:
                        options.task = 'manage-global-config';
                        projectManagementMode = false;
                        break;
                    case tCreate:
                        console.log('Creating new Cloud starter...');
                        // Use different Gulp file to create a new cloud starter
                        options.task = 'new-starter';
                        projectManagementMode = false;
                        break;
                    default:
                        console.log('\x1b[36m%s\x1b[0m', "Ok I won't do anything :-(  ...");
                        process.exit();
                }
            } else {
                if (options.debug) {
                    console.log(propFileName + ' found...');
                }
            }
        }
    }


    if (!options.createCP && !options.doMultiple) {
        // Start the specified Gulp Task
        var gulp = require('gulp');
        if (projectManagementMode) {
            require(__dirname + '/manage-project');
        } else {
            require(__dirname + '/manage-application');
        }
        // TODO: pass in commandline options
        // TODO: Maybe call run here to prevent two times asking of PW on new file

        if (options.task == '') {
            gulp.series('default')();
        } else {
            // console.log('TASK: ' + options.task);
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
    console.log('Cloud CLI) Usage: tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)]');
    console.log('Note: When you run "tcli" as a loose command it will bring you in an interactive menu based on context.');
    console.log('new: Create new Cloud starter. Usage] tcli new <name> [--template(-t)] <template-to-use>');
    console.log('   --debug: Display debug information.');
    console.log('--createCP: Create a new tibco-cloud.properties file.');
    console.log('    --help: display this help ');
    console.log('These are the available TIBCO CLOUD CLI Tasks:');
    // run('gulp -T  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
    const cliTaskConfigCLI = require('./config-cli-task.json');
    var cTsks = cliTaskConfigCLI.cliTasks;
    for (var cliTask in cTsks) {
        var allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            //console.log('cTsks[cliTask].availableOnOs:' + cTsks[cliTask].availableOnOs);
            for (var allowedOS of cTsks[cliTask].availableOnOs) {
                //console.log('OS:' + allowedOS);
                if (allowedOS == process.platform || allowedOS == 'all') {
                    allowed = true;
                }
            }
        }
        if (cTsks[cliTask].enabled && !cTsks[cliTask].internal && allowed) {
            var str = cliTask;
            var x = 30 - cliTask.length;
            for (var i = 0; i < x; i++) {
                str = ' ' + str;
            }
            console.log('\x1b[36m%s\x1b[0m', str + ':', ' ' + cTsks[cliTask].description);
        }
        // gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')');
    }
}
