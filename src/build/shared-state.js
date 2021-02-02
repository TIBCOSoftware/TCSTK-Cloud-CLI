const CCOM = require('./cloud-communications');
const LA = require('./live-apps');
const colors = require('colors');

//TODO: Move this to prop file
const SHARED_STATE_STEP_SIZE = 400;
const SHARED_STATE_MAX_CALLS = 20;
let SHARED_STATE_FILTER = 'APPLICATION';
let SHARED_STATE_DOUBLE_CHECK = 'YES';
let SHARED_STATE_FOLDER = './Shared_State/';
let DO_SHARED_STATE_DOUBLE_CHECK = true;

function prepSharedStateProps() {
    // Shared state filter (picked up from configuration if exists)
    if (getProp('Shared_State_Filter') != null) {
        SHARED_STATE_FILTER = getProp('Shared_State_Filter');
    } else {
        log(INFO, 'No Shared State Filter Property found; Adding APPLICATION to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Shared_State_Filter', 'APPLICATION');
    }
    // Shared state filter (picked up from configuration if exists)
    if (getProp('Shared_State_Double_Check') != null) {
        SHARED_STATE_DOUBLE_CHECK = getProp('Shared_State_Double_Check');
    } else {
        log(INFO, 'No Shared State Filter Double Check Property found; Adding YES to ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Shared_State_Double_Check', 'YES');
    }
    DO_SHARED_STATE_DOUBLE_CHECK = (!(SHARED_STATE_DOUBLE_CHECK.toLowerCase() == 'no'));
    // Shared state folder (picked up from configuration if exists)
    if (getProp('Shared_State_Folder') != null) {
        SHARED_STATE_FOLDER = getProp('Shared_State_Folder');
    } else {
        addOrUpdateProperty(getPropFileName(), 'Shared_State_Folder', SHARED_STATE_FOLDER);
    }
}

