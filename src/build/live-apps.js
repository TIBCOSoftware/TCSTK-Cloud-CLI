const CCOM = require('./cloud-communications');
//TODO Possibly circular dependency ???
const VAL = require('./validation');

let globalProductionSandbox = null;

export async function getProductionSandbox() {
    if (!globalProductionSandbox) {
        const claims = await CCOM.callTCA(CCOM.clURI.claims);
        for (let sb of claims.sandboxes) {
            if (sb.type === 'Production') {
                globalProductionSandbox = sb.id;
            }
        }
        log(INFO, 'SANDBOX ID: ' + globalProductionSandbox);
    }
    return globalProductionSandbox;
}

// Shared state folder (picked up from configuration if exists)
let CASE_FOLDER = './Cases/';

function checkCaseFolder() {
    if (getProp('Case_Folder') != null) {
        CASE_FOLDER = getProp('Case_Folder');
    } else {
        addOrUpdateProperty(getPropFileName(), 'Case_Folder', CASE_FOLDER);
    }
}

// Get a LiveApps Case by Reference
export async function getLaCaseByReference(caseRef) {
    const caseData = await CCOM.callTCA(CCOM.clURI.la_cases + '/' + caseRef + '?$sandbox=' + await getProductionSandbox(), false, {handleErrorOutside: true});
    if (!caseData) {
        log(ERROR, 'Error Retrieving Case Data for ref: ', caseRef);
    }
    return caseData;
}

// Function to show LiveApps cases
export async function showLiveApps(doShowTable, doCountCases) {
    //TODO: Call can be optimized by only requesting the basics
    const caseTypes = await CCOM.callTCA(CCOM.clURI.types + '?$sandbox=' + await getProductionSandbox() + '&$top=1000');
    log(DEBUG, 'Case Types: ', caseTypes)
    // TODO: (maybe) get case owner
    const cases = {};
    for (const curCase in caseTypes) {
        const caseTemp = {};
        const appN = parseInt(curCase) + 1;
        //log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
        caseTemp['CASE NAME'] = caseTypes[curCase].name;
        caseTemp['APPLICATION ID'] = caseTypes[curCase].applicationId;
        caseTemp['VERSION'] = caseTypes[curCase].applicationVersion;
        caseTemp['IS CASE'] = caseTypes[curCase].isCase;
        if (doCountCases) {
            logLine("Counting Cases: (" + appN + '/' + caseTypes.length + ')...');
            caseTemp['NUMBER OF CASES'] = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + caseTypes[curCase].applicationId + '&$count=true');
        }
        cases[appN] = caseTemp;
    }
    console.log('\n');
    pexTable(cases, 'live-apps', getPEXConfig(), doShowTable);
    return caseTypes;
}

const storeOptions = {spaces: 2, EOL: '\r\n'};

export async function exportLiveAppsCaseType() {
    checkCaseFolder();
    const cTypes = showLiveApps(true, false);
    let cTypeArray = [];
    for (const curCase in cTypes) {
        cTypeArray.push(cTypes[curCase].name);
    }
    let typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray);
    let fName = await askQuestion('What file name would you like to export to ? (press enter for default)');
    for (const curCase in cTypes) {
        if (typeForExport === cTypes[curCase].name) {

            mkdirIfNotExist(CASE_FOLDER);
            let fileName = CASE_FOLDER + fName;
            if (fName === '') {
                fileName = CASE_FOLDER + cTypes[curCase].name + '.' + cTypes[curCase].applicationVersion + '.type.json';
            }
            require('jsonfile').writeFileSync(fileName, cTypes[curCase], storeOptions);
            log(INFO, 'Case Type File Stored: ' + fileName)
        }
    }
}

const exportCaseStepSize = 30;

