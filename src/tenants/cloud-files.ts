import {
    col,
    doesExist, getOrganization,
    mkdirIfNotExist
} from '../common/common-functions'
import {
    createTable,
    getPEXConfig,
    iterateTable,
    pexTable
} from '../common/tables'
import {
    askMultipleChoiceQuestion,
    askMultipleChoiceQuestionSearch,
    askQuestion,
    isGlobalAnswersUsed
} from '../common/user-interaction'
import {ERROR, INFO, log, logCancel, logLine, WARNING} from '../common/logging'
import {addOrUpdateProperty, getProp, getPropFileName} from '../common/property-file-management'
import {Global} from '../models/base'

declare let global: Global

const CCOM = require('../common/cloud-communications')
const USERGROUPS = require('./user-groups')

let CLOUD_FILES_FOLDER = './Cloud_Files/'
let CLOUD_FILE_DO_DELETE_ALL_VERSIONS = false
let cfInformed = false

async function prepCloudFileProps() {
    // Cloud file folder (picked up from configuration if exists)
    if (getProp('Cloud_File_Folder') != null) {
        CLOUD_FILES_FOLDER = getProp('Cloud_File_Folder')
    } else {
        addOrUpdateProperty(getPropFileName(), 'Cloud_File_Folder', CLOUD_FILES_FOLDER, 'Local folder used to download and upload Cloud Files to\n' +
            '# NOTE: You can use ~{ORGANIZATION}, to use the current organization name in your folder.')
    }
    // Potentially use the organization name in the Folder property
    if (CLOUD_FILES_FOLDER.toLowerCase().indexOf('~{organization}') > 0) {
        if (!getOrganization()) {
            await CCOM.showCloudInfo(false)
        }
        CLOUD_FILES_FOLDER = CLOUD_FILES_FOLDER.replace(/~{organization}/ig, getOrganization())
        if (!cfInformed) {
            log(INFO, 'Using Local Folder (for cloud files): ' + col.blue(CLOUD_FILES_FOLDER))
            cfInformed = true
        }
    }
    // Get config to see if all versions can be deleted
    if (getProp('Cloud_File_Do_Delete_All_Versions') != null) {
        CLOUD_FILE_DO_DELETE_ALL_VERSIONS = getProp('Cloud_File_Do_Delete_All_Versions').toLowerCase() === 'yes'
    } else {
        addOrUpdateProperty(getPropFileName(), 'Cloud_File_Do_Delete_All_Versions', 'NO', 'Option to, when deleting a cloud file, to delete all versions of a cloud file at once. Options: (YES | NO)')
    }
}

// Get a list of Cloud folders
async function getOrgFoldersBase() {
    const folderStepSize = 200
    let hasMoreFolders = true
    let allFolders: any[] = []
    for (let i = 0; hasMoreFolders; i = i + folderStepSize) {
        // let exportBatch = callURL(cloudURL + 'case/v1/cases?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i, 'GET', null, null, false);
        hasMoreFolders = false
        let skip = ''
        if (i !== 0) {
            skip = '&$skip=' + i
        }
        const folderDet = await CCOM.callTCA(CCOM.clURI.la_org_folders + '?$top=' + folderStepSize + skip, false, {handleErrorOutside: true})
        if (folderDet) {
            if (folderDet.errorCode) {
                if (folderDet.errorCode === 'WR_FOLDER_DOES_NOT_EXIST') {
                    log(WARNING, 'No org folders exist yet...')
                    return []
                } else {
                    log(ERROR, 'Something went wrong: ', folderDet)
                }
            } else {
                if (folderDet.length === folderStepSize) {
                    hasMoreFolders = true
                }
                allFolders = allFolders.concat(folderDet)
            }
        }
    }
    return allFolders
}

export async function getOrgFolderTable(showFolders: boolean, countItems: boolean) {
    const allFolders = await getOrgFoldersBase()
    const folderTable = createTable(allFolders, CCOM.mappings.la_org_folders, false)
    if (countItems) {
        for (const fNr in folderTable) {
            const noItems = await CCOM.callTCA(CCOM.clURI.la_org_folders + '/' + folderTable[fNr].Name + '/artifacts?$count=TRUE')
            logLine('Processing folder (' + fNr + '/' + iterateTable(folderTable).length + ')')
            folderTable[fNr]['Number of Items'] = noItems
        }
        // To start a new line
        console.log('')
    }
    if (allFolders.length > 0) {
        pexTable(folderTable, 'cloud-folders', getPEXConfig(), showFolders)
    }
    return folderTable
}

