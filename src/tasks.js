//import functions
require('./build/common-functions');
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Common');
const version = require('../package.json').version;
const colors = require('colors');
// Constants
const BACK = 'BACK';
const BACK_TO_ALL = 'BACK TO ALL TASKS';
const CAT_QUESTION = 'From which category would you like to select a task ?';
const cliTaskConfig = require('./config/config-cli-task.json');
const cTsks = cliTaskConfig.cliTasks;
// Comes from prop file
let gTasksDescr = [];
let gTasksNames = [];
let gCategory = ['ALL'];
let globalLastCommand = 'help';

// Wrapper to main task
export async function mainT(cat) {
    const catToUse = cat || 'ALL';
    loadTaskDesc(catToUse);
    displayOpeningMessage();
    console.log('[TIBCO CLOUD CLI - V' + version + '] ("exit" to quit / "help" to display tasks)');
    const appRoot = process.cwd();
    if (getProp('CloudLogin.pass') === '' && !isOauthUsed()) {
        // When password is empty ask it manually for the session.
        const pass = await askQuestion('Please provide your password: ', 'password');
        setProperty('CloudLogin.pass', obfuscatePW(pass));
    }
    await promptTask(__dirname, appRoot);
}

export function loadTaskDesc(category) {
    gTasksDescr = [];
    gTasksNames = [];
    const catToUse = category || 'ALL';
    if (catToUse !== 'ALL') {
        gTasksDescr.push(BACK, BACK_TO_ALL);
        gTasksNames.push(BACK, BACK_TO_ALL);
    }
    let taskCounter = 0;
    for (let cliTask in cTsks) {
        // console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (let allowedOS of cTsks[cliTask].availableOnOs) {
                // console.log('OS:' + allowedOS);
                if (allowedOS === process.platform || allowedOS === 'all') {
                    allowed = true;
                    // console.log('CLI TASK: ' + cliTask + ' Is Allowed !!');
                }
            }
        }
        if (cTsks[cliTask].enabled && allowed) {
            // Add to global category (if not exits)
            if (gCategory.indexOf(cTsks[cliTask].category) === -1) {
                gCategory.push(cTsks[cliTask].category);
            }
            // console.log('Adding: ' + cliTask);
            // console.log('Adding: ' + cliTask + ' : ' + cliTask.length);
            if (!cTsks[cliTask].internal && !(cliTask === 'help' || cliTask === 'exit')) {
                if (cTsks[cliTask].category === catToUse || catToUse === 'ALL') {
                    taskCounter++;
                    const tCounterStr = taskCounter + ') ';
                    const catStr = '[' + cTsks[cliTask].category + '] ';
                    // Remove the category from the name
                    let taskName = cliTask.replace(cTsks[cliTask].category, '');
                    // Special case for cloud starter since the category is called cloud starters
                    taskName = taskName.replace('cloud-starter', '');
                    // Replace double --
                    taskName = taskName.replace('--', '-');
                    // Remove -'s at the end or beginning
                    if (taskName.endsWith('-')) {
                        taskName = taskName.substring(0, taskName.length - 1);
                    }
                    if (taskName.startsWith('-')) {
                        taskName = taskName.substring(1, taskName.length);
                    }
                    gTasksDescr.push(tCounterStr.padStart(4) + taskName.padEnd(30) + catStr.padStart(17) +' - ' + cTsks[cliTask].description);
                    gTasksNames.push(cliTask);
                }
            } else {
                gTasksDescr.push(cliTask);
                gTasksNames.push(cliTask);
            }
        }
    }
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After task descriptions');
}

