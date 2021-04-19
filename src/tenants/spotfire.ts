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
import {SFCopyRequest, SFCreateFolderRequest, SFFolderInfo, SFLibObject, SFType} from "../models/spotfire";
import {askMultipleChoiceQuestionSearch, askQuestion} from "../common/user-interaction";
import {DEBUG, ERROR, INFO, log, logLine, WARNING} from "../common/logging";
import {getProp, prepProp} from "../common/property-file-management";

declare var global: Global;

const CCOM = require('../common/cloud-communications');
const SF_TYPES = ["spotfire.folder", "spotfire.dxp", "spotfire.sbdf", "spotfire.mod"];
const SF_FRIENDLY_TYPES: any = {
    'Spotfire Reports': 'spotfire.dxp',
    'Spotfire Mods': 'spotfire.mod',
    'Information links': 'spotfire.query',
    'Data files': 'spotfire.sbdf',
    'Data connections': 'spotfire.dataconnection',
    'Library Folders': 'spotfire.folder',
}

let jSession: string;
let xSRF: string;


export function prepSpotfireProps() {
    // Shared state filter (picked up from configuration if exists)
    prepProp('Spotfire_Library_Base', '/Teams/~{ORGANIZATION}', '------------------------\n' +
        '#  SPOTFIRE\n' +
        '# ------------------------\n' +
        '# The location in the library to search from.\n' +
        '#  NOTE: You can use ~{ORGANIZATION}, to use the current organization name in library base.\n' +
        '#  NOTE: Do not end this folder with a \'/\' character');
}

