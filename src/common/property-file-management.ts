import {
    col,
    copyFile,
    createTableValue,
    doesFileExist,
    getPEXConfig,
    isOauthUsed,
    pexTable,
    run
} from "./common-functions";
import {ORGFile, ORGInfo} from "../models/tcli-models";
import {askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion} from "./user-interaction";
import {getClientIDforOrg, getOrganizations} from "./organization-management";
import {DEBUG, ERROR, INFO, log, WARNING} from "./logging";
import {getOAUTHDetails, parseOAUTHToken, setOAUTHDetails} from "./oauth";
const LA = require('../tenants/live-apps');
const _ = require('lodash');

let globalProperties: any;
let propsGl:any;

// TODO: Move this to home folder (and add migration)
export const globalTCpropFolder = __dirname + '/../../../common/';
const GLOBALPropertyFileName = globalTCpropFolder + 'global-tibco-cloud.properties';
export function getGLOBALPropertyFileName() {
    return GLOBALPropertyFileName;
}

let LOCALPropertyFileName: string;
export function setPropFileName(propFileName: string) {
    LOCALPropertyFileName = propFileName;
    log(DEBUG, 'Using Property File: ' + LOCALPropertyFileName);
}
export function getPropFileName() {
    return LOCALPropertyFileName;
}

// Function to set a property (in memory)
export function setProperty(name: string, value: string) {
    //console.log('BEFORE propsGl: ' , propsGl);
    log(DEBUG, 'Setting Property) Name: ', name, ' Value: ', value);
    if (propsGl == null) {
        propsGl = {};
    }
    set(name, value, propsGl);
    //console.log('AFTER propsGl: ' , propsGl);
}

function set(path: string, value: string, obj: any) {
    let schema = obj;  // a moving reference to internal objects within obj
    const pList = path.split('.');
    const len = pList.length;
    for (let i = 0; i < len - 1; i++) {
        const elem = pList[i]!;
        if (!schema[elem]) schema[elem] = {}
        schema = schema[elem];
    }
    schema[pList[len - 1]!] = value;
}

export function getProp(propName:string, forceRefresh?:boolean, forceGlobalRefresh?:boolean): string {
    log(DEBUG, 'Getting Property: ' + propName, ' Forcing a Refresh: ', forceRefresh, 'Forcing a Global Refresh: ', forceGlobalRefresh);
    if (forceRefresh) {
        propsGl = null;
    }
    if (propsGl == null) {
        if (doesFileExist(LOCALPropertyFileName)) {
            const propLoad = require('properties-reader')(LOCALPropertyFileName);
            propsGl = propLoad.path();
        }
    }
    let re = null;
    if (propsGl != null) {
        try {
            re = _.get(propsGl, propName);
        } catch (e) {
            log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
            process.exit(1);
        }
        log(DEBUG, 'Returning Property: ', re);
        if (re === 'USE-GLOBAL') {
            re = getPropertyFromGlobal(propName, forceGlobalRefresh);
        }
    } else {
        log(DEBUG, 'Local Property file not set yet, trying to get it from global');
        // No local property file, try to get it from global
        re = getPropertyFromGlobal(propName, forceGlobalRefresh);
    }
    if (re && propName === 'CloudLogin.OAUTH_Token') {
        const key = 'Token:';
        if (re.indexOf(key) > 0) {
            const orgOInfo = re;
            re = re.substring(re.indexOf(key) + key.length);
            // Look for other token parts
            if (getOAUTHDetails() == null) {
                setOAUTHDetails(parseOAUTHToken(orgOInfo, false));
            }
        }
    }
    log(DEBUG, 'Returning Property [END]: ', re);
    return re;
}

function getPropertyFromGlobal(propName: string, forceGlobalRefresh?:boolean) {
    let re = null;
    if (doesFileExist(GLOBALPropertyFileName)) {
        if (globalProperties == null || forceGlobalRefresh) {
            globalProperties = require('properties-reader')(GLOBALPropertyFileName).path();
        }
        try {
            re = _.get(globalProperties, propName);
        } catch (e) {
            log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
            process.exit(1);
        }
        log(DEBUG, 'Got Property From Global: ', re);
    } else {
        log(DEBUG, 'No Global Configuration Set...');
        return false;
    }
    return re;
}

