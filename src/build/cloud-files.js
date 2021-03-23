const CCOM = require('./cloud-communications');
const USERGROUPS = require('./user-groups');
const colors = require('colors');

const isWindows = process.platform === 'win32';
const dirDelimiter = isWindows ? '\\' : '/';

let CLOUD_FILES_FOLDER = './Cloud_Files/';
let cfInformed = false;

async function prepCloudFileProps() {
    // Shared state folder (picked up from configuration if exists)
    if (getProp('Cloud_File_Folder') != null) {
        CLOUD_FILES_FOLDER = getProp('Cloud_File_Folder');
    } else {
        addOrUpdateProperty(getPropFileName(), 'Cloud_File_Folder', CLOUD_FILES_FOLDER, 'Local folder used to download and upload Cloud Files to\n' +
            '# NOTE: You can use ~{ORGANIZATION}, to use the current organization name in your folder.');
    }
    // Potentially use the organization name in the Folder property
    if (CLOUD_FILES_FOLDER.toLowerCase().indexOf('~{organization}') > 0) {
        if (!getOrganization()) {
            await CCOM.showCloudInfo(false);
        }
        CLOUD_FILES_FOLDER = CLOUD_FILES_FOLDER.replace(/\~\{organization\}/ig, getOrganization());
        if (!cfInformed) {
            log(INFO, 'Using Local Folder (for cloud files): ' + colors.blue(CLOUD_FILES_FOLDER));
            cfInformed = true;
        }
    }
}

// Get a list of Cloud folders
export async function getOrgFolders(showFolders, countItems) {
    const folderStepSize = 200;
    let hasMoreFolders = true;
    let allFolders = [];
    for (let i = 0; hasMoreFolders; i = i + folderStepSize) {
        // let exportBatch = callURL(cloudURL + 'case/v1/cases?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i, 'GET', null, null, false);
        let skip = '';
        if (i != 0) {
            skip = '&$skip=' + i
        }
        const folderDet = await CCOM.callTCA(CCOM.clURI.la_org_folders + '?$top=' + folderStepSize + skip);
        if (folderDet) {
            if (folderDet.length < folderStepSize) {
                hasMoreFolders = false;
            }
            allFolders = allFolders.concat(folderDet);
        } else {
            hasMoreFolders = false;
        }
    }
    const folderTable = createTable(allFolders, CCOM.mappings.la_org_folders, false);
    if (countItems) {
        for (let fNr in folderTable) {
            const noItems = await CCOM.callTCA(CCOM.clURI.la_org_folders + '/' + folderTable[fNr].Name + '/artifacts?$count=TRUE');
            logLine('Processing folder (' + fNr + '/' + iterateTable(folderTable).length + ')');
            folderTable[fNr]['Number of Items'] = noItems;
        }
    }
    pexTable(folderTable, 'cloud-folders', getPEXConfig(), showFolders);
    return folderTable;
}

// Function to get org folders
export async function getOrgFolderFiles(folderTable, folder, showFiles) {
    const folderResp = await CCOM.callTCA(CCOM.clURI.la_org_folders + '/' + folder + '/artifacts/');
    const folderContentTable = createTable(folderResp, CCOM.mappings.la_org_folder_content, false);
    const users = await USERGROUPS.showLiveAppsUsers(false, false);
    for (let cont in folderContentTable) {
        for (let usr of iterateTable(users)) {
            if (usr.Id == folderContentTable[cont]['Author']) {
                folderContentTable[cont]['Author'] = usr['First Name'] + ' ' + usr['Last Name'];
            }
            if (usr.Id == folderContentTable[cont]['Modified By']) {
                folderContentTable[cont]['Modified By'] = usr['First Name'] + ' ' + usr['Last Name'];
            }
        }
    }
    pexTable(folderContentTable, 'cloud-folder-content', getPEXConfig(), showFiles);
    return folderContentTable;
}

// Function to download an org folder file
async function downLoadOrgFolderFile(folder, file) {
    log(INFO, '    Cloud Folder: ' + colors.blue(folder) + ' File: ' + colors.blue(file));
    // checkOrgFolderLocation();
    await prepCloudFileProps();
    mkdirIfNotExist(CLOUD_FILES_FOLDER);
    mkdirIfNotExist(CLOUD_FILES_FOLDER + '/' + folder);
    // const dataForFile = await CCOM.callTCA(CCOM.clURI.la_org_folder_download + '/' + folder + '/' + file + '?$download=true', true);
    let fileName = CLOUD_FILES_FOLDER + '/' + folder + '/' + file;
    if (CLOUD_FILES_FOLDER.endsWith('/')) {
        fileName = CLOUD_FILES_FOLDER + folder + '/' + file;
    }
    await CCOM.downloadFromCloud(fileName, CCOM.clURI.la_org_folder_download + '/' + folder + '/' + file + '?$download=true');
}

