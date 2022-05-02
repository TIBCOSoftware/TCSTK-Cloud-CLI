import {DEBUG, ERROR, INFO, log, logCancel, WARNING} from '../common/logging'
import {callTCA, postMessageToCloud, postToCloud, readableSize} from '../common/cloud-communications'
import {Analysis} from '../models/discover/analysis'
import {
    createTable,
    createTableFromObject,
    getPEXConfig,
    iterateTable,
    pexTable,
    showTableFromTobject
} from '../common/tables'
import {Dataset} from '../models/discover/dataset'
import {Template} from '../models/discover/template'
import {DiscoverFileInfo} from '../models/discover/FileInfo'
import {getProp, prepProp} from '../common/property-file-management'
import {
    col, doesFileExist,
    getCurrentRegion,
    getFilesFromFolder, getFolderSafeOrganization, getOrganization,
    mkdirIfNotExist,
    sleep,
    storeJsonToFile
} from '../common/common-functions'
import {askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion} from '../common/user-interaction'
import {CreateDataSetResult, CreateProcessAnalysisResult} from '../models/discover/CustomModels'
import {PreviewStatus} from '../models/discover/previewStatus'
import {AnalysisStatus} from '../models/discover/analysisStatus'
import {DatasetDetail} from '../models/discover/datasetDetail'
import path from 'path'
import Watcher from '../common/watcher'
import {InvestigationApplication} from "@tibco/discover-client-lib";

const CCOM = require('../common/cloud-communications')
const SKIP_REGION = true
const _ = require('lodash')

export function prepDiscoverProps() {
    // Checking if properties exist, otherwise create them with default values
    prepProp('Discover_Folder', './Project_Discover_NMS/', 'Folder used for Project Discover\n# NOTE: You can use ~{ORGANIZATION}, to use the current organization name in your folder. For Example:\n#Discover_Folder=./Project_Discover (~{ORGANIZATION})/')
    mkdirIfNotExist(getProp('Discover_Folder'))
    mkdirIfNotExist(getProp('Discover_Folder') + '/Datasets')
    mkdirIfNotExist(getProp('Discover_Folder') + '/DatasetFiles')
    mkdirIfNotExist(getProp('Discover_Folder') + '/Templates')
    mkdirIfNotExist(getProp('Discover_Folder') + '/ProcessAnalysis')
    mkdirIfNotExist(getProp('Discover_Folder') + '/Configuration')
}

// TODO: Show details
export async function getProcessAnalysis(showTable: boolean): Promise<Analysis[]> {
    log(INFO, 'Getting process analysis...')
    prepDiscoverProps()
    // https://discover.labs.tibcocloud.com/repository/analysis
    const disPA = await callTCA(CCOM.clURI.dis_pa, false, {skipInjectingRegion: SKIP_REGION}) as Analysis[]
    const paTable = createTable(disPA, CCOM.mappings.dis_pa, false)
    pexTable(paTable, 'discover-process-analysis', getPEXConfig(), showTable)
    return disPA
}

// Function to get all the datasets
async function getDataSets(showTable: boolean): Promise<Dataset[]> {
    log(INFO, 'Getting datasets...')
    prepDiscoverProps()
    // https://discover.labs.tibcocloud.com/catalog/datasets
    const disDS = await callTCA(CCOM.clURI.dis_ds, false, {skipInjectingRegion: SKIP_REGION}) as Dataset[]
    // console.log(disDS)
    const paTable = createTable(disDS, CCOM.mappings.dis_ds, false)
    pexTable(paTable, 'discover-datasets', getPEXConfig(), showTable)
    return disDS
}

// Show datasets and possibly details
export async function showDataSets() {
    const dataSets = await getDataSets(true)
    const dsToExport = await askMultipleChoiceQuestionSearch('For which dataset would you like to see the details ?', ['NONE', 'ALL', ...dataSets.map(v => v.name!)])
    if (dsToExport.toLowerCase() !== 'none') {
        if (dsToExport.toLowerCase() === 'all') {
            for (const ds of dataSets) {
                // console.log(await getDataSetDetail(ds.datasetid!))
                // const dsT = dataSets.find(v => v.name === dsToExport)!
                createTableFromObject(await getDataSetDetail(ds.datasetid!), 'DATASET - ' + ds.name)
            }
        } else {
            // console.table(await getDataSetDetail(dataSets.find(v => v.name === dsToExport)!.datasetid!))
            const ds = dataSets.find(v => v.name === dsToExport)!
            createTableFromObject(await getDataSetDetail(ds.datasetid!), 'DATASET - ' + ds.name)
        }
    } else {
        logCancel(true)
    }
}

