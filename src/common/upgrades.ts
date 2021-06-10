// For future versions: if(getProp('Cloud_Properties_Version') != 'V3'){
import { addOrUpdateProperty, GLOBALPropertyFileName, getProp, getPropFileName } from './property-file-management'
import { INFO, log, WARNING } from './logging'
import { col, doesFileExist } from './common-functions'
import { Global } from '../models/base'

const _ = require('lodash')

declare let global: Global

const DisableMessage = '  --> AUTOMATICALLY DISABLED by Upgrade to TIBCO Cloud Property File V2 (You can remove this...)'
const EnableMessage = '  --> AUTOMATICALLY CREATED by Upgrade to TIBCO Cloud Property File V2 (You can remove this...)'

export function checkForGlobalPropertyFileUpgrades () {
  checkGlobalForUpgrade()
}

export function checkForLocalPropertyFileUpgrades () {
  // Function to upgrade the prop file to V2
  if (getProp('Cloud_Properties_Version') == null) {
    upgradeToV2(false, getPropFileName())
  }
  /* TODO: Upgrade to v3
  if (getProp('Cloud_Properties_Version') === 'V2') {
    upgradeLocalToV3(getPropFileName())
  } */
}

/*
function upgradeLocalToV3 (propFile: string) {
  log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'))
  log(INFO, col.rainbow('* AUTOMATICALLY Updating you property file to V3... *'))
  log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'))
  log(INFO, col.rainbow('* * * ') + ' Checking the location of your global property file...')
  console.log('propfile: ', propFile)
  console.log('Home: ', require('os').homedir())
  // Old global file: globalTCpropFolder = __dirname + '/../../../common/'

  // TODO: When a local file get's created; automatically create the global file as well.
  // TODO: If there is no global file at the new location, automatically copy the file to the new location (or create one).
  // TODO: Now there is a file at the new location, check the properties of the new global file.
} */

