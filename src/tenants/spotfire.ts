import {
    col,
    createTable, doesExist,
    getCurrentRegion, getOrganization,
    getPEXConfig,
    isOauthUsed,
    pexTable
} from "../common/common-functions";
import {Global} from "../models/base";
import {CallConfig} from "../models/tcli-models";
import {SFCopyRequest, SFCreateFolderRequest, SFFolderInfo, SFLibObject, SFType, UploadDXP} from "../models/spotfire";
import {askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion} from "../common/user-interaction";
import {DEBUG, ERROR, INFO, log, logLine, WARNING} from "../common/logging";
import {getProp, prepProp} from "../common/property-file-management";
import {readableSize} from "../common/cloud-communications";

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
    prepProp('Spotfire_Do_Copy_With_New_Name', 'NO', '# This setting indicates when an item is copied in the library and the target location exists, it it needs to be added with a new name.\n' +
        '# So for example: Analysis_DXP (2), if set to NO the copy action will be ignored and a warning is given. Possible Values (YES | NO)');

}

// Function to browse spotfire reports
export async function browseSpotfire() {
    prepSpotfireProps();
    log(DEBUG, 'Browsing the Spotfire Library...');
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    let currentFolderID = SFSettings.HomeFolderId;
    let doBrowse = true;
    while (doBrowse) {
        const sfReports = await getSFolderInfo(currentFolderID);
        let currentFolder = sfReports.CurrentFolder.Title;
        if (sfReports.CurrentFolder.TCLIPath) {
            currentFolder = sfReports.CurrentFolder.TCLIPath;
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
    log(DEBUG, 'Listing the Spotfire Library...');
    // Ask for type
    const typeForSearch = await askTypes('What Spotfire Library item type would you like to list ?', true, true);
    if (typeForSearch.toLowerCase() !== 'none') {
        if (typeForSearch.toLowerCase() === 'all') {
            for (const [ReadableName, SFTypeName] of Object.entries(SF_FRIENDLY_TYPES)) {
                log(INFO, 'Looking for: ' + col.blue(ReadableName) + ' in library:');
                await listOnType(SFTypeName as SFType, false, true);
            }
        } else {
            await listOnType(typeForSearch, false, true);
        }
        if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'After SF List');
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to copy a library item from one place to another
export async function copySpotfire() {
    prepSpotfireProps();
    log(INFO, 'Copying Spotfire Library Item...');
    let itemToCopy: SFLibObject;
    let folderIdToCopyTo = '';
    // 1: Ask what type to copy
    const typeForCopy = await askTypes('What Spotfire Library item type would you like to copy ?');
    if (typeForCopy.toLowerCase() !== 'none') {
        // 2: Get everything that can be copied
        log(INFO, 'Getting all library items that can be copied...');
        const itemsAvailableForCopy = await listOnType(typeForCopy, false, true);
        // 3: Ask which element to copy
        if (itemsAvailableForCopy && itemsAvailableForCopy.length > 0) {
            const itemNameToCopy = await askMultipleChoiceQuestionSearch('Which item would you like to copy ?', ['NONE', ...itemsAvailableForCopy.map(v => v.TCLIPath)]);
            if (itemNameToCopy.toLowerCase() !== 'none') {
                itemToCopy = itemsAvailableForCopy.find(v => v.TCLIPath === itemNameToCopy)!;
                if (itemToCopy) {
                    // 4: List all folders
                    log(INFO, 'Getting all library folders that the item can be copied to...');
                    const sfFolders = await listOnType('spotfire.folder', false, false);
                    if (sfFolders) {
                        // 5: Ask what folder to copy to
                        log(INFO, 'Specify the target folder, you are currently in: ' + col.blue(getOrganization() + ' '));
                        const foldersToCopyTo = [];
                        for (const folder of sfFolders) {
                            if (folder && folder.TCLIPath) {
                                foldersToCopyTo.push(folder.TCLIPath);
                            }
                        }
                        const folderToCopyTo = await askMultipleChoiceQuestionSearch('To which folder would you like to copy ' + col.blue(itemNameToCopy) + ' ?', foldersToCopyTo);
                        // 6: Get the folder ID
                        const folderDetailsToCopyTo = sfFolders!.find(v => v.TCLIPath === folderToCopyTo);
                        if (folderDetailsToCopyTo) {
                            folderIdToCopyTo = folderDetailsToCopyTo.Id;
                            let doCopy = true;
                            if (getProp('Spotfire_Do_Copy_With_New_Name').toLowerCase() !== 'yes') {
                                const targetFolderInfo = await getSFolderInfo(folderIdToCopyTo);
                                doCopy = !doesExist(targetFolderInfo.Children.map(g => g.Title), itemToCopy.Title, `The library item ${itemToCopy.Title} already exists, we will not try to create it again (since Spotfire_Do_Copy_With_New_Name is set too NO).`);
                            }
                            if (doCopy) {
                                const copyRequest: SFCopyRequest = {
                                    itemsToCopy: [itemToCopy.Id],
                                    destinationFolderId: folderIdToCopyTo,
                                    conflictResolution: 'KeepBoth'
                                }
                                /*if (!copyRequest['conflictResolution']) {
                                    copyRequest['conflictResolution'] = 'KeepBoth';
                                }*/
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
                            }
                        } else {
                            log(ERROR, 'The folder that you are trying to copy to (' + folderToCopyTo + ') does not exist; create it first...');
                        }
                    } else {
                        log(ERROR, 'No target folders available for copying, create a folder first');
                    }
                } else {
                    log(ERROR, `We could not find your item to copy (${itemNameToCopy}), consider changing your Spotfire_Library_Base`);
                }
            } else {
                log(INFO, 'OK, I won\'t do anything :-)');
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
    const folders = await listOnType('spotfire.folder', false, false);
    if (folders && folders.length > 0) {
        // Step 2: Choose a parent folder
        const parentFolderName = await askMultipleChoiceQuestionSearch('For which folder would you like to create a subfolder ?', folders.map(v => v.TCLIPath));
        const parentFolder = folders.find(v => v.TCLIPath === parentFolderName)!;
        // Step 3: Get Id of parent folder
        const parentFolderId = parentFolder.Id;
        // Step 4: Ask for a name of the folder
        const fName = await askQuestion('What is the name of the folder you would like to create ? (use "NONE" or press enter to not create a folder)');
        if (fName && fName.toLowerCase() !== 'none') {
            const newFolderPath = parentFolder.TCLIPath + '/' + fName;
            if (!doesExist(folders.map(g => g.TCLIPath), newFolderPath, `The spotfire folder ${newFolderPath} already exists, we will not try to create it again...`)) {
                // Step 5: Possibly ask for a description of the folder
                let fDesc = await askQuestion('What is the description of the folder you would like to create ? (use "NONE" or press enter to leave blank)');
                if (fDesc.toLowerCase() === 'none') fDesc = '';
                // Step 6: Create the folder
                const createFolderRequest: SFCreateFolderRequest = {
                    description: fDesc,
                    keywords: "",
                    parentId: parentFolderId,
                    title: fName
                }
                const SFCreateFolder = await callSpotfire(CCOM.clURI.sf_create_folder, false, {
                    method: 'POST',
                    postRequest: createFolderRequest
                }) as SFLibObject;
                if (SFCreateFolder.Id) {
                    log(INFO, 'Successfully crated folder with name: ', col.green(fName) + ' and description ' + col.green(fDesc) + ' (new id: ' + SFCreateFolder.Id + ')');
                } else {
                    log(ERROR, 'Something went wrong while creating a library folder: ', SFCreateFolder);
                }
            }
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(ERROR, 'No parent folders found, adjust your Spotfire_Library_Base property: ' + getProp('Spotfire_Library_Base'));
    }
}

// Function to rename a Spotfire Item
export async function renameSpotfireLibraryItem() {
    prepSpotfireProps();
    log(DEBUG, 'Renaming a spotfire library item...');
    const typeForSearch = await askTypes('What Spotfire Library item type would you like to rename ?', false, true);
    if (typeForSearch.toLowerCase() !== 'none') {
        // Step 1: List all the Spotfire Library Items
        const itemsToRename = await listOnType(typeForSearch, false, false);
        // Step 2: Choose an item to rename
        if (itemsToRename) {
            const itemNameToRename = await askMultipleChoiceQuestionSearch('Which item would you like to rename ?', itemsToRename.map(v => v.TCLIPath));
            const itemToRename = itemsToRename.find(v => v.TCLIPath === itemNameToRename)!;
            // Step 3: Provide the new name
            const sfNewName = await askQuestion('What is the new name(Title) you want to rename ' + col.blue(itemToRename.Title) + ' to ? (use "NONE" or press enter to not rename)');
            if (sfNewName && sfNewName !== '' && sfNewName.toLowerCase() !== 'none') {
                // Step 4: Call the rename service
                const SFRename = await callSpotfire(CCOM.clURI.sf_rename, false, {
                    method: 'POST',
                    postRequest: {
                        itemId: itemToRename.Id,
                        title: sfNewName
                    }
                }) as SFLibObject;
                if (SFRename && SFRename.Title === sfNewName) {
                    console.table(SFRename);
                    log(INFO, 'Successfully renamed: ', col.blue(itemNameToRename) + ' to ' + col.green(sfNewName));
                } else {
                    log(ERROR, 'An error occurred renaming ', SFRename)
                }
            } else {
                log(INFO, 'OK, I won\'t do anything :-)');
            }
        } else {
            log(WARNING, 'No items found to rename...');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to share a library folder
export async function shareSpotfireLibraryFolder() {
    prepSpotfireProps();
    log(DEBUG, 'Sharing a spotfire library folder...');
    // Step 1: Show all folders that can be shared
    const itemsToShare = await listOnType("spotfire.folder", false, false);
    // Step 2: Choose a folder to share
    if (itemsToShare) {
        const itemNameToShare = await askMultipleChoiceQuestionSearch('Which folder would you like to share ?', ['NONE', ...itemsToShare.map(v => v.TCLIPath)]);
        if (itemNameToShare.toLowerCase() !== 'none') {
            const itemToShare = itemsToShare.find(v => v.TCLIPath === itemNameToShare)!;
            if (itemToShare) {
                // Step 3: Ask the email of the person to share it with
                const sfShareWith = await askQuestion('Provide the email address of the person you want to share ' + col.blue(itemToShare.Title) + ' with ? (use "NONE" or press enter to not share)');
                // TODO: Check for valid email
                if (sfShareWith && sfShareWith !== '' && sfShareWith.toLowerCase() !== 'none') {
                    // TODO: Step 4: Optionally ask for a message
                    // Step 5: Call the share API
                    const SFShare = await callSpotfire(CCOM.clURI.sf_share, false, {
                        method: 'POST',
                        postRequest: {
                            itemId: itemToShare.Id,
                            inherit: false,
                            recursive: true,
                            sharing: "shared",
                            users: [{email: sfShareWith, status: "new"}],
                            "message": "Shared through TCLI"
                        }
                    });
                    if (SFShare && SFShare.success) {
                        log(INFO, 'Successfully shared: ', col.green(itemNameToShare) + ' with ' + col.green(sfShareWith));
                    } else {
                        log(ERROR, 'An error occurred while sharing ', SFShare)
                    }
                } else {
                    log(INFO, 'OK, I won\'t do anything :-)');
                }
            } else {
                log(WARNING, 'Can\'t find ' + itemNameToShare + ' to share, does it exist ? (and is your Spotfire_Library_Base property set with the right scope ?)');
            }
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(WARNING, 'No folders found to share...');
    }
}


// Function to delete a library item
export async function deleteSpotfireLibraryItem() {
    prepSpotfireProps();
    log(DEBUG, 'Deleting a spotfire library item...');
    const typeForSearch = await askTypes('What Spotfire Library item type would you like to delete ?', false, true);
    if (typeForSearch.toLowerCase() !== 'none') {
        // Step 1: List all the Spotfire Library Items
        const itemsToDelete = await listOnType(typeForSearch, false, false);
        // Step 2: Choose an item to delete
        if (itemsToDelete) {
            const itemNameToDelete = await askMultipleChoiceQuestionSearch('Which item would you like to delete ?', ['NONE', ...itemsToDelete.map(v => v.TCLIPath)]);
            if (itemNameToDelete.toLowerCase() !== 'none') {
                const itemToDelete = itemsToDelete.find(v => v.TCLIPath === itemNameToDelete)!;
                if (itemToDelete) {
                    console.table(itemToDelete);
                    // Step 3: Make sure the user wants to delete the item
                    const doDelete = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO DELETE ' + col.blue(itemToDelete.Title) + ' ?', ['NO', 'YES']);
                    if (doDelete && doDelete !== '' && doDelete.toLowerCase() === 'yes') {
                        // Step 4: Call the delete service
                        const SFDelete = await callSpotfire(CCOM.clURI.sf_delete, false, {
                            method: 'POST',
                            postRequest: {
                                itemsToDelete: [
                                    itemToDelete.Id], force: false
                            }
                        });
                        if (SFDelete && SFDelete.Success) {
                            log(INFO, 'Successfully deleted: ', col.green(itemNameToDelete) + '... ');
                        } else {
                            log(ERROR, 'An error occurred deleting ', SFDelete)
                        }
                    } else {
                        log(INFO, 'OK, I won\'t do anything :-)');
                    }
                } else {
                    log(WARNING, 'Can\'t find ' + itemNameToDelete + ' to delete, does it exist ? (and is your Spotfire_Library_Base property set with the right scope ?)');
                }
            } else {
                log(INFO, 'OK, I won\'t do anything :-)');
            }
        } else {
            log(WARNING, 'No items found to delete...');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to Upload a Spotfire DXP
export async function uploadSpotfireDXP() {
    prepSpotfireProps();
    log(INFO, 'Uploading a Spotfire DXP...');
    // Step 1: Get the UID of the folder to Upload To
    const foldersToUpload = await listOnType("spotfire.folder", false, false);
    if (foldersToUpload) {
        const folderNameToUpload = await askMultipleChoiceQuestionSearch('To which folder would you like to upload a DXP ?', ['NONE', ...foldersToUpload.map(v => v.TCLIPath)]);
        if (folderNameToUpload.toLowerCase() !== 'none') {
            const folderToUpload = foldersToUpload.find(v => v.TCLIPath === folderNameToUpload)!;
            if (folderToUpload) {
                // console.log(folderToUpload);
                const folderIdToUpload = folderToUpload.Id;
                console.log('folderIdToUpload: ' + folderIdToUpload);
                // Step 2: Get the location of the dxp file to upload
                const dxpLocation = await askQuestion('What is the location of the DXP you would like to upload ?');
                if(dxpLocation.toLowerCase() !== '' && dxpLocation.toLowerCase() !== 'none'){
                    console.log('dxpLocation: ' + dxpLocation);
                    // https://eu.spotfire-next.cloud.tibco.com/spotfire/wp/Upload.xhr

                    const dxpIds = await uploadDXP( dxpLocation, 'spotfire-next.cloud.tibco.com', '/spotfire/wp/Upload.xhr');
                    console.log('Waid: ' , dxpIds.waid);
                    //await uploadDXP(dxpLocation, '/spotfire/attachment?c=1&alg=sha-256', 'spotfire-next.cloud.tibco.com' )
/*
                    const SFRename = await callSpotfire(CCOM.clURI.sf_rename, false, {
                        method: 'POST',
                        postRequest: {
                            itemId: dxpIds.waid,
                            title: 'AWESOME'
                        }
                    }) as SFLibObject;
                    console.log(SFRename);

                    const copyRequest: SFCopyRequest = {
                        itemsToCopy: [dxpIds.waid],
                        destinationFolderId: folderIdToUpload,
                        conflictResolution: 'KeepBoth'
                    }
                    const SFCopy = await callSpotfire(CCOM.clURI.sf_copy, false, {
                        method: 'POST',
                        postRequest: copyRequest
                    }) as SFLibObject[];
                    console.log(SFCopy);

 */

                } else {
                    log(INFO, 'OK, I won\'t do anything :-)');
                }



            }

        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(WARNING, 'No folders found to upload to...');
    }


    // Step 3: Call upload on /spotfire/attachment?c=1&alg=sha-256

    // Step 4: Call upload again: /spotfire/attachment?aid=<response from Upload Part - 1/2>&cmd=finish&c=1&b=1933490&sha-256=1493af2e7f7a32450b6f791f29be8f54a39c97dc6a083ba3fda31e5b72f17807

    // Step 5: Call the save operation: /spotfire/ws/LibraryService (a raw SOAP Message)




}



/*

<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <soap:Body>
        <saveItem xmlns="http://spotfire.tibco.com/ws/2008/12/library.xsd">
            <item xmlns="">
                <title>GatherStartSmart</title>
                <type>
                    <id>4f83cd47-71b5-11dd-050e-00100a64217d</id>
                    <label>dxp</label>
                    <labelPrefix>spotfire</labelPrefix>
                    <displayName>dxp</displayName>
                    <container>true</container>
                    <fileSuffix>dxp</fileSuffix>
                    <mimeType>application/vnd.spotfire.dxp</mimeType>
                </type>
                <formatVersion>10.9;10.8;10.3</formatVersion>
                <parentId>30c4c957-bb32-49eb-a47b-b6baf03e8e43</parentId>
                <size>0</size>
                <hidden>false</hidden>
                <properties>
                    <key>EmbedAllSourceData</key>
                    <value>False</value>
                </properties>
                <properties>
                    <key>EmbeddedDataFormatVersion</key>
                    <value>2</value>
                </properties>
                <properties>
                    <key>spotfire.Comments</key>
                    <value>RequiresReadAccess</value>
                </properties>
                <properties>
                    <key>spotfire.PrivateBookmarkCreation</key>
                    <value>RequiresReadAccess</value>
                </properties>
                <properties>
                    <key>Spotfire.Preview.Mode</key>
                    <value>Automatic</value>
                </properties>
                <properties>
                    <key>Spotfire.Connector</key>
                    <value>Spotfire.LiveAppsAdapter</value>
                </properties>
                <properties>
                    <key>spotfire.PublicBookmarkCreation</key>
                    <value>RequiresReadAndWriteAccess</value>
                </properties>
                <properties>
                    <key>AllowWebPlayerResume</key>
                    <value>True</value>
                </properties>
                <fieldsSet>Default</fieldsSet>
                <fieldsSet>Properties</fieldsSet>
            </item>
            <attachmentID xmlns="">bd8c373d-f56d-4447-86b5-4a529b6556b5</attachmentID>
            <fields xmlns="">Default</fields>
            <fields xmlns="">Path</fields>
        </saveItem>
    </soap:Body>
</soap:Envelope>
 */



// TODO: Implement
// Function to Download a Spotfire DXP
export async function downloadSpotfireDXP() {
    prepSpotfireProps();
    log(INFO, 'Downloading a Spotfire DXP...');

}



// Function to upload something to the TIBCO Cloud (for example app deployment or upload files)
async function uploadDXP(localFileLocation: string,  host: string, uploadFileURI: string) {
    return new Promise<UploadDXP>(async function (resolve) {
        const fd = require('form-data');
        const axios = require('axios');
        const fs = require('fs');
        let formData = new fd();
        const {size: fileSize} = fs.statSync(localFileLocation);
        log(INFO, 'UPLOADING DXP: ' + col.blue(localFileLocation) + ' (to:' + uploadFileURI + ')' + ' Filesize: ' + readableSize(fileSize));
        // formData.append(formDataType, fs.createReadStream(localFileLocation));
        const header: any = {};
        header['Content-Type'] = 'multipart/form-data; charset=UTF-8';
        header["cookie"] = "JSESSIONID=" + jSession;
        header["X-XSRF-TOKEN"] = xSRF;
        header["referer"] = 'https://' + getCurrentRegion() + 'spotfire-next.cloud.tibco.com/spotfire/wp/startPage';
        header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');

        formData.append(localFileLocation, fs.createReadStream(localFileLocation));
        const uploadURL = 'https://' + getCurrentRegion() + host + uploadFileURI;
        console.log(uploadURL);
        console.log( 'Headers:' , formData.getHeaders());
        header['content-type'] = formData.getHeaders()['content-type'];
        const res = await axios.post(uploadURL, formData, {
            headers: header
        });
        console.log(res.data);
        resolve(res.data);
    });
}



async function getSFolderInfo(folderId: string): Promise<SFFolderInfo> {
    const request = {
        "folderId": folderId,
        "types": SF_TYPES
    }
    const folderInfo = await callSpotfire(CCOM.clURI.sf_reports, false, {
        method: 'POST',
        postRequest: request
    }) as SFFolderInfo;
    // Add the path info from the right place
    if (folderInfo.Children && folderInfo.Children.length > 0) {
        folderInfo.Children = folderInfo.Children.map(sf => setTcliPath(sf))
    }
    if (folderInfo.Ancestors && folderInfo.Ancestors.length > 0) {
        folderInfo.Ancestors = folderInfo.Ancestors.map(sf => setTcliPath(sf))
    }
    if (folderInfo.CurrentFolder) {
        folderInfo.CurrentFolder = setTcliPath(folderInfo.CurrentFolder);
    }
    return folderInfo;
}

function setTcliPath(sfLibObject: SFLibObject): SFLibObject {
    if (sfLibObject) {
        if (sfLibObject.DisplayPath) {
            sfLibObject.TCLIPath = sfLibObject.DisplayPath;
        } else {
            if (sfLibObject.Path) {
                sfLibObject.TCLIPath = sfLibObject.Path;
            }
        }
        if (sfLibObject.TCLIPath && sfLibObject.TCLIPath.startsWith('/Users/.../')) {
            sfLibObject.TCLIPath = sfLibObject.TCLIPath.replace('/Users/.../', 'SHARED_WITH_ME/')
        }

    }
    return sfLibObject;
}

export function getNameForSFType(type: SFType): string {
    for (const [ReadableName, SFTypeName] of Object.entries(SF_FRIENDLY_TYPES)) {
        if (type === SFTypeName) {
            return ReadableName;
        }
    }
    return type;
}

export async function askTypes(question: string, doAll?: boolean, doFolders?: boolean): Promise<SFType> {
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
            if (process.stdout && process.stdout.columns) {
                logLine(' '.repeat(process.stdout.columns));
            }
            if (folder.TCLIPath) {
                logLine('Drilling Down into: ' + folder.TCLIPath);
            }
            if (folder.TCLIPath === folderPath) {
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
export async function listOnType(typeToList: SFType, fromRoot: boolean, addShared: boolean): Promise<SFLibObject[] | null> {
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
        let items = await iterateItems(sfFolderToList.Id, typeToList);
        if (addShared) {
            const sharedItems = await callSpotfire(CCOM.clURI.sf_shared_with_me, false, {
                method: "POST",
                postRequest: ''
            }) as SFLibObject[];
            for (const sharedItem of sharedItems) {
                if (sharedItem.IsFolder) {
                    items = items.concat(await iterateItems(sharedItem.Id, typeToList));
                } else {
                    items.push(sharedItem);
                }

            }
        }
        console.log('');
        if (items.length > 0) {
            let tObject = createTable(items, CCOM.mappings.sf_reports, false);
            pexTable(tObject, 'list-spotfire', getPEXConfig(), true);
            return items;
        } else {
            log(INFO, 'No ' + col.yellow(getNameForSFType(typeToList)) + ' Found in ' + col.blue(sfFolderToList.TCLIPath) + '...');
        }
    }
    return null;
}

async function iterateItems(baseFolderId: string, type: SFType): Promise<SFLibObject[]> {
    let re: SFLibObject[] = [];
    const iterateFolder = await getSFolderInfo(baseFolderId);
    if (type === 'spotfire.folder') {
        re.push(iterateFolder.CurrentFolder);
    }
    for (let itItem of iterateFolder.Children) {
        if (itItem.ItemType === type && type !== 'spotfire.folder') {
            if (itItem.TCLIPath) {
                re.push(itItem);
            }
        }
        if (itItem.IsFolder) {
            if (process.stdout && process.stdout.columns) {
                logLine(' '.repeat(process.stdout.columns));
            }
            if (itItem.TCLIPath) {
                logLine('Drilling Down into: ' + itItem.TCLIPath);
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