// Function to get details for a dataset
async function getDataSetDetail(dataSetId: string): Promise<DatasetDetail> {
    return await callTCA(CCOM.clURI.dis_dataset_detail + '/' + dataSetId, false, {skipInjectingRegion: SKIP_REGION}) as DatasetDetail
}

// TODO: Show details
export async function getTemplates(showTable: boolean): Promise<Template[]> {
    log(INFO, 'Getting templates...')
    prepDiscoverProps()
    // https://discover.labs.tibcocloud.com/visualisation/templates
    const disTEMP = await callTCA(CCOM.clURI.dis_temp, false, {skipInjectingRegion: SKIP_REGION}) as Template[]
    // console.log(disTEMP)
    const paTable = createTable(disTEMP, CCOM.mappings.dis_temp, false)
    pexTable(paTable, 'discover-templates', getPEXConfig(), showTable)
    return disTEMP
}

// TODO: create-discover-template
// TODO: remove-discover-template

// TODO: Show details
export async function getDataSetFiles(showTable: boolean): Promise<DiscoverFileInfo[]> {
    log(INFO, 'Getting dataset file info...')
    prepDiscoverProps()
    // https://discover.labs.tibcocloud.com/catalog/files
    const disFiles = await callTCA(CCOM.clURI.dis_files, false, {skipInjectingRegion: SKIP_REGION}) as DiscoverFileInfo[]
    // console.log(disFiles)
    const paTable = createTable(disFiles, CCOM.mappings.dis_files, false)
    pexTable(paTable, 'discover-dataset-files', getPEXConfig(), showTable)
    return disFiles
}

// To run a test we need

// upload-discover-dataset-file
export async function uploadDataSetFile() {
    log(INFO, 'Uploading a dataset file...')
    prepDiscoverProps()
    const optionList = ['NONE', 'FILE', ...getFilesFromFolder(getProp('Discover_Folder') + '/DatasetFiles')]
    log(INFO, 'Use NONE to cancel, use FILE to use a custom file or choose a pre-provided file to upload...')
    const typeForUpload = await askMultipleChoiceQuestionSearch('What would you like to upload as a Dataset File ? ', optionList)
    if (typeForUpload.toLowerCase() !== 'none') {
        // let endpoint = replaceEndpoint(CCOM.clURI.dis_file_upload + '/' + (await getCurrentOrgId()).toLowerCase())
        // let endpoint = replaceEndpoint(CCOM.clURI.dis_file_upload + '/' + (await getCurrentOrgId()))
        let endpoint = replaceEndpoint(CCOM.clURI.dis_file_upload)
        if (typeForUpload.toLowerCase() === 'file') {
            // if FILE, ask the user for the file location
            const localFileLocation = await askQuestion('Provide the location of the file to upload as dataset file:')
            if (localFileLocation && localFileLocation.toLowerCase() !== 'none') {
                await uploadToDiscover(localFileLocation, endpoint, true)
            } else {
                logCancel(true)
            }
        } else {
            // user has provided the file
            await uploadToDiscover(path.join(getProp('Discover_Folder'), 'DatasetFiles', typeForUpload), endpoint, true)
        }
    } else {
        // if NONE, end interaction
        logCancel(true)
    }
}

async function uploadToDiscover(fileLocation: string, uploadURL: string, doCsv: boolean) {
    const axios = require('axios')
    const FormData = require('form-data')
    const fs = require('fs')
    const {size: fileSize} = fs.statSync(fileLocation)
    const data = new FormData()
    // TODO: Make configurable
    if (doCsv) {
        data.append('newline', '\\r\\n')
        data.append('encoding', 'UTF8')
        data.append('separator', ',')
        data.append('quoteChar', '"')
        data.append('escapeChar', '\\')
        data.append('csv', fs.createReadStream(fileLocation))
    } else {
        data.append('file', fs.createReadStream(fileLocation))
    }
    let url = 'https://'
    if (!SKIP_REGION) {
        url += getCurrentRegion(false)
    }
    url += uploadURL
    const config = {
        method: 'post',
        url: url,
        headers: {
            ...data.getHeaders(),
            Authorization: 'Bearer ' + getProp('CloudLogin.OAUTH_Token')
        },
        data: data
    }
    // console.log('Config: ' , config)
    log(INFO, 'UPLOADING FILE TO DISCOVER: ' + col.blue(fileLocation) + ' Filesize: ' + readableSize(fileSize))
    log(INFO, '                  ENDPOINT: ' + url)
    const response = await axios(config)
    let error = false
    if (response && response.status >= 200 && response.status < 300) {
        if (doCsv) {
            if (response.data && response.data.message && response.data.file) {
                log(INFO, 'FILE UPLOADED SUCCESSFULLY: ' + col.green(response.data.message) + ' File Location: ' + col.blue(response.data.file))
            } else {
                error = true
            }
        } else {
            if (response.statusText === 'Created') {
                log(INFO, col.green('FILE UPLOADED SUCCESSFULLY... '))
            } else {
                error = true
            }
        }
    }

    if (error) {
        log(ERROR, 'Error uploading file to discover (status: ' + response.status + ') Message: ', response.data)
    }
}

