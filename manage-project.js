// This file manages all the tasks within a project
const gulp = require('gulp');
//import functions
require('./build/common-functions');
require('./build/project-functions');
// Read TIBCO cloud properties...
//const PropertiesReader = require('properties-reader');
//const propFileNameGulp = 'tibco-cloud.properties';
//const properties = PropertiesReader(propFileNameGulp);
//const getProp( = properties.path();
const version = require('./package.json').version;
const isWindows = process.platform == 'win32';

// Function to build the cloud starter
function build() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Building... ' + getProp('App_Name'));
        buildCloudStarterZip(getProp('App_Name'));
        resolve();
    });
};

// Function to delpoy the cloud starter
function deploy() {
    return new Promise(async function (resolve, reject) {
        await uploadApp(getProp('App_Name'));
        log('INFO', "DONE DEPLOYING: " + getProp('App_Name'));
        let cloudURLdisp = getProp('Cloud_URL');
        /*
        if(cloudURLdisp == 'USE-GLOBAL') {
            cloudURLdisp = getProp('Cloud_URL');
        }*/
        log('INFO', "LOCATION: " + cloudURLdisp + "webresource/apps/" + getProp('App_Name') + "/index.html");
        resolve();
    });
}

// Function to publish the cloud starter
function publish() {
    return new Promise(async function (resolve, reject) {
        await publishApp(getProp('App_Name'));
        log('INFO', 'APP PUBLISHED: ' + getProp('App_Name'));
        let cloudURLdisp = getProp('Cloud_URL');
        /*
        if(cloudURLdisp == 'USE-GLOBAL') {
            cloudURLdisp = getProp(G.Cloud_URL;
        }*/
        log('INFO', "LOCATION: " + cloudURLdisp + "webresource/apps/" + getProp('App_Name') + "/index.html");
        resolve();
    });
}


// Function to get the cloud library sources from GIT
getCLgit = function () {
    return getGit(getProp('GIT_Source_TCSTLocation'), getProp('TCSTLocation'), getProp('GIT_Tag_TCST'));
}

// Function that injects the sources of the library into this project
function injectLibSources() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Injecting Lib Sources');
        //run('mkdir tmp');
        mkdirIfNotExist('./projects/tibco-tcstk');
        copyDir('./tmp/TCSDK-Angular/projects/tibco-tcstk', './projects/tibco-tcstk');
        //use debug versions
        var now = new Date();
        mkdirIfNotExist('./backup/');
        // Make Backups in the back up folder
        copyFile('./tsconfig.json', './backup/tsconfig-Before-Debug(' + now + ').json');
        copyFile('./angular.json', './backup/angular-Before-Debug(' + now + ').json');
        copyFile('./package.json', './backup/package-Before-Debug(' + now + ').json');
        copyFile('./tsconfig.debug.json', './tsconfig.json');
        copyFile('./angular.debug.json', './angular.json');
        //copyFile('./package.debug.json', './package.json');
        run('npm uninstall ' + getProp('TCSTDebugPackages'));
        //do NPM install
        //npmInstall('./');
        npmInstall('./', 'lodash-es');
        log('INFO', 'Now you can debug the cloud library sources in your browser !!');
        resolve();
    });
}

const packagesForLibSources = '';

// Function to go back to the compiled versions of the libraries
function undoLibSources() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Undo-ing Injecting Lib Sources');
        //Move back to Angular build files
        var now = new Date();
        mkdirIfNotExist('./backup/');
        // Make Backups in the back up folder
        copyFile('./tsconfig.json', './backup/tsconfig-Before-Build(' + now + ').json');
        copyFile('./angular.json', './backup/angular-Before-Build(' + now + ').json');
        copyFile('./package.json', './backup/package-Before-Build(' + now + ').json');
        copyFile('./tsconfig.build.json', './tsconfig.json');
        copyFile('./angular.build.json', './angular.json');
        // copyFile('./package.build.json', './package.json');
        //Delete Project folder
        //FIX: Just delete those folders imported...
        deleteFolder('./projects/tibco-tcstk/tc-core-lib');
        deleteFolder('./projects/tibco-tcstk/tc-forms-lib');
        deleteFolder('./projects/tibco-tcstk/tc-liveapps-lib');
        deleteFolder('./projects/tibco-tcstk/tc-spotfire-lib');
        //FIX: just install those npm packages (instead of removing the entire package.json file...)
        run('npm install ' + getProp('TCSTDebugPackages'));
        // npmInstall('./');
        resolve();
    });
}

// Function to change the tenant in the properties file
changeRegion = function () {
    return new Promise(async function (resolve, reject) {
        await updateRegion(getPropFileName());
        resolve();
    });
};

