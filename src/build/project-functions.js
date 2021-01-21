// Package Definitions
const CCOM = require('./cloud-communications');
//TODO: Remove these values
let cloudURL = getProp('Cloud_URL');
let cloudHost = getProp('cloudHost');

// Check if a global config exi sts and if it is required
//TODO: Manage global config in common functions
if (getGlobalConfig()) {
    const propsG = getGlobalConfig();
    if (cloudURL === 'USE-GLOBAL') {
        cloudURL = propsG.Cloud_URL;
    }
    if (cloudHost === 'USE-GLOBAL') {
        cloudHost = propsG.cloudHost;
    }
}
const colors = require('colors');


cleanDist = function () {
    return deleteFolder('./dist/' + getProp('App_Name'));
}

generateCloudDescriptor = function () {
    // Add Descriptor
    let ADD_DESCRIPTOR = 'YES';
    if (getProp('Add_Descriptor') != null) {
        ADD_DESCRIPTOR = getProp('Add_Descriptor');
    } else {
        log(INFO, 'No Add_Descriptor Property found; Adding Add_Descriptor to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Add_Descriptor', 'YES');
    }
    // Add Descriptor
    let ADD_DESCRIPTOR_TIMESTAMP = 'YES';
    if (getProp('Add_Descriptor_Timestamp') != null) {
        ADD_DESCRIPTOR_TIMESTAMP = getProp('Add_Descriptor_Timestamp');
    } else {
        log(INFO, 'No Add_Descriptor_Timestamp Property found; Adding Add_Descriptor_Timestamp to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Add_Descriptor_Timestamp', 'YES');
    }
    // Add Descriptor
    let DESCRIPTOR_FILE = './src/assets/cloudstarter.json';
    if (getProp('Descriptor_File') != null) {
        DESCRIPTOR_FILE = getProp('Descriptor_File');
    } else {
        log(INFO, 'No Descriptor_File Property found; Adding Descriptor_File to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Descriptor_File', './src/assets/cloudstarter.json');
    }
    log(INFO, 'Adding descriptor file: ' + DESCRIPTOR_FILE + ' Adding Timestamp: ' + ADD_DESCRIPTOR_TIMESTAMP);
    // Get the version from the JSON File
    const workdir = process.cwd();
    const path = require('path');
    const packageJson = workdir + path.sep + 'package.json';
    if (doesFileExist(packageJson)) {
        let now = "";
        let buildOn = "";
        if (ADD_DESCRIPTOR_TIMESTAMP === 'YES') {
            now = (new Date()).getTime();
            buildOn = new Date();
        }
        const pJsonObj = require('jsonfile').readFileSync(packageJson);
        let name = "";
        if (pJsonObj.name) {
            name = pJsonObj.name;
        }
        let version = "";
        if (pJsonObj.version) {
            version = pJsonObj.version;
        }
        let description = "";
        if (pJsonObj.description) {
            description = pJsonObj.description;
        }
        let csObject = {
            cloudstarter: {
                name: name,
                version: version + now,
                build_date: buildOn,
                description: description
            }
        }
        log(INFO, 'Adding Cloud Starter Descriptor: ', csObject);
        const storeOptions = {spaces: 2, EOL: '\r\n'};
        require('jsonfile').writeFileSync(DESCRIPTOR_FILE, csObject, storeOptions);
    } else {
        log(ERROR, packageJson + ' File not found...');
    }
    // Possibly add timestamp
    //TODO: Possibly use a descriptor template
    //TODO: Possibly add dependencies into the file
}

// Function to display the location on the deployed cloudstarter and possilby the descriptor.
showAppLinkInfo = function () {
    //TODO: Get from global file
    let cloudURLdisp = getProp('Cloud_URL');
    log('INFO', "LOCATION: " + cloudURLdisp + "webresource/apps/" + getProp('App_Name') + "/index.html");
    if (getProp('Add_Descriptor') === 'YES') {
        log('INFO', "DESCRIPTOR LOCATION: " + cloudURLdisp + "webresource/apps/" + getProp('App_Name') + getProp('Descriptor_File').replace('./src', ''));
    }
}