// Function to browse spotfire reports
export async function browseSpotfire() {
    prepSpotfireProps();
    log(INFO, 'Browsing the Spotfire Library...');
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    let currentFolderID = SFSettings.HomeFolderId;
    let doBrowse = true;
    while (doBrowse) {
        const sfReports = await getSFolderInfo(currentFolderID);
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

// Function to browse spotfire library
export async function listSpotfire() {
    prepSpotfireProps();
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

// Function to copy a library item from one place to another
export async function copySpotfire() {
    log(INFO, 'Copying Spotfire Library Item...');
    let itemToCopy: SFLibObject;
    let folderIdToCopyTo = '';
    // 1: Ask what type to copy
    const typeForCopy = await askTypes('What Spotfire Library item type would you like to copy ?');
    if (typeForCopy.toLowerCase() !== 'none') {
        // 2: List those types (of your org)
        // TODO: Should we ask here for folder type
        log(INFO, 'Getting all library items that can be copied...');
        const libTypes = await listOnType(typeForCopy);
        // 3: Ask which element to copy
        if (libTypes) {
            const itemNameToCopy = await askMultipleChoiceQuestionSearch('Which item would you like to copy ?', libTypes.map(v => v.DisplayPath));
            itemToCopy = libTypes.find(v => v.DisplayPath === itemNameToCopy)!;
            // 4: List all folders
            log(INFO, 'Getting all library folders that the item can be copied to...');
            const sfFolders = await listOnType('spotfire.folder', true);
            if(sfFolders) {
                // 5: Ask what folder to copy to
                log(INFO, 'Specify the target folder, you are currently in: ' + col.blue(getOrganization()));
                const folderToCopyTo = await askMultipleChoiceQuestionSearch('To which folder would you like to copy ' + col.blue(itemNameToCopy) + ' ?', sfFolders.map(v => v.DisplayPath));
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
                    if (itemToCopy.Title !== SFCopy[0].Title) {
                        log(WARNING, 'Item was renamed to: ' + SFCopy[0].Title);
                    }
                } else {
                    log(ERROR, 'Something went wrong while copying: ', SFCopy);
                }
            } else {
                log(ERROR, 'No target folders available for copying, create a folder first');
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// https://eu.spotfire-next.cloud.tibco.com/spotfire/rest/library/createFolder

// {"description":"Test","keywords":"","parentId":"ae0820f3-1c6a-4564-b02f-0ba0c7210f93","title":"MyFolder"}

export async function createSpotfireLibraryFolder() {
    prepSpotfireProps();
    log(INFO, 'Creating Spotfire Library Folder...');
    // Step 1: List all current folders
    const folders = await listOnType('spotfire.folder', false);
    if (folders && folders.length > 0) {
        // Step 2: Choose a parent folder
        const parentFolderName = await askMultipleChoiceQuestionSearch('For which folder would you like to create a subfolder ?', folders.map(v => v.DisplayPath));
        const parentFolder = folders.find(v => v.DisplayPath === parentFolderName)!;
        // Step 3: Get Id of parent folder
        const parentFolderId = parentFolder.Id;
        // Step 4: Ask for a name of the folder
        const fName = await askQuestion('What is the name of the folder you would like to create ? (use "NONE" or press enter to not create a folder)');
        if (fName && fName.toLowerCase() !== 'none') {
            // Step 5: Possibly ask for a description of the folder
            let fDesc = await askQuestion('What is the description of the folder you would like to create ? (use "NONE" or press enter to leave blank)');
            if (fDesc.toLowerCase() === 'none') fDesc = '';
            // Step 6: Create the folder
            const createFolderRequest:SFCreateFolderRequest = {
                description: fDesc,
                keywords: "",
                parentId: parentFolderId,
                title: fName
            }
            const SFCreateFolder = await callSpotfire(CCOM.clURI.sf_create_folder, false, {
                method: 'POST',
                postRequest: createFolderRequest
            }) as SFLibObject;
            if(SFCreateFolder.Id) {
                log(INFO, 'Successfully crated folder with name: ', col.green(fName) + ' and description ' + col.green(fDesc) + ' (new id: ' + SFCreateFolder.Id + ')');
            } else {
                log(ERROR, 'Something went wrong while creating a library folder: ', SFCreateFolder);
            }
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(ERROR, 'No parent folders found, adjust your Spotfire_Library_Base property: ' + getProp('Spotfire_Library_Base'));
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


async function getSFolderInfo(folderId: string): Promise<SFFolderInfo> {
    const request = {
        "folderId": folderId,
        "types": SF_TYPES
    }
    return await callSpotfire(CCOM.clURI.sf_reports, false, {method: 'POST', postRequest: request}) as SFFolderInfo;
}


function getNameForSFType(type: SFType): string {
    for (const [ReadableName, SFTypeName] of Object.entries(SF_FRIENDLY_TYPES)) {
        if (type === SFTypeName) {
            return ReadableName;
        }
    }
    return type;
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
    if (re.toLowerCase() !== 'none' && re.toLowerCase() !== 'all' && SF_FRIENDLY_TYPES[re]) {
        re = SF_FRIENDLY_TYPES[re];
    }
    return re as SFType;
}

// This function finds the folder details from Spotfire given a path (recursive)
async function findFolderFromPath(folderInfo: SFFolderInfo, folderPath: string): Promise<SFLibObject | null> {
    for (const folder of folderInfo.Children) {
        if (folder.IsFolder) {
            const pathToCompare = folder.DisplayPath || folder.Path;
            if (process.stdout && process.stdout.columns) {
                logLine(' '.repeat(process.stdout.columns));
            }
            if (folder.DisplayPath) {
                logLine('Drilling Down into: ' + pathToCompare);
            }
            if (pathToCompare === folderPath) {
                return folder;
            } else {
                const subFolder = await findFolderFromPath(await getSFolderInfo(folder.Id), folderPath);
                if (subFolder) {
                    return subFolder;
                }
            }
        }
    }
    return null;
}

// A function that searches though the spotfire lib for a specific type
export async function listOnType(typeToList: SFType, fromRoot?: boolean): Promise<SFLibObject[] | null> {
    const doFromRoot = fromRoot || false;
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    // Go from Root
    const sfRoot = await getSFolderInfo(SFSettings.rootFolderId);
    let searchFolder = sfRoot;
    let sfFolderToList: null | SFLibObject = sfRoot.CurrentFolder;
    if (!doFromRoot) {
        if (getProp('Spotfire_Library_Base') !== '/Teams/' + getOrganization()) {
            let folderToLookFrom = sfRoot;
            if (getProp('Spotfire_Library_Base').trim() === '') {
                sfFolderToList = sfRoot.CurrentFolder;
            } else {
                // if it is the teams folder, directly look from there
                if (getProp('Spotfire_Library_Base').startsWith('/Teams')) {
                    for (let folder of sfRoot.Children) {
                        if (folder.IsFolder && folder.Path == '/Teams') {
                            folderToLookFrom = await getSFolderInfo(folder.Id);
                        }
                    }
                }
                sfFolderToList = await findFolderFromPath(folderToLookFrom, getProp('Spotfire_Library_Base'));
            }
        } else {
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
            } else {
                sfFolderToList = searchFolder.CurrentFolder;
            }
        }
    }
    if (sfFolderToList) {
        const items = await iterateItems(sfFolderToList.Id, typeToList);
        console.log('');
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
    let re: any[] = [];
    const iterateFolder = await getSFolderInfo(baseFolderId);
    if (type === 'spotfire.folder') {
        re.push(iterateFolder.CurrentFolder);
    }
    for (let itItem of iterateFolder.Children) {
        if (itItem.ItemType === type && type !== 'spotfire.folder') {
            if (itItem.DisplayPath) {
                re.push(itItem);
            }
        }
        if (itItem.IsFolder) {
            const path = itItem.DisplayPath || itItem.Path;
            if (process.stdout && process.stdout.columns) {
                logLine(' '.repeat(process.stdout.columns));
            }
            if (itItem.DisplayPath) {
                logLine('Drilling Down into: ' + path);
            }
            re = re.concat(await iterateItems(itItem.Id, type));
        }
    }
    return re;
}


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
            return await CCOM.callTCA(url, doLog, conf);
        }
    } else {
        log(ERROR, 'OAUTH Needs to be enabled for communication with SPOTFIRE, Please generate an OAUTH Token. Make sure it is enabled for TSC as well as SPOTFIRE.');
        process.exit(1);
    }
}