openingMessage = function () {
    return new Promise(async function (resolve, reject) {
        displayOpeningMessage();
        resolve()
    });
}


helptcli = function () {
    return new Promise(async function (resolve, reject) {
        log('INFO', 'GULP DETAILS:');
        var cwdir = process.cwd();
        run('gulp --version  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
        log('INFO', 'These are the available TIBCO CLOUD CLI Tasks:');
        // run('gulp -T  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
        var cTsks = cliTaskConfig.cliTasks;
        for (cliTask in cTsks) {
            var allowed = false;
            if (cTsks[cliTask].availableOnOs != null) {
                for (allowedOS of cTsks[cliTask].availableOnOs) {
                    // console.log('OS:' + allowedOS);
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
            // gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')'); \x1b[35m
        }

        resolve();
    });
}

// Start Cloudstarter Locally
start = function () {
    return new Promise(async function (resolve, reject) {
        log('INFO', 'Starting: ' + getProp('App_Name'));
        //TODO: Check if port 4200 is available, if not use 4201, 4202 etc.
        let port = 4200;
        const range = 50;
        let portToUse = 0;
        for (let i = 0; i < range ; i++){
            let pAv = await isPortAvailable(port + i);
            if(pAv){
                portToUse = port + i;
                i = range;
            }
        }
        if(portToUse != 0){
            log('INFO', 'Using Port: ' + portToUse);
            let myHost = getProp('cloudHost');
            /*
            if(myHost == 'USE-GLOBAL'){
                myHost =  getProp(G.cloudHost;
            }*/
            if(portToUse == 4200){
                if (myHost.includes('eu')) {
                    run('npm run serve_eu');
                } else {
                    if (myHost.includes('au')) {
                        run('npm run serve_au');
                    } else {
                        run('npm run serve_us');
                    }
                }
            }   else {
                if (myHost.includes('eu')) {
                    run('ng serve --proxy-config proxy.conf.prod.eu.json --ssl true --source-map --aot --port ' + portToUse);
                } else {
                    if (myHost.includes('au')) {
                        run('ng serve --proxy-config proxy.conf.prod.au.json --ssl true --source-map --aot --port ' + portToUse);
                    } else {
                        run('ng serve --proxy-config proxy.conf.prod.us.json --ssl true --source-map --aot --port ' + portToUse);
                    }
                }
            }
        } else {
            log('ERROR', 'No available port found (started at ' + port + ', with range: ' + range + ')');
        }
        resolve();
    });
}

mainT = function () {
    return new Promise(async function (resolve, reject) {
        console.log('[TIBCO CLOUD CLI - V' + version + '] ("exit" to quit / "help" to display tasks)');
        // checkPW();
        resolve();
        // var appRoot = process.env.PWD;
        var appRoot = process.cwd();
        if (getProp('CloudLogin.pass') == '') {
            // When password is empty ask it manually for the session.
            var pass = await askQuestion('Please provide your password: ', 'password');
            properties.set('CloudLogin.pass', obfuscatePW(pass));
        }

        await promptGulp(__dirname, appRoot);
    });
};

const getAppOwner = false;

test = function () {
    return new Promise(async function (resolve, reject) {
        console.log('Test...');
        var now = new Date();
        console.log(now);
        var answer = await askQuestion('Hoe gaat het ?');
        console.log(answer);
        var answer = await askQuestion('Hoe gaat het ?', 'password');
        console.log(answer);
        var answer = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
        console.log(answer);
        var answer = await askMultipleChoiceQuestion('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
        console.log(answer);
        console.log(testFunction());
        resolve();
    });
};

obfuscate = function () {
    return new Promise(async function (resolve, reject) {

        var password = await askQuestion('Please provide the password...', 'password');
        console.log('\nObfuscated password is is: ' + obfuscatePW(password));
        resolve();
    });
}

viewGlobalConfig = function () {
    return new Promise(async function (resolve, reject) {
        displayGlobalConnectionConfig();
        resolve();
    });
}

updateGlobalConfig = function () {
    return new Promise(async function (resolve, reject) {
        updateGlobalConnectionConfig();
        resolve();
    });
}

// Function to replace a string in a file
replaceStringInFileOne = function (prefix) {
    const rFrom = getProp(prefix + 'Replace_FROM');
    const rTo = getProp(prefix + 'Replace_TO');
    const rPat = getProp(prefix + 'Replace_PATTERN');

    if( rFrom == null || rTo == null || rPat == null){
        log(ERROR, 'Replace properties not found, please set Replace_FROM, Replace_TO and Replace_PATTERN in your properties file...');
    } else {
        log(INFO, 'Replacing From: ' , rFrom, ' To: ' , rTo, ' Pattern: ' , rPat);
        replaceInFile(rFrom,rTo,rPat);
    }
}

// Function to replace multiple strings in files
replaceStringInFileWrapper = function () {
    return new Promise(async function (resolve, reject) {
        const rMul = getProp('Replace_MULTIPLE');
        if(rMul == null){
            replaceStringInFileOne('');
        } else {
            const replaceA = rMul.split(',');
            for(var i = 0; i < replaceA.length; i++) {
                const currentRep = trim(replaceA[i]);
                replaceStringInFileOne(currentRep);
            }
        }
        resolve();
    });
}

// Wrapper to create a multiple prop file
createMultiplePropertyFileWrapper = function () {
    return new Promise(async function (resolve, reject) {
        await createMultiplePropertyFile();
        resolve();
    });
}

//gulp.task('test-call-service', testCallService);
gulp.task('test', test);
//gulp.task('test-wsu', testWSU);
gulp.task('wsu-add-tci', wsuAddTci);
gulp.task('wsu-list-tci', wsuListTci);
gulp.task('schematic-add', schematicAdd);
gulp.task('help-tcli', helptcli);
helptcli.description = 'Displays this message';
gulp.task('main', mainT);
gulp.task('opening', openingMessage);
gulp.task('default', gulp.series('opening', 'main'));
gulp.task('start', start);
start.description = 'Starts the cloud starter locally';
gulp.task('change-region', changeRegion);
changeRegion.description = 'Change the tenant to login to';
gulp.task('obfuscate', obfuscate);
obfuscate.description = 'Obfuscates a Password';
mainT.description = 'Displays this message';
gulp.task('show-cloud', showClaims);
showClaims.description = 'Shows basic information on your cloud login. (use this to test your cloud login details)';
gulp.task('show-apps', showApps);
showAvailableApps.description = 'Shows all the applications that are deployed in the cloud and their versions.';
gulp.task('show-application-links', showLinks);
showLinks.description = 'Shows all the links to the deployed applications (that have and index.html file).';
gulp.task('clean-dist', cleanDist);
gulp.task('buildZip', build);
gulp.task('build', gulp.series('clean-dist', 'buildZip'));

build.description = 'Build the ZIP file for your project.';
gulp.task('deploy', deploy);
deploy.description = 'Deploys your application to the cloud.';
gulp.task('publish', publish);
publish.description = 'Publishes the latest version of your application.';
gulp.task('build-deploy', gulp.series('build', 'deploy'));

gulp.task('get-cloud-libs-from-git', getCLgit);
getCLgit.description = 'Get the library sources from GIT';
gulp.task('format-project-for-lib-sources', injectLibSources);
injectLibSources.description = '(INTERNAL TASK) Used to reformat your project so you can work with the library sources (for debugging)';
gulp.task('clean', cleanTemp);
cleanTemp.description = '(INTERNAL TASK) Used to clean the temporary folders';
gulp.task('inject-lib-sources', gulp.series('clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'));
gulp.task('undo-lib-sources', undoLibSources);
undoLibSources.description = 'UNDO task for inject-lib-sources, use this when you want to go back to normal mode';

gulp.task('view-global-config', viewGlobalConfig);
viewGlobalConfig.description = 'A task to View the Global Connection Configuration.';
gulp.task('update-global-config', updateGlobalConfig);
updateGlobalConfig.description = 'A task to Update the Global Connection Configuration.';

gulp.task('show-shared-state', showSharedState);
showSharedState.description = 'Show the Shared State contents.';

gulp.task('show-shared-state-details', showSharedStateDetails);
showSharedStateDetails.description = 'Shows the details of one Shared State entry.';

gulp.task('clear-shared-state-entry', removeSharedStateEntry);
removeSharedStateEntry.description = 'Removes one Shared State entry.';

gulp.task('clear-shared-state-scope', clearSharedStateScope);
clearSharedStateScope.description = 'Removes all shared state entries in the configured scope.';

gulp.task('export-shared-state-scope', exportSharedStateScope);
exportSharedStateScope.description = 'Downloads all shared state entries from the configured scope to the local file system.';

gulp.task('import-shared-state-scope', importSharedStateScope);
importSharedStateScope.description = 'Uploads one entry or the configured scope from the local file system to the shared state.';

gulp.task('watch-shared-state-scope', watchSharedStateScopeMain);
watchSharedStateScopeMain.description = 'Monitors the local shared state and when changes are detected it is uploaded to the cloud.';

gulp.task('watch-shared-state-scope-do', watchSharedStateScope);

gulp.task('update-tcli', updateTCLIwrapper);
updateTCLIwrapper.description = 'Update the Cloud CLI.';

gulp.task('replace-string-in-file', replaceStringInFileWrapper);
replaceStringInFileWrapper.description = 'Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties';



gulp.task('create-multiple-property-file', createMultiplePropertyFileWrapper);
createMultiplePropertyFileWrapper.description = 'Creating an initial property file to manage multiple cloud starters and environments.';




/*
TODO: Additional Cloud CLI Capabilities
- List properties
- Revert app to older version (revert and publish
- List TCI Endpoints
- List Cloud Event Channels
- List Spotfire Reports
-- perhaps provide a gate into the various CLI's
-- Get the token from the cloud
 */

const cliTaskConfig = require('./config-cli-task.json');
// Comes from prop file now...
// const gtasks = ['show-cloud', 'show-apps', 'show-application-links','change-region', 'obfuscate', 'start', 'build', 'deploy', 'publish', 'clean', 'build-deploy-publish', 'get-cloud-libs-from-git', 'inject-lib-sources', 'undo-lib-sources', 'q', 'exit', 'quit', 'help-tcli' , 'repeat-last-task'];
var gtasks = [];
//var gtasks = determineEnabledTasks(cliTaskConfig);


var cTsks = cliTaskConfig.cliTasks;
for (cliTask in cTsks) {
    // console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
    var allowed = false;
    if (cTsks[cliTask].availableOnOs != null) {
        for (allowedOS of cTsks[cliTask].availableOnOs) {
            // console.log('OS:' + allowedOS);
            if (allowedOS == process.platform || allowedOS == 'all') {
                allowed = true;
                // console.log('CLI TASK: ' + cliTask + ' Is Allowed !!');
            }
        }
    }
    if (cTsks[cliTask].enabled && allowed) {
        // console.log('Adding: ' + cliTask);
        gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')');
    }
}

var globalLastCommand = 'help-tcli';
var inquirer = require('inquirer');
//Main Cloud CLI Questions
promptGulp = function (stDir, cwdDir) {
    log('DEBUG', 'PromtGulp)           stDir dir: ' + stDir);
    log('DEBUG', 'PromtGulp) current working dir: ' + cwdDir);
    return new Promise(function (resolve, reject) {
        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        inquirer.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: '[TCLI - CLOUD STARTER (\x1b[36m' + getProp('App_Name') + '\x1b[0m)]: ',
            source: searchAnswer,
            pageSize: 4/*,
            validate: function (val) {
                return val ? true : 'Type something!';
            }*/
        }]).then(function (answers) {
            //console.log(answers);
            //console.log('Command: ' + answers.command);
            let selectedTask = '';
            let selectedTaskConfig = {};
            for (cliTask in cTsks) {
                if (answers.command.substr(0, answers.command.indexOf('(') - 1) == cliTask) {
                    selectedTask = cliTask;
                    selectedTaskConfig = cTsks[cliTask];
                }
                //gtasks.push(cliTask + ' (' + cTsks[cliTask].description + ')');
            }
            // console.log('Selected Task: ' , selectedTask);
            // console.log('Task Config: ' , selectedTaskConfig);

            var com = selectedTask;
            if (com == 'q' || com == 'quit' || com == 'exit') {
                console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
                return resolve();
            } else {
                // Check if we need to repeat the last task
                var comToInject = selectedTaskConfig.gulpTask;
                if (com == 'repeat-last-task') {
                    log('INFO', 'Repeating Last Task: ' + globalLastCommand);
                    comToInject = globalLastCommand;
                } else {
                    globalLastCommand = comToInject;
                }
                //run('cd ' + stDir + ' && gulp ' + comToInject + ' --cwd "' + cwdDir + '" --gulpfile "' + stDir + '/manage-project.js" --pass "' + getProp('CloudLogin.pass') + '"');
                // console.log('tcli ' + comToInject + ' -p \'' + getPropFileName() + '\'');
                let additionalArugments = '';
                for (arg in process.argv) {
                    // console.log(process.argv[arg]);
                    if (process.argv[arg] == '--debug' || process.argv[arg] == '-d') {
                        additionalArugments = '-d';
                    }
                }
                run('tcli ' + comToInject + ' -p \'' + getPropFileName() + '\' ' + additionalArugments);
                return promptGulp(stDir, cwdDir);
            }
        });
    });
}


const _ = require('lodash');
const fuzzy = require('fuzzy');

//User interaction
searchAnswer = function (answers, input) {
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            var fuzzyResult = fuzzy.filter(input, gtasks);
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

