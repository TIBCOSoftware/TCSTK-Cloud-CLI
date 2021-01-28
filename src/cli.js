'use strict';
// File to manage the CLI Interaction
import {createMultiplePropertyFileWrapper, manageGlobalConfig, newStarter} from "./manage-application";

require('./build/common-functions');
import arg from 'arg';

let propFileName;

//const version = require('./package.json').version;

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
            '--multipleInteraction': Boolean,
            '-i': '--multipleInteraction',
            '--multipleFile': String,
            '-f': '--multipleFile',
            '--surpressStart': Boolean,
            '-s': '--surpressStart',
            '--pass': String,
            '--org': String,
            '--answers': String,
            '-a': '--answers',
            '--job': String,
            '-j': '--job',
            '--environment': String,
            '-e': '--environment',
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
        doMultipleInteraction: args['--multipleInteraction'] || false,
        multipleFile: args['--multipleFile'] || 'manage-multiple-cloud-starters.properties',
        surpressStart: args['--surpressStart'] || false,
        task: args._[0] || '',
        pass: args['--pass'] || '',
        org: args['--org'] || '',
        answers: args['--answers'] || '',
        job: args['--job'] || '',
        environment: args['--environment'] || '',
    };
}

const isWindows = process.platform == 'win32';
const dirDelimiter = isWindows ? '\\' : '/';

