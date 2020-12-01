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

// Function to build the cloud starter
async function buildCloudStarter() {
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


/*
openingMessage = function () {
    return new Promise(async function (resolve, reject) {
        displayOpeningMessage();
        resolve()
    });
}*/


export async function helptcli() {
    // log(INFO', 'GULP DETAILS:');
    // const cwdir = process.cwd();
    // run('gulp --version  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
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
// const OAUTH_REQUIRED_HOURS_VALID = 168;
// Start Cloudstarter Locally
export async function start() {
    log(INFO, 'Starting: ' + getProp('App_Name'));
    if (isOauthUsed()) {
        await validateAndRotateOauthToken(true);
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

export async function mainT() {
    console.log('[TIBCO CLOUD CLI - V' + version + '] ("exit" to quit / "help" to display tasks)');
    var appRoot = process.cwd();
    if (getProp('CloudLogin.pass') == '' && !isOauthUsed()) {
        // When password is empty ask it manually for the session.
        var pass = await askQuestion('Please provide your password: ', 'password');
        setProperty('CloudLogin.pass', obfuscatePW(pass));
    }
    await promptTask(__dirname, appRoot);
};

// const getAppOwner = false;

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

export async function viewGlobalConfig() {
    displayGlobalConnectionConfig();
}

export async function updateGlobalConfig() {
    updateGlobalConnectionConfig();
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

// Function to show liveApps
export async function showLiveAppsWrapper() {
    showLiveApps(true, true);
}

// Display the shared state entries to a user
export async function showSharedState() {
    getSharedState(true);
};

// Display the details of a shared state
export async function showSharedStateDetailsWrapper() {
    await showSharedStateDetails();
};

export async function removeSharedStateEntryWrapper() {
    await removeSharedStateEntry();
}

export async function clearSharedStateScopeWrapper() {
    await clearSharedStateScope();
}

export async function exportSharedStateScopeWrapper() {
    await exportSharedStateScope();
}

export async function importSharedStateScopeWrapper() {
    await importSharedStateScope();
}

export async function watchSharedStateScopeMainWrapper() {
    await watchSharedStateScopeMain();
}

export async function watchSharedStateScopeWrapper() {
    await watchSharedStateScope();
}





// Function to export liveApps cases
export async function exportLiveAppsDataWrapper() {

    exportLiveAppsData();

}

export async function generateLiveAppsImportConfiguration() {

    createLAImportFile();

}

// Function to
export async function importLiveAppsDataWrapper() {

    importLiveAppsData();

}

// Function to
export async function csvToJsonLiveAppsDataWrapper() {

    csvToJsonLiveAppsData();

}

// Function to
export async function jsonToCsvLiveAppsDataWrapper() {

    jsonToCsvLiveAppsData();

}

export async function exportLiveAppsCaseTypeWrapper() {

    exportLiveAppsCaseType();

}

export async function generateCloudDescriptorWrapper() {

    generateCloudDescriptor();

}

export async function updateCloudPackagesWrapper() {

    updateCloudPackages();

}

export async function showTCIWrapper() {

    showTCI();

}

export async function monitorTCIWrapper() {

    await monitorTCI();

}


export async function showSpotfireReportsWrapper() {

    showSpotfire();

}

export async function generateOauthTokenWrapper() {

    generateOauthToken();

}

export async function showOauthTokenWrapper() {

    showOauthToken();

}

export async function revokeOauthTokenWrapper() {

    revokeOauthToken();

}

export async function rotateOauthTokenWrapper() {

    rotateOauthToken();

}

export async function validateAndRotateOauthTokenWrapper() {

    validateAndRotateOauthToken(false);

}

export async function showOrgFoldersWrapper() {

    showOrgFolders();

}

export async function generateCloudPropertyFilesWrapper() {

    generateCloudPropertyFiles();

}

export async function exportOrgFolderWrapper() {

    exportOrgFolder();

}

export async function importOrgFolderWrapper() {

    importOrgFolder();

}

export async function watchOrgFolderWrapper() {

    watchOrgFolder();

}

export async function showLiveAppsGroupsWrapper() {

    showLiveAppsGroups();

}

export async function createLiveAppsGroupWrapper() {

    createLiveAppsGroup();

}

export async function showLiveAppsUsersWrapper() {

    showLiveAppsUsers(true, false);

}


export async function addUserToGroupWrapper() {

    addUserToGroup();

}

export async function validateWrapper() {

    validate();

}

export async function updatePropertyWrapper() {

    updateProperty();

}


// Comes from prop file now...
let gtasks = [];
const cliTaskConfig = require('./config/config-cli-task.json');
const cTsks = cliTaskConfig.cliTasks;

/*
export function initGulp() {
    // This file manages all the tasks within a project
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Loading Second GulP');
    const gulp = require('gulp');
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Loading Second GulP');
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Before gulp init');
    //gulp.task('test', test);
//gulp.task('test-wsu', testWSU);
    // gulp.task('wsu-add-tci', wsuAddTci);
    // gulp.task('wsu-list-tci', wsuListTci);
    // gulp.task('schematic-add', schematicAdd);
   // gulp.task('help-tcli', helptcli);
// helptcli.description = 'Displays this message';
    //gulp.task('main', mainT);
    //gulp.task('opening', openingMessage);
    //gulp.task('default', gulp.series('opening', 'main'));
    // gulp.task('start', start);
// start.description = 'Starts the cloud starter locally';
    // gulp.task('change-region', changeRegion);
    // changeRegion.description = 'Change the tenant to login to';
    // gulp.task('obfuscate', obfuscate);
// obfuscate.description = 'Obfuscates a Password';
// mainT.description = 'Displays this message';
    // gulp.task('show-cloud', showCloudInfo);
// showCloudInfo.description = 'Shows basic information on your cloud login. (use this to test your cloud login details)';
    // gulp.task('show-cloud-starters', showApps);
// showAvailableApps.description = 'Shows all the applications that are deployed in the cloud and their versions.';
    // gulp.task('show-cloud-starter-links', showLinks);
// showLinks.description = 'Shows all the links to the deployed applications (that have and index.html file).';
    // gulp.task('delete-cloud-starter', deleteApp);
// deleteApp.description = 'Delete a Cloud Starter.';
    // gulp.task('show-live-apps-cases', showLiveAppsWrapper);
// showLiveAppsWrapper.description = 'Show Live Apps';
    // gulp.task('export-live-apps-cases', exportLiveAppsDataWrapper);
// exportLiveAppsDataWrapper.description = 'Export Data from Live Apps';
    // gulp.task('import-live-apps-cases', importLiveAppsDataWrapper);
// importLiveAppsDataWrapper.description = 'Import Data to Live Apps';
    //gulp.task('csv-to-json-liveapps-data', csvToJsonLiveAppsDataWrapper);
// csvToJsonLiveAppsDataWrapper.description = 'Convert CSV to JSON for LiveApps data';
    //gulp.task('json-to-csv-liveapps-data', jsonToCsvLiveAppsDataWrapper);
// jsonToCsvLiveAppsDataWrapper.description = 'Convert JSON to CSV for LiveApps data';
    // gulp.task('export-live-apps-case-type', exportLiveAppsCaseTypeWrapper);
// exportLiveAppsCaseTypeWrapper.description = 'Export the details of a Live Apps Case Type';
    // gulp.task('show-tci-apps', showTCIWrapper);
// showTCIWrapper.description = 'List all TIBCO Cloud Integration Applications(Flogo, Scribe, Node.JS & Business Works).';
// monitor-tci-app
    //gulp.task('monitor-tci-app', monitorTCIWrapper);
// monitorTCIWrapper.description = 'Monitor the logs of a TIBCO Cloud Integration Flogo Application';
   // gulp.task('show-spotfire-reports', showSpotfireReportsWrapper);
// showSpotfireReportsWrapper.description = 'List all Spotfire Analytical Reports.';
    //  gulp.task('describe-cloud', gulp.series('show-cloud', 'show-tci-apps', 'show-spotfire-reports', 'show-live-apps-cases', 'show-cloud-starters'));
   // gulp.task('generate-oauth-token', generateOauthTokenWrapper);
// generateOauthTokenWrapper.description = 'Generate a new OAUTH token to authenticate to the TIBCO Cloud.';
    // gulp.task('show-oauth-tokens', showOauthTokenWrapper);
// showOauthTokenWrapper.description = 'Displays OAUTH tokens to authenticate to the TIBCO Cloud.';
    // gulp.task('revoke-oauth-token', revokeOauthTokenWrapper);
// revokeOauthTokenWrapper.description = 'Revokes an existing OAUTH token.';
    // gulp.task('rotate-oauth-token', rotateOauthTokenWrapper);
// rotateOauthTokenWrapper.description = 'Revokes your existing OAUTH token and then generates a new one.';
    // gulp.task('validate-and-rotate-oauth-token', validateAndRotateOauthTokenWrapper);
// validateAndRotateOauthTokenWrapper.description = 'Checks if OAUTH token is valid for more than a configured time (1 week for example) and if not, it will rotate it.';
    //gulp.task('generate-cloud-property-files', generateCloudPropertyFilesWrapper);
// generateCloudPropertyFilesWrapper.description = 'Generates a list of cloud property files.';
    // gulp.task('show-org-folders', showOrgFoldersWrapper);
// showOrgFoldersWrapper.description = 'Displays the content of the LiveApps Organization Folders.';
    // gulp.task('export-org-folder', exportOrgFolderWrapper);
// exportOrgFolderWrapper.description = 'Exports the content of a LiveApps Organization Folder to disk.';
   // gulp.task('import-org-folder', importOrgFolderWrapper);
// importOrgFolderWrapper.description = 'Imports the content of a folder on disk to a LiveApps Organization Folder.';
   // gulp.task('watch-org-folder', watchOrgFolderWrapper);
// watchOrgFolderWrapper.description = 'Watches a folder on disk for changes and updates those changes to a LiveApps Organization Folder.';
    // gulp.task('show-live-apps-groups', showLiveAppsGroupsWrapper);
// showLiveAppsGroupsWrapper.description = 'Displays the LiveApps groups and their users.';
    // gulp.task('create-live-apps-group', createLiveAppsGroupWrapper);
// createLiveAppsGroupWrapper.description = 'Creates a new LiveApps group.';
   // gulp.task('show-live-apps-users', showLiveAppsUsersWrapper);
// showLiveAppsUsersWrapper.description = 'Shows the users in LiveApps (which can be added to groups).';
    // gulp.task('add-user-to-group', addUserToGroupWrapper);
// addUserToGroupWrapper.description = 'Adds a user to a LiveApps group.';
   // gulp.task('validate', validateWrapper);
// validateWrapper.description = 'Validates the setting of a property & the value of a property or validates the existence of a Cloud Starter, LiveApps app or TCI App.';
    // gulp.task('add-or-update-property', updatePropertyWrapper);
// updatePropertyWrapper.description = 'Updates a property in a file.';
    // gulp.task('clean-dist', cleanDist);
    // gulp.task('buildZip', build);
    // gulp.task('build', gulp.series('clean-dist', 'buildZip'));
// build.description = 'Build the ZIP file for your project.';
    // gulp.task('deploy', deploy);
// deploy.description = 'Deploys your application to the cloud.';
    // gulp.task('publish', publish);
// publish.description = 'Publishes the latest version of your application.';
    // gulp.task('build-deploy', gulp.series('build', 'deploy'));
    //gulp.task('get-cloud-libs-from-git', getCLgit);
// getCLgit.description = 'Get the library sources from GIT';
    //gulp.task('format-project-for-lib-sources', injectLibSources);
// injectLibSources.description = '(INTERNAL TASK) Used to reformat your project so you can work with the library sources (for debugging)';
    // gulp.task('clean', cleanTemp);
// cleanTemp.description = '(INTERNAL TASK) Used to clean the temporary folders';
    //gulp.task('inject-lib-sources', gulp.series('clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'));
    // gulp.task('undo-lib-sources', undoLibSources);
// undoLibSources.description = 'UNDO task for inject-lib-sources, use this when you want to go back to normal mode';
    // gulp.task('view-global-config', viewGlobalConfig);
// viewGlobalConfig.description = 'A task to View the Global Connection Configuration.';
    // gulp.task('update-global-config', updateGlobalConfig);
// updateGlobalConfig.description = 'A task to Update the Global Connection Configuration.';
    // gulp.task('show-shared-state', showSharedState);
// showSharedState.description = 'Show the Shared State contents.';
    // gulp.task('show-shared-state-details', showSharedStateDetails);
// showSharedStateDetails.description = 'Shows the details of one Shared State entry.';
    //gulp.task('clear-shared-state-entry', removeSharedStateEntry);
// removeSharedStateEntry.description = 'Removes one Shared State entry.';
    //gulp.task('clear-shared-state-scope', clearSharedStateScope);
// clearSharedStateScope.description = 'Removes all shared state entries in the configured scope.';
    // gulp.task('export-shared-state-scope', exportSharedStateScope);
// exportSharedStateScope.description = 'Downloads all shared state entries from the configured scope to the local file system.';
    //gulp.task('generate-live-apps-import-configuration', generateLiveAppsImportConfiguration);
// generateLiveAppsImportConfiguration.description = 'Generate the Live Apps Import configuration file.';
   // gulp.task('import-shared-state-scope', importSharedStateScope);
// importSharedStateScope.description = 'Uploads one entry or the configured scope from the local file system to the shared state.';
    // gulp.task('watch-shared-state-scope', watchSharedStateScopeMain);
// watchSharedStateScopeMain.description = 'Monitors the local shared state and when changes are detected it is uploaded to the cloud.';
    // gulp.task('watch-shared-state-scope-do', watchSharedStateScope);
    // gulp.task('update-cloud-packages', updateCloudPackagesWrapper);
// updateCloudPackagesWrapper.description = 'Updates the NPM packges in the @tibco-tcstk scope in your project.';
   // gulp.task('update-tcli', updateTCLIwrapper);
// updateTCLIwrapper.description = 'Update the Cloud CLI.';
    // gulp.task('replace-string-in-file', replaceStringInFileWrapper);
// replaceStringInFileWrapper.description = 'Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties';
    // gulp.task('generate-cloud-descriptor', generateCloudDescriptorWrapper);
// generateCloudDescriptorWrapper.description = 'Generates the configured Public Cloud Descriptor';
    // gulp.task('create-multiple-property-file', createMultiplePropertyFileWrapper);
// createMultiplePropertyFileWrapper.description = 'Creating an initial property file to manage multiple cloud starters and environments.';
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After gulp init');
}*/

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
    loadTaskDesc();
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
            var com = selectedTask;
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


function fakeForUsage() {
    buildDeploy();
    deleteApp();
    changeRegion();
}