// Function to export case data
export async function exportLiveAppsData() {
    checkCaseFolder();
    const cTypes = showLiveApps(true, true);
    let cTypeArray = [];
    for (const curCase in cTypes) {
        cTypeArray.push(cTypes[curCase].name);
    }
    let typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray);
    let fName = await askQuestion('What Folder like to export to ? (press enter for default, date get\'s added...)');
    // let oneFileStore = await askMultipleChoiceQuestion('Do you also want to store all contents in one file ? (this is used for import)', ['YES', 'NO']);
    let allCases = [];
    for (let curCase in cTypeArray) {
        if (cTypeArray[curCase] === typeForExport) {
            // count cases
            const numberOfCasesForExport = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + '&$count=true');
            log(INFO, 'Number of cases for export: ' + numberOfCasesForExport);
            const typeIdString = ' and typeId eq 1';
            // get cases in batch sizes
            for (let i = 0; i <= numberOfCasesForExport; i = i + exportCaseStepSize) {
                let exportBatch = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i);
                // console.log('Export Batch', exportBatch);
                logLine('Exporting Case: (' + i + '/' + numberOfCasesForExport + ')...');
                allCases = allCases.concat(exportBatch);
            }
            log(INFO, 'Number of Exported Cases: ' + allCases.length);
            // Write Cases
            let cfName = CASE_FOLDER + fName;
            if (fName === '') {
                //Add date to the end of this
                const today = new Date();
                const dayAddition = '(' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '_h' + today.getHours() + 'm' + today.getMinutes() + ')';
                cfName = CASE_FOLDER + 'Export-' + typeForExport + dayAddition + '/';
            }
            mkdirIfNotExist(cfName);
            mkdirIfNotExist(cfName + 'CONTENT/');
            let AllCaseArray = [];
            for (let exCase of allCases) {
                let contextFileName = cfName + typeForExport + '-' + exCase.caseReference + '.json';
                let writeContentSeparate = false;
                let contentObject = {};
                //let contextFileName = CASE_FOLDER + sSEntry.name + '.json';
                let contentFileName = cfName + 'CONTENT/' + typeForExport + '-' + exCase.caseReference + '.CONTENT.json';
                if (exCase.casedata != null) {
                    try {
                        // Get the details for every shared state entry
                        contentObject = JSON.parse(' {  "' + cTypes[curCase].name + '" : ' + exCase.casedata + '}');
                        AllCaseArray.push(contentObject);
                        exCase.casedata = {'FILESTORE': contentFileName};
                        // And store them in a file / folder
                        require('jsonfile').writeFileSync(contentFileName, contentObject, storeOptions);
                        writeContentSeparate = true;
                        //log(INFO, '[STORED CONTENT]: ' + contentFileName);
                    } catch (e) {
                        log(ERROR, 'Parse Error on: ' + exCase.name + 'Writing directly...');
                    }
                    require('jsonfile').writeFileSync(contextFileName, exCase, storeOptions);
                    // log(INFO, 'Exported Case To: ' + cfName);
                    log(INFO, '[STORED CONTEXT]: ' + contextFileName);
                    if (writeContentSeparate) {
                        log(INFO, '[STORED CONTENT]: ' + contentFileName);
                    } else {
                        log(ERROR, 'Stored all in: ' + contextFileName);
                    }
                }
            }
            //if(oneFileStore == 'YES'){
            let AllCaseFileName = cfName + 'CONTENT/' + typeForExport + '-ALL.CONTENT.json';
            //TODO: Put the app name around the AllCaseArray

            require('jsonfile').writeFileSync(AllCaseFileName, AllCaseArray, storeOptions);
            log(INFO, '[STORED ALL CONTENT]: ' + AllCaseFileName);
            //}
        }
    }
}

