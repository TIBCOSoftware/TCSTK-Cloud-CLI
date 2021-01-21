//import functions
require('./build/common-functions');
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Common');
require('./build/project-functions');
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Projects');
const version = require('../package.json').version;
// const isWindows = process.platform == 'win32';

// Function to show cloud info
export async function showCloud() {
    await showCloudInfo();
}

// Show all the cloud starters
export function showApps() {
    showAvailableApps(true);
}

//Show all the cloud starter links
export function showLinks() {
    getAppLinks(true);
}

// Function to build the cloud starter
export async function buildCloudStarter() {
    await cleanDist();
    log('INFO', 'Building... ' + getProp('App_Name'));
    buildCloudStarterZip(getProp('App_Name'));
}

// Function to delpoy the cloud starter
export async function deploy() {
    log(INFO, 'Deploying ' + getProp('App_Name') + ' to:');
    showCloudInfo();
    await uploadApp(getProp('App_Name'));
    log('INFO', "DONE DEPLOYING: " + getProp('App_Name'));
    showAppLinkInfo();
}

export async function buildDeploy() {
    await buildCloudStarter();
    await deploy();
}

// TODO: look at exporting all functions at once
//module.exports = {deploy, buildCloudStarter, buildDeploy}

// Function to delete a WebApplication
export async function deleteApp() {
    // Get the list of applications
    log(INFO, 'Getting Applications...');
    const appArray = new Array();
    appArray.push('NONE');
    let deleteApp = false;
    const apps = showAvailableApps(true);
    for (let app of apps) {
        appArray.push(app.name);
    }
    const appToDelete = await askMultipleChoiceQuestionSearch('Which APP Would you like to delete ? ', appArray);
    if (appToDelete != 'NONE') {
        const confirm = await askMultipleChoiceQuestion('Are you sure you want to delete ? ' + appToDelete, ['YES', 'NO']);
        if (confirm == 'YES') {
            deleteApp = true;
        }
    }
    if (deleteApp) {
        log(INFO, 'Deleting ' + appToDelete + '...');
        const da = doDeleteApp(appToDelete);

        if (da) {
            if (da.message) {
                log(INFO, da.message);
            } else {
                log(ERROR, 'Error On Delete: ', da);
            }
        } else {
            log(ERROR, 'No Body Returned on Delete:  ', da);
        }

    } else {
        log(INFO, 'Ok I won\'t do anything...');
    }
}

// Function to publish the cloud starter
export async function publish() {
    await publishApp(getProp('App_Name'));
    log(INFO, 'APP PUBLISHED: ' + getProp('App_Name'));
    showAppLinkInfo();
}

// Clean temp folder
export async function cleanTemp() {
    log(INFO, 'Cleaning Temp Directory: ' + getProp('Workspace_TMPFolder'));
    return deleteFolder(getProp('Workspace_TMPFolder'));
}

// Function to get the cloud library sources from GIT
export async function getCLgit() {
    return getGit(getProp('GIT_Source_TCSTLocation'), getProp('TCSTLocation'), getProp('GIT_Tag_TCST'));
}

// Function that injects the sources of the library into this project
export function injectLibSources() {
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
}

// Inject the sources from the libs into a cloud starter project
export async function injectLibSourcesWrapper() {
    //'clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'
    await cleanDist();
    await getCLgit();
    injectLibSources();
    await cleanDist();
};

// Function to go back to the compiled versions of the libraries
export function undoLibSources() {
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

}

// Function to change the tenant in the properties file
export async function changeRegion() {
    await updateRegion(getPropFileName());
};

