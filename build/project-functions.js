// Package Definitions
const syncClient = require('sync-rest-client');
const git = require('gulp-git');
const fs = require('file-system');
const fse = require('fs-extra');
const PropertiesReader = require('properties-reader');
//const propFileName = 'tibco-cloud.properties';
//const propertiesF = PropertiesReader('tibco-cloud.properties');
//const propertiesF = PropertiesReader(propFileName);
//const getProp( = propertiesF.path();
const isWindows = process.platform == 'win32';

// Clean temp folder
cleanTemp = function () {
    log(INFO, 'Cleaning Temp Directory: ' + getProp('Workspace_TMPFolder'));
    return deleteFolder(getProp('Workspace_TMPFolder'));
}

// Function that determines which cloud login method to use
// function to login to the cloud
var loginC = null;
var argv = require('yargs').argv;

var cloudURL = getProp('Cloud_URL');
var cloudHost = getProp('cloudHost');
// Check if a global config exists and if it is required
//TODO: Manage global config in common functions
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
var loginURL = cloudURL + getProp('loginURE');
cLogin = function () {
    //TODO: Set a timer, if login was too long ago login again...
    var pass = getProp('CloudLogin.pass');
    var tentantID = getProp('CloudLogin.tenantID');
    var clientID = getProp('CloudLogin.clientID');
    var email = getProp('CloudLogin.email');
    //
    //TODO: Manage global config in common functions
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
    console.log(response.body);
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
        log(INFO, 'Login Successful of ' + email + ' ...');
    }
    return re;
}

