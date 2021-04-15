import {
    col,
    createTable,
    getCurrentRegion, getOrganization,
    getPEXConfig,
    isOauthUsed,
    pexTable
} from "../common/common-functions";
import {Global} from "../models/base";
import {CallConfig} from "../models/tcli-models";
import {SFCopyRequest, SFFolderInfo, SFLibObject, SFType} from "../models/spotfire";
import {askMultipleChoiceQuestionSearch, askQuestion} from "../common/user-interaction";
import {DEBUG, ERROR, INFO, log, logLine, WARNING} from "../common/logging";

declare var global: Global;

const CCOM = require('../common/cloud-communications');

let jSession: string;
let xSRF: string;


async function callSpotfire(url: string, doLog?: boolean, conf?: CallConfig): Promise<any> {
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
            jSession = /JSESSIONID=(.*?);/g.exec(loginCookie)![1]!;
            xSRF = /XSRF-TOKEN=(.*?);/g.exec(loginCookie)![1]!;
            log(DEBUG, 'Got Spotfire Details] jSession: ', jSession);
            log(DEBUG, 'Got Spotfire Details]     xSRF: ', xSRF);
            return callSpotfire(url, doLog, originalConf);
        } else {
            const header: any = {};
            header["cookie"] = "JSESSIONID=" + jSession;
            header["X-XSRF-TOKEN"] = xSRF;
            header["referer"] = 'https://' + getCurrentRegion() + 'spotfire-next.cloud.tibco.com/spotfire/wp/startPage';
            conf = {...conf, customHeaders: header};
            /*
            if (conf) {
                conf['customHeaders'] = header;
            } else {
                conf = {customHeaders: header};
            }*/
            return await CCOM.callTCA(url, doLog, conf);
        }
    } else {
        log(ERROR, 'OAUTH Needs to be enabled for communication with SPOTFIRE, Please generate an OAUTH Token. Make sure it is enabled for TSC as well as SPOTFIRE.');
        process.exit(1);
    }
}


const SF_TYPES = ["spotfire.folder", "spotfire.dxp", "spotfire.sbdf", "spotfire.mod"];
const SF_FRIENDLY_TYPES: any = {
    'Spotfire Reports': 'spotfire.dxp',
    'Spotfire Mods': 'spotfire.mod',
    'Information links': 'spotfire.query',
    'Data files': 'spotfire.sbdf',
    'Data connections': 'spotfire.dataconnection',
    'Library Folders': 'spotfire.folder',
}

async function getSFolderInfo(folderId: string): Promise<SFFolderInfo> {
    const request = {
        "folderId": folderId,
        "types": SF_TYPES
    }
    return await callSpotfire(CCOM.clURI.sf_reports, false, {method: 'POST', postRequest: request}) as SFFolderInfo;
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
        log(INFO, 'Current folder: ', col.blue(currentFolder));
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
    // Ask for type
    const typeForSearch = await askTypes('What Spotfire Library item type would you like to list ?', true, true);
    if (typeForSearch.toLowerCase() !== 'none') {
        if (typeForSearch.toLowerCase() === 'all') {
            for (const [ReadableName, SFTypeName] of Object.entries(SF_FRIENDLY_TYPES)) {
                log(INFO, 'Looking for: ' + col.blue(ReadableName) + ' in library:');
                await listOnType(SFTypeName as SFType);
            }
        } else {
            await listOnType(typeForSearch);
        }
        if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'After SF List');
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}


function getNameForSFType(type: SFType): string {
    for (const [ReadableName, SFTypeName] of Object.entries(SF_FRIENDLY_TYPES)) {
        if (type === SFTypeName) {
            return ReadableName;
        }
    }
    return '';
}

async function askTypes(question: string, doAll?: boolean, doFolders?: boolean): Promise<SFType> {
    doAll = doAll || false;
    doFolders = doFolders || false;
    const questionTypes = ['NONE'];
    Object.entries(SF_FRIENDLY_TYPES).forEach(([key]) => {
        if (key === 'Library Folders') {
            if (doFolders) {
                questionTypes.push(key);
            }
        } else {
            questionTypes.push(key);
        }
    });
    if (doAll) {
        questionTypes.push('ALL');
    }
    let re = await askMultipleChoiceQuestionSearch(question, questionTypes);
    if (re.toLowerCase() !== 'none' && re.toLowerCase() !== 'all') {
        re = SF_FRIENDLY_TYPES[re];
    }
    return re as SFType;
}