// Function to get org folders
export async function getOrgFolderFiles(folder: string, showFiles: boolean) {
    const folderResp = await CCOM.callTCA(CCOM.clURI.la_org_folders + '/' + folder + '/artifacts/')
    const folderContentTable = createTable(folderResp, CCOM.mappings.la_org_folder_content, false)
    const users = await USERGROUPS.showLiveAppsUsers(false, false)
    for (const cont in folderContentTable) {
        for (const usr of iterateTable(users)) {
            if (usr.Id === folderContentTable[cont].Author) {
                folderContentTable[cont].Author = usr['First Name'] + ' ' + usr['Last Name']
            }
            if (usr.Id === folderContentTable[cont]['Modified By']) {
                folderContentTable[cont]['Modified By'] = usr['First Name'] + ' ' + usr['Last Name']
            }
        }
    }
    if(showFiles && Object.entries(folderContentTable).length === 0){
        log(INFO, col.yellow('The folder ') + col.blue(folder) + col.yellow(' does not contain any files...'))
    }
    pexTable(folderContentTable, 'cloud-folder-content', getPEXConfig(), showFiles)
    return folderContentTable
}

// Function to download an org folder file
async function downLoadOrgFolderFile(folder: string, file: string) {
    log(INFO, '    Cloud Folder: ' + col.blue(folder) + ' File: ' + col.blue(file))
    // checkOrgFolderLocation();
    await prepCloudFileProps()
    mkdirIfNotExist(CLOUD_FILES_FOLDER)
    mkdirIfNotExist(CLOUD_FILES_FOLDER + '/' + folder)
    // const dataForFile = await CCOM.callTCA(CCOM.clURI.la_org_folder_download + '/' + folder + '/' + file + '?$download=true', true);
    let fileName = CLOUD_FILES_FOLDER + '/' + folder + '/' + file
    if (CLOUD_FILES_FOLDER.endsWith('/')) {
        fileName = CLOUD_FILES_FOLDER + folder + '/' + file
    }
    await CCOM.downloadFromCloud(fileName, CCOM.clURI.la_org_folder_download + '/' + folder + '/' + file + '?$download=true')
}

// Function to delete file(s) from an organization folder
async function deleteOrgFolderFile(folder: string, file: string) {
    log(INFO, 'Deleting file: ')
    log(INFO, '    Cloud Folder: ' + col.blue(folder) + ' File: ' + col.blue(file))
    const deleteResponse = await CCOM.callTCA(CCOM.clURI.la_org_folders + '/' + folder + '/artifacts/' + file, false, {
        method: 'DELETE'
    })
    if (deleteResponse.message) {
        log(INFO, col.green(deleteResponse.message))
        // If we need to delete all versions
        if (CLOUD_FILE_DO_DELETE_ALL_VERSIONS) {
            // Check what the version is of this file
            const files = await getOrgFolderFiles(folder, false)
            // console.log('Files: ', files)
            const fileObject = iterateTable(files).find((f: any) => f.Name === file)
            if (fileObject && fileObject.Version) {
                const nextVersion = fileObject.Version
                log(INFO, 'Deleting next version: ', nextVersion)
                await deleteOrgFolderFile(folder, file)
            }
        } else {
            log(INFO, 'Only depleted the latest version of the file, change Cloud_File_Do_Delete_All_Versions to YES in your cloud property file to delete all versions at once.')
        }
    } else {
        log(ERROR, 'Problem deleting file; ', deleteResponse)
        process.exit(1)
    }
}