// Function to add or update property to a file, and possibly adds a comment if the property does not exists
export function addOrUpdateProperty(location: string, property: string, value: string | number, comment?: string, checkForGlobal?: boolean) {
    log(DEBUG, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ') Use Global: ', checkForGlobal);
    // Check for global is true by default
    let doCheckForGlobal = true;
    if (checkForGlobal != null) {
        doCheckForGlobal = checkForGlobal
    }
    // If we check for global and if the global file exist, see if we need to update the global file instead.
    if (doCheckForGlobal && location === LOCALPropertyFileName && doesFileExist(GLOBALPropertyFileName)) {
        // We are updating the local prop file
        const localProps = require('properties-reader')(LOCALPropertyFileName).path();
        if (_.get(localProps, property) === 'USE-GLOBAL') {
            location = GLOBALPropertyFileName;
            log(INFO, 'Found ' + col.blue('USE-GLOBAL') + ' for property: ' + col.blue(property) + ', so updating the GLOBAL Property file...')
        }
    }
    // Check if file exists
    const fs = require('fs');
    try {
        if (fs.existsSync(location)) {
            //file exists
            log(DEBUG, 'Property file found: ' + location);
            // Check if file contains property
            // const data = fs.readFileSync(location, 'utf8');
            const dataLines = fs.readFileSync(location, 'utf8').split('\n');
            let propFound = false;
            for (let lineNumber in dataLines) {
                if (!dataLines[lineNumber].startsWith('#')) {
                    // console.log('Line: ', dataLines[lineNumber]);
                    const reg = new RegExp(property + '\\s*=\\s*(.*)');
                    const regNl = new RegExp(property + '\\s*=');
                    if (dataLines[lineNumber].search(reg) > -1 || dataLines[lineNumber].search(regNl) > -1) {
                        // We found the property
                        log(DEBUG, `Property found: ${property} We are updating it to: ${value}`);
                        dataLines[lineNumber] = property + '=' + value;
                        propFound = true;
                    }

                }
            }
            let dataForFile = '';
            for (let lineN = 0; lineN < dataLines.length; lineN++) {
                if (lineN !== (dataLines.length - 1)) {
                    dataForFile += dataLines[lineN] + '\n';
                } else {
                    // The last one:
                    dataForFile += dataLines[lineN];
                }
            }
            if (propFound) {
                let doLog = true;
                if (property === 'CloudLogin.clientID') {
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW CLIENT ID]') + ' (in:' + location + ')');
                    doLog = false;
                }
                if (property === 'CloudLogin.OAUTH_Token') {
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW OAUTH TOKEN]') + ' (in:' + location + ')');
                    doLog = false;
                }
                if (doLog){
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow(value) + ' (in:' + location + ')');
                }
            } else {
                // append prop to the end.
                log(INFO, 'Property NOT found: ' + col.blue(property) + ' We are adding it and set it to: ' + col.yellow(value) + ' (in:' + location + ')');
                if (comment) {
                    dataForFile += '\n# ' + comment;
                }
                dataForFile += '\n' + property + '=' + value + '\n';
            }
            fs.writeFileSync(location, dataForFile, 'utf8');
        } else {
            log(ERROR, 'Property File does not exist: ' + location);
        }
    } catch (err) {
        console.error(err)
    }
}

