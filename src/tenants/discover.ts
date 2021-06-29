import { ERROR, INFO, log, logCancel, WARNING } from '../common/logging'
import { callTCA, postToCloud } from '../common/cloud-communications'
import { Analysis } from '../models/discover/analysis'
import { createTable, createTableFromObject, getPEXConfig, pexTable } from '../common/tables'
import { Dataset } from '../models/discover/dataset'
import { Template } from '../models/discover/template'
import { DiscoverFileInfo } from '../models/discover/FileInfo'
import { getProp, prepProp } from '../common/property-file-management'
import { col, mkdirIfNotExist, sleep, storeJsonToFile } from '../common/common-functions'
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch } from '../common/user-interaction'
import { CreateDataSetResult, CreateProcessAnalysisResult } from '../models/discover/CustomModels'
import { PreviewStatus } from '../models/discover/previewStatus'
import { AnalysisStatus } from '../models/discover/analysisStatus'
import { DatasetDetail } from '../models/discover/datasetDetail'
import path from 'path'

const CCOM = require('../common/cloud-communications')
const SKIP_REGION = true

export function prepDiscoverProps () {
  // Checking if properties exist, otherwise create them with default values
  prepProp('Discover_Folder', './Project_Discover/', 'Folder used for Project Discover\n# NOTE: You can use ~{ORGANIZATION}, to use the current organization name in your folder. For Example:\n#Discover_Folder=./Project_Discover (~{ORGANIZATION})/')
  mkdirIfNotExist(getProp('Discover_Folder'))
  mkdirIfNotExist(getProp('Discover_Folder') + '/Datasets')
  mkdirIfNotExist(getProp('Discover_Folder') + '/DatasetFiles')
  mkdirIfNotExist(getProp('Discover_Folder') + '/Templates')
  mkdirIfNotExist(getProp('Discover_Folder') + '/ProcessAnalysis')
}

// TODO: Show details
export async function getProcessAnalysis (showTable: boolean): Promise<Analysis[]> {
  log(INFO, 'Getting process analysis...')
  prepDiscoverProps()
  // https://discover.labs.tibcocloud.com/repository/analysis
  const disPA = await callTCA(CCOM.clURI.dis_pa, false, { skipInjectingRegion: SKIP_REGION }) as Analysis[]
  const paTable = createTable(disPA, CCOM.mappings.dis_pa, false)
  pexTable(paTable, 'discover-process-analysis', getPEXConfig(), showTable)
  return disPA
}

// Function to get all the datasets
async function getDataSets (showTable: boolean): Promise<Dataset[]> {
  log(INFO, 'Getting datasets...')
  prepDiscoverProps()
  // https://discover.labs.tibcocloud.com/catalog/datasets
  const disDS = await callTCA(CCOM.clURI.dis_ds, false, { skipInjectingRegion: SKIP_REGION }) as Dataset[]
  // console.log(disDS)
  const paTable = createTable(disDS, CCOM.mappings.dis_ds, false)
  pexTable(paTable, 'discover-datasets', getPEXConfig(), showTable)
  return disDS
}