//Main Cloud CLI Questions
export async function promptTask(stDir, cwdDir) {
    const inquirer = require('inquirer');
    log(DEBUG, 'PromtTask)           stDir dir: ' + stDir);
    log(DEBUG, 'PromtTask) current working dir: ' + cwdDir);
    return new Promise(function (resolve) {
        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        let pMes = '[TCLI - ' + colors.blue(getRegion(true)) + ' - ' + colors.yellow(getProp('App_Name')) + ']: ';
        // If there is an org, show it
        if (getOrganization() !== '') {
            pMes = '[TCLI - ' + colors.blue(getRegion(true) + ' - ' + getOrganization(true)) + ' - ' + colors.yellow(getProp('App_Name')) + ']: ';
        }
        inquirer.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: pMes,
            source: searchAnswer,
            pageSize: 5
        }]).then(async function (answers) {
            let selectedTask = gTasksNames[gTasksDescr.findIndex((el) => answers.command === el)];
            log(INFO, 'Selected task] ' + colors.blue(selectedTask));
            let com = selectedTask;
            // Special case for help, call the inline help directly
            if (com === 'help') {
                await helptcliWrapper();
                return promptTask(stDir, cwdDir);
            }
            // Logic to browse by task
            if (com === BACK_TO_ALL) {
                loadTaskDesc('ALL');
                return promptTask(stDir, cwdDir);
            }
            if (com === 'browse-tasks' || com === BACK) {
                const chosenCat = await askMultipleChoiceQuestion(CAT_QUESTION, gCategory);
                loadTaskDesc(chosenCat);
                return promptTask(stDir, cwdDir);
            }
            if (com === 'quit') {
                if(Math.random() < 0.1){
                    //Quit with a quote
                    console.log(colors.bgWhite(QUOTES[Math.floor(Math.random() * QUOTES.length)]));
                }
                console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
                return resolve();
            }
            // Check if we need to repeat the last task
            let comToInject = selectedTask;
            if (com === 'repeat-last-task') {
                log('INFO', 'Repeating Last Task: ' + globalLastCommand);
                comToInject = globalLastCommand;
            } else {
                globalLastCommand = comToInject;
            }
            let additionalArugments = '';
            for (let arg in process.argv) {
                // TODO: Should not all arguments be propagated >?
                if (process.argv[arg] === '--debug' || process.argv[arg] === '-d') {
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
        });
    });
}

//TODO: Use function from common, and test with test
//User interaction
export async function searchAnswer(answers, input) {
    const _ = require('lodash');
    const fuzzy = require('fuzzy');
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            const fuzzyResult = fuzzy.filter(input, gTasksDescr);
            // TODO: Check for more exact match
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

// A function to get directly into the browse mode
export async function browseTasks() {
    // Load categories
    loadTaskDesc('ALL');
    const chosenCat = await askMultipleChoiceQuestion(CAT_QUESTION, gCategory);
    mainT(chosenCat);
}

export async function testTask() {
    console.log('Test...');
    const PROPM = require('./build/property-file-management');
    await PROPM.getClientIDforOrg();

}

// Function to display help
export async function helptcliWrapper() {
    const HELP = require('./build/help');
    await HELP.showInteractiveHelp();
}

// Function to show cloud info
export async function showCloud() {
    const CCOM = require('./build/cloud-communications');
    await CCOM.showCloudInfo();
}

// Start Cloud Starter Locally
export async function startWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.start();
}

// Test Cloud Starter Locally
export async function testCSWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.testCS();
}

// Test Cloud Starter Locally Headless
export async function testCSHeadlessWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.testCSHeadless();
}

// Function to publish the cloud starter
export async function publish() {
    const CS = require('./build/cloud-starters');
    await CS.publishApp(getProp('App_Name'));
    log(INFO, 'APP PUBLISHED: ' + getProp('App_Name'));
    CS.showAppLinkInfo();
}

// Show all the cloud starters
export async function showApps() {
    const CS = require('./build/cloud-starters');
    await CS.showAvailableApps(true);
}

// Show all the cloud starters
export async function deleteAppWrapper() {
    const CS = require('./build/cloud-starters');
    await CS.deleteApp();
}


//Show all the cloud starter links
export async function showLinks() {
    const CS = require('./build/cloud-starters');
    await CS.getAppLinks(true);
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
    await CCOM.showCloudInfo();
    await CS.uploadApp(getProp('App_Name'));
    log('INFO', "DONE DEPLOYING: " + getProp('App_Name'));
    await CS.showAppLinkInfo();
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
    await CS.cleanDist();
    await getCLgit();
    CS.injectLibSources();
    await CS.cleanDist();
}

