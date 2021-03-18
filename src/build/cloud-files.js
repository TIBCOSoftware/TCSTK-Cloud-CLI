const CCOM = require('./cloud-communications');
const USERGROUPS = require('./user-groups');
const colors = require('colors');

let OrgFolderLocation;

// Function to get org folders
function checkOrgFolderLocation() {
    if (getProp('LA_Organization_Folder') == null) {
        const OrgFolderLocationDef = './LA_Organization_Folder/'
        log(INFO, 'No LA_Organization_Folder property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'LA_Organization_Folder', OrgFolderLocationDef, 'The location for exports and imports of the LiveApps organization folders');
        OrgFolderLocation = OrgFolderLocationDef;
    } else {
        OrgFolderLocation = getProp('LA_Organization_Folder');
    }
}

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
    pexTable(folderTable, 'live-apps-org-folders', getPEXConfig(), showFolders);
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
    pexTable(folderContentTable, 'live-apps-folder-folder-content', getPEXConfig(), showFiles);
    return folderContentTable;
}

// Function to download an org folder file
async function downLoadOrgFolderFile(folder, file) {
    checkOrgFolderLocation();
    mkdirIfNotExist(OrgFolderLocation);
    mkdirIfNotExist(OrgFolderLocation + '/' + folder);
    const dataForFile = await CCOM.callTCA(CCOM.clURI.la_org_folder_download + '/' + folder + '/' + file + '?$download=true', true);
    const fs = require('fs');
    // console.log('Data for file: ' , dataForFile);
    // TODO: Download the DATA correctly (jpeg etc.)
    const fileName = OrgFolderLocation + '/' + folder + '/' + file;
    fs.writeFileSync(fileName, dataForFile, 'utf8');
    log(INFO, 'LA Orgfolder data exported: ' + fileName);

}

export async function showOrgFolders() {
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
        const orgFFiles = await getOrgFolderFiles(folderT, folderDecision, true);
        const chContent = ['NONE'];
        for (let fil of iterateTable(orgFFiles)) {
            chContent.push(fil.Name);
        }
        const fileDecision = await askMultipleChoiceQuestionSearch('Which file would you like to download ?', chContent);
        if (fileDecision != 'NONE') {
            await downLoadOrgFolderFile(folderDecision, fileDecision);
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to create an org folder
export async function createOrgFolder() {
    const folderT = await getOrgFolders(true, false);
    log(INFO, 'Above are the existing Organizational folders.')
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
    const folderT = await getOrgFolders(true, false);
    let chFolder = ['NONE'];
    for (let fol of iterateTable(folderT)) {
        chFolder.push(fol.Name);
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('To which folder would you like to upload a file ?', chFolder);
    if (folderDecision != 'NONE') {
        const localFileLocation = await askQuestion('Specify to location of the local file you want to upload ?');
        const cloudFileName = await askQuestion('Specify the fileName as which you would like to upload it ?');
        await uploadFile(localFileLocation, folderDecision, cloudFileName);

    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to upload a zip to the LiveApps ContentManagment API
export function uploadFile(fileLocation, cloudFolder, cloudFileName) {
    return new Promise(async function (resolve, reject) {
        let formData = new require('form-data')();
        log(INFO, 'UPLOADING File: ' + fileLocation);
        // /orgFolders/{folderName}/artifacts/{artifactName}/upload/
        //
        const uploadFileURI = '/webresource/v1/orgFolders/' + cloudFolder  + '/artifacts/'+ cloudFileName+'/upload/';
        formData.append('artifactContents', require("fs").createReadStream(fileLocation));
        const header = {};
        header['Content-Type'] = 'multipart/form-data; charset=UTF-8';
        // Possibly add OAUTH Header...
        if (isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
            header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
        } else {
            const lCookie = await CCOM.cLogin();
            // console.log(lCookie);
            header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
        let query = require('https').request({
            hostname: getCurrentRegion() + CCOM.clURI.la_host,   //cloudHost,*/
            path: uploadFileURI,
            method: 'POST',
            headers: header
        }, (res) => {
            let data = '';
            res.on("data", (chunk) => {
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                console.log(data);
                if (data) {
                    const dataObj = JSON.parse(data);
                    if (dataObj && dataObj.message) {
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