// Build the zip for deployment
buildCloudStarterZip = function (cloudStarter) {
    // Check for Build Command
    let BUILD_COMMAND = 'HASHROUTING';
    if (getProp('BUILD_COMMAND') != null) {
        BUILD_COMMAND = getProp('BUILD_COMMAND');
    } else {
        log(INFO, 'No BUILD_COMMAND Property found; Adding BUILD_COMMAND to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'BUILD_COMMAND', 'HASHROUTING', 'Build command to use: Options: HASHROUTING | NON-HASHROUTING | <a custom command (example: ng build --prod )>');
    }
    const csURL = '/webresource/apps/' + cloudStarter + '/';
    deleteFile('./dist/' + cloudStarter + '.zip');
    //Add the cloudstarter.json file
    if (getProp('Add_Descriptor') === 'YES') {
        generateCloudDescriptor();
    }
    //hashrouting build configurable
    let buildCommand = BUILD_COMMAND;
    let bType = 'CUSTOM';
    if (BUILD_COMMAND === 'HASHROUTING') {
        bType = 'HASHROUTING';
        buildCommand = 'ng build --prod --base-href ' + csURL + 'index.html --deploy-url ' + csURL;
    }
    if (BUILD_COMMAND === 'NON-HASHROUTING') {
        bType = 'NON-HASHROUTING';
        buildCommand = 'ng build --prod --base-href ' + csURL + ' --deploy-url ' + csURL;
    }
    log(INFO, 'Building Cloudstarter Using Command(Type: ' + bType + '): ' + buildCommand);
    run(buildCommand);
    //TODO: Use NPM to zip a folder, fix bug on extraction when upload to cloud... (perhaps use no compression)
    //const folderToZip = './dist/' + cloudStarter + '/';
    //const fileForZip = './dist/' + cloudStarter + '.zip';
    run('cd ./dist/' + cloudStarter + '/ && zip -r ./../' + cloudStarter + '.zip .');
    log(INFO, 'ZIP Created: ./dist/' + cloudStarter + '.zip');
}

// function that shows all the availible applications in the cloud
showAvailableApps = function (showTable) {
    //TODO: Use table config
    const doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    // TODO: loop over if there are more than 200
    const response = CCOM.callTC(CCOM.clURI.app_info + '?$top=200', false, {handleErrorOutside: true});
    // console.log(response)
    if (response.errorMsg) {
        if (response.errorMsg === 'Application does not exist') {
            log(INFO, 'No Cloud Starters deployed yet...');
            return null;
        } else {
            log(ERROR, response.errorMsg);
            process.exit(1);
        }
    } else {
        // console.log('APPS: ' , response);
        const users = iterateTable(require("./user-groups").showLiveAppsUsers(false, true));
        // console.log('USERS: ', users);
        // TODO: Apparently apps can have tags, look into this...
        let apps = {};
        for (const app in response) {
            const appTemp = {};
            const appN = parseInt(app) + 1;
            //log(INFO, appN + ') APP NAME: ' + response[app].name  + ' Published Version: ' +  response[app].publishedVersion + ' (Latest:' + response[app].publishedVersion + ')') ;
            appTemp['APP NAME'] = response[app].name;
            let owner = 'Unknown';
            for (const user of users){
                if(user.Id === response[app].owner){
                    owner = user['First Name'] + ' ' + user['Last Name'];
                }
            }
            appTemp['OWNER'] = owner;
            // TODO: Use the API (get artifacts) to find an index.htm(l) and provide highest
            const publV = parseInt(response[app].publishedVersion);
            appTemp['PUBLISHED VERSION'] = publV;
            const latestV = parseInt(response[app].latestVersion);
            appTemp['LATEST VERSION'] = latestV;
            //appTemp['PUBLISHED / LATEST VERSION'] = '(' + publV + '/' + latestV + ')';
            let latestDeployed = false;
            if (publV === latestV) {
                latestDeployed = true;
            }
            appTemp['LATEST DEPLOYED'] = latestDeployed;
            apps[appN] = appTemp;
            const created = new Date(response[app].creationDate);
            const options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
            const optionsT = {hour: 'numeric'};
            appTemp['CREATED'] = created.toLocaleDateString("en-US", options);
            //appTemp['CREATED TIME'] = created.toLocaleTimeString();
            const lastModified = new Date(response[app].lastModifiedDate);
            //appTemp['LAST MODIFIED'] = lastModified.toLocaleDateString("en-US", options);
            //appTemp['LAST MODIFIED TIME'] = lastModified.toLocaleTimeString();
            const now = new Date();
            appTemp['AGE(DAYS)'] = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            appTemp['LAST MODIFIED(DAYS)'] = Math.round((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
        }
        pexTable(apps, 'cloud-starters', getPEXConfig(), doShowTable);
        return response;
    }
};

// Function to show claims for the configured user
showCloudInfo = function (showTable) {
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Show Cloud');
    let doShowTable = true;
    if (showTable != null) {
        doShowTable = showTable;
    }
    const response = CCOM.callTC(CCOM.clURI.claims);
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After Show Cloud');
    let nvs = createTableValue('REGION', getRegion());
    nvs = createTableValue('ORGANIZATION', getOrganization(), nvs);
    nvs = createTableValue('FIRST NAME', response.firstName, nvs);
    nvs = createTableValue('LAST NAME', response.lastName, nvs);
    nvs = createTableValue('EMAIL', response.email, nvs);
    if (response.sandboxes) {
        for (let i = 0; i < response.sandboxes.length; i++) {
            nvs = createTableValue('SANDBOX ' + i, response.sandboxes[i].type, nvs);
            nvs = createTableValue('SANDBOX ' + i + ' ID', response.sandboxes[i].id, nvs);
        }
    }
    // TODO: display groups
    if (doShowTable) {
        console.table(nvs);
    }
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Final Show Cloud');
};

doDeleteApp = function (appToDelete) {
    return CCOM.callTC(CCOM.clURI.app_info + appToDelete + '/', false ,{method: 'DEL'});
}

// const getApplicationDetailsURL = cloudURL + getProp('appURE');
getApplicationDetails = function (application, version, showTable) {
    const doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    const details = {};
    //console.log(getApplicationDetailsURL +  application + '/applicationVersions/' + version + '/artifacts/');
    const artefactStepSize = 200;
    let hasMoreArtefacts = true;
    let allArteFacts = [];
    for (let i = 0; hasMoreArtefacts; i = i + artefactStepSize) {
        // let exportBatch = callURL(cloudURL + 'case/v1/cases?$sandbox=' + getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i, 'GET', null, null, false);
        let skip = '';
        if (i !== 0) {
            skip = '&$skip=' + i
        }
        const appDet = CCOM.callTC(CCOM.clURI.app_info + application + '/applicationVersions/' + version + '/artifacts/?&$top=' + artefactStepSize + skip);
        if (appDet) {
            if (appDet.length < artefactStepSize) {
                hasMoreArtefacts = false;
            }
            allArteFacts = allArteFacts.concat(appDet);
        } else {
            hasMoreArtefacts = false;
        }
    }

    // logO(INFO, appDet);
    let i = 0;
    for (const det in allArteFacts) {
        const appTemp = {};
        appN = i;
        i++;
        appTemp['CLOUD STARTER'] = application;
        appTemp['DETAIL NAME'] = allArteFacts[det].name;
        details[appN] = appTemp;
    }
    // if (doShowTable) console.table(details);
    pexTable(details, 'cloud-starter-details', getPEXConfig(), doShowTable);
    return allArteFacts;
};


//Get Links to all the applications
getAppLinks = function (showTable) {
    log(INFO, 'Getting Cloud Starter Links...');
    const appLinkTable = {};
    const apps = showAvailableApps(false);
    let i = 1;
    for (let app of apps) {
        const appTemp = {};
        appTemp['APP NAME'] = app.name;
        const appN = i++;
        const tempDet = getApplicationDetails(app.name, app.publishedVersion, false);
        logLine("Processing App: (" + appN + '/' + apps.length + ')...');
        if (isIterable(tempDet)) {
            for (let appD of tempDet) {
                // Get file after last slash in Descriptor file name; expected cloudstarter.json
                if (appD.name.includes(/[^/]*$/.exec(getProp('Descriptor_File'))[0])) {
                    const csInfo = CCOM.callTC(CCOM.clURI.apps + encodeURIComponent(app.name) + '/' + appD.name, false);
                    // const csInfo = callURL(cloudURL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name, null, null, null, false);
                    if (csInfo && csInfo.cloudstarter) {
                        appTemp['CS VERSION'] = csInfo.cloudstarter.version;
                        appTemp['BUILD DATE'] = csInfo.cloudstarter.build_date;
                    }
                }
                if (appD.name.includes("index.html")) {
                    const tempLink = cloudURL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name;
                    appTemp['LINK'] = tempLink;
                }
            }
        } else {
            if (app.name && tempDet && tempDet.errorMsg) {
                log(ERROR, 'App: ' + app.name + ', Error: ' + tempDet.errorMsg);
            } else {
                log(ERROR, 'Something is wrong with ', app, tempDet);
            }
        }
        appLinkTable[appN] = appTemp;
    }
    process.stdout.write('\n');
    pexTable(appLinkTable, 'cloud-starter-links', getPEXConfig(), showTable);
    return appLinkTable;
}



// Function to upload a zip to the LiveApps ContentManagment API
uploadApp = function (application) {
    return new Promise(function (resolve, reject) {
        let formData = new require('form-data')();
        log(INFO, 'UPLOADING APP: ' + application);
        const uploadAppLocation = '/webresource/v1/applications/' + application + '/upload/';
        formData.append('appContents', require("fs").createReadStream('./dist/' + application + '.zip'));
        const header = {};
        header['Content-Type'] = 'multipart/form-data; charset=UTF-8';
        // Possibly add OAUTH Header...
        if (isOauthUsed()) {
            header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
        } else {
            const lCookie = CCOM.cLogin();
            header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
        let query = require('https').request({
            hostname: cloudHost,
            path: uploadAppLocation,
            method: 'POST',
            headers: header
        }, (res) => {
            let data = '';
            res.on("data", (chunk) => {
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                console.log(data);
                resolve();
            })
        });
        query.on("error", (e) => {
            console.error(e);
            resolve();
        });
        formData.pipe(query);
    });
}

// Function to publish the application to the cloud
publishApp = function (application) {
    return new Promise(function (resolve, reject) {
        // const publishLocation = cloudURL + 'webresource/v1/applications/' + application + '/';
        const response = CCOM.callTC(CCOM.clURI.app_info , false, {method: 'PUT'});
        log(INFO, 'Publish Result: ', response);
        resolve();
    });
}

// Get the TIBCO Cloud Starter Development Kit from GIT
getGit = function (source, target, tag) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    if (tag == null || tag === 'LATEST' || tag === '') {
        run('git clone "' + source + '" "' + target + '" ');
    } else {
        run('git clone "' + source + '" "' + target + '" -b ' + tag);
    }
}

// Function to install NPM packages
npmInstall = function (location, packageToUse) {
    return new Promise(function (resolve, reject) {
        if (packageToUse != null) {
            run('cd ' + location + ' && npm install ' + packageToUse);
        } else {
            run('cd ' + location + ' && npm install');
        }
        resolve();
    });
}

// Function to test features
testFunction = async function (propFile) {
    const re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
    return re;
}

checkPW = function () {
    if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') === '') {
        log(ERROR, 'Please provide your password to login to the tibco cloud in the file tibco-cloud.properties (for property: CloudLogin.pass)');
        process.exit();
    }
}

// Use WSU to generate TCI code
wsuAddTci = function () {
    return new Promise(async function (resolve, reject) {
        // TODO: Implement
        console.log('TODO: Implement');
        resolve();
    });
}

wsuListTci = function () {
    return new Promise(async function (resolve, reject) {
        // TODO: Remove web scaffolding utility ?
        /*const wsu = require('@tibco-tcstk/web-scaffolding-utility');
        console.log(wsu.API.getVersion());
        wsu.API.login(getProp('CloudLogin.clientID'), getProp('CloudLogin.email'), getProp('CloudLogin.pass'));
        // console.log(wsu.API.getArtefactList("TCI").createTable());
        const afList = wsu.API.getArtefactList(wsu.API.flavour.TCI);
        console.table(afList.createTable());
        */
        resolve();

    });
}

const posSchematics = require('../config/config-schematics.json').schematicConfig;
schematicAdd = async function () {
    log(INFO, 'Adding Schematic...');
    const LIST_ALL = 'List All Possible Schematics';
    // Check if schematic is allowed
    let listing = true;
    let initialList = true;
    let sType = '';
    while (listing) {
        const appType = getProp('App_Type');
        let possibleSchematics = posSchematics.descriptions;
        let question = 'What type of schematic would you like to add ?';
        if (appType != null && initialList) {
            possibleSchematics = [LIST_ALL];
            for (let sNr in posSchematics.AvailableInTemplate) {
                for (let availableSchematic of posSchematics.AvailableInTemplate[sNr]) {
                    // console.log('App Type: ', appType, ' availableSchematic: ', availableSchematic);
                    if (appType === availableSchematic) {
                        possibleSchematics.unshift(posSchematics.descriptions[sNr]);
                    }
                }
            }
            question = 'Based on your application type ' + colors.blue(appType) + ' you can choose one of the following schematics (or choose list all):'
            initialList = false;
        }
        sType = await askMultipleChoiceQuestion(question, possibleSchematics);
        if (sType !== LIST_ALL) {
            listing = false;
        }
    }
    const sName = await askQuestion('What is the name of your schematic ?');
    run('ng generate @tibco-tcstk/component-template:' + posSchematics.names[posSchematics.descriptions.indexOf(sType)] + ' ' + sName);
    // Run npm install only after certain schematics.
    log(INFO, 'DO RUN NPM: ' + posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]);
    if (posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]) {
        run('npm install');
    }
}