// Function to display help
export async function helptcli() {
    log(INFO, 'These are the available TIBCO CLOUD CLI Tasks:');
    const cTsks = cliTaskConfig.cliTasks;
    for (let cliTask in cTsks) {
        var allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (let allowedOS of cTsks[cliTask].availableOnOs) {
                // console.log('OS:' + allowedOS);
                if (allowedOS == process.platform || allowedOS == 'all') {
                    allowed = true;
                }
            }
        }
        if (cTsks[cliTask].enabled && !cTsks[cliTask].internal && allowed) {
            var str = cliTask;
            var x = 30 - cliTask.length;
            for (let i = 0; i < x; i++) {
                str = ' ' + str;
            }
            console.log('\x1b[36m%s\x1b[0m', str + ':', ' ' + cTsks[cliTask].description);
        }
    }
}

// Required to be valid for more than a week (default generation 2 weeks)
// Start Cloudstarter Locally
export async function start() {
    log(INFO, 'Starting: ' + getProp('App_Name'));
    if (isOauthUsed()) {
        const oauth = require('./build/oauth');
        await oauth.validateAndRotateOauthToken(true);
    }
    //Check if port 4200 is available, if not use 4201, 4202 etc.
    let port = 4200;
    const range = 50;
    let portToUse = 0;
    for (let i = 0; i < range; i++) {
        let pAv = await isPortAvailable(port + i);
        if (pAv) {
            portToUse = port + i;
            i = range;
        }
    }
    if (portToUse != 0) {
        log('INFO', 'Using Port: ' + portToUse);
        let myHost = getProp('cloudHost');
        if (portToUse == 4200) {
            // TODO: Fix bug, can not read includes of undefined (no global config, and no password)
            if (myHost.includes('eu')) {
                run('npm run serve_eu');
            } else {
                if (myHost.includes('au')) {
                    run('npm run serve_au');
                } else {
                    run('npm run serve_us');
                }
            }
        } else {
            if (myHost.includes('eu')) {
                run('ng serve --proxy-config proxy.conf.prod.eu.js --ssl true --source-map --aot --port ' + portToUse);
            } else {
                if (myHost.includes('au')) {
                    run('ng serve --proxy-config proxy.conf.prod.au.js --ssl true --source-map --aot --port ' + portToUse);
                } else {
                    run('ng serve --proxy-config proxy.conf.prod.us.js --ssl true --source-map --aot --port ' + portToUse);
                }
            }
        }
    } else {
        log('ERROR', 'No available port found (started at ' + port + ', with range: ' + range + ')');
    }
}

// Wrapper to main task
export async function mainT() {
    loadTaskDesc();
    displayOpeningMessage();
    console.log('[TIBCO CLOUD CLI - V' + version + '] ("exit" to quit / "help" to display tasks)');
    const appRoot = process.cwd();
    if (getProp('CloudLogin.pass') == '' && !isOauthUsed()) {
        // When password is empty ask it manually for the session.
        const pass = await askQuestion('Please provide your password: ', 'password');
        setProperty('CloudLogin.pass', obfuscatePW(pass));
    }
    await promptTask(__dirname, appRoot);
};


export async function test() {
    console.log('Test...');
    var now = new Date();
    console.log(now);
    //addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Token',  'NEW-' + now);
    console.log(' OAUTH Token: ', getProp('CloudLogin.OAUTH_Token'));
    console.log('OAUTH Token2: ', getProp('CloudLogin.OAUTH_Token'));
}

export async function obfuscate() {
    var password = await askQuestion('Please provide the password...', 'password');
    console.log('\nObfuscated password is is: ' + obfuscatePW(password));
}

export function viewGlobalConfig() {
    displayGlobalConnectionConfig();
}

export async function updateGlobalConfig() {
    await updateGlobalConnectionConfig();
}

// Function to replace a string in a file
export async function replaceStringInFileOne(prefix) {
    let rFrom = getProp(prefix + 'Replace_FROM');
    let rTo = getProp(prefix + 'Replace_TO');
    const rPat = getProp(prefix + 'Replace_PATTERN');
    if (rFrom == null || rTo == null || rPat == null) {
        log(ERROR, 'Replace properties not found, please set Replace_FROM, Replace_TO and Replace_PATTERN in your properties file...');
    } else {
        rFrom = rFrom.trim();
        rTo = rTo.trim();
        log(INFO, 'Replacing From: |' + rFrom + '| To: |' + rTo + '| Pattern: ', rPat);
        replaceInFile(rFrom, rTo, rPat);
    }
}