//DONE: Add Export Feature to one file. (Just the data and to use for import)
export async function createLAImportFile() {
    checkCaseFolder();
    log(INFO, ' -- Generate Live Aps Import Configuration file --- ');
    //TODO: Create a generator for the input feature. (based on the template and ask to add steps)
    //TODO: Make sure you are not overwriting a current import file.
    // Check if default file exists:
    const importFolder = process.cwd() + '/' + CASE_FOLDER + 'Import/';
    let impConfFileName = 'import-live-apps-data-configuration.json';
    let nameAnsw = await askQuestion('Please specify a name for the Live Apps Import Config file (\x1b[34mDefault: import-live-apps-data-configuration\x1b[0m) ?');
    if (nameAnsw != null && nameAnsw !== '') {
        impConfFileName = nameAnsw + '.properties';
    }
    const targetFile = importFolder + impConfFileName;
    let doWrite = true;
    if (doesFileExist(targetFile)) {
        const doOverWrite = await askMultipleChoiceQuestion('The property file: \x1b[34m' + impConfFileName + '\x1b[0m already exists, do you want to Overwrite it ?', ['YES', 'NO']);
        if (doOverWrite === 'NO') {
            doWrite = false;
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    }
    if (doWrite) {
        mkdirIfNotExist(CASE_FOLDER);
        mkdirIfNotExist(importFolder);
        log(INFO, 'Creating new Live Aps Import Configuration file: ' + impConfFileName);
        copyFile(global.PROJECT_ROOT + 'templates/import-live-apps-data-configuration.json', targetFile);
        // log(INFO, 'Now configure the multiple propety file and then run "\x1b[34mtcli -m\033[0m" (for default propety name) or "\x1b[34mtcli -m <propfile name>\033[0m" to execute...');
    }
}

// Function to Import LiveApps Case Data based on Config File
export async function importLiveAppsData() {
    checkCaseFolder();
    log(INFO, ' -- Gathering Import Configuration --- ');
    const importFolder = process.cwd() + '/' + CASE_FOLDER + 'Import/';
    let importFile = importFolder + 'import-live-apps-data-configuration.json';
    //TODO: Choose import file (if there are more) --> Starts with import && ends with json

    // If default import file does not exist, ask for a custom one.
    if (!doesFileExist(importFile)) {
        importFile = process.cwd() + '/' + await askQuestion('Default Import file (' + importFile + ') not found, which import configuration file would you like to use ?');
    }
    const impConf = require('jsonfile').readFileSync(importFile);
    const cSteps = impConf['import-steps'];
    log(INFO, 'Configured Steps: ', cSteps);

    //TODO: check if data of all steps has the same size
    //TODO: Check if there is a creator (how to map the caseID)
    //TODO: Check if the first step is a creator

    //Loop over all the data
    let numberOfImports = 1;
    let dataForImport = [];
    if (impConf[impConf['import-steps'][0]].data) {
        if (impConf[impConf[impConf['import-steps'][0]].data].FILESTORE != null) {
            dataForImport = require('jsonfile').readFileSync(importFolder + impConf[impConf[impConf['import-steps'][0]].data].FILESTORE)
        } else {
            dataForImport = impConf[impConf['import-steps'][0]].data;
        }
        numberOfImports = dataForImport.length;
    }
    const sBid = await getProductionSandbox();
    let importAppName = '';
    let importAppId = '';
    let numberOfImportSteps = 0;
    if (impConf['la-application-name'] != null) {
        importAppName = impConf['la-application-name'];
        log(INFO, 'Getting App Id for LA Application ' + importAppName);
        const apps = await showLiveApps(false, false);
        //console.log(apps);
        let appData = {};
        for (let app of apps) {
            if (app.name === importAppName) {
                importAppId = app.applicationId;
                appData = app;
            }
        }
        numberOfImportSteps = impConf['import-steps'].length;
        for (let step of impConf['import-steps']) {
            const stepConf = impConf[step];
            //console.log(stepConf)
            impConf[step].applicationId = importAppId;
            if (stepConf.type === 'CREATOR') {
                // Look in the creators
                if (appData.creators != null) {
                    for (let creator of appData.creators) {
                        if (creator.name === stepConf.name) {
                            impConf[step]['process-id'] = creator.id;
                        }
                    }
                }
            }
            if (stepConf.type === 'ACTION') {
                // Look in the creators
                if (appData.actions != null) {
                    for (let action of appData.actions) {
                        if (action.name === stepConf.name) {
                            impConf[step]['process-id'] = action.id;
                        }
                    }
                }
            }
        }
    }
    // console.log(impConf);
    CCOM.showCloudInfo();
    log(INFO, '\x1b[34m                   -- IMPORT SUMMARY --- ');
    log(INFO, '\x1b[34m -       Number of Imports: ' + numberOfImports);
    log(INFO, '\x1b[34m -              Sandbox ID: ' + sBid);
    log(INFO, '\x1b[34m -         Import App Name: ' + importAppName);
    log(INFO, '\x1b[34m -           Import App ID: ' + importAppId);
    log(INFO, '\x1b[34m -  Number of Import Steps: ' + numberOfImportSteps);
    let stepN = 1;
    //Show Summary Table (Step Number, Step Name, SandboxID, Application Name, Application ID, Process Type, Process Name, Process ID, Sleep Time)

    for (let step of impConf['import-steps']) {
        const stepConf = impConf[step];
        log(INFO, '\x1b[33m -                    STEP: ' + stepN);
        log(INFO, '\x1b[34m -                    NAME: ' + stepConf.name);
        log(INFO, '\x1b[34m -                    TYPE: ' + stepConf.type);
        if (stepConf.type.toString().toLowerCase() !== 'validate') {
            log(INFO, '\x1b[34m -              PROCESS ID: ' + stepConf['process-id']);
        } else {
            log(INFO, '\x1b[34m -       VALIDATION ACTION: ' + stepConf['validation-action']);
            if (stepConf['validation-action'].toLowerCase() === 'case_in_state') {
                log(INFO, '\x1b[34m -          EXPECTED STATE: ' + stepConf['expected-state']);
            }
        }
        if (stepConf['sleep']) {
            stepConf['sleep-min'] = +(stepConf['sleep'] / 60000).toFixed(2);
            log(INFO, '\x1b[34m -              SLEEP TIME: ' + stepConf['sleep'] + 'ms (' + stepConf['sleep-min'] + ' Minutes)');
        }
        stepN++;
    }

    log(INFO, '\x1b[0m');
    const doImport = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO START THE IMPORT ?', ['YES', 'NO']);
    if (doImport.toLowerCase() === 'yes') {
        for (let i = 0; i < numberOfImports; i++) {
            //Loop over all cases
            let caseRef = '';
            for (let impStep of impConf['import-steps']) {
                const stepConf = impConf[impStep];
                // TODO: Add option to provide process name and type and then look up the application ID an process ID
                log(INFO, '           Step: ' + impStep);
                //Option to point to file for importing data
                let dataForImport = [];
                let dataToImport;
                if (stepConf.type.toString().toLowerCase() !== 'validate') {
                    log(INFO, '     Process ID: ' + stepConf['process-id']);
                    log(INFO, ' Application ID: ' + stepConf.applicationId);
                    //TODO: put this in seperate function
                    if (impConf[stepConf.data].FILESTORE != null) {
                        dataForImport = require('jsonfile').readFileSync(importFolder + impConf[stepConf.data].FILESTORE)
                    } else {
                        dataForImport = impConf[stepConf.data];
                    }
                    dataToImport = dataForImport[i];
                }
                if (stepConf.type.toString().toLowerCase() === 'creator') {
                    log(INFO, 'Creating LiveApps Case (' + i + ')');
                    let postRequest = {
                        id: stepConf['process-id'],
                        sandboxId: sBid,
                        applicationId: stepConf.applicationId,
                        data: JSON.stringify(dataToImport)
                    }
                    const response = await CCOM.callTCA(CCOM.clURI.la_process, false, {
                        method: 'POST',
                        postRequest: postRequest
                    });
                    log(INFO, 'Response: ', response);
                    //Get Case ID
                    caseRef = response.caseReference;
                }
                if (stepConf.type.toString().toLowerCase() === 'action') {
                    if (stepConf.caseref) { // TODO: Duplicate code, move to one function
                        if (Number.isInteger(stepConf.caseref)) {
                            caseRef = stepConf.caseref;
                        } else {
                            if (stepConf.caseref.toString().toLowerCase() === 'from-creator') {
                                if (caseRef === '') {
                                    log(ERROR, 'Caseref to be configured from creator but no caseref is set...');
                                }
                            } else {
                                const _F = require('lodash');
                                caseRef = _F.get(dataToImport, stepConf.caseref);
                                log(INFO, 'Using CaseRef: ' + caseRef);
                                if (stepConf['delete-caseref'].toLowerCase() === 'true') {
                                    _F.unset(dataToImport, stepConf.caseref);
                                }
                            }
                        }
                    }
                    log(INFO, 'Actioning LiveApps Case (' + i + ') Ref ' + caseRef);
                    let postRequest = {
                        id: stepConf['process-id'],
                        sandboxId: sBid,
                        applicationId: stepConf.applicationId,
                        /*TODO: look at bug .replace is not a function */
                        data: JSON.stringify(dataToImport).replace('@@CASEREF@@', caseRef),
                        caseReference: caseRef
                    }
                    const response = await CCOM.callTCA(CCOM.clURI.la_process, true, {
                        method: 'POST',
                        postRequest: postRequest
                    });
                    // log(INFO, 'Response: ' , response);
                }
                if (stepConf.type.toString().toLowerCase() === 'validate') {
                    // TODO: Add this to config: "fail-on-validation-error": true,
                    if (stepConf.caseref) {
                        if (Number.isInteger(stepConf.caseref)) {
                            caseRef = stepConf.caseref;
                        } else {
                            if (stepConf.caseref.toString().toLowerCase() === 'from-creator') {
                                if (caseRef === '') {
                                    log(ERROR, 'Caseref to be configured from creator but no caseref is set...');
                                    process.exit(1);
                                }
                            } else {
                                const _F = require('lodash');
                                caseRef = _F.get(dataToImport, stepConf.caseref);
                                log(INFO, 'Using CaseRef for Validation: ' + caseRef);
                                if (stepConf['delete-caseref'].toLowerCase() === 'true') {
                                    _F.unset(dataToImport, stepConf.caseref);
                                }
                            }
                        }
                    } else {
                        log(ERROR, 'caseref not found on ', stepConf);
                        process.exit(1);
                    }
                    if (stepConf['validation-action']) {
                        const vAction = stepConf['validation-action'].toLowerCase().trim();
                        let actFound = false;
                        if (vAction === 'case_exist' || vAction === 'case_not_exist') {
                            await VAL.validateLACase(caseRef.toString(), vAction);
                            actFound = true;
                        }
                        if (vAction === 'case_in_state') {
                            if (stepConf['expected-state'] != null) {
                                await VAL.validateLACaseState(caseRef.toString(), stepConf['expected-state']);
                            } else {
                                log(ERROR, 'expected-state not found on ', stepConf);
                            }
                            actFound = true;
                        }
                        if (!actFound) {
                            log(ERROR, 'validation-action not recognized: |', vAction + '|');
                            process.exit(1);
                        }
                    } else {
                        log(ERROR, 'validation-action not found on ', stepConf);
                        process.exit(1);
                    }
                }
                if (stepConf.sleep && stepConf.sleep > 0) {
                    log(INFO, 'Sleeping for ' + stepConf.sleep + ' ms (' + stepConf['sleep-min'] + ' Minutes)...');
                    await sleep(stepConf.sleep);
                }
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to
export function csvToJsonLiveAppsData() {
// TODO: Implement
}

// Function to
export function jsonToCsvLiveAppsData() {
// TODO: Implement
}