// Main function
export async function cli(args) {
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' CLI INIT');
    //console.log('start');
    const options = parseArgumentsIntoOptions(args);
    const appRoot = process.env.PWD;
    const cwdir = process.cwd();
    propFileName = options.propfile;
    setPropFileName(propFileName);
    // TODO: Allow for multiple Jobs and environments
    setMultipleOptions({name: options.multipleFile, job: options.job, environment: options.environment});
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
        console.log('answers: ' + options.answers);
    }
    if (options.pass != '') {
        // This call sets the properties object, to be able to add a property to it.
        getProp('CloudLogin.pass');
        if (options.pass.charAt(0) == '#') {
            setProperty('CloudLogin.pass', options.pass);
        } else {
            setProperty('CloudLogin.pass', obfuscatePW(options.pass));
        }
    }
    if (options.org != '') {
        setOrganization(options.org);
    }

    if (options.answers != '') {
        setGlobalAnswers(options.answers);
    }

    // Show help
    if (options.help) {
        helptcli();
        process.exit(0);
        //options.task = 'help-tcli';
    }
    // Run multiple management
    if (options.doMultiple || options.doMultipleInteraction) {
        require('./manage-multiple');
        if (options.doMultiple) {
            await processMultipleFile();
        }
        if (options.doMultipleInteraction) {
            await multipleInteraction();
        }
        process.exit(0);
    }
    // Show the version
    if (options.version) {
        console.log('TIBCO Cloud CLI Version: ' + require('../package.json').version);
        process.exit(0);
    }
    // Update the TCLI
    if (options.update) {
        updateTCLI();
        process.exit(0);
    }
    const projectManagementMode = true;
    if (!(options.doMultiple || options.doMultipleInteraction)) {
        if (options.task == 'new' || options.task == 'new-starter') {
            // options.task = 'new-starter';
            await require('./manage-application').newStarter();
            process.exit();
            // const projectManagementMode = false;
        } else {
            // Test if tibco-cloud.properties exists
            const fs = require("fs");
            const tCreate = 'Create New Cloud Starter';
            const tCProp = 'Create New TIBCO Cloud properties file';
            const tManageG = 'Manage Global Cloud Connection Configuration';
            const tMultiple = 'Create New Multiple Properties file';
            const tNothing = 'Nothing';
            // if (!fs.existsSync(cwdir + dirDelimiter + propFileName) || options.createCP) {
            // console.log('Workdir: ' + cwdir);
            if (!fs.existsSync(propFileName) || options.createCP) {
                let cif = tCProp;
                if (!options.createCP) {
                    displayOpeningMessage();
                    console.log('\x1b[36m%s\x1b[0m', "[TIBCO Cloud Starter CLI " + require('../package.json').version + "]");
                    console.log('No TIBCO Cloud Properties file found...');
                    cif = await askMultipleChoiceQuestion('What would you like to do ? ', [tCreate, tCProp, tMultiple, tManageG, tNothing]);
                }
                switch (cif) {
                    case tCProp:
                        // if we use a global config
                        if (getGlobalConfig()) {
                            log(INFO, 'Using Global Connection Configuration...');
                            // console.log(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties')
                            fs.copyFileSync(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties', cwdir + '/' + propFileName);
                        } else {
                            log(INFO, 'Using Local Connection Configuration...');
                            fs.copyFileSync(global.PROJECT_ROOT + 'templates/tibco-cloud.properties', cwdir + '/' + propFileName);
                            await updateRegion(propFileName);
                            await updateCloudLogin(propFileName, true);
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
                            log(ERROR, e);
                        }
                        //Add used template to property file
                        if (options.template) {
                            addOrUpdateProperty(propFileName, 'App_Type', options.template);
                        }
                        break;
                    case tMultiple:
                        await require('./manage-application').createMultiplePropertyFileWrapper();
                        process.exit();
                        break;
                    case tManageG:
                        await require('./manage-application').manageGlobalConfig();
                        process.exit();
                        break;
                    case tCreate:
                        log(INFO, 'Creating new Cloud starter...');
                        // create a new cloud starter
                        await require('./manage-application').newStarter();
                        process.exit();
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

    if (!options.createCP && !(options.doMultiple || options.doMultipleInteraction)) {
        // Start the specified Task
        if (projectManagementMode) {
            if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Loading Tasks');
            require('./tasks');
            if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Loading Tasks');
        } else {
            require('./manage-application');
        }
        // TODO: pass in commandline options
        // TODO: Maybe call run here to prevent two times asking of PW on new file

        if (options.task == '') {
            await require('./tasks').mainT();
        } else {
            if (options.task == 'help') {
                options.task = 'help-tcli';
            }
            // Check if the task exists...
            const cliTaskConfigCLI = require('./config/config-cli-task.json');
            const cTsks = cliTaskConfigCLI.cliTasks;
            let taskArray = ['new', 'new-starter', 'manage-global-config', 'create-multiple-property-file', 'run-multiple', 'watch-shared-state-scope-do'];
            let taskExist = false;
            let directTask = false;
            let directTaskMethod = '';
            for (const cliTask of taskArray) {
                if (cliTask == options.task) {
                    taskExist = true;
                }
            }
            for (const cliTask in cTsks) {
                if (cTsks[cliTask].taskName == options.task) {
                    taskExist = true;
                    if (cTsks[cliTask].task) {
                        directTask = true;
                        // directTaskFile = cTsks[cliTask].taskFile;
                        directTaskMethod = cTsks[cliTask].task;
                    }
                }
                taskArray.push(cTsks[cliTask].taskName);
            }
            if (!taskExist) {
                log(ERROR, 'TASK: ' + options.task + ' does not exist...');
                const stringSimilarity = require('string-similarity');
                const matches = stringSimilarity.findBestMatch(options.task, taskArray);
                log(INFO, 'Did you mean ? \x1b[34m' + taskArray[matches.bestMatchIndex]);
            } else {
                if (directTask) {
                    const tasks = require('./tasks');
                    try {
                        await tasks[directTaskMethod]();
                    } catch (err) {
                        log(ERROR, 'Task ' + options.task + ' failed: ' + err.message);
                        console.log(err)
                    }
                } else {
                    log(ERROR, 'No Implementation Task found for ' + options.task);
                }
            }
        }
    }
}

// Display commandline usage
function helptcli() {
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
    const cliTaskConfigCLI = require('./config/config-cli-task.json');
    const cTsks = cliTaskConfigCLI.cliTasks;
    for (const cliTask in cTsks) {
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            //console.log('cTsks[cliTask].availableOnOs:' + cTsks[cliTask].availableOnOs);
            for (const allowedOS of cTsks[cliTask].availableOnOs) {
                //console.log('OS:' + allowedOS);
                if (allowedOS == process.platform || allowedOS == 'all') {
                    allowed = true;
                }
            }
        }
        if (cTsks[cliTask].enabled && !cTsks[cliTask].internal && allowed) {
            let str = cliTask;
            const x = 30 - cliTask.length;
            for (let i = 0; i < x; i++) {
                str = ' ' + str;
            }
            console.log('\x1b[36m%s\x1b[0m', str + ':', ' ' + cTsks[cliTask].description);
        }
        // gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')');
    }
}