export async function removeDataSetFile() {
    log(INFO, 'Removing a dataset file...')
    prepDiscoverProps()
    const datasetFiles = await getDataSetFiles(true)
    const dsfToRemove = datasetFiles.filter(v => !v.beingUsed).map(v => v.redisFileInfo.OriginalFilename!)
    const dsFileNameToRemove = await askMultipleChoiceQuestionSearch('Which data-set file do you want to remove ?', ['NONE', ...dsfToRemove])
    if (dsFileNameToRemove.toLowerCase() !== 'none') {
        const dsToRemove = datasetFiles.find(v => v.redisFileInfo.OriginalFilename === dsFileNameToRemove)
        if (dsToRemove) {
            // https://discover.labs.tibcocloud.com/catalog/files/CallcenterExampleAutoTest.csv
            await CCOM.callTCA(CCOM.clURI.dis_files + '/' + dsToRemove.redisFileInfo.OriginalFilename, false, {
                method: 'DELETE',
                skipInjectingRegion: SKIP_REGION
            })
            log(INFO, col.green('Successfully removed dataset file: ') + col.blue(dsFileNameToRemove) + col.reset(' (Location: ' + dsToRemove.redisFileInfo.FileLocation + ')'))
        } else {
            log(ERROR, 'Dataset file: ' + dsFileNameToRemove + ' Not found...')
        }
    } else {
        logCancel(true)
    }
}

// const MAX_DATASET_CYCLES = 5
const MAX_DATASET_CYCLES = 1500

export async function createDataSet() {
    log(INFO, 'Creating a dataset...')
    prepDiscoverProps()
    // Ask if you want to monitor the progress
    const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the dataset creation ?', ['YES', 'NO'])
    // Create the dataset
    console.time('Creating Dataset Took')
    const dsResponse = await postToCloud(CCOM.clURI.dis_dataset_preview, 'What would you like to use to create a Dataset ?', path.join(getProp('Discover_Folder'), 'Datasets'), '.json', {skipInjectingRegion: SKIP_REGION}) as CreateDataSetResult
    if (dsResponse.status === 'OK') {
        log(INFO, 'Dataset Created with id: ' + col.green(dsResponse.datasetId))
        if (doProgress) {
            log(INFO, 'Monitoring the progress of the dataset creation...')
            let i = 0
            // Maximum 5 minutes = 200 ms * 5 = 1 second; 300 seconds is 1500 polls
            let isDone = false
            let progress = 0
            while (i <= MAX_DATASET_CYCLES && !isDone) {
                i++
                // https://discover.labs.tibcocloud.com/repository/analysis/e8defd49-8231-453a-82a3-356901b5a64b-1624626240682/status
                const dsStatus = await callTCA(CCOM.clURI.dis_dataset_status + '/' + dsResponse.datasetId, false, {
                    skipInjectingRegion: SKIP_REGION,
                    handleErrorOutside: true
                }) as PreviewStatus

                // console.log(dsStatus)
                if (dsStatus.Progression || dsStatus.Progression === 0) {
                    if (progress !== dsStatus.Progression) {
                        log(INFO, 'Dataset Creation Status', col.green((dsStatus.Progression + '%').padStart(4)) + ' Message: ' + col.green(dsStatus.Message))
                        progress = dsStatus.Progression
                    }
                    if (dsStatus.Progression > 99) {
                        isDone = true
                    }
                    if ((dsStatus.Progression === 0 && i > 10) || dsStatus.Level === 'ERROR') {
                        if (dsStatus.Message) {
                            log(ERROR, 'There was an error creating the dataset: ', dsStatus.Message)
                        } else {
                            log(ERROR, 'There was an UNKNOWN error creating the dataset: ', dsStatus)
                        }
                        process.exit(1)
                    }
                } else {
                    log(WARNING, 'No progress reported...', dsStatus)
                }
                await sleep(200)
            }
            log(INFO, 'Monitoring Dataset Took: ' + (i / 5) + ' Seconds...')
            console.timeEnd('Creating Dataset Took')
            if (i >= MAX_DATASET_CYCLES) {
                log(ERROR, 'Creating Dataset Timed Out...')
                process.exit(1)
            }
        }
    } else {
        log(ERROR, 'Error creating dataset: ', dsResponse)
    }
}