export async function showOrgFolders() {
    await prepCloudFileProps();
    const folderT = await getOrgFolders(true, true);
    let chFolder = ['NONE'];
    // TODO: Use mapping
    for (let fol of iterateTable(folderT)) {
        if (fol['Number of Items'] > 0) {
            chFolder.push(fol.Name);
        }
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('For which folder would you like to see the contents ?', chFolder);
    if (folderDecision != 'NONE') {
        await getOrgFolderFiles(folderT, folderDecision, true);
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to create an org folder
export async function createOrgFolder() {
    await prepCloudFileProps();
    const fName = await askQuestion('What is the name of the organization folder you would like to create (use "NONE" or press enter to not create a folder) ?');
    if (fName !== '' || fName.toLowerCase() !== 'none') {
        const postFolder = {
            "name": fName
        };
        const oResponse = await CCOM.callTCA(CCOM.clURI.la_org_folders, false, {
            method: 'POST',
            postRequest: postFolder
        });
        if (oResponse != null) {
            log(INFO, 'Successfully created folder: ', oResponse);
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to upload a file to an org folder
export async function uploadFileToOrgFolder() {
    await prepCloudFileProps();
    const folderT = await getOrgFolders(true, false);
    let chFolder = ['NONE'];
    for (let fol of iterateTable(folderT)) {
        chFolder.push(fol.Name);
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('To which folder would you like to upload a file ?', chFolder);
    if (folderDecision != 'NONE') {
        const localFileLocation = await askQuestion('Specify to location of the local file you want to upload ?');
        let cloudFileName = await askQuestion('Specify the fileName as which you would like to upload it (Or press enter or use "SAME" to use the same name)?');
        if (cloudFileName === '' || cloudFileName.toLowerCase() === 'same') {
            if (localFileLocation.indexOf(dirDelimiter) > 0) {
                cloudFileName = localFileLocation.substring(localFileLocation.lastIndexOf(dirDelimiter) + 1, localFileLocation.length);
            } else {
                cloudFileName = localFileLocation;
            }
        }
        log(INFO, 'Creating ' + colors.blue(cloudFileName) + ' in folder: ' + colors.blue(folderDecision));
        await uploadFile(localFileLocation, folderDecision, cloudFileName);

    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to upload a zip to the LiveApps ContentManagment API
export async function uploadFile(fileLocation, cloudFolder, cloudFileName) {
    const uploadFileURI = '/webresource/v1/orgFolders/' + cloudFolder + '/artifacts/' + cloudFileName + '/upload/';
    await CCOM.uploadToCloud('artifactContents', fileLocation, uploadFileURI);
}

// Download a file from an organization flder
export async function downloadFileFromOrgFolder() {
    await prepCloudFileProps();
    const folderT = await getOrgFolders(true, false);
    let chFolder = ['NONE'];
    for (let fol of iterateTable(folderT)) {
        chFolder.push(fol.Name);
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('From which folder would you like to download a file ?', chFolder);
    if (folderDecision.toLowerCase() !== 'none') {
        const orgFFiles = await getOrgFolderFiles(folderT, folderDecision, true);
        const chContent = ['NONE', 'ALL'];
        for (let fil of iterateTable(orgFFiles)) {
            chContent.push(fil.Name);
        }
        const fileDecision = await askMultipleChoiceQuestionSearch('Which file would you like to download ?', chContent);
        if (fileDecision.toLowerCase() === 'all') {
            const fArray = chContent.slice(2, chContent.length);
            log(INFO, 'Files to Download: ' + fArray.length);
            for (let fN in fArray) {
                log(INFO, 'Downloading file: ' + (Number(fN) + 1));
                await downLoadOrgFolderFile(folderDecision, fArray[fN]);
            }
        } else if (fileDecision.toLowerCase() !== 'none') {
            await downLoadOrgFolderFile(folderDecision, fileDecision);
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}


/*
ORG FOLDERS:

./Cloud_Folders/
./Cloud_Folders/caseFolders
./Cloud_Folders/orgFolders

Endpoints:

GET /caseFolders/
GET /caseFolders/{folderName}/
GET /caseFolders/{folderName}/artifacts/
GET /caseFolders/{folderName}/artifacts/{artifactName}/artifactVersions

GET /orgFolders/
GET /orgFolders/{folderName}/
GET /orgFolders/{folderName}/artifacts/
GET /orgFolders/{folderName}/artifacts/{artifactName}/artifactVersions

 */

// TODO: implement Function
export function exportOrgFolder() {
    log(ERROR, 'TODO: Implement...')
}

// TODO: implement Function
export function importOrgFolder() {
    log(ERROR, 'TODO: Implement...')
}

// TODO: implement Function
export function watchOrgFolder() {
    log(ERROR, 'TODO: Implement...')
}
