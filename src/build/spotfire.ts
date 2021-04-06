import {
    askMultipleChoiceQuestionSearch,
    askQuestion,
    createTable,
    DEBUG, ERROR, getCurrentRegion, getOrganization,
    getPEXConfig,
    INFO,
    isOauthUsed,
    log,
    logLine,
    pexTable
} from "./common-functions";

const CCOM = require('./cloud-communications');
const colors = require('colors');

let jSession;
let xSRF;


async function callSpotfire(url, doLog, conf?) {
    // https://eu.spotfire-next.cloud.tibco.com/spotfire/wp/settings
    if (isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
        if (!jSession || !xSRF) {
            const originalConf = conf;
            if (conf) {
                conf['returnResponse'] = true;
                conf['handleErrorOutside'] = true;
            } else {
                conf = {returnResponse: true, handleErrorOutside: true};
            }
            const response = await CCOM.callTCA(url, doLog, conf);
            const loginCookie = response.headers['set-cookie'];
            //  logO(DEBUG, loginCookie);
            jSession = /JSESSIONID=(.*?);/g.exec(loginCookie)[1];
            xSRF = /XSRF-TOKEN=(.*?);/g.exec(loginCookie)[1];

            log(DEBUG, 'Got Spotfire Details] jSession: ', jSession);
            log(DEBUG, 'Got Spotfire Details]     xSRF: ', xSRF);
            return callSpotfire(url, doLog, originalConf);
        } else {
            const header = {};
            header["cookie"] = "JSESSIONID=" + jSession;
            header["X-XSRF-TOKEN"] = xSRF;
            header["referer"] = 'https://' + getCurrentRegion() + 'spotfire-next.cloud.tibco.com/spotfire/wp/startPage';
            if (conf) {
                conf['customHeaders'] = header;
            } else {
                conf = {customHeaders: header};
            }
            return await CCOM.callTCA(url, doLog, conf);
        }
    } else {
        log(ERROR, 'OAUTH Needs to be enabled for communication with SPOTFIRE, Please generate an OAUTH Token. Make sure it is enabled for TSC as well as SPOTFIRE.');
        process.exit(1);
    }
}

/*
    'spotfire.sbdf': 'Data file',
    'spotfire.dataconnection': 'Data connection',
    'spotfire.folder': 'Folder',
    'spotfire.mod': 'Mod file',
    'spotfire.query': 'Information link',
    'spotfire.dxp': 'Analysis file'

 */


const SF_TYPES = ["spotfire.folder", "spotfire.dxp", "spotfire.sbdf", "spotfire.mod"];

async function getSFolderInfo(folderId) {
    const request = {
        "folderId": folderId,
        "types": SF_TYPES
    }
    let re = await callSpotfire(CCOM.clURI.sf_reports, false, {method: 'POST', postRequest: request});
    return re;
}


// Function to browse spotfire reports
export async function browseSpotfire() {
    log(INFO, 'Browsing the Spotfire Library...');
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    let currentFolderID = SFSettings.HomeFolderId;
    // console.log('Initial Folder ID: ' , SFSettings.HomeFolderId);
    let doBrowse = true;
    while (doBrowse) {
        const sfReports = await getSFolderInfo(currentFolderID);
        // console.log('sfReports ', sfReports);
        let currentFolder = sfReports.CurrentFolder.Title;
        if (sfReports.CurrentFolder.DisplayPath) {
            currentFolder = sfReports.CurrentFolder.DisplayPath;
        }
        log(INFO, 'Current folder: ', colors.blue(currentFolder));
        let items = [];
        for (let parent of sfReports.Ancestors) {
            if (parent.ItemType === 'spotfire.folder') {
                let name = parent.Title;
                if (parent.DisplayName) {
                    name = parent.DisplayName;
                }
                items.push({
                    type: 'Parent',
                    id: parent.Id,
                    name: 'Parent) ' + name
                });
            }
        }
        for (let child of sfReports.Children) {
            let name = child.Title;
            if (child.DisplayName) {
                name = child.DisplayName;
            }
            if (child.ItemType === 'spotfire.folder') {
                items.push({
                    type: 'Child',
                    id: child.Id,
                    name: 'Child) ' + name
                });
            } else {
                if (child.ItemType === 'spotfire.dxp') {
                    items.push({
                        type: 'DXP',
                        id: child.Id,
                        name: 'DXP) ' + name,
                        item: child
                    });
                }
                if (child.ItemType === 'spotfire.mod') {
                    items.push({
                        type: 'MOD',
                        id: child.Id,
                        name: 'MOD) ' + name,
                        item: child
                    });
                }
            }
        }
        let tObject = createTable(sfReports.Children, CCOM.mappings.sf_reports, false);
        pexTable(tObject, 'spotfire-reports', getPEXConfig(), true);
        let itemArray = ['NONE'];
        for (const item of items) {
            itemArray.push(item.name);
        }
        const answer = await askMultipleChoiceQuestionSearch('On which Item would you like more details ?', itemArray);
        if (answer === 'NONE') {
            doBrowse = false;
        } else {
            for (const item of items) {
                if (item.name === answer) {
                    if (item.type === 'DXP' || item.type === 'MOD') {
                        // show more info on DXP
                        console.table(item.item);
                        await askQuestion('Press [enter] to continue...');
                    } else {
                        currentFolderID = item.id;
                    }
                }
            }
        }
    }
}