// Inject the sources from the libs into a cloud starter project
export async function undoLibSourcesWrapper() {
    const CS = require('./build/cloud-starters');
    CS.undoLibSources();
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
}

// Function to change the organization in the properties file
export async function changeOrganizationWrapper() {
    const PROPM = require('./build/property-file-management');
    await PROPM.changeOrganization();
}

// Function to change the organization in the properties file
export async function showOrganizationWrapper() {
    const PROPM = require('./build/property-file-management');
    await PROPM.showOrganization();
}

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
}

// Display the shared state entries to a user
export async function showSharedState() {
    const SHST = require('./build/shared-state');
    await SHST.getSharedState(true);
}

// Display the details of a shared state
export async function showSharedStateDetailsWrapper() {
    const SHST = require('./build/shared-state');
    await SHST.showSharedStateDetails();
}

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
export async function showLiveAppsWrapper() {
    const LA = require('./build/live-apps');
    await LA.showLiveApps(true, true);
}

// Function to show liveApps Actions
export async function showLiveAppsActionsWrapper() {
    const LA = require('./build/live-apps');
    await LA.showLiveAppsActions();
}

// Function to show liveApps Actions
export async function showLiveAppsSandboxWrapper() {
    const CCOM = require('./build/cloud-communications');
    await CCOM.showCloudInfo(true,true);
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

export async function showTCIWrapper() {
    const TCI = require('./build/tci');
    await TCI.showTCI();
}

export async function monitorTCIWrapper() {
    const TCI = require('./build/tci');
    await TCI.monitorTCI();
}

export async function exportTCIAppWrapper() {
    const TCI = require('./build/tci');
    await TCI.exportTCIApp();
}


export async function browseSpotfireLibraryWrapper() {
    const SPOTFIRE = require('./build/spotfire');
    await SPOTFIRE.browseSpotfire();
}

export async function listSpotfireLibraryWrapper() {
    const SPOTFIRE = require('./build/spotfire');
    await SPOTFIRE.listSpotfire();
}

export async function generateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.generateOauthToken();
}

export async function showOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.showOauthToken();
}

export async function revokeOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.revokeOauthToken();
}

export async function rotateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.rotateOauthToken();
}

export async function validateAndRotateOauthTokenWrapper() {
    const OAUTH = require('./build/oauth');
    await OAUTH.validateAndRotateOauthToken(false);
}

export async function showOrgFoldersWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.showOrgFolders();
}

export async function createOrgFolderWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.createOrgFolder();
}

export async function uploadFileWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.uploadFileToOrgFolder();
}

export async function downloadFileWrapper() {
    const CFILES = require('./build/cloud-files');
    await CFILES.downloadFileFromOrgFolder();
}

export async function showPropertiesWrapper() {
    const PROPM = require('./build/property-file-management');
    await PROPM.showPropertiesTable();
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

export async function showLiveAppsUsersWrapper() {
    const USERGROUPS = require('./build/user-groups');
    await USERGROUPS.showLiveAppsUsers(true, false);
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

export async function showMessagingClientsWrapper() {
    const MESSAGING = require('./build/messaging');
    await MESSAGING.showClients();
}

// Set log debug level from local property
setLogDebug(getProp('Use_Debug'));

// Function to upgrade the prop file to V2
if (getProp('Cloud_Properties_Version') == null) {
    upgradeToV2(false, getPropFileName());
}

const QUOTES = [
    "Everyone's a nerd inside. I don't care how cool you are. - Channing Tatum",
    "Never argue with the data. - Sheen",
    "Be nice to nerds. Chances are you'll end up working for one. - Bill Gates",
    "Geeks are people who love something so much that all the details matter. - Marissa Mayer",
    "Q. How does a computer get drunk? A. It takes screenshots....",
    "Q. Why did the PowerPoint Presentation cross the road? A. To get to the other slide....",
    "Q: Why did the computer show up at work late? A: It had a hard drive....",
    "Autocorrect has become my worst enema...."
]