// Function to return a JSON with the shared state entries from a set filter
export function getSharedState(showTable) {
    prepSharedStateProps();
    // const lCookie = cLogin();
    // log(DEBUG, 'Login Cookie: ', lCookie);
    //TODO: Think about applying a filter when getting the entries (instead of client side filtering)
    let ALLsState = [];
    let i = 0;
    let moreStates = true;
    let filterType = 'PUBLIC';
    if (getProp('Shared_State_Type') != null) {
        filterType = getProp('Shared_State_Type');
    }
    log(INFO, 'Type of Shared State: ' + colors.blue(filterType));
    while (moreStates && i < SHARED_STATE_MAX_CALLS) {
        let start = i * SHARED_STATE_STEP_SIZE;
        let end = (i + 1) * SHARED_STATE_STEP_SIZE;
        //log(INFO, 'Getting shared state entries from ' + start + ' till ' + end);
        //TODO: Also get Shared shared states (+ '&filter=type = SHARED')
        let filter = '&$filter=type=' + filterType;
        let sStateTemp = CCOM.callTC(CCOM.clURI.shared_state + '?$top=' + SHARED_STATE_STEP_SIZE + '&$skip=' + start + filter);
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
    if (SHARED_STATE_FILTER == 'APPLICATION') {
        SHARED_STATE_FILTER = getProp('App_Name');
    }
    let sState = [];
    log(INFO, 'Applying Shared State Filter: ' + SHARED_STATE_FILTER);
    if (SHARED_STATE_FILTER != '*') {
        for (const state in ALLsState) {
            if (ALLsState[state] && ALLsState[state].name && ALLsState[state].name.startsWith(SHARED_STATE_FILTER)) {
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
    const states = {};
    const statesDisplay = {};
    for (const state in sState) {
        const sTemp = {};
        const appN = parseInt(state) + 1;
        sTemp['ID'] = sState[state].id;
        sTemp['NAME'] = sState[state].name;
        sTemp['CREATED BY'] = sState[state].createdByName;
        const created = new Date(sState[state].createdDate);
        const options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        sTemp['CREATED ON'] = created.toLocaleDateString("en-US", options);
        sTemp['MODIFIED BY'] = sState[state].modifiedByName;
        const modified = new Date(sState[state].modifiedDate);
        sTemp['MODIFIED ON'] = modified.toLocaleDateString("en-US", options);
        states[appN] = sTemp;
        let sTempDisplay = {...sTemp};
        delete sTempDisplay['CREATED BY'];
        delete sTempDisplay['CREATED ON'];
        statesDisplay[appN] = sTempDisplay;
    }
    pexTable(states, 'shared-states', getPEXConfig(), false);
    if(showTable){
        log(INFO, colors.blue('TABLE] shared-states'));
        console.table(statesDisplay)
    }
    return sState;
}


async function selectSharedState(sharedStateEntries, question) {
    // console.log('Shared State Entries: ' , sharedStateEntries);
    const stateNames = [];
    for (const state of sharedStateEntries) {
        stateNames.push(state.name);
    }
    // console.log('Shared state names: ' , stateNames);
    // Pick Item from the list
    let answer = await askMultipleChoiceQuestionSearch(question, stateNames);
    let re = {};
    for (const state of sharedStateEntries) {
        if (state.name == answer) {
            re = state;
        }
    }
    return re;
}


function deleteSharedState(sharedStateID) {
    const response = CCOM.callTC(CCOM.clURI.shared_state + '/' + sharedStateID, false, {method: 'DEL'});
    let ok = true;
    if (response != null) {
        if (response.errorMsg != null) {
            log(ERROR, response.errorMsg);
            ok = false;
        }
    }
    if (ok) {
        log(INFO, 'Successfully removed shared state with ID: ' + sharedStateID);
    }
}

// Display the details of a shared state
export async function showSharedStateDetails() {
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
        log(WARNING, 'No Shared States available to show details of in the filter: ' + getProp('Shared_State_Filter'))
    }
}

// Removes a Shared State Entry
export async function createSharedState() {
    const ssType = getProp('Shared_State_Type');
    log(INFO, 'Creating Shared State Entry. Type: ' + colors.blue(ssType));
    const ssName = await askQuestion('What is the name of the Shared State entry that you want to create ?');
    const postSS = {
        "name": ssName + '.' + ssType,
        "content": {
            "json": "{}"
        },
        "type": ssType,
        "sandboxId": LA.getProductionSandbox()
    }
    const result = CCOM.callTC(CCOM.clURI.shared_state, false, {method: 'POST', postRequest: postSS});
    console.log(result);
    if(result != null){
        log(INFO, 'Successfully created ' + colors.yellow('EMPTY') + ' shared state entry: ' + colors.green(ssName) + ' ('+colors.blue(ssType)+')...')
    }
}

// Removes a Shared State Entry
export async function removeSharedStateEntry() {
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
        // Remove shared state entry
        if (decision == 'YES') {
            deleteSharedState(selectedState.id);
        } else {
            log(INFO, 'Don\'t worry I have not removed anything :-) ... ');
        }
    } else {
        log(ERROR, 'No Shared States available to remove in the filter: ' + getProp('Shared_State_Filter'))
    }
}

// Removes a Shared State Filter
export async function clearSharedState() {
    // Show Shared State list
    const sStateList = getSharedState(true);
    if (sStateList.length > 0) {
        // Ask if you really want to delete this shared state filter
        let decision = 'YES';

        if (DO_SHARED_STATE_DOUBLE_CHECK) {
            decision = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (Filter: ' + getProp('Shared_State_Filter') + ') ?', ['YES', 'NO']);
        }
        // If the filter is set to * then really double check...
        if (getProp('Shared_State_Filter') == '*') {
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
        log(ERROR, 'No Shared States available to remove in the filter: ' + getProp('Shared_State_Filter'))
    }
}


// Export the Shared state filter to a folder
export async function exportSharedState(verbose) {
    let reNumberOfStates = 0;
    let doVerbose = verbose || false;
    // Show Shared State List
    let sharedStateEntries = getSharedState(true);
    let decision = 'YES';
    if (DO_SHARED_STATE_DOUBLE_CHECK && !doVerbose) {
        decision = await askMultipleChoiceQuestion('Are you sure you want to export all the states above ?', ['YES', 'NO']);
    }
    if (decision == 'YES') {
        // Check if folder exist
        let ssExportFolder = SHARED_STATE_FOLDER;
        // TODO: think about setting up a structure with the organization (so that import get it directly from the right org)
        mkdirIfNotExist(ssExportFolder);
        mkdirIfNotExist(ssExportFolder + 'CONTENT/');
        // Create 2 files per shared state: description (name of the state.json) and content ( name.CONTENT.json)
        const storeOptions = {spaces: 2, EOL: '\r\n'};
        for (let sSEntry of sharedStateEntries) {
            let writeContentSeparate = false;
            let contentObject = {};
            let contextFileName = ssExportFolder + sSEntry.name + '.json';
            let contentFileName = ssExportFolder + 'CONTENT/' + sSEntry.name + '.CONTENT.json';
            if (sSEntry.content != null) {
                if (sSEntry.content.json != null) {
                    try {
                        // Get the details for every shared state entry
                        contentObject = JSON.parse(sSEntry.content.json);
                        sSEntry.content.json = {'FILESTORE': contentFileName};
                        writeContentSeparate = true;
                        // And store them in a file / folder
                        require('jsonfile').writeFileSync(contentFileName, contentObject, storeOptions);
                        log(INFO, '[STORED CONTENT]: ' + contentFileName);
                        reNumberOfStates++;
                    } catch (e) {
                        log(ERROR, 'Parse Error on: ' + sSEntry.name + 'Writing directly...');
                    }
                }
            }
            require('jsonfile').writeFileSync(ssExportFolder + sSEntry.name + '.json', sSEntry, storeOptions);
            log(INFO, '[STORED CONTEXT]: ' + contextFileName);
            if (!writeContentSeparate) {
                log(ERROR, 'Stored all in: ' + contextFileName)
            }
        }
    } else {
        log(INFO, 'Don\'t worry I have not exported anything :-) ... ');
    }
    return reNumberOfStates;
}

// Load shared state contents from a file
function importSharedStateFile(ssFile) {
    prepSharedStateProps();
    log(DEBUG, 'Importing: ' + ssFile);
    const fs = require('fs');
    const contentContextFile = fs.readFileSync(ssFile).toString();
    let ssObject = {};
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
                const contentContentFile = fs.readFileSync(contentFile, "utf8");
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

function putSharedState(sharedStateObject) {
    prepSharedStateProps();
    if (sharedStateObject != null || sharedStateObject != '' || sharedStateObject != {}) {
        log(DEBUG, 'POSTING Shared State', sharedStateObject);
        CCOM.callTC(CCOM.clURI.shared_state, false, {method: 'PUT', postRequest: [sharedStateObject]});
        log(INFO, '\x1b[32m', 'Updated: ' + sharedStateObject.name)
        // const re = response;
        // TODO: Check for errors, and if the state does not exist use post..
    } else {
        log(ERROR, 'NOT Posting Empty Shared State: ', sharedStateObject)
    }
}

// Import the Shared state filter from a folder
export async function importSharedState() {
    prepSharedStateProps();
    //console.log('ORG: ', getOrganization());
    let importOptions = [];
    // Go Over Shared State files
    const states = {};
    let it = 1;
    const fs = require('fs');
    fs.readdirSync(SHARED_STATE_FOLDER).forEach(file => {
        if (file != 'CONTENT') {
            importOptions.push(file);
            const sTemp = {};
            const appN = it;
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
};

//wrapper function around the watcher on shared state
export async function watchSharedStateMain() {
    prepSharedStateProps();
    const commandSTDO = 'tcli watch-shared-state-do -p "' + getPropFileName() + '"';
    const decision = await askMultipleChoiceQuestion('Before you watch the files for changes, do you want to do an export of the latest shared state (filtered) ?', ['YES', 'NO']);
    if (decision == 'YES') {
        await exportSharedState();
        run(commandSTDO);
    } else {
        run(commandSTDO);
    }
}

let ignoreChanges = 0;
//A shared state watcher (every time the file changes, the shared state is updated)
export function watchSharedState() {
    const chokidar = require('chokidar');
    return new Promise(async function (resolve, reject) {
        //Do the login now, so it does not have to be done later
        prepSharedStateProps();
        await CCOM.cLogin();
        log(INFO, 'Waiting for FILE Changes in: ' + SHARED_STATE_FOLDER)
        const watcher = chokidar.watch(SHARED_STATE_FOLDER).on('all', (event, path) => {
            if (event == 'change') {
                if(ignoreChanges <= 0) {
                    let pS = '/';
                    if (process.platform == 'win32') {
                        pS = '\\';
                    }
                    if (path.includes(pS + 'CONTENT' + pS)) {
                        log(INFO, 'CONTENT File UPDATED: ' + path);
                        const contextFile = path.replace(pS + 'CONTENT' + pS, pS).replace('.CONTENT.', '.');
                        if (doesFileExist(contextFile)) {
                            putSharedState(importSharedStateFile(contextFile));
                        } else {
                            log(ERROR, 'Can\'t find context file: ' + contextFile);
                        }
                    } else {
                        log(INFO, 'CONTEXT File UPDATED: ' + path);
                        log(INFO, 'NOTHING CHANGED; WE ARE NOT POSTING CONTEXT FILES CURRENTLY...');
                    }
                } else {
                    ignoreChanges--;
                }
            }
        });
        const readline = require('readline');
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', async (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }
            if (key.name == 'r') {
                // Reload Shared State
                log(INFO, 'Reloading Shared State from Cloud...');
                // Two files per update..
                ignoreChanges = (await exportSharedState(true)) * 2;
            }
            if (key.name == 'escape' || key.name === 'q') {
                // console.log('ESCAPE...');
                resolve();
                watcher.close().then(() => {
                    log(INFO, 'Stopped Listening for File changes...');
                    process.exit();
                });
            }
        });
        console.log('Press Escape key or the \'q\'-key to stop listening for file changes, or the \'r\'-key to reload from cloud...');
    });
};