function upgradeToV2 (isGlobal: boolean, propFile: string) {
  let host = ''
  let curl = ''
  let newORG = 'US'
  let newPW = ''
  let propsTemp
  let defaultSharedStateFilter = 'APPLICATION'
  if (isGlobal) {
    propsTemp = require('properties-reader')(GLOBALPropertyFileName).path()
    host = propsTemp.cloudHost || ''
    curl = propsTemp.Cloud_URL || ''
  } else {
    host = getProp('cloudHost') || ''
    curl = getProp('Cloud_URL') || ''
    // Old Local Props
    propsTemp = require('properties-reader')(getPropFileName()).path()
    if (propsTemp.Shared_State_Scope != null) {
      defaultSharedStateFilter = propsTemp.Shared_State_Scope
    }
    if (propsTemp.cloudHost === 'USE-GLOBAL' || propsTemp.Cloud_URL === 'USE-GLOBAL') {
      newORG = 'USE-GLOBAL'
    }
  }
  const pass = _.get(propsTemp, 'CloudLogin.pass')
  if (pass && pass !== '' && pass !== 'USE-GLOBAL' && !pass.startsWith('@#')) {
    const fus = require('./fuzzy-search.js')
    if (pass.startsWith('#')) {
      newPW = fus.search(Buffer.from(pass, 'base64').toString())
    } else {
      newPW = fus.search(pass)
    }
  }
  if (host.toLowerCase().includes('eu') && curl.toLowerCase().includes('eu')) {
    newORG = 'EU'
  }
  if (host.toLowerCase().includes('au') && curl.toLowerCase().includes('au')) {
    newORG = 'AU'
  }
  // console.log('newORG: ', newORG, 'host',host, 'curl',curl);
  let initialTokenName = 'MyCLIToken_1'
  log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'))
  if (isGlobal) {
    initialTokenName = 'MyGlobalCLIToken_1'
    log(INFO, col.rainbow('* AUTOMATICALLY Updating GLOBAL property file to V2.*'))
  } else {
    log(INFO, col.rainbow('* AUTOMATICALLY Updating you property file to V2... *'))
  }
  log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'))
  log(INFO, col.rainbow('* * * ') + ' Disabling Properties...')
  const PROPM = require('./property-file-management')
  PROPM.disableProperty(propFile, 'CloudLogin.tenantID', DisableMessage)
  PROPM.disableProperty(propFile, 'cloudHost', DisableMessage)
  PROPM.disableProperty(propFile, 'Cloud_URL', DisableMessage)
  PROPM.disableProperty(propFile, 'loginURE', DisableMessage)
  PROPM.disableProperty(propFile, 'appURE', DisableMessage)
  PROPM.disableProperty(propFile, 'Claims_URE', DisableMessage)
  log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'))
  log(INFO, col.rainbow('* * * ') + ' Adding new Properties...')
  addOrUpdateProperty(propFile, 'Cloud_Properties_Version', 'V2', EnableMessage + '\n# Property File Version', false)
  addOrUpdateProperty(propFile, 'CloudLogin.Region', newORG, EnableMessage + '\n# Use:\n#  US Cloud (Oregon) - US\n#  EU Cloud (Ireland) - EU\n# AUS Cloud (Sydney) - AU\n# Options: US | EU | AU', false)
  // addOrUpdateProperty(propFile, '# CloudLogin.Cloud_Location', 'cloud.tibco.com', 'Optional, if provided it uses a different cloud URL than cloud.tibco.com', false);
  createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_Token_Name', initialTokenName, 'Name of the OAUTH token to be generated.')
  createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_For_Tenants', 'TSC,BPM', 'Comma separated list of tenants for which the OAUTH Token gets generated. (Options: TSC,BPM,TCDS,TCE,TCI,TCM,SPOTFIRE,TCMD)\n#  TSC: General Cloud Authentication\n#  BPM: LiveApps Authentication\n# TCDS: TIBCO Cloud Data Streams Authentication\n#  TCE: TIBCO Cloud Events Authentication\n#  TCI: TIBCO Cloud Integration Authentication\n#  TCM: TIBCO Cloud Messaging Authentication\n#  SPOTFIRE: TIBCO Cloud Spotfire Authentication\n#  TCMD: TIBCO Cloud Meta Data Authentication\n# NOTE: You need to be part of the specified subscription.')
  createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_Valid_Hours', '336', 'Number of Hours the generated OAUTH token should be valid.')
  createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Required_Hours_Valid', '168', 'Number of hours that the OAUTH Token should be valid for (168 hours is 1 week), Checked on Startup and on with the validate-and-rotate-oauth-token task.')
  if (newPW !== '') {
    addOrUpdateProperty(propFile, 'CloudLogin.pass', newPW, '', false)
  }
  if (!isGlobal) {
    // Translate Shared_State_Scope to Shared_State_Filter
    PROPM.disableProperty(propFile, 'Shared_State_Scope', DisableMessage)
    createPropINE(isGlobal, propFile, 'Shared_State_Filter', defaultSharedStateFilter, 'Shared_State_Scope was renamed to Shared_State_Filter\n# Filter for the shared state to manage (all shared states starting with this value will be managed)\n' +
            '#  Use \'\'(empty) or APPLICATION for the current application. Use * for all values, or use a specific value to apply a filter.\n' +
            '#  ( <Filter> | APPLICATION | * )')
    createPropINE(isGlobal, propFile, 'TIBCLI_Location', 'tibcli', 'The location of the TIBCLI Executable (including the executable name, for example: /folder/tibcli)')
    // Force a Refresh (not needed for global)
    getProp('CloudLogin.Region', true, true)
  }
}

// Upgrade Helper: Create Property If Not Exists
function createPropINE (isGlobal: boolean, propFile: string, propName: string, value: string, comment: string) {
  let doUpdate
  if (isGlobal) {
    const propsG = require('properties-reader')(GLOBALPropertyFileName).path()
    doUpdate = propsG[propName] === undefined
  } else {
    doUpdate = getProp(propName) === undefined
  }
  if (doUpdate) {
    addOrUpdateProperty(propFile, propName, value, EnableMessage + '\n# ' + comment, false)
  } else {
    log(INFO, 'Not changed the value of ' + col.green(propName) + '...')
  }
}

if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'BEFORE Check for Global Upgrade')

function checkGlobalForUpgrade () {
  if (doesFileExist(GLOBALPropertyFileName)) {
    const propsG = require('properties-reader')(GLOBALPropertyFileName).path()
    if (propsG.Cloud_Properties_Version == null) {
      log(WARNING, 'Global file need to be upgraded...')
      upgradeToV2(true, GLOBALPropertyFileName)
    }
  }
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'AFTER Check for Global Upgrade')
}