// Function to replace multiple strings in files
export async function replaceStringInFileWrapper() {
    const rMul = getProp('Replace_MULTIPLE');
    if (rMul == null) {
        replaceStringInFileOne('');
    } else {
        const replaceA = rMul.split(',');
        for (var i = 0; i < replaceA.length; i++) {
            const currentRep = trim(replaceA[i]);
            replaceStringInFileOne(currentRep);
        }
    }
}

// Wrapper to create a multiple prop file
export async function createMultiplePropertyFileWrapper() {
    await createMultiplePropertyFile();
}

// Display the shared state entries to a user
export function showSharedState() {
    const SHST = require('./build/shared-state');
    SHST.getSharedState(true);
};

// Display the details of a shared state
export async function showSharedStateDetailsWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.showSharedStateDetails();
};

export async function removeSharedStateEntryWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.removeSharedStateEntry();
}

export async function clearSharedStateScopeWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.clearSharedStateScope();
}

export async function exportSharedStateScopeWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.exportSharedStateScope();
}

export async function importSharedStateScopeWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.importSharedStateScope();
}

export async function watchSharedStateScopeMainWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.watchSharedStateScopeMain();
}

export async function watchSharedStateScopeWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.watchSharedStateScope();
}

// Function to show liveApps
export function showLiveAppsWrapper() {
    const LA = require('./build/liveApps');
    LA.showLiveApps(true, true);
}

// Function to export liveApps cases
export async function exportLiveAppsDataWrapper() {
    const LA = require('./build/liveApps');
    await LA.exportLiveAppsData();
}

export async function generateLiveAppsImportConfiguration() {
    const LA = require('./build/liveApps');
    await LA.createLAImportFile();
}

// Function to
export async function importLiveAppsDataWrapper() {
    const LA = require('./build/liveApps');
    await LA.importLiveAppsData();
}

// Function to
export async function csvToJsonLiveAppsDataWrapper() {
    const LA = require('./build/liveApps');
    await LA.csvToJsonLiveAppsData();
}

// Function to
export async function jsonToCsvLiveAppsDataWrapper() {
    const LA = require('./build/liveApps');
    await LA.jsonToCsvLiveAppsData();
}

export async function exportLiveAppsCaseTypeWrapper() {
    const LA = require('./build/liveApps');
    await LA.exportLiveAppsCaseType();
}

export function generateCloudDescriptorWrapper() {
    generateCloudDescriptor();
}

export function updateCloudPackagesWrapper() {
    updateCloudPackages();
}

export function showTCIWrapper() {
    const TCI = require('./build/tci');
    TCI.showTCI();
}

export async function monitorTCIWrapper() {
    const TCI = require('./build/tci');
    await TCI.monitorTCI();
}

export async function showSpotfireReportsWrapper() {
    const SPOTFIRE = require('./build/spotfire');
    await SPOTFIRE.showSpotfire();
}

export async function generateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.generateOauthToken();
}

export function showOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    OAUTH.showOauthToken();
}

export async function revokeOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.revokeOauthToken();
}

export function rotateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    OAUTH.rotateOauthToken();
}

export async function validateAndRotateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.validateAndRotateOauthToken(false);
}

export async function showOrgFoldersWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.showOrgFolders();
}

export async function generateCloudPropertyFilesWrapper() {
    await generateCloudPropertyFiles();
}

export async function exportOrgFolderWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.exportOrgFolder();
}

export async function importOrgFolderWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.importOrgFolder();
}

export async function watchOrgFolderWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.watchOrgFolder();
}