export async function exportDataSets() {
    log(INFO, 'Exporting Datasets...')
    prepDiscoverProps()
    const dataSets = await getDataSets(true)
    const dsToExport = await askMultipleChoiceQuestionSearch('Which datasets would you like to export ?', ['NONE', 'ALL', ...dataSets.map(v => v.name!)])
    if (dsToExport.toLowerCase() !== 'none') {
        if (dsToExport.toLowerCase() === 'all') {
            storeJsonToFile(getProp('Discover_Folder') + '/Datasets/ALL_Datasets_Summary.json', dataSets)
            for (const ds of dataSets) {
                storeJsonToFile(getProp('Discover_Folder') + '/Datasets/' + ds.name + '_details.json', await getDataSetDetail(ds.datasetid!))
                storeJsonToFile(getProp('Discover_Folder') + '/Datasets/' + ds.name + '.json', ds)
            }
        } else {
            storeJsonToFile(getProp('Discover_Folder') + '/Datasets/' + dsToExport + '_details.json', await getDataSetDetail(dataSets.find(v => v.name === dsToExport)!.datasetid!))
            storeJsonToFile(getProp('Discover_Folder') + '/Datasets/' + dsToExport + '.json', dataSets.find(v => v.name === dsToExport))
        }
    } else {
        logCancel(true)
    }
}

export async function removeDataSet() {
    log(INFO, 'Removing a dataset...')
    prepDiscoverProps()
    const datasets = await getDataSets(true)
    const dsNameToRemove = await askMultipleChoiceQuestionSearch('Which data set do you want to remove ?', ['NONE', ...datasets.map(v => v.name!)])
    if (dsNameToRemove.toLowerCase() !== 'none') {
        // Chosen PA
        const dsToRemove = datasets.find(v => v.name === dsNameToRemove)
        if (dsToRemove) {
            await CCOM.callTCA(CCOM.clURI.dis_dataset_detail + '/' + dsToRemove.datasetid, false, {
                method: 'DELETE',
                skipInjectingRegion: SKIP_REGION
            })
            // console.log(response)
            log(INFO, col.green('Successfully removed dataset: ') + col.blue(dsNameToRemove) + col.reset(' (id: ' + dsToRemove.datasetid + ')'))
        } else {
            log(ERROR, 'Dataset ' + dsNameToRemove + ' Not found...')
        }
    } else {
        logCancel(true)
    }
}

const MAX_PM_CYCLES = 4500

// const MAX_PM_CYCLES = 45

