import { INFO, log } from '../common/logging'
import { callTCA } from '../common/cloud-communications'
import { Analysis } from '../models/discover/analysis'
import { createTable, getPEXConfig, pexTable } from '../common/tables'
import { Dataset } from '../models/discover/dataset'
import { Template } from '../models/discover/template'
const CCOM = require('../common/cloud-communications')

export async function getProcessAnalysis (showTable: boolean) {
  log(INFO, 'Getting process analysis...')
  // https://discover.labs.tibcocloud.com/repository/analysis
  const disPA = await callTCA(CCOM.clURI.dis_pa, false, { skipInjectingRegion: true }) as Analysis[]
  const paTable = createTable(disPA, CCOM.mappings.dis_pa, false)
  pexTable(paTable, 'discover-process-analysis', getPEXConfig(), showTable)
  return disPA
}

export async function getDataSets (showTable: boolean) {
  log(INFO, 'Getting datasets...')
  // https://discover.labs.tibcocloud.com/catalog/datasets
  const disDS = await callTCA(CCOM.clURI.dis_ds, false, { skipInjectingRegion: true }) as Dataset[]
  // console.log(disDS)
  const paTable = createTable(disDS, CCOM.mappings.dis_ds, false)
  pexTable(paTable, 'discover-datasets', getPEXConfig(), showTable)
  return disDS
}

export async function getTemplates (showTable: boolean) {
  log(INFO, 'Getting templates...')
  // https://discover.labs.tibcocloud.com/visualisation/templates
  const disTEMP = await callTCA(CCOM.clURI.dis_temp, false, { skipInjectingRegion: true }) as Template[]
  // console.log(disTEMP)
  const paTable = createTable(disTEMP, CCOM.mappings.dis_temp, false)
  pexTable(paTable, 'discover-templates', getPEXConfig(), showTable)
  return disTEMP
}