export async function copySpotfire() {
    log(INFO, 'Copying Spotfire Library Item...');
    let itemToCopy:SFLibObject;
    let folderIdToCopyTo = '';
    // 1: Ask what type to copy
    const typeForCopy = await askTypes('What Spotfire Library item type would you like to copy ?');
    if (typeForCopy.toLowerCase() !== 'none') {
        // 2: List those types (of your org)
        // TODO: Should we ask here for folder type
        log(INFO, 'Getting all library items that can be copied...');
        const libTypes = await listOnType(typeForCopy);
        // console.log(libTypes);
        // 3: Ask which element to copy
        if (libTypes) {
            const itemNameToCopy = await askMultipleChoiceQuestionSearch('Which item would you like to copy ?', libTypes.map(v => v.DisplayPath));
            itemToCopy = libTypes.find(v => v.DisplayPath === itemNameToCopy)!;
            // 4: List all folders
            log(INFO, 'Getting all library folders that the item can be copied to...');
            const sfFolders = await listOnType('spotfire.folder', true);
            // 5: Ask what folder to copy to
            log(INFO, 'Specify the target folder, you are currently in: ' + col.blue(getOrganization()));
            const folderToCopyTo = await askMultipleChoiceQuestionSearch('To which folder would you like to copy ' + col.blue(itemNameToCopy) + ' ?', sfFolders!.map(v => v.DisplayPath));
            // 6: Get the folder ID
            folderIdToCopyTo = sfFolders!.find(v => v.DisplayPath === folderToCopyTo)!.Id;
            const copyRequest: SFCopyRequest = {
                itemsToCopy: [itemToCopy.Id],
                destinationFolderId: folderIdToCopyTo,
                conflictResolution: 'KeepBoth'
            }
            if (!copyRequest['conflictResolution']) {
                copyRequest['conflictResolution'] = 'KeepBoth';
            }
            const SFCopy = await callSpotfire(CCOM.clURI.sf_copy, false, {
                method: 'POST',
                postRequest: copyRequest
            }) as SFLibObject[];
            if (SFCopy && SFCopy.length > 0 && SFCopy[0] && SFCopy[0].Id) {
                log(INFO, 'Successfully copied: ', col.green(itemNameToCopy) + ' to ' + col.green(folderToCopyTo) + ' (new id: ' + SFCopy[0].Id + ')');
                if(itemToCopy.Title !== SFCopy[0].Title){
                    log(WARNING, 'Item was renamed to: ' + SFCopy[0].Title);
                }
            } else {
                log(ERROR, 'Something went wrong while copying: ' , SFCopy);
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to rename a Spotfire Item
/* TODO: Implement Function
export async function renameSpotfireItem() {

    let SFRename = {};
    log(INFO, 'Renaming with: ' , renameRequest)
    renameRequest['title'] = renameRequest['newName'];
    delete renameRequest['newName'];
    try {
        // Do a settings call first not to rename twice...
        const SFSettings = await callSpotfire(clURI.sf_settings, false, {manualOAUTH: oauthKey});
        SFRename = await callSpotfire(clURI.sf_rename, false, {method: 'POST', postRequest: renameRequest, manualOAUTH: oauthKey});
        // Catch Error
    } catch (e) {
        console.log('Got Error: ' + e);
        throw e;
    }
    return SFRename;
}*/


async function listOnType(typeToList: SFType, fromRoot?: boolean): Promise<SFLibObject[] | null> {
    const doFromRoot = fromRoot || false;
    // console.log('doFromRoot: ', doFromRoot)
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    // console.log(SFSettings);

    // Go from Root
    const sfRoot = await getSFolderInfo(SFSettings.rootFolderId);
    // console.log('sfRoot ', sfRoot);
    let searchFolder = sfRoot;
    if (!doFromRoot) {
        // Look for Teams
        for (let folder of sfRoot.Children) {
            if (folder.IsFolder && folder.Path == '/Teams') {
                const teamFolders = await getSFolderInfo(folder.Id);
                for (let teamFolder of teamFolders.Children) {
                    if (teamFolder.IsFolder && teamFolder.DisplayName) {
                        if (teamFolder.DisplayName === getOrganization()) {
                            log(INFO, 'Organization Folder: ' + teamFolder.DisplayName + ' found...');
                            searchFolder = await getSFolderInfo(teamFolder.Id);
                        }
                    }
                }
            }
        }
        if (searchFolder === sfRoot) {
            log(ERROR, 'Teams folder not found...');
        }
    }
    // console.log('searchFolder: ', searchFolder)
    const sfFolderToList = searchFolder.CurrentFolder;
    // console.log('sfFolderToList: ', sfFolderToList)
    if (sfFolderToList !== null) {
        const items = await iterateItems(sfFolderToList.Id, typeToList);
        console.log('');
        // console.log(items);
        if (items.length > 0) {
            let tObject = createTable(items, CCOM.mappings.sf_reports, false);
            pexTable(tObject, 'list-spotfire', getPEXConfig(), true);
            return items;
        } else {
            log(INFO, 'No ' + col.yellow(getNameForSFType(typeToList)) + ' Found in ' + col.blue(sfFolderToList.DisplayName) + '...');
        }
    }
    return null;
}

async function iterateItems(baseFolderId: string, type: SFType): Promise<any[]> {
    // console.log('Finding: ' , type , ' in ', baseFolderId);
    let re: any[] = [];
    const iterateFolder = await getSFolderInfo(baseFolderId);
    for (let itItem of iterateFolder.Children) {
        // console.log(itItem.ItemType);
        if (itItem.ItemType === type) {
            // console.log('Found: ' + type);
            if (itItem.DisplayPath) {
                re.push(itItem);
            }
        }
        if (itItem.IsFolder) {
            // logLine('                                                                                ');

            if (process.stdout && process.stdout.columns) {
                logLine(' '.repeat(process.stdout.columns));
            }
            if (itItem.DisplayPath) {
                logLine('Drilling Down into: ' + itItem.DisplayPath);
            }
            re = re.concat(await iterateItems(itItem.Id, type));
            // re.push();
        }
    }
    return re;
}