export async function runProcessAnalysis() {
    log(INFO, 'Running Process Analysis...')
    prepDiscoverProps()
    // Ask if you want to monitor the progress
    const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the process mining ?', ['YES', 'NO'])
    // Create the dataset
    console.time('Running Process Mining Took')
    const paResponse = await postToCloud(CCOM.clURI.dis_pa, 'What would you like to use to do process mining ?', getProp('Discover_Folder') + '/ProcessAnalysis', '.json', {skipInjectingRegion: SKIP_REGION}) as CreateProcessAnalysisResult
    if (paResponse.id) {
        log(INFO, 'Process Analysis created with id: ' + col.green(paResponse.id))
        if (doProgress) {
            log(INFO, 'Monitoring the progress of the process mining...')
            let i = 0
            // Maximum 15 minutes = 200 ms * 5 = 1 second; 300 seconds is 4500 polls
            let isDone = false
            let progress = 0
            while (i <= MAX_PM_CYCLES && !isDone) {
                i++
                // https://discover.labs.tibcocloud.com/repository/analysis/e8defd49-8231-453a-82a3-356901b5a64b-1624626240682/status
                const pmStatus = await callTCA(CCOM.clURI.dis_pa_status + '/' + paResponse.id + '/status', false, {skipInjectingRegion: SKIP_REGION}) as AnalysisStatus
                if (pmStatus.progression || pmStatus.progression === 0) {
                    if (progress !== pmStatus.progression) {
                        log(INFO, 'Process Mining Status', col.green((pmStatus.progression + '%').padStart(4)) + ' Message: ' + col.green(pmStatus.message))
                        progress = pmStatus.progression
                    }
                    if (pmStatus.progression > 99) {
                        isDone = true
                    }
                    if ((pmStatus.progression === 0 && i > 600) || pmStatus.level === 'ERROR') {
                        if (pmStatus.message) {
                            log(ERROR, 'There was an error creating the process analysis', pmStatus.message)
                        } else {
                            log(ERROR, 'There was an UNKNOWN error creating the process analysis: ', pmStatus)
                        }
                        process.exit(1)
                    }
                }
                await sleep(200)
            }
            log(INFO, 'Monitoring Process Mining Took: ' + (i / 5) + ' Seconds...')
            console.timeEnd('Running Process Mining Took')
            if (i >= MAX_PM_CYCLES) {
                log(ERROR, 'Process Mining Timed Out...')
                process.exit(1)
            }
        }
    } else {
        log(ERROR, 'Error creating process analysis: ', paResponse)
    }
}

export async function actionProcessAnalysis() {
    log(INFO, 'Action Process Analysis...')
    prepDiscoverProps()
    const prAnalysis = await getProcessAnalysis(false)
    const conf = {...CCOM.mappings.dis_pa}
    conf.entries.push({
        header: 'Available Actions',
        field: 'actions'
    })
    const paTable = createTable(prAnalysis, conf, false)
    pexTable(paTable, 'discover-process-analysis-actions', getPEXConfig(), true)
    // console.log(prAnalysis)
    await sleep(100)
    const doAction = await askMultipleChoiceQuestionSearch('Which action do you wish to execute on a Process Analysis ?', ['NONE', ...getAvailableActions(prAnalysis)])
    if (doAction.toLowerCase() !== 'none') {
        await sleep(100)
        const doActionPA = await askMultipleChoiceQuestionSearch('Which Process Analysis do you wish to ' + col.blue(doAction) + ' ?', ['NONE', ...getAvailablePAforAction(prAnalysis, doAction).map(v => v.data.name)])
        if (doActionPA.toLowerCase() !== 'none') {
            // Chosen PA
            const paChosen = prAnalysis.find(v => v.data.name === doActionPA)
            if (paChosen) {
                if (paChosen.actions && paChosen.actions.indexOf(doAction) > -1) {
                    log(INFO, 'Running ' + col.blue(doAction) + ' on Process Analysis: ', col.blue(paChosen.data.name) + ' (with id: ' + paChosen.id + ')')
                    // POST
                    // https://discover.labs.tibcocloud.com/repository/analysis/4c61e5ae-fc5e-4cab-b78b-834534069886-1624635032381/action/Archive
                    const actionResult = await callTCA(CCOM.clURI.dis_pa + '/' + paChosen.id + '/action/' + doAction, false, {
                        skipInjectingRegion: SKIP_REGION,
                        method: 'POST'
                    })
                    // console.log(actionResult)
                    if (actionResult) {
                        log(INFO, col.green('Successfully completed ' + doAction + '...'))
                    } else {
                        log(ERROR, 'Error Running action: ', actionResult)
                    }
                } else {
                    log(ERROR, 'Action (' + doAction + ') not allowed on Process Analysis: ', paChosen.data.name + ' (with id: ' + paChosen.id + ')')
                }
            } else {
                log(ERROR, 'Process Analysis not found: ', doActionPA)
            }
        } else {
            logCancel(true)
        }
    } else {
        logCancel(true)
    }
}

const STORE_OPTIONS = {spaces: 2, EOL: '\r\n'}

// Function to export the configuration of discover to a JSON file
export async function exportDiscoverConfig() {
    log(INFO, 'Exporting Discover Configuration ' + col.blue('(for ' + getOrganization() + ')'))
    prepDiscoverProps()
    const configResult = await callTCA(CCOM.clURI.dis_nms_configuration, false, {skipInjectingRegion: SKIP_REGION})
    const applicationConfigResult = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/applications', false, {skipInjectingRegion: SKIP_REGION})
    const configFileName = getProp('Discover_Folder') + '/Configuration/discover_config (' + getFolderSafeOrganization() + ').json'
    require('jsonfile').writeFileSync(configFileName, {
        ...configResult,
        investigations: applicationConfigResult
    }, STORE_OPTIONS)
    log(INFO, 'Exported Discover Configuration to : ' + col.green(configFileName))
}