cleanDist = function () {
    return deleteFolder('./dist/' + getProp('App_Name'));
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
const getAppURL = cloudURL + getProp('appURE') + '?%24top=200';
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
const getClaimsURL = cloudURL + getProp('Claims_URE');
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

doDeleteApp = function (appToDelete) {
    const lCookie = cLogin();
    const location = cloudURL + 'webresource/v1/applications/' + appToDelete + '/';
    const response = syncClient.del(location, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    return response;
}


//TODO: Move this to prop file
const sharedStateBaseURL = cloudURL + 'clientstate/v1/';
const sharedStateURL = sharedStateBaseURL + 'states';
const SHARED_STATE_STEP_SIZE = 400;
const SHARED_STATE_MAX_CALLS = 20;

// Shared state scope (picked up from configuration if exists)
let SHARED_STATE_SCOPE = 'APPLICATION';
if (getProp('Shared_State_Scope') != null) {
    SHARED_STATE_SCOPE = getProp('Shared_State_Scope');
} else {
    log(INFO, 'No Shared State Scope Property found; Adding APPLICATION to ' + getPropFileName());
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Scope', 'APPLICATION');
}

// Shared state scope (picked up from configuration if exists)
let SHARED_STATE_DOUBLE_CHECK = 'YES';
if (getProp('Shared_State_Double_Check') != null) {
    SHARED_STATE_DOUBLE_CHECK = getProp('Shared_State_Double_Check');
} else {
    log(INFO, 'No Shared State Scope Double Check Property found; Adding YES to ' + getPropFileName());
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Double_Check', 'YES');
}
const DO_SHARED_STATE_DOUBLE_CHECK = (!(SHARED_STATE_DOUBLE_CHECK.toLowerCase() == 'no'));


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
    if (SHARED_STATE_SCOPE == 'APPLICATION') {
        SHARED_STATE_SCOPE = getProp('App_Name');
    }
    let sState = [];
    log(INFO, 'Applying Filter) Shared State Scope: ' + SHARED_STATE_SCOPE);
    if (SHARED_STATE_SCOPE != '*') {
        for (var state in ALLsState) {
            if (ALLsState[state].name.startsWith(SHARED_STATE_SCOPE)) {
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
        sTemp['MODIFIED BY'] = sState[state].modifiedByName;
        var modified = new Date(sState[state].modifiedDate);
        sTemp['LAST MODIFIED'] = modified.toLocaleDateString("en-US", options);
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
            log(INFO, 'CONTEXT:' + selectedState.name + ' (' + selectedState.id + ')\n', selectedState, '\n------------------------------');
            log(INFO, 'JSON CONTENT: ' + selectedState.name + ' (' + selectedState.id + ')\n', JSON.parse(selectedState.content.json), '\n------------------------------');

            // Show Details:  /states/{id}
            // TODO: Think about:

            // Show Links From
            // Show Links To

            // Show Attributes
            // Show Attribute Details

            // Get Roles
            // Show Role Details

            // Show State Links
            // Show State Link Details
        } else {
            log(ERROR, 'No Shared States available to show details of in the scope: ' + getProp('Shared_State_Scope'))
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
            let decision = 'YES';
            if (DO_SHARED_STATE_DOUBLE_CHECK) {
                decision = await askMultipleChoiceQuestion('Are you sure ?', ['YES', 'NO']);
            }
            // console.log(decision);
            // Remove shared state entry
            if (decision == 'YES') {
                deleteSharedState(selectedState.id);
                //deleteSharedState(8088);

            } else {
                log(INFO, 'Don\'t worry I have not removed anything :-) ... ');
            }
        } else {
            log(ERROR, 'No Shared States available to remove in the scope: ' + getProp('Shared_State_Scope'))
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
            let decision = 'YES';

            if (DO_SHARED_STATE_DOUBLE_CHECK) {
                decision = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (From Scope: ' + getProp('Shared_State_Scope') + ') ?', ['YES', 'NO']);
            }
            // If the scope is set to * then really double check...
            if (getProp('Shared_State_Scope') == '*') {
                decision = 'NO';
                const secondDecision = await askMultipleChoiceQuestion('YOU ARE ABOUT TO REMOVE THE ENTIRE SHARED STATE ARE YOU REALLY REALLY SURE ? ', ['YES', 'NO']);
                if (secondDecision == 'YES') {
                    decision = 'YES';
                }
            }
            // Remove shared state entries
            if (decision == 'YES') {
                for (sStateToDelete of sStateList) {
                    // Remove entries one by one
                    log(INFO, 'REMOVING SHARED STATE - NAME: ' + sStateToDelete.name + ' ID: ' + sStateToDelete.id);
                    deleteSharedState(sStateToDelete.id);
                }
            } else {
                log(INFO, 'Don\'t worry I have not removed anything :-) ... ');
            }
        } else {
            log(ERROR, 'No Shared States available to remove in the scope: ' + getProp('Shared_State_Scope'))
        }
        resolve();
    });
};

// Shared state folder (picked up from configuration if exists)
let SHARED_STATE_FOLDER = './Shared_State/';
if (getProp('Shared_State_Folder') != null) {
    SHARED_STATE_FOLDER = getProp('Shared_State_Folder');
} else {
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Folder', SHARED_STATE_FOLDER);
}

const jsonfile = require('jsonfile');
// Export the Shared state scope to a folder
exportSharedStateScope = function () {
    return new Promise(async function (resolve, reject) {
        // Show Shared State List
        let sharedStateEntries = getSharedState(true);
        let decision = 'YES';
        if (DO_SHARED_STATE_DOUBLE_CHECK) {
            decision = await askMultipleChoiceQuestion('Are you sure you want to export all the states above ?', ['YES', 'NO']);
        }
        if (decision == 'YES') {
            // Check if folder exist
            mkdirIfNotExist(SHARED_STATE_FOLDER);
            mkdirIfNotExist(SHARED_STATE_FOLDER + 'CONTENT/');
            // Create 2 files per shared state: description (name of the state.json) and content ( name.CONTENT.json)
            const storeOptions = {spaces: 2, EOL: '\r\n'};
            for (let sSEntry of sharedStateEntries) {
                let writeContentSeparate = false;
                let contentObject = {};
                let contextFileName = SHARED_STATE_FOLDER + sSEntry.name + '.json';
                let contentFileName = SHARED_STATE_FOLDER + 'CONTENT/' + sSEntry.name + '.CONTENT.json';
                if (sSEntry.content != null) {
                    if (sSEntry.content.json != null) {
                        try {
                            // Get the details for every shared state entry
                            contentObject = JSON.parse(sSEntry.content.json);
                            sSEntry.content.json = {'FILESTORE': contentFileName};
                            writeContentSeparate = true;
                            // And store them in a file / folder
                            jsonfile.writeFileSync(contentFileName, contentObject, storeOptions);
                            log(INFO, '[STORED CONTENT]: ' + contentFileName);
                        } catch (e) {
                            log(ERROR, 'Parse Error on: ' + sSEntry.name + 'Writing directly...');
                        }
                    }
                }
                jsonfile.writeFileSync(SHARED_STATE_FOLDER + sSEntry.name + '.json', sSEntry, storeOptions);
                log(INFO, '[STORED CONTEXT]: ' + contextFileName);
                if (!writeContentSeparate) {
                    log(ERROR, 'Stored all in: ' + contextFileName)
                }
            }
        } else {
            log(INFO, 'Don\'t worry I have not exported anything :-) ... ');
        }
        resolve();
    });
};

// Load shared state contents from a file
importSharedStateFile = function (ssFile) {
    log(DEBUG, 'Importing: ' + ssFile);
    var contentContextFile = fs.readFileSync(ssFile);
    var ssObject = {};
    try {
        ssObject = JSON.parse(contentContextFile);
    } catch (e) {
        log(ERROR, 'Parse Error on: ' + ssFile);
        log(ERROR, e);
        process.exit();
    }
    if (ssObject.content != null) {
        if (ssObject.content.json != null) {
            if (ssObject.content.json['FILESTORE'] != null) {
                const contentFile = ssObject.content.json['FILESTORE'];
                log(INFO, 'Getting content from: ' + contentFile);
                var contentContentFile = fs.readFileSync(contentFile, "utf8");
                // console.log('GOT: ' , contentContentFile);
                try {
                    ssObject.content.json = contentContentFile;
                } catch (e) {
                    log(ERROR, 'Parse Error on: ' + contentFile);
                    log(ERROR, e);
                    process.exit();
                }
                ssObject.content.json = ssObject.content.json;
            }
        }
    }
    // console.log(ssObject);
    return ssObject;
}

putSharedState = function (sharedStateObject) {
    if (sharedStateObject != null || sharedStateObject != '' || sharedStateObject != {}) {
        log(DEBUG, 'POSTING Shared State', sharedStateObject);
        const lCookie = cLogin();
        log(DEBUG, 'Login Cookie: ', lCookie);
        const response = syncClient.put(encodeURI(sharedStateURL), {
            headers: {
                "accept": "application/json",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            },
            payload: [sharedStateObject]
        });
        //console.log(response.body);
        log(INFO, '\x1b[32m', 'Updated: ' + sharedStateObject.name)
        var re = response;
        // TODO: Check for errors, and if the state does not exist use post..
    } else {
        log(ERROR, 'NOT Posting Empty Shared State: ', sharedStateObject)
    }
}

// Import the Shared state scope from a folder
importSharedStateScope = function () {
    return new Promise(async function (resolve, reject) {
            let importOptions = [];
            // Go Over Shared State files
            var states = {};
            let it = 1;
            fs.readdirSync(SHARED_STATE_FOLDER).forEach(file => {
                if (file != 'CONTENT') {
                    importOptions.push(file);
                    var sTemp = {};
                    var appN = it;
                    sTemp['FILE'] = file;
                    states[appN] = sTemp;
                    it++;
                }
            });
            if (importOptions.length > 0) {
                log(INFO, 'Shared states found in: ' + SHARED_STATE_FOLDER);
                console.table(states);
                importOptions.unshift('ALL SHARED STATES');
                // Provide the option to select one or upload all
                let answer = await askMultipleChoiceQuestionSearch('Which shared state would you like to import', importOptions);
                if (answer == 'ALL SHARED STATES') {
                    // Import all shared states
                    for (curState of importOptions) {
                        if (curState != 'ALL SHARED STATES') {
                            // console.log('Updating: ' + SHARED_STATE_FOLDER + curState);
                            putSharedState(importSharedStateFile(SHARED_STATE_FOLDER + curState));
                        }
                    }
                } else {
                    putSharedState(importSharedStateFile(SHARED_STATE_FOLDER + answer));
                }
            } else {
                log(ERROR, 'No Shared States found for import in: ' + SHARED_STATE_FOLDER);
            }
            // TODO: Check which shared states will be overwritten
            // Provide a summary to the user
            // Ask if you are sure to import the shared state ?
            // Upload the shared states one by one
            resolve();
        }
    );
};

//wrapper function around the watcher on shared state
watchSharedStateScopeMain = function () {
    return new Promise(async function (resolve, reject) {
        //const commandSTDO = 'cd ' + __dirname  + '/../ && gulp watch-shared-state-scope-do --cwd "' + process.cwd() + '" --gulpfile "' + __dirname + '/../manage-project.js" --pass "' + getProp('CloudLogin.pass + '"';
        const commandSTDO = 'tcli watch-shared-state-scope-do';
        const decision = await askMultipleChoiceQuestion('Before you watch the files for changes, do you want to do an export of the latest shared state scope ?', ['YES', 'NO']);
        if (decision == 'YES') {
            exportSharedStateScope().then(() => {
                run(commandSTDO);
                resolve();
            })
        } else {
            run(commandSTDO);
            resolve();
        }
    });
}

//A shared state watcher (every time the file changes, the shared state is updated)
const chokidar = require('chokidar');
watchSharedStateScope = function () {
    return new Promise(async function (resolve, reject) {
        //Do the login now, so it does not have to be done later
        cLogin();
        log(INFO, 'Waiting for FILE Changes in: ' + SHARED_STATE_FOLDER)
        const watcher = chokidar.watch(SHARED_STATE_FOLDER).on('all', (event, path) => {
            // console.log(event, path);
            if (event == 'change') {
                if (path.includes('/CONTENT/')) {
                    log(INFO, 'CONTENT File UPDATED: ' + path);
                    const contextFile = path.replace('/CONTENT/', '/').replace('.CONTENT.', '.');
                    // console.log(contextFile);
                    if (doesFileExist(contextFile)) {
                        putSharedState(importSharedStateFile(contextFile));
                    } else {
                        log(ERROR, 'Can\'t find context file: ' + contextFile);
                    }
                } else {
                    log(INFO, 'CONTEXT File UPDATED: ' + path);
                    log(INFO, 'NOTHING CHANGED; WE ARE NOT POSTING CONTEXT FILES CURRENTLY...');
                    //putSharedState(importSharedStateFile(path));
                }
            }

        });
        const readline = require('readline');
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }
            // console.log(key);
            // console.log(key.name);
            if (key.name == 'escape' || key.name === 'q') {
                // console.log('ESCAPE...');
                resolve();
                watcher.close().then(() => {
                    log(INFO, 'Stopped Listening for File changes...');
                    process.exit();
                });
            }
        });
        console.log('Press Escape key or the \'q\'-key to stop listening for file changes...');
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
    return re;
}