// Function to browse spotfire reports
export async function listSpotfire() {
    log(INFO, 'Listing the Spotfire Library...');
    /*
        'spotfire.sbdf': 'Data file',
            'spotfire.dataconnection': 'Data connection',
            'spotfire.folder': 'Folder',
            'spotfire.mod': 'Mod file',
            'spotfire.query': 'Information link',
            'spotfire.dxp': 'Analysis file'
    */
    // Ask for type
    const questionTypes = ['Spotfire Reports', 'Spotfire Mods', 'Information links', 'Data files', 'Data connections', 'NONE', 'ALL'];
    const typeForSearch = await askMultipleChoiceQuestionSearch('What Spotfire Library item would you like to list ?', questionTypes);
    if (typeForSearch.toLowerCase() !== 'none') {
        const map = {
            'Spotfire Reports': 'spotfire.dxp',
            'Spotfire Mods': 'spotfire.mod',
            'Information links': 'spotfire.query',
            'Data files': 'spotfire.sbdf',
            'Data connections': 'spotfire.dataconnection'
        }
        if(typeForSearch.toLowerCase() === 'all'){
            for (const [ReadableName, SFTypeName] of Object.entries(map)) {
                log(INFO, 'Looking for: ' + colors.blue(ReadableName)  + ' in library:');
                await listOnType(SFTypeName, ReadableName);
            }
        } else {
            let typeToSearch = typeForSearch;
            if(map[typeForSearch] != null){
                typeToSearch = map[typeForSearch];
            }
            await listOnType(typeToSearch, typeForSearch);
        }
        if ((global as any).SHOW_START_TIME) console.log((new Date()).getTime() - (global as any).TIME.getTime(), 'After SF List');
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}


async function listOnType(typeToList, typeName) {

    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    // console.log(SFSettings);

    // Go from Root
    const sfRoot = await getSFolderInfo(SFSettings.rootFolderId);
    // console.log('sfRoot ', sfRoot);

    // Look for Teams
    let teamsInfo = null;
    for (let folder of sfRoot.Children) {
        if (folder.IsFolder && folder.Path == '/Teams') {
            teamsInfo = await getSFolderInfo(folder.Id);
        }
    }
    if (teamsInfo !== null) {
        // console.log(teamsInfo);
        for (let teamFolder of teamsInfo.Children) {
            if (teamFolder.IsFolder && teamFolder.DisplayName) {
                if (teamFolder.DisplayName === getOrganization()) {
                    log(INFO, 'Organization Folder: ' + teamFolder.DisplayName + ' found...');
                    // console.log(teamFolder);
                    GlCounter = 0;
                    const items = await iterateItems(teamFolder.Id, typeToList);
                    console.log('');
                    // console.log(items);
                    if(items.length > 0){
                        let tObject = createTable(items, CCOM.mappings.sf_reports, false);
                        pexTable(tObject, 'list-spotfire', getPEXConfig(), true);
                    } else {
                        log(INFO, 'No ' + colors.yellow(typeName) + ' Found in ' + colors.blue(teamFolder.DisplayName) + '...');
                    }

                }
            }
        }
    } else {
        log(ERROR, 'Teams folder not found...');
    }
}


let GlCounter = 0;

async function iterateItems(baseFolderId, type) {
    // console.log('Finding: ' , type , ' in ', baseFolderId);
    let re = [];
    const iterateFolder = await getSFolderInfo(baseFolderId);
    for (let itItem of iterateFolder.Children) {
        // console.log(itItem.ItemType);
        if (itItem.ItemType === type) {
            // console.log('Found: ' + type);
            GlCounter++;
            re.push(itItem);
        }
        if (itItem.IsFolder) {
            logLine('                                                                                ');
            logLine('Drilling Down into: ' + itItem.DisplayPath);
            re = re.concat(await iterateItems(itItem.Id, type));
            // re.push();
        }
    }
    return re;
}
