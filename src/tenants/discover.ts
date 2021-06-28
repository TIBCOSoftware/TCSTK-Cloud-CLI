import { ERROR, INFO, log, logCancel } from '../common/logging'
import { callTCA, postToCloud } from '../common/cloud-communications'
import { Analysis } from '../models/discover/analysis'
import { createTable, getPEXConfig, pexTable } from '../common/tables'
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

const CCOM = require('../common/cloud-communications')

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
  // https://discover.labs.tibcocloud.com/repository/analysis
  const disPA = await callTCA(CCOM.clURI.dis_pa, false, { skipInjectingRegion: true }) as Analysis[]
  const paTable = createTable(disPA, CCOM.mappings.dis_pa, false)
  pexTable(paTable, 'discover-process-analysis', getPEXConfig(), showTable)
  return disPA
}

// TODO: Show details
export async function getDataSets (showTable: boolean): Promise<Dataset[]> {
  log(INFO, 'Getting datasets...')
  // https://discover.labs.tibcocloud.com/catalog/datasets
  const disDS = await callTCA(CCOM.clURI.dis_ds, false, { skipInjectingRegion: true }) as Dataset[]
  // console.log(disDS)
  const paTable = createTable(disDS, CCOM.mappings.dis_ds, false)
  pexTable(paTable, 'discover-datasets', getPEXConfig(), showTable)
  return disDS
}

async function getDataSetDetail (dataSetId: string): Promise<DatasetDetail> {
  return await callTCA(CCOM.clURI.dis_dataset_detail + '/' + dataSetId, false, { skipInjectingRegion: true }) as DatasetDetail
}

// TODO: Show details
export async function getTemplates (showTable: boolean): Promise<Template[]> {
  log(INFO, 'Getting templates...')
  // https://discover.labs.tibcocloud.com/visualisation/templates
  const disTEMP = await callTCA(CCOM.clURI.dis_temp, false, { skipInjectingRegion: true }) as Template[]
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
  // https://discover.labs.tibcocloud.com/catalog/files
  const disFiles = await callTCA(CCOM.clURI.dis_files, false, { skipInjectingRegion: true }) as DiscoverFileInfo[]
  // console.log(disFiles)
  // TODO: Make a FILESIZE format, to display the filesize nicely
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
  // TODO: Implement
}

export async function createDataSet () {
  log(INFO, 'Creating a dataset...')
  prepDiscoverProps()
  // Ask if you want to monitor the progress
  const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the dataset creation ?', ['YES', 'NO'])
  // Create the dataset
  const dsResponse = await postToCloud(CCOM.clURI.dis_dataset_preview, 'What would you like to use to create a Dataset ?', getProp('Discover_Folder') + '/Datasets', '.json', { skipInjectingRegion: true }) as CreateDataSetResult
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
        const dsStatus = await callTCA(CCOM.clURI.dis_dataset_status + '/' + dsResponse.datasetId, false, { skipInjectingRegion: true }) as PreviewStatus
        if (dsStatus.Progression) {
          if (progress !== dsStatus.Progression) {
            log(INFO, 'Dataset Creation Status', col.green((dsStatus.Progression + '%').padStart(4)) + ' Message: ' + col.green(dsStatus.Message))
            progress = dsStatus.Progression
          }
          if (progress > 99) {
            isDone = true
          }
          if (progress === 0 && i > 25) {
            log(ERROR, 'There was an error creating the dataset', dsStatus)
          }
          await sleep(200)
        }
      }
    }
  } else {
    log(ERROR, 'Error creating dataset: ', dsResponse)
  }
}

export async function removeDataSet () {
  log(INFO, 'Removing a dataset...')
  prepDiscoverProps()

  // TODO: Implement

  // DELETE
  // https://discover.labs.tibcocloud.com/catalog/dataset/clidataset-525cd81f-c59e-4a60-b910-7b5a097e437d
}

export async function runProcessAnalysis () {
  log(INFO, 'Running Process Analysis...')
  // Ask if you want to monitor the progress
  const doProgress = await askMultipleChoiceQuestion('Do you want to monitor the progress of the process mining ?', ['YES', 'NO'])
  // Create the dataset
  const paResponse = await postToCloud(CCOM.clURI.dis_pa, 'What would you like to use to do process mining ?', getProp('Discover_Folder') + '/ProcessAnalysis', '.json', { skipInjectingRegion: true }) as CreateProcessAnalysisResult
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
        const pmStatus = await callTCA(CCOM.clURI.dis_pa_status + '/' + paResponse.id + '/status', false, { skipInjectingRegion: true }) as AnalysisStatus
        if (pmStatus.progression) {
          if (progress !== pmStatus.progression) {
            log(INFO, 'Process Mining Status', col.green((pmStatus.progression + '%').padStart(4)) + ' Message: ' + col.green(pmStatus.message))
            progress = pmStatus.progression
          }
          if (progress > 99) {
            isDone = true
          }
          if (progress === 0 && i > 25) {
            log(ERROR, 'There was an error creating the process analysis', pmStatus)
          }
          await sleep(200)
        }
      }
    }
  } else {
    log(ERROR, 'Error creating process analysis: ', paResponse)
  }
}

export async function rerunProcessAnalysis () {
  log(INFO, 'Re-Running Process Analysis...')
  // TODO: Implement
}

export async function archiveProcessAnalysis () {
  log(INFO, 'Archiving Process Analysis...')
  // TODO: Implement
}

export async function removeProcessAnalysis () {
  log(INFO, 'Removing Process Analysis...')
  // TODO: Implement
}