export async function showLiveAppsGroupsWrapper() {
    const USERGROUPS = require('./build/user-groups');
    await USERGROUPS.showLiveAppsGroups();
}

export async function createLiveAppsGroupWrapper() {
    const USERGROUPS = require('./build/user-groups');
    await USERGROUPS.createLiveAppsGroup();
}

export function showLiveAppsUsersWrapper() {
    const USERGROUPS = require('./build/user-groups');
    USERGROUPS.showLiveAppsUsers(true, false);
}


export async function addUserToGroupWrapper() {
    const USERGROUPS = require('./build/user-groups');
    await USERGROUPS.addUserToGroup();
}

export async function validateWrapper() {
    const VAL = require('./build/validation');
    await VAL.validate();
}

export async function updatePropertyWrapper() {
    await updateProperty();
}

export async function schematicAddWrapper() {
    await schematicAdd();
}

export async function showMessagingSummaryWrapper() {
    const MESSAGING = require('./build/messaging');
    await MESSAGING.showSummary();
}


// Comes from prop file now...
let gtasks = [];
const cliTaskConfig = require('./config/config-cli-task.json');
const cTsks = cliTaskConfig.cliTasks;

export function loadTaskDesc() {
    for (let cliTask in cTsks) {
        // console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (let allowedOS of cTsks[cliTask].availableOnOs) {
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
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After task descriptions');
}

let globalLastCommand = 'help-tcli';

//Main Cloud CLI Questions
// TODO: look at double answers
export async function promptTask(stDir, cwdDir) {
    const inquirer = require('inquirer');
    log(DEBUG, 'PromtTask)           stDir dir: ' + stDir);
    log(DEBUG, 'PromtTask) current working dir: ' + cwdDir);
    return new Promise(function (resolve, reject) {
        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        let pMes = '[TCLI - CLOUD STARTER (\x1b[36m' + getRegion() + ' - ' + getProp('App_Name') + '\x1b[0m)]: ';
        if (getOrganization() != '') {
            pMes = '[TCLI - CLOUD STARTER (\x1b[36m' + getRegion() + '(' + getOrganization() + ') - ' + getProp('App_Name') + '\x1b[0m)]: ';
        }
        inquirer.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: pMes,
            source: searchAnswer,
            pageSize: 4
        }]).then(function (answers) {
            let selectedTask = '';
            let selectedTaskConfig = {};
            for (let cliTask in cTsks) {
                if (answers.command.substr(0, answers.command.indexOf('(') - 1) == cliTask) {
                    selectedTask = cliTask;
                    selectedTaskConfig = cTsks[cliTask];
                }
            }
            let com = selectedTask;
            if (com == 'q' || com == 'quit' || com == 'exit') {
                console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
                return resolve();
            } else {
                // Check if we need to repeat the last task
                var comToInject = selectedTaskConfig.taskName;
                if (com == 'repeat-last-task') {
                    log('INFO', 'Repeating Last Task: ' + globalLastCommand);
                    comToInject = globalLastCommand;
                } else {
                    globalLastCommand = comToInject;
                }
                let additionalArugments = '';
                for (let arg in process.argv) {
                    // TODO: Should not all arguments be propagated >?
                    if (process.argv[arg] == '--debug' || process.argv[arg] == '-d') {
                        additionalArugments += ' -d ';
                    }
                }
                if (getProp('CloudLogin.pass').toString() !== '') {
                    additionalArugments += ' --pass "' + getProp('CloudLogin.pass') + '"';
                }
                if (getOrganization() !== '') {
                    additionalArugments += ' --org "' + getOrganization() + '"';
                }
                let commandTcli = 'tcli ' + comToInject + ' -p "' + getPropFileName() + '" ' + additionalArugments;
                run(commandTcli);
                return promptTask(stDir, cwdDir);
            }
        });
    });
}

//User interaction
export async function searchAnswer(answers, input) {
    const _ = require('lodash');
    const fuzzy = require('fuzzy');
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