const getApplicationDetailsURL = cloudURL + getProp('appURE');
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
    for (let app of apps) {
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
        if (isIterable(tempDet)) {
            for (let appD of tempDet) {
                //console.log(appD.name);
                if (appD.name.includes("index.html")) {
                    // console.log('FOUND INDEX of ' + app.name + ': ' + appD.name);
                    const tempLink = cloudURL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name;
                    // console.log('LOCATION: ' + tempLink);
                    appTemp['LINK'] = tempLink;
                }
            }
        } else {
            if (app.name && tempDet.errorMsg) {
                log(ERROR, 'App: ' + app.name + ', Error: ' + tempDet.errorMsg);
            } else {
                log(ERROR, 'Something is wrong with ', app, tempDet);
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

isIterable = function (obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
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

// Function to call liveApps

callURL = function (url, method, postRequest, contentType, doLog) {
    const lCookie = cLogin();
    const cMethod = method || 'GET';
    let cdoLog = true;
    if (doLog != null) {
        cdoLog = doLog;
    }
    const cType = contentType || 'application/json';
    let body = null;
    if (cMethod === 'POST') {
        if (cType === 'application/json') {
            body = JSON.stringify(postRequest);
        } else {
            body = postRequest;
        }
    }
    const header = {
        "accept": "application/json",
        "Content-Type": "application/json",
        "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
    }
    if (cdoLog) {
        log(INFO, '--- CALLING SERVICE ---');
        log(INFO, '-     URL: ' + url);
        log(INFO, '-  METHOD: ' + cMethod);
        log(INFO, '- CONTENT: ' + cType);
    }
    if (method === 'POST') {
        if (cdoLog) {
            log(INFO, '-    BODY: ' + body);
        }
        var response = syncClient.post(encodeURI(url), {
            headers: header,
            payload: body
        });
    } else {
        var response = syncClient.get(encodeURI(url), {
            headers: header
        });

    }
    if (response.body.errorMsg != null) {
        log(ERROR, response.body.errorMsg);
        log(ERROR, response.body);

        return null;
    } else {
        return response.body;
    }
}

let globalProductionSandbox = null;
getProductionSandbox = function () {
    if (!globalProductionSandbox) {
        const claims = callURL(getClaimsURL);
        for (let sb of claims.sandboxes) {
            if (sb.type === 'Production') {
                globalProductionSandbox = sb.id;
            }
        }
        log(INFO, 'SANDBOX ID: ' + globalProductionSandbox);
    }
    return globalProductionSandbox;
}


const getTypesURL = cloudURL + 'case/v1/types'; // getProp('Claims_URE');
// Function to
showLiveApps = function (doShowTable, doCountCases) {
    // https://eu.liveapps.cloud.tibco.com/case/v1/types?%24sandbox=31

    //TODO: Call can be optimized by only requesting the basics
    const caseTypes = callURL(getTypesURL + '?$sandbox=' + getProductionSandbox() + '&$top=1000');
    log(DEBUG, 'Case Types: ', caseTypes)

    // TODO: (maybe) get case owner

    var cases = {};
    for (var curCase in caseTypes) {
        var caseTemp = {};
        var appN = parseInt(curCase) + 1;
        //log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
        caseTemp['CASE NAME'] = caseTypes[curCase].name;
        caseTemp['APPLICATION ID'] = caseTypes[curCase].applicationId;
        caseTemp['VERSION'] = caseTypes[curCase].applicationVersion;
        caseTemp['IS CASE'] = caseTypes[curCase].isCase;
        if (doCountCases) {
            logLine("Counting Cases: (" + appN + '/' + caseTypes.length + ')...');
            caseTemp['NUMBER OF CASES'] = callURL(cloudURL + 'case/v1/cases?$sandbox=' + getProductionSandbox() + '&$filter=applicationId eq ' + caseTypes[curCase].applicationId + '&$count=true', 'GET', null, null, false);
        }

        //https://eu.liveapps.cloud.tibco.com/?%24sandbox=31&%24filter=applicationId%20eq%202880&%24count=true
        cases[appN] = caseTemp;

    }
    console.log('\n');
    //logO(INFO,apps);
    if (doShowTable) console.table(cases);
    return caseTypes;


}

// Shared state folder (picked up from configuration if exists)
let CASE_FOLDER = './Cases/';
if (getProp('Case_Folder') != null) {
    CASE_FOLDER = getProp('Case_Folder');
} else {
    addOrUpdateProperty(getPropFileName(), 'Case_Folder', CASE_FOLDER);
}

/*
getCaseType = async function(question){
    const cTypes = showLiveApps(true, false);
    let cTypeArray = new Array();
    for (var curCase in cTypes) {
        cTypeArray.push(cTypes[curCase].name);
    }
    let choosenCT = await askMultipleChoiceQuestionSearch(question, cTypeArray);
    let re = { 'choosenCT' : choosenCT,
        'cTypes' : cTypes };
    return re;
}*/

const storeOptions = {spaces: 2, EOL: '\r\n'};
exportLiveAppsCaseType = async function () {
    const cTypes = showLiveApps(true, false);
    let cTypeArray = new Array();
    for (var curCase in cTypes) {
        cTypeArray.push(cTypes[curCase].name);
    }
    let typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray);

    let fName = await askQuestion('What file name would you like to export to ? (press enter for default)');
    for (var curCase in cTypes) {
        if (typeForExport == cTypes[curCase].name) {

            mkdirIfNotExist(CASE_FOLDER);
            let fileName = CASE_FOLDER + fName;
            if (fName == '') {
                fileName = CASE_FOLDER + cTypes[curCase].name + '.' + cTypes[curCase].applicationVersion + '.type.json';
            }
            jsonfile.writeFileSync(fileName, cTypes[curCase], storeOptions);
            log(INFO, 'Case Type File Stored: ' + fileName)
        }
        ;
    }
}

const exportCaseStepSize = 30;
// Function to export case data
exportLiveAppsData = async function () {
    const cTypes = showLiveApps(true, false);
    let cTypeArray = new Array();
    for (var curCase in cTypes) {
        cTypeArray.push(cTypes[curCase].name);
    }
    let typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray);
    let fName = await askQuestion('What Folder like to export to ? (press enter for default, date get\'s added...)');
    // let oneFileStore = await askMultipleChoiceQuestion('Do you also want to store all contents in one file ? (this is used for import)', ['YES', 'NO']);
    let allCases = new Array();
    for (let curCase in cTypeArray) {
        if (cTypeArray[curCase] == typeForExport) {
            // count cases
            const numberOfCasesForExport = callURL(cloudURL + 'case/v1/cases?$sandbox=' + getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + '&$count=true', 'GET', null, null, false);
            log(INFO, 'Number of cases for export: ' + numberOfCasesForExport);
            const typeIdString = ' and typeId eq 1';
            // get cases in batch sizes
            for (let i = 0; i <= numberOfCasesForExport; i = i + exportCaseStepSize) {
                let exportBatch = callURL(cloudURL + 'case/v1/cases?$sandbox=' + getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i, 'GET', null, null, false);
                // console.log('Export Batch', exportBatch);
                logLine('Exporting Case: (' + i + '/' + numberOfCasesForExport + ')...');
                allCases = allCases.concat(exportBatch);
            }
            log(INFO, 'Number of Exported Cases: ' + allCases.length);
            // Write Cases
            let cfName = CASE_FOLDER + fName;
            if (fName == '') {
                //Add date to the end of this
                const today = new Date();
                const dayAddition = '(' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '_h' + today.getHours() + 'm' +today.getMinutes() + ')';
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
                        contentObject = JSON.parse(exCase.casedata);
                        AllCaseArray.push(contentObject);
                        exCase.casedata = {'FILESTORE': contentFileName};
                        // And store them in a file / folder
                        jsonfile.writeFileSync(contentFileName, contentObject, storeOptions);
                        writeContentSeparate = true;
                        //log(INFO, '[STORED CONTENT]: ' + contentFileName);
                    } catch (e) {
                        log(ERROR, 'Parse Error on: ' + exCase.name + 'Writing directly...');
                    }
                    jsonfile.writeFileSync(contextFileName, exCase, storeOptions);
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
            jsonfile.writeFileSync(AllCaseFileName, AllCaseArray, storeOptions);
            log(INFO, '[STORED ALL CONTENT]: ' + AllCaseFileName);
            //}
        }
    }
}

//TODO: Add Export Feature to one file. (Just the data and to use for import)

//TODO: Create a generator for the input feature. (based on the template and ask to add steps)
//TODO: Make sure you are not overwriting a current import file.

// Function to Import LiveApps Case Data based on Config File
importLiveAppsData = async function () {
    //TODO: Choose import file (if there are more) --> Starts with import && ends with json

    log(INFO, ' -- Importing Case Data --- ');
    const importFolder = process.cwd() + '/' + CASE_FOLDER + 'Import/';
    const impConf = require(importFolder + 'import.json');
    const cSteps = impConf['import-steps'];
    log(INFO, 'Configured Steps: ', cSteps);

    //TODO: check if data of all steps has the same size
    //TODO: Check if there is a creator (how to map the caseID)
    //TODO: Check if the first step is a creator
    //
    //TODO: Show Summary Table (Step Number, Step Name, SandboxID, Application Name, Application ID, Process Type, Process Name, Process ID, Sleep Time)
    //

    //Loop over all the data
    if (impConf[impConf[impConf['import-steps'][0]].data].FILESTORE != null) {
        dataForImport = jsonfile.readFileSync(importFolder + impConf[impConf[impConf['import-steps'][0]].data].FILESTORE)
    } else {
        dataForImport = impConf[impConf['import-steps'][0]].data;
    }
    const numberOfImports = dataForImport.length;
    log(INFO, 'Number of Imports: ' + numberOfImports);

    //TODO: Add are you sure ?
    const sBid = getProductionSandbox();
    for (let i = 0; i < numberOfImports; i++) {
        //Loop over all cases
        let caseRef = '';
        for (let impStep of impConf['import-steps']) {
            const stepConf = impConf[impStep];
            log(INFO, '           Step: ' + impStep);
            log(INFO, '     Process ID: ' + stepConf['process-id']);
            log(INFO, ' Application ID: ' + stepConf.applicationId);
            //Option to point to file for importing data
            let dataForImport = [];
            //TODO: put this in seperate function
            if (impConf[stepConf.data].FILESTORE != null) {
                // console.log(impConf[stepConf.data].FILESTORE);
                dataForImport = jsonfile.readFileSync(importFolder + impConf[stepConf.data].FILESTORE)
            } else {
                dataForImport = impConf[stepConf.data];
            }
            const dataToImport = dataForImport[i];
            // TODO: Add option to provide process name and type and then look up the application ID an process ID
            if (stepConf.type.toString().toLowerCase() == 'creator') {
                log(INFO, 'Creating LiveApps Case (' + i + ')');
                let postRequest = {
                    id: stepConf['process-id'],
                    sandboxId: sBid,
                    applicationId: stepConf.applicationId,
                    data: JSON.stringify(dataToImport)
                }
                //console.log(postRequest);
                const response = callURL(cloudURL + 'process/v1/processes', 'POST', postRequest, null, true);
                log(INFO, 'Response: ', response);
                //Get Case ID
                caseRef = response.caseReference;
            }
            if (stepConf.type.toString().toLowerCase() == 'action') {
                log(INFO, 'Actioning LiveApps Case (' + i + ') Ref ' + caseRef);


                let postRequest = {
                    id: stepConf['process-id'],
                    sandboxId: sBid,
                    applicationId: stepConf.applicationId,
                    /*TODO: look at bug .replace is not a function */
                    data: JSON.stringify(dataToImport).replace('@@CASEREF@@', caseRef),
                    caseReference: caseRef
                }
                const response = callURL(cloudURL + 'process/v1/processes', 'POST', postRequest, null, true);
                // log(INFO, 'Response: ' , response);

            }
            if (stepConf.sleep && stepConf.sleep > 0) {
                await sleep(stepConf.sleep)
            }
        }
    }
}

// Function to
csvToJsonLiveAppsData = function () {

}

// Function to
jsonToCsvLiveAppsData = function () {

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
        log(INFO, 'Could not delete file, maybe file does not exist ?... (' + err.code + ')');
        //console.log(err)
    }
}


checkPW = function () {
    if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') == '') {
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
        wsu.API.login(getProp('CloudLogin.clientID'), getProp('CloudLogin.email'), getProp('CloudLogin.pass'));
        // console.log(wsu.API.getArtefactList("TCI").createTable());
        var afList = wsu.API.getArtefactList(wsu.API.flavour.TCI);
        console.table(afList.createTable());
        resolve();
    });
}

const posSchematics = require('../config-schematics').schematicConfig;
schematicAdd = function () {
    return new Promise(async function (resolve, reject) {
        log(INFO, 'Adding Schematic...');
        var sType = await askMultipleChoiceQuestion('What type of schematic would you like to add ?', posSchematics.descriptions);
        var sName = await askQuestion('What is the name of your schematic ?');
        run('ng generate @tibco-tcstk/component-template:' + posSchematics.names[posSchematics.descriptions.indexOf(sType)] + ' ' + sName);
        // TODO: run npm install only after certain schematics.
        log(INFO, 'DO RUN NPM: ' + posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]);
        if (posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]) {
            run('npm install');
        }
        resolve();
    });
}

// Set log debug level from local property
setLogDebug(getProp('Use_Debug'));
