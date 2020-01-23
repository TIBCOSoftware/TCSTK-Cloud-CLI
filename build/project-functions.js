// Package Definitions
const execSync = require('child_process').execSync;
const syncClient = require('sync-rest-client');
const git = require('gulp-git');
const fs = require('file-system');
const fse = require('fs-extra');
const del = require('del');
const PropertiesReader = require('properties-reader');
const propFileName = 'tibco-cloud.properties';
//const propertiesF = PropertiesReader('tibco-cloud.properties');
const propertiesF = PropertiesReader(propFileName);
const propsF = propertiesF.path();
const isWindows = process.platform == 'win32';

// Create a directory if it does not exists
mkdirIfNotExist = function (dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// Clean temp folder
cleanTemp = function () {
    log(INFO, 'Cleaning Temp Directory: ' + propsF.Workspace_TMPFolder);
    return deleteFolder(propsF.Workspace_TMPFolder);
}

// Delete a folder
deleteFolder = function (folder) {
    log(INFO, 'Deleting Folder: ' + folder);
    return del([
        folder
    ]);
}


// Run an OS Command
run = function (command) {
    return new Promise(function (resolve, reject) {
        log(DEBUG, 'Executing Command: ' + command);
        try {
            execSync(
                command,
                {stdio: 'inherit'}
            );
        } catch (err) {
            reject(err);
        }
        resolve();
    }).catch(
        (reason => {
            logO(ERROR, reason);
            process.exit(1);
        })
    );
}

// Function that determines which cloud login method to use
// function to login to the cloud

var loginC = null;
var argv = require('yargs').argv;

var cloudURL = propsF.Cloud_URL;
var cloudHost = propsF.cloudHost;
// Check if a global config exists and if it is required
if (getGlobalConfig()) {
    const propsG = getGlobalConfig();
    if (cloudURL == 'USE-GLOBAL') {
        cloudURL = propsG.Cloud_URL;
    }
    if (cloudHost == 'USE-GLOBAL') {
        cloudHost = propsG.cloudHost;
    }
}

//Function to manage the login from the cloud
var loginURL = cloudURL + propsF.loginURE;
cLogin = function () {
    var pass = propsF.CloudLogin.pass;
    var tentantID = propsF.CloudLogin.tenantID;
    var clientID = propsF.CloudLogin.clientID;
    var email = propsF.CloudLogin.email;
    //
    if (getGlobalConfig()) {
        const propsG = getGlobalConfig();
        if (pass == 'USE-GLOBAL') pass = propsG.CloudLogin.pass;
        if (tentantID == 'USE-GLOBAL') tentantID = propsG.CloudLogin.tenantID;
        if (clientID == 'USE-GLOBAL') clientID = propsG.CloudLogin.clientID;
        if (email == 'USE-GLOBAL') email = propsG.CloudLogin.email;
    }

    if (pass == '') {
        pass = argv.pass;
        // console.log('Pass from args: ' + pass);
    }
    if (pass.charAt(0) == '#') {
        pass = Buffer.from(pass, 'base64').toString()
    }
    if (loginC == null) {
        loginC = cloudLoginV3(tentantID, clientID, email, pass, loginURL);
    }
    if (loginC == 'ERROR') {
        // TODO: exit the gulp task properly
        log(INFO, 'Error Exiting..');
        process.exit();
    }
    // console.log("RETURN: " , loginC);
    return loginC;
}


// Function that logs into the cloud and returns a cookie
function cloudLoginV3(tenantID, clientID, email, pass, TCbaseURL) {
    log(DEBUG, 'cloudLoginV3]  tenantID=' + tenantID + ' clientID=' + clientID + ' email=' + email + ' TCbaseURL=' + TCbaseURL);
    var postForm = 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email + '&Password=' + pass;
    log(INFO, 'Calling: ' + TCbaseURL);
    //log(DEBUG,'With Form: ' + postForm);
    var response = syncClient.post(encodeURI(TCbaseURL), {
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        payload: postForm
    });
    var re = '';
    if (response.body.errorMsg != null) {
        log(ERROR, response.body.errorMsg);
        re = 'ERROR';
    } else {
        var loginCookie = response.headers['set-cookie'];
        logO(DEBUG, loginCookie);
        var rxd = /domain=(.*?);/g;
        var rxt = /tsc=(.*?);/g;
        re = {"domain": rxd.exec(loginCookie)[1], "tsc": rxt.exec(loginCookie)[1]};
        logO(DEBUG, re.domain);
        logO(DEBUG, re.tsc);
        logO(DEBUG, re);
        log(INFO, 'Login Successful...');
    }
    return re;
}

cleanDist = function () {
    return deleteFolder('./dist/' + propsF.App_Name);
}

// const { zip } = require('zip-a-folder');
// Function that builds the zip for deployment
buildCloudStarterZip = function (cloudStarter) {
    return new Promise(async function (resolve, reject) {
        const csURL = '/webresource/apps/' + cloudStarter + '/';
        deleteFile('./dist/' + cloudStarter + '.zip');
        run('ng build --prod --base-href ' + csURL + 'index.html --deploy-url ' + csURL);
        //copyFile('./tmp/' + cloudStarter + '/tsconfig.build.json', './tmp/' + cloudStarter + '/tsconfig.json');
        //TODO: Use NPM to zip a folder, fix bug on extraction when upload to cloud...
        //log(INFO, 'Using zip a folder... ');
        const folderToZip = './dist/' + cloudStarter + '/';
        const fileForZip = './dist/' + cloudStarter + '.zip';

        // await zip(folderToZip, fileForZip);

        // var zipFolder = require('zip-folder');

        //await zipFolder(folderToZip, fileForZip);
        //var zipFolder = require('zip-folder');

        /*
                zipFolder(folderToZip, fileForZip, function(err) {
                    if(err) {
                        console.log('oh no!', err);
                    } else {
                        console.log('EXCELLENT');
                        log(INFO, 'ZIP Created: ./dist/' + cloudStarter + '.zip');
                        resolve();
                    }
                });
        */
        run('cd ./dist/' + cloudStarter + '/ && zip -r ./../' + cloudStarter + '.zip .');
        log(INFO, 'ZIP Created: ./dist/' + cloudStarter + '.zip');
        resolve();

    });
}


// function that shows all the availible applications in the cloud
const getAppURL = cloudURL + propsF.appURE + '?%24top=200';
showAvailableApps = function (showTable) {
    var doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    //return new Promise(function (resolve, reject) {
    var lCookie = cLogin();
    //log(INFO, 'Login Cookie: ', lCookie);
    var response = syncClient.get(getAppURL, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    //console.log(response.body);
    //console.table(response.body);
    var apps = {};
    for (var app in response.body) {
        var appTemp = {};
        var appN = parseInt(app) + 1;
        //log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
        appTemp['APP NAME'] = response.body[app].name;
        //appTemp['LINK'] = 'https://eu.liveapps.cloud.tibco.com/webresource/apps/'+response.body[app].name+'/index.html';
        // TODO: Use the API (get artifacts) to find an index.htm(l) and provide highest
        // TODO: Use right eu / us link
        var publV = parseInt(response.body[app].publishedVersion);
        appTemp['PUBLISHED VERSION'] = publV;
        var latestV = parseInt(response.body[app].latestVersion);
        appTemp['LATEST VERSION'] = latestV;
        //appTemp['PUBLISHED / LATEST VERSION'] = '(' + publV + '/' + latestV + ')';
        var latestDeployed = false;
        if (publV == latestV) {
            latestDeployed = true;
        }
        appTemp['LATEST DEPLOYED'] = latestDeployed;
        apps[appN] = appTemp;
        var created = new Date(response.body[app].creationDate);
        var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        var optionsT = {hour: 'numeric'};
        appTemp['CREATED'] = created.toLocaleDateString("en-US", options);
        //appTemp['CREATED TIME'] = created.toLocaleTimeString();
        var lastModified = new Date(response.body[app].lastModifiedDate);
        //appTemp['LAST MODIFIED'] = lastModified.toLocaleDateString("en-US", options);
        //appTemp['LAST MODIFIED TIME'] = lastModified.toLocaleTimeString();
        var now = new Date();
        appTemp['AGE(DAYS)'] = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        appTemp['LAST MODIFIED(DAYS)'] = Math.round((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
    }
    //logO(INFO,apps);
    if (doShowTable) console.table(apps);
    return response.body;
    // resolve();
    // });
};

showApps = function () {
    return new Promise(function (resolve, reject) {
        showAvailableApps(true);
        resolve();
    });
}


// Function to show claims for the configured user
const getClaimsURL = cloudURL + propsF.Claims_URE;
showClaims = function () {
    return new Promise(function (resolve, reject) {
        var lCookie = cLogin();
        log(DEBUG, 'Login Cookie: ', lCookie);
        var response = syncClient.get(getClaimsURL, {
            headers: {
                "accept": "application/json",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });
        logO(INFO, response.body);
        resolve();
    });
};

/*

name: 'CLIe2e.liveapps.config.tibcolabs.client.context.PUBLIC',
    content:
     { json:
        '{"applicationIds":[],"caseIconsFolderId":"CLIe2e_Icons","id":"7007"}' },
    type: 'PUBLIC',
    description: null,
    sandboxId: '31',
    scope: '',
    attributes: [],
    roles: [],
    links: [],
    id: '7007',
    createdById: '265',
    createdByName: 'Guest SEG',
    createdDate: 1564059412958,
    modifiedById: '265',
    modifiedByName: 'Guest SEG',
    modifiedDate: 1564059413173,
    isOrphaned: false,
    isAbandoned: false },





 */

const sharedStateBaseURL = cloudURL + 'clientstate/v1/';
const sharedStateURL = sharedStateBaseURL + 'states';

//const sharedStateDetailsURL = sharedStateBaseURL + 'states/';

const SHARED_STATE_STEP_SIZE = 400;
const SHARED_STATE_MAX_CALLS = 20;

// Function to return a JSON with the shared state entries from a set scope
getSharedState = function (showTable) {
    var lCookie = cLogin();
    log(DEBUG, 'Login Cookie: ', lCookie);
    //TODO: Think about applying a filter when getting the entries (instead of client side filtering)
    let ALLsState = [];
    var i = 0;
    let moreStates = true;
    while (moreStates && i < SHARED_STATE_MAX_CALLS) {
        let start = i * SHARED_STATE_STEP_SIZE;
        let end = (i + 1) * SHARED_STATE_STEP_SIZE;
        //log(INFO, 'Getting shared state entries from ' + start + ' till ' + end);
        let sStateTemp = getCloud(sharedStateURL + '?%24top=' + SHARED_STATE_STEP_SIZE + '&%24skip=' + start);
        if (sStateTemp.length < 1) {
            moreStates = false;
        }
        //log(INFO, 'Got ' + sStateTemp.length);
        ALLsState = ALLsState.concat(sStateTemp);
        i++;
        logLine('Got Shared States: ' + ALLsState.length);
    }
    console.log('');
    log(INFO, 'Total Number of Shared State Entries: ' + ALLsState.length);
    let ssScope = 'APPLICATION';
    if (propsF.Shared_State_Scope == null) {
        log(INFO, 'No Shared State Scope found; Adding APPLICATION to ' + propFileName);
        addOrUpdateProperty(propFileName, 'Shared_State_Scope', 'APPLICATION');
    } else {
        ssScope = propsF.Shared_State_Scope;
    }
    if (ssScope == 'APPLICATION') {
        ssScope = propsF.App_Name;
    }
    let sState = [];
    log(INFO, 'Applying Filter) Shared State Scope: ' + ssScope);
    if (ssScope != '*') {
        for (var state in ALLsState) {
            if (ALLsState[state].name.startsWith(ssScope)) {
                sState.push(ALLsState[state]);
            }
        }
    } else {
        sState = ALLsState;
    }
    log(INFO, 'Filtered Shared State Entries: ' + sState.length);
    //Sort shared state by old date till new
    sState.sort(function (a, b) {
        a = new Date(a.createdDate);
        b = new Date(b.createdDate);
        return a > b ? 1 : a < b ? -1 : 0;
    });
    var states = {};
    for (var state in sState) {
        var sTemp = {};
        var appN = parseInt(state) + 1;
        sTemp['ID'] = sState[state].id;
        sTemp['NAME'] = sState[state].name;
        sTemp['CREATED BY'] = sState[state].createdByName;
        var created = new Date(sState[state].createdDate);
        var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        sTemp['CREATED ON'] = created.toLocaleDateString("en-US", options);
        states[appN] = sTemp;
    }
    if (showTable) {
        console.table(states);
    }
    return sState;
}

// Display the shared state entries to a user
showSharedState = function () {
    return new Promise(function (resolve, reject) {
        getSharedState(true);
        resolve();
    });
};

selectSharedState = async function (sharedStateEntries, question) {
    // console.log('Shared State Entries: ' , sharedStateEntries);
    var stateNames = [];
    for (var state of sharedStateEntries) {
        stateNames.push(state.name);
    }
    // console.log('Shared state names: ' , stateNames);
    // Pick Item from the list
    let answer = await askMultipleChoiceQuestionSearch(question, stateNames);
    let re = {};
    for (var state of sharedStateEntries) {
        if (state.name == answer) {
            re = state;
        }
    }
    return re;


}


// Display the details of a shared state
showSharedStateDetails = function () {
    return new Promise(async function (resolve, reject) {
        // Show Shared State list
        const sStateList = getSharedState(true);
        if (sStateList.length > 0) {
            // Pick Item from the list
            let selectedState = await selectSharedState(sStateList, 'Which Shared State do you like to get the Details from ?');
            // Show details on the item
            log(INFO, '---*** ' + selectedState.name + ' (' + selectedState.id + ')***--- \n', selectedState, '\n------------------------------');
            log(INFO, '---*** CONTENT: ' + selectedState.name + ' (' + selectedState.id + ')***--- \n', JSON.parse(selectedState.content.json), '\n------------------------------');

            // Show Details:  /states/{id}

            // Show Links From
            // Show Links To

            // Show Attributes
            // Show Attribute Details

            // Get Roles
            // Show Role Details

            // Show State Links
            // Show State Link Details
        } else {
            log(ERROR, 'No Shared States available to show details of in the scope: ' + propsF.Shared_State_Scope)
        }

        resolve();
    });
};

deleteSharedState = function (sharedStateID) {
    const lCookie = cLogin();
    log(DEBUG, 'Login Cookie: ', lCookie);
    const response = syncClient.del(sharedStateURL + '/' + sharedStateID, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    var re = response;
    //let re = Object.assign({}, response.body);
    //logO(INFO, re);
    let ok = true;
    if (re.body != null) {
        if (re.body.errorMsg != null) {
            log(ERROR, re.body.errorMsg);
            ok = false;
        }
    }
    if (ok) {
        log(INFO, 'Successfully removed shared state with ID: ' + sharedStateID);
    }
}

// Removes a Shared State Entry
removeSharedStateEntry = function () {
    return new Promise(async function (resolve, reject) {
        // Show Shared State list
        const sStateList = getSharedState(true);
        if (sStateList.length > 0) {
            // Pick Item from the list
            let selectedState = await selectSharedState(sStateList, 'Which Shared State would you like to remove ?');
            log(INFO, 'Removing Shared State: ' + selectedState.name + ' (' + selectedState.id + ')');
            // Ask if you really want to delete the selected shared state entry
            const decision = await askMultipleChoiceQuestion('Are you sure ?', ['YES', 'NO']);
            // console.log(decision);
            // Remove shared state entry
            if (decision == 'YES') {
                deleteSharedState(selectedState.id);
                //deleteSharedState(8088);

            } else {
                log(INFO, 'Don\'t worry I have not removed anything :-) ... ');
            }
        } else {
            log(ERROR, 'No Shared States available to remove in the scope: ' + propsF.Shared_State_Scope)
        }
        resolve();
    });
};

// Removes a Shared State Scope
clearSharedStateScope = function () {
    return new Promise(async function (resolve, reject) {
        // Show Shared State list
        const sStateList = getSharedState(true);
        if (sStateList.length > 0) {
            // Ask if you really want to delete this shared state scope
            let decision = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (From Scope: '+ propsF.Shared_State_Scope + ') ?', ['YES', 'NO']);
            // If the scope is set to * then really double check...
            if(propsF.Shared_State_Scope == '*'){
                decision = 'NO';
                const secondDecision = await askMultipleChoiceQuestion('YOU ARE ABOUT TO REMOVE THE ENTIRE SHARED STATE ARE YOU REALLY REALLY SURE ? ', ['YES', 'NO']);
                if(secondDecision == 'YES'){
                    decision = 'YES';
                }
            }
            // Remove shared state entries
            if (decision == 'YES') {
                for(sStateToDelete of sStateList){
                    // Remove entries one by one
                    log(INFO, 'REMOVING SHARED STATE - NAME: ' + sStateToDelete.name + ' ID: ' + sStateToDelete.id);
                    deleteSharedState(sStateToDelete.id);
                }
            } else {
                log(INFO, 'Don\'t worry I have not removed anything :-) ... ');
            }
        } else {
            log(ERROR, 'No Shared States available to remove in the scope: ' + propsF.Shared_State_Scope)
        }
        resolve();
    });
};

// Shared state folder (picked up from configuration if exists)
let SHARED_STATE_FOLDER = './Shared_State/';
if(propsF.Shared_State_Folder != null){
    SHARED_STATE_FOLDER = propsF.Shared_State_Folder;
}

// Export the Shared state scope to a folder
exportSharedStateScope = function () {
    return new Promise(function (resolve, reject) {
        // Show Shared State List
        let sharedStateEntries = getSharedState(true);
        //TODO: HIER VERDER

        // Check if folder exist

        // Create 2 files per shared state: description (name of the state.json) and content ( name.CONTENT.json)

        // Get the details for every shared state entry

        // And store them in a file / folder

        resolve();
    });
};


// Import the Shared state scope from a folder
importSharedStateScope = function () {
    return new Promise(function (resolve, reject) {

        // Go Over Shared State files

        // Provide the option to select one or upload all

        // Check which shared states will be overwritten

        // Provide a summary to the user

        // Ask if you are sure to import the shared state ?

        // Upload the shared states one by one

        resolve();
    });
};

// TODO: Create a shared state watcher (every time the file changes, the shared state is updated)

watchSharedStateScope = function () {
    return new Promise(function (resolve, reject) {

        // TODO: Implement

        resolve();
    });
};


// Get details from a specific Cloud URL
getCloud = function (url) {
    const lCookie = cLogin();
    log(DEBUG, 'Login Cookie: ', lCookie);
    const response = syncClient.get(url, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    var re = response.body;
    //let re = Object.assign({}, response.body);
    //logO(INFO, re);
    return re;
}

const getApplicationDetailsURL = cloudURL + propsF.appURE;
//const getApplicationDetailsURL = 'https://eu.liveapps.cloud.tibco.com/webresource/v1/applications/AppMadeWithSchematic3/applicationVersions/1/artifacts/';
getApplicationDetails = function (application, version, showTable) {
    var doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    var details = {};
    //console.log(getApplicationDetailsURL +  application + '/applicationVersions/' + version + '/artifacts/');
    const appDet = getCloud(getApplicationDetailsURL + application + '/applicationVersions/' + version + '/artifacts/?%24top=200');
    //logO(INFO, appDet);
    var i = 0;
    for (var det in appDet) {
        var appTemp = {};
        appN = i;
        i++;
        appTemp['DETAIL NAME'] = appDet[det].name;
        details[appN] = appTemp;
    }
    if (doShowTable) console.table(details);
    return appDet;
};

//Show all the applications links
showLinks = function () {
    return new Promise(function (resolve, reject) {
        getAppLinks(true);
        resolve();
    });
}

//Get Links to all the applications
getAppLinks = function (showTable) {
    log(INFO, 'Getting Application Links...');
    var appLinkTable = {};
    var apps = showAvailableApps(false);
    var i = 1;
    for (app of apps) {
        var appTemp = {};
        appTemp['APP NAME'] = app.name;
        var appN = i++;
        appTemp['PUBLISHED VERSION'] = parseInt(app.publishedVersion);
        // console.log(app.name, app.publishedVersion);
        var tempDet = getApplicationDetails(app.name, app.publishedVersion, false);
        logLine("Processing App: (" + appN + '/' + apps.length + ')...');
        /*
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("Processing App: (" + appN + '/' + apps.length + ')...');
        */
        for (appD of tempDet) {
            //console.log(appD.name);
            if (appD.name.includes("index.html")) {
                // console.log('FOUND INDEX of ' + app.name + ': ' + appD.name);
                var tempLink = cloudURL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name;
                // console.log('LOCATION: ' + tempLink);
                appTemp['LINK'] = tempLink;
            }
        }
        appLinkTable[appN] = appTemp;
    }
    process.stdout.write('\n');
    if (showTable) {
        console.table(appLinkTable);
    }
    return appLinkTable;
}

// Function to upload a zip to the LiveApps ContentManagment API
uploadApp = function (application) {
    return new Promise(function (resolve, reject) {
        var lCookie = cLogin();
        let formData = new require('form-data')();
        log(INFO, 'UPLOADING APP: ' + application);
        var uploadAppLocation = '/webresource/v1/applications/' + application + '/upload/';
        //formData.append('key1', 1);
        // formData.setHeader("cookie", "tsc="+lCookie.tsc + "; domain=" + lCookie.domain);
        formData.append('appContents', require("fs").createReadStream('./dist/' + application + '.zip'));
        let query = require('https').request({
            hostname: cloudHost,
            path: uploadAppLocation,
            method: 'POST',
            headers: {
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain,
                'Content-Type': 'multipart/form-data; charset=UTF-8'
            },
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
        var lCookie = cLogin();
        // var lCookie = cloudLoginV3();
        // console.log('Login Cookie: ' , lCookie);
        var publishLocation = cloudURL + 'webresource/v1/applications/' + application + '/';
        var response = syncClient.put(publishLocation, {
            headers: {
                "accept": "application/json",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });
        console.log(response.body);
        resolve();
    });
}

// Get the TIBCO Cloud Starter Development Kit from GIT
getGit = function (source, target, tag) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    // git clone --branch bp-baseV1 https://github.com/TIBCOSoftware/TCSDK-Angular
    if (tag == 'LATEST') {
        return git.clone(source, {args: target}, function (err) {
        });
    } else {
        return git.clone(source, {args: '--branch ' + tag + ' ' + target}, function (err) {
        });
    }
}

// Function to install NPM packages
npmInstall = function (location, package) {
    return new Promise(function (resolve, reject) {
        if (package != null) {
            run('cd ' + location + ' && npm install ' + package);
        } else {
            run('cd ' + location + ' && npm install');
        }
        resolve();
    });
}

// Function to test features
testFunction = async function (propFile) {
    var re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
    return re;
}

// Function to copy a directory
copyDir = function (fromDir, toDir) {
    log(INFO, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fse.copySync(fromDir, toDir, {overwrite: true});
}

// Function to delete a file but does not fail when the file does not exits
deleteFile = function (file) {
    log(INFO, 'Deleting File: ' + file);
    try {
        fs.unlinkSync(file);
        //file removed
    } catch (err) {
        log(ERROR, 'Maybe file does not exist ?... (' + err.code + ')');
        //console.log(err)
    }
}


checkPW = function () {
    if (propsF.CloudLogin.pass == null || propsF.CloudLogin.pass == '') {
        log(ERROR, 'Please provide your password to login to the tibco cloud in the file tibco-cloud.properties (for property: CloudLogin.pass)');
        process.exit();
    }
}

var readline = require('readline');
var Writable = require('stream').Writable;

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
        var wsu = require('@tibco-tcstk/web-scaffolding-utility');
        console.log(wsu.API.getVersion());
        wsu.API.login(propsF.CloudLogin.clientID, propsF.CloudLogin.email, propsF.CloudLogin.pass);
        // console.log(wsu.API.getArtefactList("TCI").createTable());
        var afList = wsu.API.getArtefactList(wsu.API.flavour.TCI);
        console.table(afList.createTable());
        resolve();
    });
}
//TODO: either inspect or get from config

const possibleSchematics = ["case-cockpit", "home-cockpit", "custom-form-creator", "custom-form-action", "custom-form-casedata"];

schematicAdd = function () {
    return new Promise(async function (resolve, reject) {
        log(INFO, 'Adding Schematic...');
        var sType = await askMultipleChoiceQuestion('What type of schematic would you like to add ?', possibleSchematics);
        var sName = await askQuestion('What is the name of your schematic ?');
        //TODO: Add choice for the type of schematic
        run('ng generate @tibco-tcstk/component-template:' + sType + ' ' + sName);
        resolve();
    });
}

// Set log debug level from local property
setLogDebug(propsF.Use_Debug);
