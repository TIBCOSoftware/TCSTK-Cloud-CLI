import { callTCA, clURI } from '../common/cloud-communications'
import { createTable, getPEXConfig, pexTable } from '../common/tables'
import { INFO, log } from '../common/logging'
import { NimbusMapsResponse } from '../models/nimbus'
const CCOM = require('../common/cloud-communications')

export async function showNimbusMaps () {
  log(INFO, 'Getting Nimbus maps...')
  const nimbusMaps = (await callTCA(clURI.nimbus_maps) as NimbusMapsResponse).items
  for (const map of nimbusMaps) {
    map.isMaster = 'master' in map
  }
  const nimbusMapsTable = createTable(nimbusMaps, CCOM.mappings.nimbus_maps, false)
  pexTable(nimbusMapsTable, 'nimbus-maps', getPEXConfig(), true)
  return nimbusMaps
}
