//import functions
require('./build/common-functions');
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Common');
const version = require('../package.json').version;
const colors = require('colors');

// Function to display help
export async function helptcli() {
    log(INFO, 'These are the available TIBCO CLOUD CLI Tasks:');
    const cTsks = cliTaskConfig.cliTasks;
    for (let cliTask in cTsks) {
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (let allowedOS of cTsks[cliTask].availableOnOs) {
                // console.log('OS:' + allowedOS);
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
    }
    // TODO: Ask for which task to show details and then display the MD
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
}

export async function test() {
    console.log('Test...');
    // displayMDFile('docs/use-cases/UC1_Get_Started.md');
    const PROPM = require('./build/property-file-management');
    // PROPM.getClientID();
    // PROPM.disableProperty(getPropFileName(), 'test', 'Disabled for Upgrade to V2');

    const fus = require('./build/fuzzy-search.js');
    console.log(fus.search('test'));

}

// Function to show cloud info
export async function showCloud() {
    const CCOM = require('./build/cloud-communications');
    await CCOM.showCloudInfo();
}

// Required to be valid for more than a week (default generation 2 weeks)
// Start Cloudstarter Locally
export async function startWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.start();
}

// Function to publish the cloud starter
export async function publish() {
    const CS = require('./build/cloud-starters');
    await CS.publishApp(getProp('App_Name'));
    log(INFO, 'APP PUBLISHED: ' + getProp('App_Name'));
    CS.showAppLinkInfo();
}

// Show all the cloud starters
export function showApps() {
    const CS = require('./build/cloud-starters');
    CS.showAvailableApps(true);
}

// Show all the cloud starters
export async function deleteAppWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.deleteApp();
}


//Show all the cloud starter links
export function showLinks() {
    const CS = require('./build/cloud-starters');
    CS.getAppLinks(true);
}

// Function to build the cloud starter
export async function buildCloudStarter() {
    const CS = require('./build/cloud-starters');
    await CS.cleanDist();
    log('INFO', 'Building... ' + getProp('App_Name'));
    CS.buildCloudStarterZip(getProp('App_Name'));
}

// Function to delpoy the cloud starter
export async function deploy() {
    const CCOM = require('./build/cloud-communications');
    const CS = require('./build/cloud-starters');
    log(INFO, 'Deploying ' + getProp('App_Name') + ' to)');
    CCOM.showCloudInfo();
    await CS.uploadApp(getProp('App_Name'));
    log('INFO', "DONE DEPLOYING: " + getProp('App_Name'));
    CS.showAppLinkInfo();
}

export async function buildDeploy() {
    // Getting these functions from self
    await buildCloudStarter();
    await deploy();
}

// Clean temp folder
export async function cleanTemp() {
    // Getting this from common
    log(INFO, 'Cleaning Temp Directory: ' + getProp('Workspace_TMPFolder'));
    return deleteFolder(getProp('Workspace_TMPFolder'));
}

// Function to get the cloud library sources from GIT
export async function getCLgit() {
    // Getting this from common
    return getGit(getProp('GIT_Source_TCSTLocation'), getProp('TCSTLocation'), getProp('GIT_Tag_TCST'));
}

// Inject the sources from the libs into a cloud starter project
export async function injectLibSourcesWrapper() {
    //'clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'
    const CS = require('./build/cloud-starters');
    await cleanDist();
    await getCLgit();
    CS.injectLibSources();
    await cleanDist();
}

// Function to generate the cloud descriptor
export function generateCloudDescriptorWrapper() {
    const CS = require('./build/cloud-starters');
    CS.generateCloudDescriptor();
}

// Function to change the tenant in the properties file
export async function changeRegion() {
    // Getting this from common
    await updateRegion(getPropFileName());
};


export async function obfuscate() {
    const password = await askQuestion('Please provide the password...', 'password');
    // Getting this fromo common
    console.log('\nObfuscated password is is: ' + obfuscatePW(password));
}

export function viewGlobalConfig() {
    // Is coming from Common
    displayGlobalConnectionConfig();
}

export async function updateGlobalConfig() {
    // Is coming from Common
    await updateGlobalConnectionConfig();
}

// Function to replace a string in a file
export function replaceStringInFileOne(prefix) {
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
        for (let i = 0; i < replaceA.length; i++) {
            const currentRep = trim(replaceA[i]);
            replaceStringInFileOne(currentRep);
        }
    }
}

// Wrapper to create a multiple prop file
export async function createMultiplePropertyFileWrapper() {
    // Is coming from Common
    await createMultiplePropertyFile();
}

// Display the shared state entries to a user
export async function createSharedStateWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.createSharedState();
};

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

export async function clearSharedStateWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.clearSharedState();
}

export async function exportSharedStateWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.exportSharedState();
}

export async function importSharedStateWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.importSharedState();
}

export async function watchSharedStateMainWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.watchSharedStateMain();
}

export async function watchSharedStateWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.watchSharedState();
}

// Function to show liveApps
export function showLiveAppsWrapper() {
    const LA = require('./build/live-apps');
    LA.showLiveApps(true, true);
}

// Function to export liveApps cases
export async function exportLiveAppsDataWrapper() {
    const LA = require('./build/live-apps');
    await LA.exportLiveAppsData();
}

export async function generateLiveAppsImportConfiguration() {
    const LA = require('./build/live-apps');
    await LA.createLAImportFile();
}

// Function to
export async function importLiveAppsDataWrapper() {
    const LA = require('./build/live-apps');
    await LA.importLiveAppsData();
}

// Function to
export async function csvToJsonLiveAppsDataWrapper() {
    const LA = require('./build/live-apps');
    await LA.csvToJsonLiveAppsData();
}

// Function to
export async function jsonToCsvLiveAppsDataWrapper() {
    const LA = require('./build/live-apps');
    await LA.jsonToCsvLiveAppsData();
}

export async function exportLiveAppsCaseTypeWrapper() {
    const LA = require('./build/live-apps');
    await LA.exportLiveAppsCaseType();
}

export function updateCloudPackagesWrapper() {
    // Is coming from common
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

export async function browseSpotfireLibraryWrapper() {
    const SPOTFIRE = require('./build/spotfire');
    await SPOTFIRE.browseSpotfire();
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
    const PROPM = require('./build/property-file-management');
    await PROPM.generateCloudPropertyFiles();
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
    const PROPM = require('./build/property-file-management');
    await PROPM.updateProperty();
}

export async function schematicAddWrapper() {
    const SCHEMATICS = require('./build/schematics');
    await SCHEMATICS.schematicAdd();
}

export async function showMessagingSummaryWrapper() {
    const MESSAGING = require('./build/messaging');
    await MESSAGING.showSummary();
}


// Comes from prop file
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
        let pMes = '[TCLI - ' + colors.blue(getRegion(true)) + ' - ' + colors.yellow(getProp('App_Name')) + ']: ';
        // TODO: Look at getting org
        if (getOrganization() != '') {
            pMes = '[TCLI - ' + colors.blue(getRegion(true) + ' - ' + getOrganization(true))+' - ' + colors.yellow(getProp('App_Name')) + ']: ';
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
                let comToInject = selectedTaskConfig.taskName;
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
            const fuzzyResult = fuzzy.filter(input, gtasks);
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

// Set log debug level from local property
setLogDebug(getProp('Use_Debug'));

// Function to upgrade the prop file to V2
if(getProp('Cloud_Properties_Version') == null){
    upgradeToV2(false, getPropFileName());
}