// Function to generate other property files next to the existing ones
generateCloudPropertyFiles = async function () {
    log(INFO, 'Generating Cloud Property Files');
    const response = CCOM.callTC(CCOM.clURI.account_info, false, {tenant: 'TSC', customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login});
    // console.log(JSON.stringify(response));
    let projectName = await askQuestion('What is the name of your Project ? (press enter to leave it blank)');
    if (projectName.trim() !== '') {
        projectName = projectName + '_';
    }
    const propFilesALL = [];
    const propFilesEU = [];
    const propFilesUS = [];
    const propFilesAU = [];
    const propOption = ['NONE', 'ALL', 'ALL EU', 'ALL US', 'ALL AU'];
    for (let org of response.accountsInfo) {
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
extractCloudInfo = function (org, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU) {
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
configurePropFile = function (fileName, region) {
    log(INFO, '[' + region + ']: Generating: ' + fileName);
    let regToAdd = '';
    if (region === 'EU') {
        regToAdd = 'eu.';
    }
    if (region === 'AU') {
        regToAdd = 'au.';
    }
    copyFile(getPropFileName(), fileName);
    addOrUpdateProperty(fileName, 'CloudLogin.clientID', "<PLEASE GET THE API access key(CLIENT ID) FROM: https://" + regToAdd + "account.cloud.tibco.com/manage/settings/oAuthTokens>");
    addOrUpdateProperty(fileName, 'cloudHost', regToAdd + 'liveapps.cloud.tibco.com');
    addOrUpdateProperty(fileName, 'Cloud_URL', 'https://' + regToAdd + 'liveapps.cloud.tibco.com/');
    log(WARNING, 'Remember to Update The Client ID in: ' + fileName);
}

const SPECIAL = 'SPECIAL';
// A Function to update a property (possibly in a custom file)
updateProperty = async function () {
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
            const LA = require('./liveApps');
            pValue = LA.getProductionSandbox();
        }
        if (vType === 'LiveApps_AppID' || vType === 'LiveApps_ActionID') {
            const apps = require("./liveApps").showLiveApps(true, false);
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
                    let laActions = [{name: 'NONE'}];
                    if (laApp.creators) {
                        laActions = laActions.concat(laApp.creators.map(v => ({
                            type: 'CREATOR',
                            id: v.id,
                            name: v.name
                        })));
                    }
                    if (laApp.actions) {
                        laActions = laActions.concat(laApp.actions.map(v => ({
                            type: 'ACTION',
                            id: v.id,
                            name: v.name
                        })));
                    }
                    // console.log(laActions);
                    log(INFO, 'Liva Apps Actions: ');
                    console.table(laActions);
                    let laActD = await askMultipleChoiceQuestionSearch('For which ACTION would you like to store an Action ID ?', laActions.map(v => v.name));
                    if (laActD === 'NONE') {
                        log(INFO, 'OK, I won\'t do anything :-)');
                        doUpdate = false;
                    } else {
                        let laAction = laActions.find(e => e.name === laActD);
                        if (laAction != null) {
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
        addOrUpdateProperty(pFile, pName, pValue, pComment);
    }
}

// Set log debug level from local property
setLogDebug(getProp('Use_Debug'));
