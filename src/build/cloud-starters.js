// Package Definitions
const CCOM = require('./cloud-communications');
const OAUTH = require('./oauth');
const USERGROUPS = require('./user-groups');
const colors = require('colors');

export async function start() {
    log(INFO, 'Starting: ' + getProp('App_Name'));
    if (isOauthUsed()) {
        await OAUTH.validateAndRotateOauthToken(true);
        // Display OAUTH Details from Common
        OAUTH.displayCurrentOauthDetails();
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
    if (portToUse !== 0) {
        log('INFO', 'Using Port: ' + portToUse);
        const region = getProp('CloudLogin.Region').toLowerCase();
        if (portToUse === 4200) {
            // TODO: Fix bug, can not read includes of undefined (no global config, and no password)
            if (region === 'eu') {
                run('npm run serve_eu');
            } else {
                if (region === 'au') {
                    run('npm run serve_au');
                } else {
                    run('npm run serve_us');
                }
            }
        } else {
            if (region === 'eu') {
                run('ng serve --proxy-config proxy.conf.prod.eu.js --ssl true --source-map --aot --port ' + portToUse);
            } else {
                if (region === 'au') {
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

export async function cleanDist() {
    return deleteFolder('./dist/' + getProp('App_Name'));
}

export function generateCloudDescriptor () {
    // Add Descriptor
    let ADD_DESCRIPTOR = 'YES';
    if (getProp('Add_Descriptor') !== null) {
        ADD_DESCRIPTOR = getProp('Add_Descriptor');
    } else {
        log(INFO, 'No Add_Descriptor Property found; Adding Add_Descriptor to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Add_Descriptor', 'YES');
    }
    // Add Descriptor
    let ADD_DESCRIPTOR_TIMESTAMP = 'YES';
    if (getProp('Add_Descriptor_Timestamp') !== null) {
        ADD_DESCRIPTOR_TIMESTAMP = getProp('Add_Descriptor_Timestamp');
    } else {
        log(INFO, 'No Add_Descriptor_Timestamp Property found; Adding Add_Descriptor_Timestamp to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Add_Descriptor_Timestamp', 'YES');
    }
    // Add Descriptor
    let DESCRIPTOR_FILE = './src/assets/cloudstarter.json';
    if (getProp('Descriptor_File') !== null) {
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
export function showAppLinkInfo() {
    //TODO: Get from global file
    // let cloudURLdisp = getProp('Cloud_URL');
    log('INFO', 'LOCATION: https://' + getCurrentRegion() + CCOM.clURI.apps + getProp('App_Name') + "/index.html");
    if (getProp('Add_Descriptor') === 'YES') {
        log('INFO', 'DESCRIPTOR LOCATION: https://' + getCurrentRegion() + CCOM.clURI.apps + getProp('App_Name') + getProp('Descriptor_File').replace('./src', ''));
    }
}

// Build the zip for deployment
export function buildCloudStarterZip(cloudStarter) {
    // Check for Build Command
    let BUILD_COMMAND = 'HASHROUTING';
    if (getProp('BUILD_COMMAND') !== null) {
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
export function showAvailableApps(showTable) {
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
        const users = iterateTable(USERGROUPS.showLiveAppsUsers(false, true));
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
}

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
    if (appToDelete !== 'NONE') {
        const confirm = await askMultipleChoiceQuestion('Are you sure you want to delete ? ' + appToDelete, ['YES', 'NO']);
        if (confirm === 'YES') {
            deleteApp = true;
        }
    }
    if (deleteApp) {
        log(INFO, 'Deleting ' + appToDelete + '...');
        const da = CCOM.callTC(CCOM.clURI.app_info + appToDelete + '/', false ,{method: 'DEL'});
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

// Get details of a cloud starter
function getApplicationDetails(application, version, showTable) {
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
    let i = 0;
    for (const det in allArteFacts) {
        const appTemp = {};
        let appN = i;
        i++;
        appTemp['CLOUD STARTER'] = application;
        appTemp['DETAIL NAME'] = allArteFacts[det].name;
        details[appN] = appTemp;
    }
    pexTable(details, 'cloud-starter-details', getPEXConfig(), doShowTable);
    return allArteFacts;
};


//Get Links to all the applications
export function getAppLinks(showTable) {
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
                    const tempLink = 'https://' + CCOM.clURI.apps + encodeURIComponent(app.name) + '/' + appD.name;
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
export function uploadApp(application) {
    return new Promise(async function (resolve, reject) {
        let formData = new require('form-data')();
        log(INFO, 'UPLOADING APP: ' + application);
        const uploadAppLocation = '/webresource/v1/applications/' + application + '/upload/';
        formData.append('appContents', require("fs").createReadStream('./dist/' + application + '.zip'));
        const header = {};
        header['Content-Type'] = 'multipart/form-data; charset=UTF-8';
        // Possibly add OAUTH Header...
        if (isOauthUsed() && CCOM.isOAUTHLoginValid()) {
            header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
        } else {
            const lCookie = await CCOM.cLogin();
            header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
        let query = require('https').request({
            hostname: getCurrentRegion() + CCOM.clURI.la_host,   //cloudHost,*/
            path: uploadAppLocation,
            method: 'POST',
            headers: header
        }, (res) => {
            let data = '';
            res.on("data", (chunk) => {
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                // console.log(data);
                if(data){
                    const dataObj = JSON.parse(data);
                    if(dataObj && dataObj.message) {
                        log(INFO, 'UPLOAD RESULT:', colors.green(dataObj.message));
                    } else {
                        log(WARNING, 'UPLOAD RESULT:', data);
                    }
                } else {
                    log(WARNING, 'UPLOAD RESULT:', data);
                }
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
export function publishApp(application) {
    return new Promise(function (resolve, reject) {
        // const publishLocation = cloudURL + 'webresource/v1/applications/' + application + '/';
        const response = CCOM.callTC(CCOM.clURI.app_info , false, {method: 'PUT'});
        log(INFO, 'Publish Result: ', response);
        resolve();
    });
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

// Function to test features
export async function testFunction (propFile){
    const re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
    return re;
}