// Function to check if a property exist and add a default value if not
export function prepProp(propName:string, propDefaultValue:string, comment: string){
    if (getProp(propName) == null) {
        log(INFO, 'No '+propName+' Property found; Adding '+propDefaultValue+' to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), propName, propDefaultValue,comment);
    }
}

// Function to generate other property files next to the existing ones
export async function generateCloudPropertyFiles() {
    log(INFO, 'Generating Cloud Property Files');
    const organizations = await getOrganizations();
    // console.log(JSON.stringify(organizations));
    let projectName = await askQuestion('What is the name of your Project ? (press enter to leave it blank)');
    if (projectName.trim() !== '') {
        projectName = projectName + '_';
    }
    const propFilesALL: ORGFile[] = [];
    const propFilesEU: ORGFile[] = [];
    const propFilesUS: ORGFile[] = [];
    const propFilesAU: ORGFile[] = [];
    const propOption = ['NONE', 'ALL', 'ALL EU', 'ALL US', 'ALL AU'];
    for (let org of organizations) {
        extractCloudInfo(org, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU);
        // Check for Children
        if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
            for (let childOrg of org.childAccountsInfo) {
                extractCloudInfo(childOrg, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU);
            }
        }
    }
    log(INFO, 'Files that can be created');
    console.table(propFilesALL);
    const propFilesToGenerate = await askMultipleChoiceQuestionSearch('Which property file(s) would you like to generate ?', propOption);
    let doOauth = false;
    if (isOauthUsed()) {
        const decision = await askMultipleChoiceQuestion('Do you want to generate OAUTH tokens for the new files ?', ['YES', 'NO']);
        if (decision.toLowerCase() === 'yes') {
            doOauth = true;
        }
    }

    let propForMFile = '';
    if (propFilesToGenerate !== 'NONE') {
        let genOne = true;
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL EU') {
            genOne = false;
            for (let pFile of propFilesEU) {
                await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL US') {
            genOne = false;
            for (let pFile of propFilesUS) {
                await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL AU') {
            genOne = false;
            for (let pFile of propFilesAU) {
                await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (genOne) {
            let reg = '';
            let accId = '';
            for (let pFile of propFilesALL) {
                if (pFile.PROPERTY_FILE_NAME === propFilesToGenerate) {
                    reg = pFile.REGION;
                    propForMFile += pFile.PROP + ',';
                    accId = pFile.ACCOUNT_ID;
                }
            }
            await configurePropFile('./' + propFilesToGenerate, reg, accId, doOauth);
        }
        let tcliIprop = propForMFile.substr(0, propForMFile.length - 1);
        log(INFO, 'Property for tcli interaction: ' + tcliIprop);
        const doUpdate = await askMultipleChoiceQuestion('Do you want to add this to your manage-multiple-cloud-starters property file ?', ['YES', 'NO']);
        if (doUpdate === 'YES') {
            let fileName = await askQuestion('What is file name of multiple property file ? (press enter for: manage-multiple-cloud-starters.properties)');
            if (fileName === '') {
                fileName = 'manage-multiple-cloud-starters.properties';
            }
            const currVal = require('properties-reader')(fileName).path().Multiple_Interaction_Property_Files;
            if (currVal) {
                tcliIprop = currVal + ',' + tcliIprop;
            }
            addOrUpdateProperty(fileName, 'Multiple_Interaction_Property_Files', tcliIprop);
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Extract Helper
function extractCloudInfo(org: ORGInfo, projectName: string, propOption: string[], propFilesALL: ORGFile[], propFilesEU: ORGFile[], propFilesUS: ORGFile[], propFilesAU: ORGFile[]) {
    const orgName = '' + org.accountDisplayName;
    const accId = org.accountId as string;
    let tOrgName = orgName.replace(/ /g, '_').replace(/'/g, '_').replace(/-/g, '_').replace(/_+/g, '_');
    let tOrgNameEU: ORGFile = {
        REGION: 'EU',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'EU_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'EU_' + tOrgName,
        ACCOUNT_ID: accId
    };
    let tOrgNameUS: ORGFile = {
        REGION: 'US',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'US_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'US_' + tOrgName,
        ACCOUNT_ID: accId
    };
    let tOrgNameAU: ORGFile = {
        REGION: 'AU',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'AU_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'AU_' + tOrgName,
        ACCOUNT_ID: accId
    };
    propOption.push(tOrgNameEU.PROPERTY_FILE_NAME, tOrgNameUS.PROPERTY_FILE_NAME, tOrgNameAU.PROPERTY_FILE_NAME);
    propFilesALL.push(tOrgNameEU, tOrgNameUS, tOrgNameAU);
    propFilesEU.push(tOrgNameEU);
    propFilesUS.push(tOrgNameUS);
    propFilesAU.push(tOrgNameAU);
}

// Config property helper
async function configurePropFile(fileName: string, region: string, accountId: string, doOauth: boolean) {
    log(INFO, '[' + region + ']: Generating: ' + fileName);
    // let regToAdd = '';
    copyFile(getPropFileName(), fileName);
    const ClientID = await getClientIDforOrg(accountId);
    addOrUpdateProperty(fileName, 'CloudLogin.clientID', ClientID);
    addOrUpdateProperty(fileName, 'CloudLogin.Region', region);
    // Possibly generate an OAUTH Token, on the new file
    if (doOauth) {
        // Remove the OAUTH Token so it does not use that as the authentication
        addOrUpdateProperty(fileName, 'CloudLogin.OAUTH_Token', '');
        log(INFO, 'Generating OAUTH Token for: ' + fileName);
        run('tcli -p "' + fileName + '" generate-oauth-token -a YES', false);
    }

}

const SPECIAL = 'SPECIAL';

// A Function to update a property (possibly in a custom file)
export async function updateProperty() {
    let doUpdate = true;
    log(INFO, 'Update a property file');
    // Ask in which file, or use default
    let pFile = await askQuestion('In which file would you like to update a property ? (use enter or default for the current property file)');
    if (pFile.toLowerCase() === 'default' || pFile === '') {
        pFile = getPropFileName();
    }
    log(INFO, '--> Property File: ', pFile);
    // Ask propname
    let pName = await askQuestion('Which property would you like to update or add ?');
    if (pName === '') {
        log(ERROR, 'You have to provide a property name');
        process.exit(1);
        doUpdate = false;
    }
    // Ask prop comments
    let pComment = await askQuestion('What comment would you like to add ? (use enter on none to not provide a comment)');
    if (pComment === 'none') {
        pComment = '';
    }
    // Ask prop value
    let pValue = await askQuestion('What value would you like to add ? (use ' + SPECIAL + ' to select from a list)');
    if (pValue.toUpperCase() === SPECIAL) {
        // TODO: Add Cloud Starter Link, FlogoAppId,
        const vTChoices = ['SandboxID', 'LiveApps_AppID', 'LiveApps_ActionID'];
        const vType = await askMultipleChoiceQuestion('What type of answer would you like to add to the property ?', vTChoices);
        if (vType === 'SandboxID') {
            pValue = await LA.getProductionSandbox();
        }
        if (vType === 'LiveApps_AppID' || vType === 'LiveApps_ActionID') {
            const apps = await LA.showLiveApps(true, false);
            let laAppNameA = ['NONE'].concat(apps.map((v: any) => v.name));
            let laAppD = await askMultipleChoiceQuestionSearch('For which LiveApp would you like to store the ID ?', laAppNameA);
            if (laAppD === 'NONE') {
                log(INFO, 'OK, I won\'t do anything :-)');
                doUpdate = false;
            } else {
                let laApp = apps.find((e: any) => e.name === laAppD.trim());
                if (laApp == null) {
                    log(ERROR, 'App not found: ' + laAppD);
                    doUpdate = false;
                }
                if (doUpdate && vType === 'LiveApps_AppID') {
                    pValue = laApp.applicationId
                }
                if (doUpdate && vType === 'LiveApps_ActionID') {
                    let laActions = [{name: 'NONE'}].concat(LA.stripLiveAppsActions(laApp));
                    // console.log(laActions);
                    log(INFO, 'Live Apps Actions: ');
                    console.table(laActions);
                    let laActD = await askMultipleChoiceQuestionSearch('For which ACTION would you like to store an Action ID ?', laActions.map(v => v.name));
                    if (laActD === 'NONE') {
                        log(INFO, 'OK, I won\'t do anything :-)');
                        doUpdate = false;
                    } else {
                        let laAction: any = laActions.find(e => e.name === laActD);
                        if (laAction) {
                            pValue = laAction.id
                        } else {
                            log(ERROR, 'LA Action not found: ' + laActD);
                            doUpdate = false;
                        }
                    }
                }
            }
        }
    }
    if (doUpdate) {
        let checkForGlobal = false;
        if (doesFileExist(getGLOBALPropertyFileName())) {
            // We are updating the local prop file
            const localProps = require('properties-reader')(getPropFileName()).path();
            if (_.get(localProps, pName) === 'USE-GLOBAL') {
                // location = GLOBALPropertyFileName;
                const propToUse = await askMultipleChoiceQuestion('Found USE-GLOBAL for property: ' + pName + '. Do you want to update the GLOBAL or the LOCAL property file ?', ['GLOBAL', 'LOCAL']);
                checkForGlobal = 'global' === propToUse.toLowerCase();
                // log(INFO, 'Found ' + col.blue('USE-GLOBAL') + ' for property: ' + col.blue(property) + ', so updating the GLOBAL Property file...')
            }
        }
        addOrUpdateProperty(pFile, pName, pValue, pComment, checkForGlobal);
    }
}

// Function comment out a property in a prop file
export function disableProperty(location: string, property: string, comment: string) {
    log(DEBUG, 'Disabling: ' + property + ' in:' + location);
    // Check if file exists
    const fs = require('fs');
    try {
        if (fs.existsSync(location)) {
            //file exists
            log(DEBUG, 'Property file found: ' + location);
            // Check if file contains property
            // const data = fs.readFileSync(location, 'utf8');
            const dataLines = fs.readFileSync(location, 'utf8').split('\n');
            let propFound = false;
            for (let lineNumber in dataLines) {
                if (dataLines[lineNumber].startsWith(property)) {
                    propFound = true;
                    log(DEBUG, `Property found: ${property} We are disabeling it...`);
                    if (comment && comment !== '') {
                        dataLines[lineNumber] = '#' + comment + '\n#' + dataLines[lineNumber];
                    } else {
                        dataLines[lineNumber] = '#' + dataLines[lineNumber];
                    }
                }
            }
            let dataForFile = '';
            for (let lineN = 0; dataLines < dataLines.length; lineN++) {
                if (lineN !== (dataLines.length - 1)) {
                    dataForFile += dataLines[lineN] + '\n';
                } else {
                    // The last one:
                    dataForFile += dataLines[lineN];
                }
            }
            if (propFound) {
                fs.writeFileSync(location, dataForFile, 'utf8');
                log(INFO, 'Disabled Property: ' + col.blue(property) + ' (in:' + location + ')');
            } else {
                // append prop to the end.
                log(WARNING, 'Property NOT found: ' + col.blue(property) + ' to disable... (in:' + location + ')');
            }
        } else {
            log(ERROR, 'Property File does not exist: ' + location);
        }
    } catch (err) {
        console.error(err)
    }
}

// display current properties in a table
export function showPropertiesTable() {
    // Get the properties object
    let props: any = {};
    if (doesFileExist(getPropFileName())) {
        const propLoad = require('properties-reader')(getPropFileName());
        props = propLoad.path();
        log(INFO, ' LOCAL Property File Name: ' + col.blue(getPropFileName()));
        if (getGLOBALPropertyFileName() && getGLOBALPropertyFileName() !== '') {
            log(INFO, 'GLOBAL Property File Name: ' + col.blue(getGLOBALPropertyFileName()));
        }
        let nvs = [];
        for (const [key, valueP] of Object.entries(props)) {
            if (key === 'CloudLogin') {
                for (const [key, valueL] of Object.entries(props.CloudLogin)) {
                    const myValueL: any = valueL;
                    if (myValueL === 'USE-GLOBAL') {
                        let displayValue = getProp('CloudLogin.' + key);
                        if (key === 'pass') {
                            if (displayValue !== '') {
                                var passT = displayValue;
                                displayValue = 'PLAIN TEXT';
                                if (passT.startsWith('#') || passT.startsWith('@')) {
                                    displayValue = 'OBFUSCATED';
                                }
                            }
                        }
                        nvs = createTableValue('CloudLogin.' + key, displayValue + ' [FROM GLOBAL]', nvs);
                    } else {
                        if (key !== 'OAUTH_Token') {
                            nvs = createTableValue('CloudLogin.' + key, myValueL, nvs);
                        } else {
                            // This is to check if there is a manual token
                            if (myValueL.length < 40) {
                                nvs = createTableValue('CloudLogin.' + key, myValueL, nvs);
                            }
                        }
                    }
                    // Force OAUTH Refresh; isOauthUsed()
                    if (key === 'OAUTH_Token' && isOauthUsed() && getOAUTHDetails() != null) {
                        // console.log(getOAUTHDetails())
                        for (const [key, value] of Object.entries(getOAUTHDetails())) {
                            if (key !== 'Expiry_Date') {
                                nvs = createTableValue('OAUTH ' + key, value, nvs);
                            }
                        }
                        // Do not add the
                    }
                }
            } else {
                if (valueP === 'USE-GLOBAL') {
                    nvs = createTableValue(key, getProp(key) + ' [FROM GLOBAL]', nvs);
                } else {
                    nvs = createTableValue(key, valueP, nvs);
                }
            }
        }
        // Print table
        pexTable(nvs, 'tibco-cloud-properties', getPEXConfig(), true);
    }
}