// Function to display all the org folders
export async function showOrgFolders() {
    await prepCloudFileProps()
    // Don't count the items if a global answer is set
    const folderT = await getOrgFolderTable(true, !isGlobalAnswersUsed())
    const chFolder = ['NONE']
    for (const fol of iterateTable(folderT)) {
        if (fol['Number of Items'] > 0) {
            chFolder.push(fol.Name)
        }
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('For which folder would you like to see the contents ?', chFolder)
    if (folderDecision !== 'NONE') {
        await getOrgFolderFiles(folderDecision, true)
    } else {
        logCancel(true)
    }
}

// Function to create an org folder
export async function createOrgFolder() {
    await prepCloudFileProps()
    const fName = await askQuestion('What is the name of the organization folder you would like to create (use "NONE" or press enter to not create a folder) ?')
    if (fName !== '' || fName.toLowerCase() !== 'none') {
        // Check if the folder does not already exist.
        const folders = await getOrgFoldersBase()
        if (!doesExist(folders.map((f: any) => f.name), fName, `The folder ${fName} already exists, we will not try to create it again...`)) {
            const postFolder = {
                name: fName
            }
            const oResponse = await CCOM.callTCA(CCOM.clURI.la_org_folders, false, {
                method: 'POST',
                postRequest: postFolder
            })
            if (oResponse != null) {
                log(INFO, 'Successfully created folder: ', oResponse)
            }
        }
    } else {
        logCancel(true)
    }
}

// Function to upload a file to an org folder
export async function uploadFileToOrgFolder() {
    await prepCloudFileProps()
    const folderT = await getOrgFolderTable(true, false)
    const chFolder = ['NONE']
    for (const fol of iterateTable(folderT)) {
        chFolder.push(fol.Name)
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('To which folder would you like to upload a file ?', chFolder)
    if (folderDecision !== 'NONE') {
        const localFileLocation = await askQuestion('Specify to location of the local file you want to upload ?')
        let cloudFileName = await askQuestion('Specify the fileName as which you would like to upload it (Or press enter or use "SAME" to use the same name)?')
        if (cloudFileName === '' || cloudFileName.toLowerCase() === 'same') {
            if (localFileLocation.indexOf(global.DIR_DELIMITER) > 0) {
                cloudFileName = localFileLocation.substring(localFileLocation.lastIndexOf(global.DIR_DELIMITER) + 1, localFileLocation.length)
            } else {
                cloudFileName = localFileLocation
            }
        }
        log(INFO, 'Creating ' + col.blue(cloudFileName) + ' in folder: ' + col.blue(folderDecision))
        await uploadFile(localFileLocation, folderDecision, cloudFileName)
    } else {
        logCancel(true)
    }
}

// Function to upload a zip to the LiveApps ContentManagment API
export async function uploadFile(fileLocation: string, cloudFolder: string, cloudFileName: string) {
    const uploadFileURI = '/webresource/v1/orgFolders/' + cloudFolder + '/artifacts/' + cloudFileName + '/upload/'
    await CCOM.uploadToCloud('artifactContents', fileLocation, uploadFileURI)
}

// Download a file from an organization flder
export async function downloadFileFromOrgFolder() {
    await prepCloudFileProps()
    const folderT = await getOrgFolderTable(true, false)
    const chFolder = ['NONE']
    for (const fol of iterateTable(folderT)) {
        chFolder.push(fol.Name)
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('From which folder would you like to download a file ?', chFolder)
    if (folderDecision.toLowerCase() !== 'none') {
        const orgFFiles = await getOrgFolderFiles(folderDecision, true)
        const chContent = ['NONE', 'ALL']
        for (const fil of iterateTable(orgFFiles)) {
            chContent.push(fil.Name)
        }
        const fileDecision = await askMultipleChoiceQuestionSearch('Which file would you like to download ?', chContent)
        if (fileDecision.toLowerCase() === 'all') {
            const fArray = chContent.slice(2, chContent.length)
            log(INFO, 'Number of files to Download: ' + fArray.length)
            for (const fN in fArray) {
                log(INFO, 'Downloading file: ' + (Number(fN) + 1))
                await downLoadOrgFolderFile(folderDecision, fArray[fN]!)
            }
        } else if (fileDecision.toLowerCase() !== 'none') {
            await downLoadOrgFolderFile(folderDecision, fileDecision)
        } else {
            logCancel(true)
        }
    } else {
        logCancel(true)
    }
}

// Download a file from an organization flder
export async function deleteFileFromOrgFolder() {
    await prepCloudFileProps()
    const folderT = await getOrgFolderTable(true, false)
    const chFolder = ['NONE']
    for (const fol of iterateTable(folderT)) {
        chFolder.push(fol.Name)
    }
    const folderDecision = await askMultipleChoiceQuestionSearch('From which folder would you like to delete a file ?', chFolder)
    if (folderDecision.toLowerCase() !== 'none') {
        const orgFFiles = await getOrgFolderFiles(folderDecision, true)
        const chContent = ['NONE', 'ALL']
        // const chContent = ['NONE']
        for (const fil of iterateTable(orgFFiles)) {
            chContent.push(fil.Name)
        }
        log(INFO, 'Deleting all versions of the file(s): ', col.blue(CLOUD_FILE_DO_DELETE_ALL_VERSIONS + ''))
        const fileDecision = await askMultipleChoiceQuestionSearch('Which file(s) would you like to delete ?', chContent)
        if (fileDecision.toLowerCase() === 'all') {
          // Ask are you sure ?
          const decision = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO DELETE ALL THE FILES FROM THE CLOUD FOLDER: ' +  folderDecision, ['YES', 'NO'])
          if(decision.toLowerCase() === 'yes'){
              const fArray = chContent.slice(2, chContent.length)
              log(INFO, 'Number of files to delete: ' + fArray.length)
              for (const fN in fArray) {
                  log(INFO, 'Deleting file: ' + (Number(fN) + 1))
                  await deleteOrgFolderFile(folderDecision, fArray[fN]!)
              }
          } else {
              logCancel(true)
          }
        } else if (fileDecision.toLowerCase() !== 'none') {
            await deleteOrgFolderFile(folderDecision, fileDecision)
        } else {
            logCancel(true)
        }
    } else {
        logCancel(true)
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
