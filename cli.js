// File to manage the CLI Interaction
require('./build/common-functions');
import arg from 'arg';

let propFileName;
const version = require('./package.json').version;

function parseArgumentsIntoOptions(rawArgs) {
    //TODO: Add a non interactive verbose option
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
            '--surpressStart': Boolean,
            '-s': '--surpressStart',
            '--pass': String,
            '--org': String
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
        surpressStart: args['--surpressStart'] || false,
        task: args._[0] || '',
        pass: args['--pass'] || '',
        org: args['--org'] || ''
    };
}

const isWindows = process.platform == 'win32';
const dirDelimiter = isWindows ? '\\' : '/';

// Main function
export async function cli(args) {
    const options = parseArgumentsIntoOptions(args);
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
        console.log('pass: ' + options.pass);
        console.log('org: ' + options.org);
    }
    if(options.pass != ''){
        // This call sets the properties object, to be able to add a property to it.
        getProp('CloudLogin.pass');
        if (options.pass.charAt(0) == '#') {
            setProperty('CloudLogin.pass', options.pass);
        } else {
            setProperty('CloudLogin.pass', obfuscatePW(options.pass));
        }
    }
    if(options.org != ''){
        setOrganization(options.org);
    }

    // Show help
    if (options.help) {
        helptcli();
        process.exit(0);
        //options.task = 'help-tcli';
    }
    // Run multiple management
    if (options.doMultiple) {
        var gulp = require('gulp');
        require(__dirname + '/manage-multiple');
        gulp.series('run-multiple')();
        // process.exit(0);
    }

    // Show the version
    if (options.version) {
        console.log('TIBCO Cloud CLI Version: ' + require('./package.json').version);
        process.exit(0);
    }

    // Update the TCLI
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
            if (!fs.existsSync(cwdir + dirDelimiter + propFileName) || options.createCP) {
                var cif = '';
                if (!options.createCP) {
                    displayOpeningMessage();
                    console.log('\x1b[36m%s\x1b[0m', "[TIBCO Cloud Starter CLI " + version + "]");
                    console.log('No TIBCO Cloud Properties file found...');
                    var cif = await askMultipleChoiceQuestion('What would you like to do ? ', [tCreate, tCProp, tMultiple, tManageG, tNothing]);
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
            // Check if the task exists...
            const cliTaskConfigCLI = require('./config-cli-task.json');
            var cTsks = cliTaskConfigCLI.cliTasks;
            let taskArray = ['new', 'new-starter', 'manage-global-config', 'create-multiple-property-file', 'run-multiple', 'watch-shared-state-scope-do'];
            let taskExist = false;
            for (var cliTask of taskArray) {
                if (cliTask == options.task) {
                    taskExist = true;
                }
            }
            for (var cliTask in cTsks) {
                if(cTsks[cliTask].gulpTask == options.task){
                    taskExist = true;
                }
                // console.log(cTsks[cliTask].gulpTask);
                taskArray.push(cTsks[cliTask].gulpTask);
            }
            if(!taskExist){
                log(ERROR, 'TASK: ' + options.task + ' does not exist...');
                var stringSimilarity = require('string-similarity');
                var matches = stringSimilarity.findBestMatch(options.task, taskArray);
                log(INFO, 'Did you mean ? \x1b[34m' + taskArray[matches.bestMatchIndex]);
            } else {
                gulp.series(options.task)();
            }
        }
    }
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
    console.log('        --debug: Display debug information.');
    console.log('     --createCP: Create a new tibco-cloud.properties file.');
    console.log('         --help: display this help ');
    console.log('      --version: display the version number');
    console.log('       --update: update the tcli');
    console.log('     --propfile: when specified tcli will use a different property file then the default tibco-cloud.properties');
    console.log('     --multiple: run the task specified in the configured multiple property file. This allows you to execute tasks on many cloud starters and many different configured environments at the same time.');
    console.log(' --multipleFile: when specified tcli will use a different property file then the default manage-multiple-cloud-starters.properties');
    console.log('--surpressStart: When using this option after creating a new cloud starter the interactive tcli will not start.');
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