// TODO: Formats & Messages seems to be missing
// Config service properties
const DISCOVER_CONFIGS =
    [{objectName: 'general', endpoint: 'general', label: 'General'},
        {objectName: 'landingPage', endpoint: 'landingpages', label: 'Landing Pages'},
        // TODO: Moved to investigations

        {objectName: 'investigations', endpoint: 'investigations', label: 'Investigations'},
        /*
        {objectName: 'investigations.applications', endpoint: 'investigations', label: 'Investigations'},
        // TODO: Moved to visualizations
        {objectName: 'analytics', endpoint: 'analytics', label: 'Analytics'},
        // TODO: Moved to catalog (only field is dateTime)
        {objectName: 'formats', endpoint: 'formats', label: 'Date Format'},
        // TODO: Moved to repository
        {objectName: 'automap', endpoint: 'automap', label: 'Auto Mapping'},
        {objectName: 'messages', endpoint: 'messages', label: 'Messages'}*/]

// Function to export the configuration of discover to a JSON file
export async function importDiscoverConfig(configFilename?: string, importAll?: boolean) {
    let configFileNameToUse = ''
    log(INFO, 'Importing Discover Configuration...')
    prepDiscoverProps()
    // if no file name provided look into the config folder
    if (!configFilename) {
        const defaultF = getProp('Discover_Folder') + '/Configuration/discover_config (' + getFolderSafeOrganization() + ').json'
        const optionList = ['NONE', 'DEFAULT', 'FILE', ...getFilesFromFolder(getProp('Discover_Folder') + '/Configuration')]
        log(INFO, 'Use NONE to cancel or DEFAULT to import the configuration file for this environment (in this case: ' + col.blue(defaultF) + ')')
        log(INFO, 'Use NONE to cancel, use FILE to use a custom file or choose a pre-provided file to upload...')
        const configFileForImport = await askMultipleChoiceQuestionSearch('Which configuration file would you like to import ? ', optionList)
        // console.log(configFileForImport)
        let configFileLocation
        switch (configFileForImport.toLowerCase()) {
            case 'none':
                logCancel(true)
                break
            case 'default':
                configFileNameToUse = defaultF
                break
            case 'file':
                configFileLocation = await askQuestion('Provide the location of the configuration file for import:')
                if (configFileLocation && configFileLocation.toLowerCase() !== 'none') {
                    configFileNameToUse = configFileLocation
                } else {
                    logCancel(true)
                }
                break
            default:
                configFileNameToUse = getProp('Discover_Folder') + '/Configuration/' + configFileForImport
        }
    } else {
        configFileNameToUse = configFilename
    }

    log(INFO, 'Analyzing: ' + col.blue(configFileNameToUse))
    const fs = require('fs')
    const configFile = fs.readFileSync(configFileNameToUse)
    let configObject: any = {}
    try {
        configObject = JSON.parse(configFile)
    } catch (error: any) {
        log(ERROR, 'JSON Parsing error on configuration: ', error.message)
        process.exit(1)
    }
    // Ask if all configuration needs to be added or just a single
    let configTypeToImport = 'all'
    if (!importAll) {
        const optionList = ['ALL', ...DISCOVER_CONFIGS.map(v => v.label), 'NONE']
        configTypeToImport = await askMultipleChoiceQuestionSearch('Which configuration type would you like to import ? ', optionList)
    }
    let disConf
    switch (configTypeToImport.toLowerCase()) {
        case 'none':
            logCancel(true)
            break
        case 'all':
            for (const disc of DISCOVER_CONFIGS.map(v => v.objectName)) {
                if (_.get(configObject, disc)) {
                    // console.log(configObject[disc])
                    log(DEBUG, 'Found the configuration for ' + disc)
                    // Upload this config
                    await updateDiscoverConfig(DISCOVER_CONFIGS.find(v => v.objectName === disc)!.endpoint, _.get(configObject, disc))
                } else {
                    log(WARNING, 'The configuration for ' + disc + ' seems to be missing !!!')
                }
            }
            break
        default: // Use the config file provided
            disConf = DISCOVER_CONFIGS.find(v => v.label.toLowerCase() === configTypeToImport.toLowerCase())!
            // console.log('_.get(configObject, disConf.objectName): ', _.get(configObject, disConf.objectName))
            if (_.get(configObject, disConf.objectName)) {
                await updateDiscoverConfig(disConf.endpoint, _.get(configObject, disConf.objectName))
                // await updateDiscoverConfig(disConf.endpoint, configObject[disConf.objectName])
            } else {
                log(ERROR, 'The configuration for ' + disConf.label + ' is missing !!!')
            }
    }
}