// Show datasets and possibly details
export async function showDataSets () {
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
async function getDataSetDetail (dataSetId: string): Promise<DatasetDetail> {
  return await callTCA(CCOM.clURI.dis_dataset_detail + '/' + dataSetId, false, { skipInjectingRegion: SKIP_REGION }) as DatasetDetail
}

// TODO: Show details
export async function getTemplates (showTable: boolean): Promise<Template[]> {
  log(INFO, 'Getting templates...')
  prepDiscoverProps()
  // https://discover.labs.tibcocloud.com/visualisation/templates
  const disTEMP = await callTCA(CCOM.clURI.dis_temp, false, { skipInjectingRegion: SKIP_REGION }) as Template[]
  // console.log(disTEMP)
  const paTable = createTable(disTEMP, CCOM.mappings.dis_temp, false)
  pexTable(paTable, 'discover-templates', getPEXConfig(), showTable)
  return disTEMP
}

// TODO: create-discover-template
// TODO: remove-discover-template

// TODO: Show details
export async function getDataSetFiles (showTable: boolean): Promise<DiscoverFileInfo[]> {
  log(INFO, 'Getting dataset file info...')
  prepDiscoverProps()
  // https://discover.labs.tibcocloud.com/catalog/files
  const disFiles = await callTCA(CCOM.clURI.dis_files, false, { skipInjectingRegion: SKIP_REGION }) as DiscoverFileInfo[]
  // console.log(disFiles)
  const paTable = createTable(disFiles, CCOM.mappings.dis_files, false)
  pexTable(paTable, 'discover-dataset-files', getPEXConfig(), showTable)
  return disFiles
}

export async function exportDataSets () {
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

// To run a test we need

// upload-discover-dataset-file
export async function uploadDataSetFile () {
  log(INFO, 'Uploading a dataset file...')
  prepDiscoverProps()
  // TODO: Implement

  // upload-discover-dataset-file, upload-discover-file (https://discover.labs.tibcocloud.com/files/01dzbgce4xgn899zq7ns238vk3)(orgID)
  /*
    newline: \r\n
    encoding: UTF8
    separator: ,
    quoteChar: "
    escapeChar: \
    csv: (binary)
     */
}

export async function removeDataSetFile () {
  log(INFO, 'Removing a dataset file...')
  prepDiscoverProps()
  // TODO: Implement
}

export async function createDataSet () {
  log(INFO, 'Creating a dataset...')
  prepDiscoverProps()
  // Ask if you want to monitor the progress
  const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the dataset creation ?', ['YES', 'NO'])
  // Create the dataset
  const dsResponse = await postToCloud(CCOM.clURI.dis_dataset_preview, 'What would you like to use to create a Dataset ?', path.join(getProp('Discover_Folder'), 'Datasets'), '.json', { skipInjectingRegion: SKIP_REGION }) as CreateDataSetResult
  if (dsResponse.status === 'OK') {
    log(INFO, 'Dataset Created with id: ' + col.green(dsResponse.datasetId))
    if (doProgress) {
      log(INFO, 'Monitoring the progress of the dataset creation...')
      let i = 0
      // Maximum 5 minutes = 200 ms * 5 = 1 second; 300 seconds is 1500 polls
      let isDone = false
      let progress = 0
      while (i < 1500 && !isDone) {
        i++
        // https://discover.labs.tibcocloud.com/repository/analysis/e8defd49-8231-453a-82a3-356901b5a64b-1624626240682/status
        const dsStatus = await callTCA(CCOM.clURI.dis_dataset_status + '/' + dsResponse.datasetId, false, { skipInjectingRegion: SKIP_REGION }) as PreviewStatus
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
    }
  } else {
    log(ERROR, 'Error creating dataset: ', dsResponse)
  }
}

export async function removeDataSet () {
  log(INFO, 'Removing a dataset...')
  prepDiscoverProps()
  const datasets = await getDataSets(true)
  const dsNameToRemove = await askMultipleChoiceQuestionSearch('Which data set do you want to remove ?', ['NONE', ...datasets.map(v => v.name!)])
  if (dsNameToRemove.toLowerCase() !== 'none') {
    // Chosen PA
    const dsToRemove = datasets.find(v => v.name === dsNameToRemove)
    if (dsToRemove) {
      await CCOM.callTCA(CCOM.clURI.dis_dataset_detail + '/' + dsToRemove.datasetid, false, { method: 'DELETE', skipInjectingRegion: SKIP_REGION })
      // console.log(response)
      log(INFO, col.green('Successfully removed dataset: ') + col.blue(dsNameToRemove) + col.reset(' (id: ' + dsToRemove.datasetid + ')'))
    } else {
      log(ERROR, 'Dataset ' + dsNameToRemove + ' Not found...')
    }
  } else {
    logCancel(true)
  }
}

export async function runProcessAnalysis () {
  log(INFO, 'Running Process Analysis...')
  prepDiscoverProps()
  // Ask if you want to monitor the progress
  const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the process mining ?', ['YES', 'NO'])
  // Create the dataset
  const paResponse = await postToCloud(CCOM.clURI.dis_pa, 'What would you like to use to do process mining ?', getProp('Discover_Folder') + '/ProcessAnalysis', '.json', { skipInjectingRegion: SKIP_REGION }) as CreateProcessAnalysisResult
  if (paResponse.id) {
    log(INFO, 'Process Analysis created with id: ' + col.green(paResponse.id))
    if (doProgress) {
      log(INFO, 'Monitoring the progress of the process mining...')
      let i = 0
      // Maximum 15 minutes = 200 ms * 5 = 1 second; 300 seconds is 4500 polls
      let isDone = false
      let progress = 0
      while (i < 4500 && !isDone) {
        i++
        // https://discover.labs.tibcocloud.com/repository/analysis/e8defd49-8231-453a-82a3-356901b5a64b-1624626240682/status
        const pmStatus = await callTCA(CCOM.clURI.dis_pa_status + '/' + paResponse.id + '/status', false, { skipInjectingRegion: SKIP_REGION }) as AnalysisStatus
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
    }
  } else {
    log(ERROR, 'Error creating process analysis: ', paResponse)
  }
}

export async function actionProcessAnalysis () {
  log(INFO, 'Action Process Analysis...')
  prepDiscoverProps()
  const prAnalysis = await getProcessAnalysis(false)
  const conf = { ...CCOM.mappings.dis_pa }
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
          const actionResult = await callTCA(CCOM.clURI.dis_pa + '/' + paChosen.id + '/action/' + doAction, false, { skipInjectingRegion: SKIP_REGION, method: 'POST' })
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

function getAvailablePAforAction (prAnalysis: Analysis[], action: string) {
  const re:Analysis[] = []
  for (const prA of prAnalysis) {
    if (prA.actions && prA.actions.length > 0) {
      if (prA.actions.indexOf(action) > -1) {
        re.push(prA)
      }
    }
  }
  return re
}

function getAvailableActions (prAnalysis: Analysis[]) {
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
