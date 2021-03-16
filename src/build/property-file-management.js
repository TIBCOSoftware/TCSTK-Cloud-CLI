import {isOAUTHLoginValid} from "./cloud-communications";

const CCOM = require('./cloud-communications');
const OAUTH = require('./oauth');
const LA = require('./live-apps');
const colors = require('colors');

// Get a list of all the organizations
async function getOrganizations() {
    return (await CCOM.callTCA(CCOM.clURI.account_info, false, {
        tenant: 'TSC',
        customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
    })).accountsInfo;
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
    const propFilesALL = [];
    const propFilesEU = [];
    const propFilesUS = [];
    const propFilesAU = [];
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
    let propFilesToGenerate = await askMultipleChoiceQuestionSearch('Which property file(s) would you like to generate ?', propOption);
    let propForMFile = '';
    if (propFilesToGenerate !== 'NONE') {
        let genOne = true;
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL EU') {
            genOne = false;
            for (let pFile of propFilesEU) {
                configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL US') {
            genOne = false;
            for (let pFile of propFilesUS) {
                configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL AU') {
            genOne = false;
            for (let pFile of propFilesAU) {
                configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION);
                propForMFile += pFile.PROP + ',';
            }
        }
        if (genOne) {
            let reg = '';
            for (let pFile of propFilesALL) {
                if (pFile.PROPERTY_FILE_NAME === propFilesToGenerate) {
                    reg = pFile.REGION;
                    propForMFile += pFile.PROP + ',';
                }
            }
            configurePropFile('./' + propFilesToGenerate, reg);
        }
        const tcliIprop = propForMFile.substr(0, propForMFile.length - 1);
        log(INFO, 'Property for tcli interaction: ' + tcliIprop);
        const doUpdate = await askMultipleChoiceQuestion('Do you want to add this to your manage-multiple-cloud-starters property file ?', ['YES', 'NO']);
        if (doUpdate === 'YES') {
            let fileName = await askQuestion('What is file name of multiple property file ? (press enter for: manage-multiple-cloud-starters.properties)');
            if (fileName === '') {
                fileName = 'manage-multiple-cloud-starters.properties';
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
function extractCloudInfo(org, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU) {
    let orgName = '' + org.accountDisplayName;
    let tOrgName = orgName.replace(/ /g, '_').replace(/'/g, '_').replace(/-/g, '_').replace(/_+/g, '_');
    let tOrgNameEU = {
        REGION: 'EU',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'EU_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'EU_' + tOrgName
    };
    let tOrgNameUS = {
        REGION: 'US',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'US_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'US_' + tOrgName
    };
    let tOrgNameAU = {
        REGION: 'AU',
        PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'AU_' + tOrgName + '.properties',
        PROP: 'tibco-cloud-' + projectName + 'AU_' + tOrgName
    };
    propOption.push(tOrgNameEU.PROPERTY_FILE_NAME, tOrgNameUS.PROPERTY_FILE_NAME, tOrgNameAU.PROPERTY_FILE_NAME);
    propFilesALL.push(tOrgNameEU, tOrgNameUS, tOrgNameAU);
    propFilesEU.push(tOrgNameEU);
    propFilesUS.push(tOrgNameUS);
    propFilesAU.push(tOrgNameAU);
}

// Config property helper
function configurePropFile(fileName, region) {
    log(INFO, '[' + region + ']: Generating: ' + fileName);
    let regToAdd = '';
    copyFile(getPropFileName(), fileName);
    addOrUpdateProperty(fileName, 'CloudLogin.clientID', "<PLEASE GET THE API access key(CLIENT ID) FROM: https://" + regToAdd + "account.cloud.tibco.com/manage/settings/oAuthTokens>");
    addOrUpdateProperty(fileName, 'CloudLogin.Region', region);
    log(WARNING, 'Remember to Update The Client ID in: ' + fileName);
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
            let laAppNameA = ['NONE'].concat(apps.map(v => v.name));
            let laAppD = await askMultipleChoiceQuestionSearch('For which LiveApp would you like to store the ID ?', laAppNameA);
            if (laAppD === 'NONE') {
                log(INFO, 'OK, I won\'t do anything :-)');
                doUpdate = false;
            } else {
                let laApp = apps.find(e => e.name === laAppD.trim());
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
                        let laAction = laActions.find(e => e.name === laActD);
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
            if (indexObj(localProps, pName) === 'USE-GLOBAL') {
                // location = GLOBALPropertyFileName;
                const propToUse = await askMultipleChoiceQuestion('Found USE-GLOBAL for property: ' + pName + '. Do you want to update the GLOBAL or the LOCAL property file ?', ['GLOBAL', 'LOCAL']);
                checkForGlobal = 'global' === propToUse.toLowerCase();
                // log(INFO, 'Found ' + colors.blue('USE-GLOBAL') + ' for property: ' + colors.blue(property) + ', so updating the GLOBAL Property file...')
            }
        }
        addOrUpdateProperty(pFile, pName, pValue, pComment, checkForGlobal);
    }
}

// Function comment out a property in a prop file
export function disableProperty(location, property, comment) {
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
            for (let line in dataLines) {
                if (line !== (dataLines.length - 1)) {
                    dataForFile += dataLines[line] + '\n';
                } else {
                    // The last one:
                    dataForFile += dataLines[line];
                }
            }
            if (propFound) {
                fs.writeFileSync(location, dataForFile, 'utf8');
                log(INFO, 'Disabled Property: ' + colors.blue(property) + ' (in:' + location + ')');
            } else {
                // append prop to the end.
                log(WARNING, 'Property NOT found: ' + colors.blue(property) + ' to disable... (in:' + location + ')');
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
    let props = {};
    if (doesFileExist(getPropFileName())) {
        const propLoad = require('properties-reader')(getPropFileName());
        props = propLoad.path();
        log(INFO, ' LOCAL Property File Name: ' + colors.blue(getPropFileName()));
        if (getGLOBALPropertyFileName() && getGLOBALPropertyFileName() !== '') {
            log(INFO, 'GLOBAL Property File Name: ' + colors.blue(getGLOBALPropertyFileName()));
        }
        let nvs = [];
        for (const [key, value] of Object.entries(props)) {
            if (key === 'CloudLogin') {
                for (const [key, value] of Object.entries(props.CloudLogin)) {
                    if (value === 'USE-GLOBAL') {
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
                            nvs = createTableValue('CloudLogin.' + key, value, nvs);
                        } else {
                            // This is to check if there is a manual token
                            if (value.length < 40) {
                                nvs = createTableValue('CloudLogin.' + key, value, nvs);
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
                if (value === 'USE-GLOBAL') {
                    nvs = createTableValue(key, getProp(key) + ' [FROM GLOBAL]', nvs);
                } else {
                    nvs = createTableValue(key, value, nvs);
                }
            }
        }
        // Print table
        pexTable(nvs, 'tibco-cloud-properties', getPEXConfig(), true);
    }
}


// TODO: Create a function that lists all client ID's


// Function to get the Client ID
export async function getClientID(headers) {
    log(INFO, 'Getting Client ID...');
    let clientID;
    clientID = (await CCOM.callTCA(CCOM.clURI.get_clientID, true, {
        method: 'POST',
        forceCLIENTID: true,
        tenant: 'TSC',
        customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login,
        headers
    })).ClientID;
    log(INFO, 'Client ID: ', clientID);
    return clientID;
}

export async function showOrganization() {
    log(INFO, 'Showing Organizations:');
    // List all the organizations
    const orgDetails = await displayOrganizations(true, true, 'For which organization would you like more details ?');
    if (orgDetails) {
        delete orgDetails.ownersInfo;
        delete orgDetails.regions;
        delete orgDetails.childAccountsInfo
        console.table(orgDetails);
    }
}

export async function changeOrganization() {
    log(INFO, 'Changing Organization...');
    // List all the organizations
    // Ask to which organization you would like to switch
    const orgDetails = await displayOrganizations(true, true, 'Which organization would you like to change to ?');
    if (orgDetails) {
        // Get the clientID for that organization
        const clientID = await getClientIDforOrg(orgDetails.accountId)
        // console.log('Client ID: ' + clientID);
        let doOauth = false;
        // If Oauth is being used: revoke the Key on the Old Organization
        if (isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
            doOauth = true;
            const oDetails = getOAUTHDetails();
            log(INFO, 'Revoking your OAUTH Token on previous environment(' + colors.blue(oDetails.Org) + '), Token Name: ' + colors.blue(oDetails.Token_Name))
            await OAUTH.revokeOauthToken(oDetails.Token_Name);
            addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Token', '');
        }
        // Update the Cloud property file with that new Client ID
        addOrUpdateProperty(getPropFileName(), 'CloudLogin.clientID', clientID);
        // Invalidate login to login to new environment
        CCOM.invalidateLogin();
        // Property file needs to be reloaded; forcing a refresh
        getProp('CloudLogin.clientID', true, true);
        // If Oauth is being used: Generate a Key on the new Org
        if (doOauth) {
            // Generate a new OAUTH Token
            await OAUTH.generateOauthToken(null, true, false);
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

function mapOrg(org) {
    org.name = org.accountDisplayName;
    if (org.ownersInfo) {
        let i = 1;
        for (const owner of org.ownersInfo) {
            org['Owner ' + i] = owner.firstName + ' ' + owner.lastName + ' (' + owner.email + ')';
            i++;
        }
    }
    if (org.regions) {
        org.regions = org.regions.map(reg => translateAWSRegion(reg));
        let i = 1;
        for (const reg of org.regions) {
            org['Region ' + i] = reg;
            i++;
        }
    } else {
        org.regions = ['NONE'];
    }
    return org;
}


// Options; doShow, doChoose, question
async function displayOrganizations(doShow, doChoose, question) {
    const organizations = await getOrganizations();
    const myOrgs = [];
    for (let org of organizations) {
        org.type = 'Main';
        org = mapOrg(org);
        myOrgs.push(org);
        const main = org.accountDisplayName;
        if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
            for (let child of org.childAccountsInfo) {
                child.type = 'Child of ' + main;
                child = mapOrg(child);
                myOrgs.push(child);
            }
        }
    }
    const tObject = createTable(myOrgs, CCOM.mappings.account_info, false);
    pexTable(tObject, 'organizations', getPEXConfig(), doShow);
    if (doChoose) {
        const orgA = await askMultipleChoiceQuestionSearch(question, ['NONE', ...iterateTable(tObject).map(v => v['Organization Name'])]);
        const selectedOrg = iterateTable(tObject).filter(v => v['Organization Name'] === orgA)[0];
        let orgDetails;
        if (selectedOrg) {
            orgDetails = getSpecificOrganization(organizations, selectedOrg['Organization Name']);
        }
        return orgDetails;
    }
}

function getSpecificOrganization(organizations, name) {
    for (let org of organizations) {
        if (name === org.accountDisplayName) {
            return org;
        }
        if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
            for (let child of org.childAccountsInfo) {
                if (name === child.accountDisplayName) {
                    return child;
                }
            }
        }
    }
}


// display current properties in a table
async function getClientIDforOrg(accountId) {
    log(INFO, 'Getting client ID for organization, with account ID: ' + colors.blue(accountId));
    const postRequest = 'account-id=' + accountId + '&opaque-for-tenant=TSC';
    const response = await CCOM.callTCA(CCOM.clURI.reauthorize, false, {
        method: 'POST',
        postRequest: postRequest,
        contentType: 'application/x-www-form-urlencoded',
        tenant: 'TSC',
        customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login,
        forceCLIENTID: true,
        returnResponse: true
    });

    const loginCookie = response.headers['set-cookie'];
    const rxd = /domain=(.*?);/g;
    const rxt = /tsc=(.*?);/g;
    const cookies = {"domain": rxd.exec(loginCookie)[1], "tsc": rxt.exec(loginCookie)[1]};

    const axios = require('axios').default;
    axios.defaults.validateStatus = () => {
        return true;
    };
    const options = {
        method: "POST",
        headers: {
            cookie: "tsc=" + cookies.tsc + "; domain=" + cookies.domain
        }
    }
    // Get the ClientID
    const clientIDResponse = (await axios('https://' + getCurrentRegion() + CCOM.clURI.get_clientID, options)).data;
    // Invalidate the login after using Re-Authorize
    CCOM.invalidateLogin();
    return clientIDResponse.ClientID;
}

/*

STEP 0: Get tennant info
GET https://eu.account.cloud.tibco.com/tsc-ws/v1/my-accounts/info?access-check-tenantid=TSC

STEP 1: Internal Logout:
POST https://eu.account.cloud.tibco.com/idm/v1/internal-logout
DATA: resumeURL=https%3A%2F%2Feu.account.cloud.tibco.com%2Fswitch-account%3Faction%3Dswitch%26resumeURL%3Dhttps%253A%252F%252Feu.account.cloud.tibco.com%252Fmanage%252Fhome%26ordinal%3D2%26baseTscDomain%3Dhttps%253A%252F%252Faccount.cloud.tibco.com%26tenantId%3DTSC%26tenantDomain%3Dhttps%253A%252F%252Feu.account.cloud.tibco.com

STEP 2: Switch Account:

https://eu.account.cloud.tibco.com/switch-account?action=switch&resumeURL=https%3A%2F%2Feu.account.cloud.tibco.com%2Fmanage%2Fhome&ordinal=2&baseTscDomain=https%3A%2F%2Faccount.cloud.tibco.com&tenantId=TSC&tenantDomain=https%3A%2F%2Feu.account.cloud.tibco.com


https://eu.account.cloud.tibco.com/switch-account?ordinal=2&tenantId=TSC&resumeURL=https%3A%2F%2Feu.account.cloud.tibco.com%2Fmanage%2Fhome&tenantDomain=https%3A%2F%2Feu.account.cloud.tibco.com&baseTscDomain=https%3A%2F%2Faccount.cloud.tibco.com&fromSource=recents&v=1.5.11


STEP 3: Reauthorize:
POST: https://eu.account.cloud.tibco.com/idm/v1/reauthorize
resumeURL=https%3A%2F%2Feu.account.cloud.tibco.com%2Fmanage%2Fhome&account-id=01DXJP1RMD9HKNYHDW34Z04M20&opaque-for-tenant=TSC

STEP 4: Get Client ID:

POST https://eu.account.cloud.tibco.com/idm/v1/clientID





 */