async function updateDiscoverConfig(endpoint: string, configObject: any) {
    log(INFO, 'Updating discover config (endpoint: ' + col.blue(endpoint) + ')')
    log(DEBUG, 'New Config: ', configObject)
    if (endpoint === 'investigations') {
        await updateDiscoverInvestigationConfig(configObject)
    } else {
        const result = await postMessageToCloud(CCOM.clURI.dis_nms_configuration + '/' + endpoint, configObject, {
            skipInjectingRegion: SKIP_REGION,
            handleErrorOutside: true,
            returnResponse: true
        })
        if (result && result.statusCode && result.statusCode === 201) {
            log(INFO, col.green('[RESULT OK]') + ' Updated discover config: ' + col.blue(endpoint))
        } else {
            log(ERROR, ' [RESULT FAILED] Updating discover config: ' + endpoint + '  Code: ', result.statusCode + ' Result: ', result.body)
        }
    }
}

async function updateDiscoverInvestigationConfig(investigations: InvestigationApplication[]) {
    if (investigations && investigations.length > 0) {
        for (const inv of investigations) {
            // Check if the id exists
            let doPost = true
            if (inv.id) {
                const applicationConfigResult = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/applications', false, {skipInjectingRegion: SKIP_REGION}) as InvestigationApplication[]
                const invOnServer = applicationConfigResult.find(v => v.id === inv.id)
                if (invOnServer) {
                    // Investigation exist on server
                    doPost = false
                    // Do a put to update the investigation
                    log(INFO, 'Investigation Application Config found on the server (id: ' + col.blue(inv.id) + ') updating the config')
                    const result = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/application', false, {
                        skipInjectingRegion: SKIP_REGION,
                        method: "PUT",
                        postRequest: [inv],
                        handleErrorOutside: true,
                        returnResponse: true
                    })
                    if (result && result.statusCode && result.statusCode === 200) {
                        log(INFO, col.green('[RESULT OK]') + ' Updated discover investigation application config: ' + col.blue(inv.id))
                    } else {
                        log(ERROR, ' [RESULT FAILED] Updating discover investigation application with id: ' + col.blue(inv.id) + '  Code: ', result.statusCode + ' Result: ', result.body)
                    }
                } else {
                    // delete the id (a new one will be created)
                    // @ts-ignore
                    delete inv.id
                }
            }
            if (doPost) {
                log(INFO, 'Investigation Application Config Not found on the server creating a new config...')
                const result = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/application', false, {
                    skipInjectingRegion: SKIP_REGION,
                    method: "POST",
                    postRequest: inv,
                    handleErrorOutside: true,
                    returnResponse: true
                })
                if (result && result.statusCode && result.statusCode === 201 && result.body && result.body.message) {
                    log(INFO, col.green('[RESULT OK]') + ' Created discover investigation application config: ' + col.blue(result.body?.message))
                } else {
                    log(ERROR, ' [RESULT FAILED] Creating discover investigation application config -  Code: ', result.statusCode + ' Result: ', result.body)
                }
            }
        }
    }
}

export async function deleteDiscoverInvestigationConfig() {
    log(INFO, 'Delete a discover investigation configuration...')
    prepDiscoverProps()
    // List all investigation configurations
    const applicationConfigResult = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/applications', false, {skipInjectingRegion: SKIP_REGION}) as InvestigationApplication[]
    const appInvConfTable = createTable(applicationConfigResult, CCOM.mappings.dis_nms_inv_conf, false)
    pexTable(appInvConfTable, 'discover-investigation-configurations', getPEXConfig(), true)
    const selectConf = ['NONE', ...iterateTable(appInvConfTable).map(v => v.Name + ' (' + v.Id + ')')]
    // Choose one to delete
    const decision = await askMultipleChoiceQuestionSearch('Which application configuration would you like to delete ?', selectConf)
    if (decision !== 'NONE') {
        let appConfToDelete = applicationConfigResult.find(ac => ac.customTitle + ' (' + ac.id + ')' === decision)
        if (!appConfToDelete) {
            // look for the id (allow this to be injected as well)
            appConfToDelete = applicationConfigResult.find(ac => ac.id === decision)
        }
        if (appConfToDelete) {
            const decisionSure = await askMultipleChoiceQuestion('Are you sure you want to delete application configuration with id (' + col.blue(appConfToDelete.id) + ') ?', ['YES', 'NO'])
            if (decisionSure.toLowerCase() === 'yes') {
                // Call the delete operation
                const response = await callTCA(CCOM.clURI.dis_nms_investigation_config + '/application/' + appConfToDelete.id, false, {
                    skipInjectingRegion: SKIP_REGION,
                    method: "DELETE"
                })
                if (response && response.result && response.result === 'OK' && response.message) {
                    log(INFO, 'Deletion successfully: ' + col.green(response.message))
                } else {
                    log(ERROR, 'Problem deleting: ', response)
                }
            } else {
                logCancel(true)
            }
        } else {
            log(ERROR, 'App conf ', decision, ' not found to delete...')
        }
    } else {
        logCancel(true)
    }
}

// Function to export the configuration of discover to a JSON file
export async function watchDiscoverConfig() {
    log(INFO, 'Watching Discover Configuration...')
    prepDiscoverProps()
    /*
    Watcher has two callbacks;
    refreshFiles --> This function calls the cloud and provides the input for the file (this is called initially (optionally) and everytime the user presses 'r'
    uploadOnRefresh --> This function gets the refreshed object everytime the watcher detects a file change.
     */
    const myWatcher = new Watcher(getProp('Discover_Folder') + '/Configuration/',
        async (_folder) => {
            // console.log('Refreshing files: ', folder)
            await exportDiscoverConfig()
        }, async (changedFile) => {
            // console.log('changed file: ', changedFile)
            await importDiscoverConfig('./' + changedFile, true)
            log(INFO, 'Updated all discover config in the cloud...')
        }
    )
    // Ask if you want to export before starting to watch
    const decision = await askMultipleChoiceQuestion('Before you watch the files for changes, do you want to do an export of the latest Discover Config ?', ['YES', 'NO'])
    if (decision === 'YES') {
        await myWatcher.pullFiles()
    }
    await myWatcher.watch()
    // Only watch one file
}

// Function to export the configuration of discover to a JSON file
export async function uploadDiscoverAsset() {
    log(INFO, 'Upload Discover Asset...')
    prepDiscoverProps()
    const fileToUpload = await askQuestion('Provide the location of the file that you wish to upload: ')

    if (fileToUpload && fileToUpload !== '' && doesFileExist(fileToUpload)) {
        // const fileNameToUse = await askQuestion('What file name would you like to use, when uploading (Use SAME or press enter to use the filename): ')
        // if (fileNameToUse.toLowerCase() === 'same' || fileNameToUse.trim() === '') {
        // }
        let endpoint = replaceEndpoint(CCOM.clURI.dis_nms_assets)

        await uploadToDiscover(fileToUpload, endpoint, false)

    } else {
        log(ERROR, 'Please provide a file name, that exists...')
    }


}

function replaceEndpoint(url: string): string {
    if (getProp('CloudLogin.Discover_Location') != null && getProp('CloudLogin.Discover_Location') !== 'discover.labs.tibcocloud.com') {
        url = url.replace('discover.labs.tibcocloud.com', getProp('CloudLogin.Discover_Location'))
        log(WARNING, 'Using another DISCOVER UPLOAD URL: ', getProp('CloudLogin.Discover_Location'))
    }
    return url
}


function getAvailablePAforAction(prAnalysis: Analysis[], action: string) {
    const re: Analysis[] = []
    for (const prA of prAnalysis) {
        if (prA.actions && prA.actions.length > 0) {
            if (prA.actions.indexOf(action) > -1) {
                re.push(prA)
            }
        }
    }
    return re
}

function getAvailableActions(prAnalysis: Analysis[]) {
    const actions = []
    for (const prA of prAnalysis) {
        if (prA.actions && prA.actions.length > 0) {
            for (const action of prA.actions) {
                if (!(actions.indexOf(action) > -1)) {
                    // We don't allow for the edit action
                    if (action !== 'Edit') {
                        actions.push(action)
                    }
                }
            }
        }
    }
    return actions
}
