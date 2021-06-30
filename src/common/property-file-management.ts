import {
  col,
  copyFile,
  doesFileExist, getOrganization,
  isOauthUsed,
  run, trim
} from './common-functions'
import {
  createTableValue,
  getPEXConfig,
  pexTable, showTableFromTobject
} from '../common/tables'
import { ORGFile, ORGInfo } from '../models/tcli-models'
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion } from './user-interaction'
import { getClientIdForOrg, getCurrentOrgId, getOrganizations } from './organization-management'
import { DEBUG, ERROR, INFO, log, logCancel, WARNING } from './logging'
import { getOAUTHDetails, parseOAUTHToken, setOAUTHDetails } from './oauth'
import { getSharedState, selectSharedState } from '../tenants/shared-state'
import { listOnType, prepSpotfireProps } from '../tenants/spotfire'
import path from 'path'

const LA = require('../tenants/live-apps')
const _ = require('lodash')
const CCOM = require('./cloud-communications')
const os = require('os')

let globalProperties: any
let propsGl: any

// TODO: Move this to home folder (and add migration)
// export const GLOBALTCPropFolder = __dirname + '/../../../common/'
export const GLOBALTCPropFolder = path.join(os.homedir(), '.tcli')
export const GLOBALPropertyFileName = path.join(GLOBALTCPropFolder, 'global-tibco-cloud.properties')

/*
export function getGLOBALPropertyFileName () {
  return GLOBALPropertyFileName
} */

let LOCALPropertyFileName: string

export function setPropFileName (propFileName: string) {
  LOCALPropertyFileName = propFileName
  log(DEBUG, 'Using Property File: ' + LOCALPropertyFileName)
}

export function getPropFileName () {
  return LOCALPropertyFileName
}

let MEMORYPass: string

// Function to set a property (in memory)
export function setProperty (name: string, value: string) {
  // console.log('BEFORE propsGl: ' , propsGl);
  log(DEBUG, 'Setting Property) Name: ', name, ' Value: ', value)
  if (propsGl == null) {
    propsGl = {}
  }
  set(name, value, propsGl)
  if (name === 'CloudLogin.pass') {
    MEMORYPass = value
  }
  // console.log('AFTER propsGl: ' , propsGl);
}

function set (path: string, value: string, obj: any) {
  let schema = obj // a moving reference to internal objects within obj
  const pList = path.split('.')
  const len = pList.length
  for (let i = 0; i < len - 1; i++) {
    const elem = pList[i]!
    if (!schema[elem]) schema[elem] = {}
    schema = schema[elem]
  }
  schema[pList[len - 1]!] = value
}

export function getProp (propName: string, forceRefresh?: boolean, forceGlobalRefresh?: boolean): string {
  log(DEBUG, 'Getting Property: ' + propName, ' Forcing a Refresh: ', forceRefresh, 'Forcing a Global Refresh: ', forceGlobalRefresh)
  if (forceRefresh) {
    propsGl = null
  }
  if (propsGl == null) {
    if (doesFileExist(LOCALPropertyFileName)) {
      const propLoad = require('properties-reader')(LOCALPropertyFileName)
      propsGl = propLoad.path()
    }
  }
  let re = null
  if (propsGl != null) {
    try {
      re = _.get(propsGl, propName)
    } catch (e) {
      log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')')
      process.exit(1)
    }
    log(DEBUG, 'Returning Property: ', re)
    if (re === 'USE-GLOBAL') {
      re = getPropertyFromGlobal(propName, forceGlobalRefresh)
      if (re === null) {
        log(WARNING, 'USE-GLOBAL specified for property ' + propName + ' but no GLOBAL property found...')
        re = ''
      }
    }
  } else {
    log(DEBUG, 'Local Property file not set yet, trying to get it from global')
    // No local property file, try to get it from global
    re = getPropertyFromGlobal(propName, forceGlobalRefresh)
  }
  if (re && propName === 'CloudLogin.OAUTH_Token') {
    const key = 'Token:'
    if (re.indexOf(key) > 0) {
      const orgOInfo = re
      re = re.substring(re.indexOf(key) + key.length)
      // Look for other token parts
      // if (getOAUTHDetails() == null || getOAUTHDetails == {}) {
      setOAUTHDetails(parseOAUTHToken(orgOInfo, false))
      // }
    }
  }
  if (propName === 'CloudLogin.pass' && MEMORYPass) {
    re = MEMORYPass
  }
  // Adding organization name as global
  re = replaceGlobal(re)
  log(DEBUG, 'Returning Property [END]: ', re)
  return re
}

function getPropertyFromGlobal (propName: string, forceGlobalRefresh?: boolean) {
  let re = null
  if (doesFileExist(GLOBALPropertyFileName)) {
    if (globalProperties == null || forceGlobalRefresh) {
      globalProperties = require('properties-reader')(GLOBALPropertyFileName).path()
    }
    try {
      re = _.get(globalProperties, propName)
    } catch (e) {
      log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')')
      process.exit(1)
    }
    log(DEBUG, 'Got Property From Global: ', re)
  } else {
    log(DEBUG, 'No Global Configuration Set...')
    return null
  }
  return re
}

// Function to add or update property to a file, and possibly adds a comment if the property does not exists
export function addOrUpdateProperty (location: string, property: string, value: string | number, comment?: string, checkForGlobal?: boolean) {
  log(DEBUG, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ') Use Global: ', checkForGlobal)
  // Check for global is true by default
  let doCheckForGlobal = true
  if (checkForGlobal != null) {
    doCheckForGlobal = checkForGlobal
  }
  // If we check for global and if the global file exist, see if we need to update the global file instead.
  if (doCheckForGlobal && location === LOCALPropertyFileName && doesFileExist(GLOBALPropertyFileName)) {
    // We are updating the local prop file
    const localProps = require('properties-reader')(LOCALPropertyFileName).path()
    if (_.get(localProps, property) === 'USE-GLOBAL') {
      location = GLOBALPropertyFileName
      log(INFO, 'Found ' + col.blue('USE-GLOBAL') + ' for property: ' + col.blue(property) + ', so updating the GLOBAL Property file...')
    }
  }
  // Check if file exists
  const fs = require('fs')
  try {
    if (fs.existsSync(location)) {
      // file exists
      log(DEBUG, 'Property file found: ' + location)
      // Check if file contains property
      // const data = fs.readFileSync(location, 'utf8');
      const dataLines = fs.readFileSync(location, 'utf8').split('\n')
      let propFound = false
      for (const lineNumber in dataLines) {
        if (!dataLines[lineNumber].startsWith('#')) {
          // console.log('Line: ', dataLines[lineNumber]);
          const reg = new RegExp(property + '\\s*=\\s*(.*)')
          const regNl = new RegExp(property + '\\s*=')
          if (dataLines[lineNumber].search(reg) > -1 || dataLines[lineNumber].search(regNl) > -1) {
            // We found the property
            log(DEBUG, `Property found: ${property} We are updating it to: ${value}`)
            dataLines[lineNumber] = property + '=' + value
            propFound = true
          }
        }
      }
      let dataForFile = ''
      for (let lineN = 0; lineN < dataLines.length; lineN++) {
        if (lineN !== (dataLines.length - 1)) {
          dataForFile += dataLines[lineN] + '\n'
        } else {
          // The last one:
          dataForFile += dataLines[lineN]
        }
      }
      if (propFound) {
        let doLog = true
        if (property === 'CloudLogin.clientID') {
          log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW CLIENT ID]') + ' (in:' + location + ')')
          doLog = false
        }
        if (property === 'CloudLogin.OAUTH_Token') {
          log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW OAUTH TOKEN]') + ' (in:' + location + ')')
          doLog = false
        }
        if (property === 'CloudLogin.pass') {
          if (typeof value === 'string' && (value.startsWith('@#') || value.startsWith('#'))) {
            log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[OBFUSCATED PASSWORD]') + ' (in:' + location + ')')
          } else {
            log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[PLAIN PASSWORD]') + ' (in:' + location + ')')
          }
          doLog = false
        }
        if (doLog) {
          log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow(value) + ' (in:' + location + ')')
        }
      } else {
        // append prop to the end.
        log(INFO, 'Property NOT found: ' + col.blue(property) + ' We are adding it and set it to: ' + col.yellow(value) + ' (in:' + location + ')')
        if (comment) {
          dataForFile += '\n# ' + comment
        }
        dataForFile += '\n' + property + '=' + value + '\n'
      }
      fs.writeFileSync(location, dataForFile, 'utf8')
    } else {
      log(ERROR, 'Property File does not exist: ' + location)
    }
  } catch (err) {
    console.error(err)
  }
}

// Function to check if a property exist and add a default value if not
export function prepProp (propName: string, propDefaultValue: string, comment: string) {
  if (getProp(propName) == null) {
    log(DEBUG, 'No ' + propName + ' Property found; Adding ' + propDefaultValue + ' to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), propName, propDefaultValue, comment)
    setProperty(propName, propDefaultValue)
  }
}

// Function to generate other property files next to the existing ones
export async function generateCloudPropertyFiles () {
  log(INFO, 'Generating Cloud Property Files')
  const organizations = await getOrganizations()
  // console.log(JSON.stringify(organizations));
  let projectName = await askQuestion('What is the name of your Project ? (press enter to leave it blank)')
  if (projectName.trim() !== '') {
    projectName = projectName + '_'
  }
  const propFilesALL: ORGFile[] = []
  const propFilesEU: ORGFile[] = []
  const propFilesUS: ORGFile[] = []
  const propFilesAU: ORGFile[] = []
  const propOption = ['NONE', 'ALL', 'ALL EU', 'ALL US', 'ALL AU']
  for (const org of organizations) {
    extractCloudInfo(org, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU)
    // Check for Children
    if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
      for (const childOrg of org.childAccountsInfo) {
        extractCloudInfo(childOrg, projectName, propOption, propFilesALL, propFilesEU, propFilesUS, propFilesAU)
      }
    }
  }
  // log(INFO, 'Files that can be created')
  // console.table(propFilesALL)
  showTableFromTobject(propFilesALL, 'Files that can be created')
  const propFilesToGenerate = await askMultipleChoiceQuestionSearch('Which property file(s) would you like to generate ?', propOption)
  let doOauth = false
  if (isOauthUsed()) {
    const decision = await askMultipleChoiceQuestion('Do you want to generate OAUTH tokens for the new files ?', ['YES', 'NO'])
    if (decision.toLowerCase() === 'yes') {
      doOauth = true
    }
  }
  let propForMFile = ''
  if (propFilesToGenerate !== 'NONE') {
    let genOne = true
    if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL EU') {
      genOne = false
      for (const pFile of propFilesEU) {
        await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth)
        propForMFile += pFile.PROP + ','
      }
    }
    if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL US') {
      genOne = false
      for (const pFile of propFilesUS) {
        await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth)
        propForMFile += pFile.PROP + ','
      }
    }
    if (propFilesToGenerate === 'ALL' || propFilesToGenerate === 'ALL AU') {
      genOne = false
      for (const pFile of propFilesAU) {
        await configurePropFile('./' + pFile.PROPERTY_FILE_NAME, pFile.REGION, pFile.ACCOUNT_ID, doOauth)
        propForMFile += pFile.PROP + ','
      }
    }
    if (genOne) {
      let reg = ''
      let accId = ''
      for (const pFile of propFilesALL) {
        if (pFile.PROPERTY_FILE_NAME === propFilesToGenerate) {
          reg = pFile.REGION
          propForMFile += pFile.PROP + ','
          accId = pFile.ACCOUNT_ID
        }
      }
      await configurePropFile('./' + propFilesToGenerate, reg, accId, doOauth)
    }
    let tcliIprop = propForMFile.substr(0, propForMFile.length - 1)
    log(INFO, 'Property for tcli interaction: ' + tcliIprop)
    const doUpdate = await askMultipleChoiceQuestion('Do you want to add this to your manage-multiple-cloud-starters property file ?', ['YES', 'NO'])
    if (doUpdate === 'YES') {
      let fileName = await askQuestion('What is file name of multiple property file ? (press enter for: manage-multiple-cloud-starters.properties)')
      if (fileName === '') {
        fileName = 'manage-multiple-cloud-starters.properties'
      }
      const currVal = require('properties-reader')(fileName).path().Multiple_Interaction_Property_Files
      if (currVal) {
        tcliIprop = currVal + ',' + tcliIprop
      }
      addOrUpdateProperty(fileName, 'Multiple_Interaction_Property_Files', tcliIprop)
    } else {
      logCancel(true)
    }
  } else {
    logCancel(true)
  }
}

// Extract Helper
function extractCloudInfo (org: ORGInfo, projectName: string, propOption: string[], propFilesALL: ORGFile[], propFilesEU: ORGFile[], propFilesUS: ORGFile[], propFilesAU: ORGFile[]) {
  const orgName = '' + org.accountDisplayName
  const accId = org.accountId as string
  const tOrgName = orgName.replace(/ /g, '_').replace(/'/g, '_').replace(/-/g, '_').replace(/_+/g, '_')
  const tOrgNameEU: ORGFile = {
    REGION: 'EU',
    PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'EU_' + tOrgName + '.properties',
    PROP: 'tibco-cloud-' + projectName + 'EU_' + tOrgName,
    ACCOUNT_ID: accId
  }
  const tOrgNameUS: ORGFile = {
    REGION: 'US',
    PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'US_' + tOrgName + '.properties',
    PROP: 'tibco-cloud-' + projectName + 'US_' + tOrgName,
    ACCOUNT_ID: accId
  }
  const tOrgNameAU: ORGFile = {
    REGION: 'AU',
    PROPERTY_FILE_NAME: 'tibco-cloud-' + projectName + 'AU_' + tOrgName + '.properties',
    PROP: 'tibco-cloud-' + projectName + 'AU_' + tOrgName,
    ACCOUNT_ID: accId
  }
  propOption.push(tOrgNameEU.PROPERTY_FILE_NAME, tOrgNameUS.PROPERTY_FILE_NAME, tOrgNameAU.PROPERTY_FILE_NAME)
  propFilesALL.push(tOrgNameEU, tOrgNameUS, tOrgNameAU)
  propFilesEU.push(tOrgNameEU)
  propFilesUS.push(tOrgNameUS)
  propFilesAU.push(tOrgNameAU)
}

// Config property helper
async function configurePropFile (fileName: string, region: string, accountId: string, doOauth: boolean) {
  log(INFO, '[' + region + ']: Generating: ' + fileName)
  // let regToAdd = '';
  copyFile(getPropFileName(), fileName)
  const ClientID = await getClientIdForOrg(accountId)
  addOrUpdateProperty(fileName, 'CloudLogin.clientID', ClientID)
  addOrUpdateProperty(fileName, 'CloudLogin.Region', region)
  // Possibly generate an OAUTH Token, on the new file
  if (doOauth) {
    // Remove the OAUTH Token so it does not use that as the authentication
    addOrUpdateProperty(fileName, 'CloudLogin.OAUTH_Token', '')
    log(INFO, 'Generating OAUTH Token for: ' + fileName)
    run('tcli -p "' + fileName + '" generate-oauth-token -a YES', false)
  }
}

const SPECIAL = 'SPECIAL'

// A Function to update a property (possibly in a custom file)
export async function updateProperty () {
  let doUpdate = true
  log(INFO, 'Update a property file')
  // Ask in which file, or use default
  let pFile = await askQuestion('In which file would you like to update a property ? (use enter or default for the current property file)')
  if (pFile.toLowerCase() === 'default' || pFile === '') {
    pFile = getPropFileName()
  }
  log(INFO, '--> Property File: ', pFile)
  // Ask propname
  const pName = await askQuestion('Which property would you like to update or add ?')
  if (pName === '') {
    log(ERROR, 'You have to provide a property name')
    process.exit(1)
    // doUpdate = false
  }
  // Ask prop comments
  let pComment = await askQuestion('What comment would you like to add ? (use enter on none to not provide a comment)')
  if (pComment === 'none') {
    pComment = ''
  }
  // Ask prop value
  let pValue = await askQuestion('What value would you like to add ? (use ' + SPECIAL + ' to select from a list)')
  if (pValue.toUpperCase() === SPECIAL) {
    // TODO: Add Cloud Starter Link, FlogoAppId
    // TODO: Move this to a special function (getSpecialProperty, that takes for example LiveApps_AppID;MyApp. And then re-use these props as globals)
    const vTChoices = ['Organization_Name', 'Organization_ID', 'SandboxID', 'LiveApps_AppID', 'LiveApps_ActionID', 'Shared_StateID', 'Spotfire_FolderPath']
    const vType = await askMultipleChoiceQuestion('What type of answer would you like to add to the property ?', vTChoices)
    if (vType.toLowerCase() === 'organization_name') {
      if (!getOrganization()) {
        await CCOM.callTCA(CCOM.clURI.claims)
      }
      pValue = getOrganization()
    }
    // Organization_ID
    if (vType.toLowerCase() === 'organization_id') {
      pValue = await getCurrentOrgId()
      /*
      const organizations = await getOrganizations() as Accounts
      const currentOrgName = await getOrganization()
      // console.log(currentOrgName)
      for (const org of organizations) {
        if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
          for (const childOrg of org.childAccountsInfo) {
            if (childOrg.accountDisplayName === currentOrgName) {
              pValue = childOrg.subscriptionId
            }
          }
        }
        if (org.accountDisplayName === currentOrgName) {
          pValue = org.subscriptionId
        }
      } */
    }
    if (vType.toLowerCase() === 'sandboxid') {
      pValue = await LA.getProductionSandbox()
    }
    if (vType.toLowerCase() === 'liveapps_appid' || vType.toLowerCase() === 'liveapps_actionid') {
      const apps = await LA.showLiveApps(true, false)
      const laAppNameA = ['NONE'].concat(apps.map((v: any) => v.name))
      const laAppD = await askMultipleChoiceQuestionSearch('For which LiveApp would you like to store the ID ?', laAppNameA)
      if (laAppD === 'NONE') {
        logCancel(true)
        doUpdate = false
      } else {
        const laApp = apps.find((e: any) => e.name === laAppD.trim())
        if (laApp == null) {
          log(ERROR, 'App not found: ' + laAppD)
          doUpdate = false
        }
        if (doUpdate && vType.toLowerCase() === 'liveapps_appid') {
          pValue = laApp.applicationId
        }
        if (doUpdate && vType.toLowerCase() === 'liveapps_actionid') {
          const laActions = [{ name: 'NONE' }].concat(LA.stripLiveAppsActions(laApp))
          // console.log(laActions);
          log(INFO, 'Live Apps Actions: ')
          // console.table(laActions)
          showTableFromTobject(laActions, 'Live Apps Actions')
          const laActD = await askMultipleChoiceQuestionSearch('For which ACTION would you like to store an Action ID ?', laActions.map(v => v.name))
          if (laActD === 'NONE') {
            logCancel(true)
            doUpdate = false
          } else {
            const laAction: any = laActions.find(e => e.name === laActD)
            if (laAction) {
              pValue = laAction.id
            } else {
              log(ERROR, 'LA Action not found: ' + laActD)
              doUpdate = false
            }
          }
        }
      }
    }
    if (vType.toLowerCase() === 'spotfire_folderpath') {
      prepSpotfireProps()
      const sfFolderList = await listOnType('spotfire.folder', false, true)
      if (sfFolderList && sfFolderList.length > 0) {
        // Pick Item from the list
        const selectedFolder = await askMultipleChoiceQuestionSearch('For which folder would you like to store the Folder Path ?', sfFolderList.map(v => v.TCLIPath))
        pValue = sfFolderList.find(v => v.DisplayPath === selectedFolder)!.Path
      } else {
        log(ERROR, 'No shared states to get the ID from, consider looking at your Shared_State_Filter setting...')
      }
    }

    if (vType.toLowerCase() === 'shared_stateid') {
      const sStateList = await getSharedState(true)
      if (sStateList.length > 0) {
        // Pick Item from the list
        const selectedState: any = await selectSharedState(sStateList, 'For which Shared State Entry would you like to store the ID ?')
        pValue = selectedState.id
      } else {
        log(ERROR, 'No shared states to get the ID from, consider looking at your Shared_State_Filter setting...')
      }
    }
  }
  if (doUpdate) {
    let checkForGlobal = false
    if (doesFileExist(GLOBALPropertyFileName)) {
      // We are updating the local prop file
      const localProps = require('properties-reader')(getPropFileName()).path()
      if (_.get(localProps, pName) === 'USE-GLOBAL') {
        // location = GLOBALPropertyFileName;
        const propToUse = await askMultipleChoiceQuestion('Found USE-GLOBAL for property: ' + pName + '. Do you want to update the GLOBAL or the LOCAL property file ?', ['GLOBAL', 'LOCAL'])
        checkForGlobal = propToUse.toLowerCase() === 'global'
        // log(INFO, 'Found ' + col.blue('USE-GLOBAL') + ' for property: ' + col.blue(property) + ', so updating the GLOBAL Property file...')
      }
    }
    addOrUpdateProperty(pFile, pName, pValue, pComment, checkForGlobal)
  }
}

// Function comment out a property in a prop file
export function disableProperty (location: string, property: string, comment: string) {
  log(DEBUG, 'Disabling: ' + property + ' in:' + location)
  // Check if file exists
  const fs = require('fs')
  try {
    if (fs.existsSync(location)) {
      // file exists
      log(DEBUG, 'Property file found: ' + location)
      // Check if file contains property
      // const data = fs.readFileSync(location, 'utf8');
      const dataLines = fs.readFileSync(location, 'utf8').split('\n')
      let propFound = false
      if (dataLines) {
        for (const lineNumber in dataLines) {
          if (dataLines[lineNumber].startsWith(property)) {
            propFound = true
            log(INFO, `Property found: ${property} We are disabling it...`)
            if (comment && comment !== '') {
              dataLines[lineNumber] = '#' + comment + '\n#' + dataLines[lineNumber]
            } else {
              dataLines[lineNumber] = '#' + dataLines[lineNumber]
            }
          }
        }
        let dataForFile = ''
        for (let lineN = 0; lineN < dataLines.length; lineN++) {
          if (lineN !== (dataLines.length - 1)) {
            dataForFile += dataLines[lineN] + '\n'
          } else {
            // The last one:
            dataForFile += dataLines[lineN]
          }
        }
        if (propFound) {
          fs.writeFileSync(location, dataForFile, 'utf8')
          log(INFO, 'Disabled Property: ' + col.blue(property) + ' (in:' + location + ')')
        } else {
          log(WARNING, 'Property NOT found: ' + col.blue(property) + ' to disable... (in:' + location + ')')
        }
      }
    } else {
      log(ERROR, 'Property File does not exist: ' + location)
    }
  } catch (err) {
    console.error(err)
  }
}

// display current properties in a table
export function showPropertiesTable () {
  // Get the properties object
  let props: any = {}
  if (doesFileExist(getPropFileName())) {
    const propLoad = require('properties-reader')(getPropFileName())
    props = propLoad.path()
    log(INFO, ' LOCAL Property File Name: ' + col.blue(getPropFileName()))
    if (GLOBALPropertyFileName !== '') {
      log(INFO, 'GLOBAL Property File Name: ' + col.blue(GLOBALPropertyFileName))
    }
    let nvs = []
    for (const [key, valueP] of Object.entries(props)) {
      if (key === 'CloudLogin') {
        for (const [key, valueL] of Object.entries(props.CloudLogin)) {
          const myValueL: any = valueL
          if (myValueL === 'USE-GLOBAL') {
            let displayValue = getProp('CloudLogin.' + key)
            if (key === 'pass') {
              if (displayValue !== '') {
                const passT = displayValue
                displayValue = 'PLAIN TEXT'
                if (passT.startsWith('#') || passT.startsWith('@')) {
                  displayValue = 'OBFUSCATED'
                }
              }
            }
            nvs = createTableValue('CloudLogin.' + key, displayValue + ' [FROM GLOBAL]', nvs)
          } else {
            if (key !== 'OAUTH_Token') {
              nvs = createTableValue('CloudLogin.' + key, myValueL, nvs)
            } else {
              // This is to check if there is a manual token
              if (myValueL.length < 40) {
                nvs = createTableValue('CloudLogin.' + key, myValueL, nvs)
              }
            }
          }
          // Force OAUTH Refresh; isOauthUsed()
          if (key === 'OAUTH_Token' && isOauthUsed() && getOAUTHDetails() != null) {
            // console.log(getOAUTHDetails())
            for (const [key, value] of Object.entries(getOAUTHDetails())) {
              if (key !== 'Expiry_Date') {
                nvs = createTableValue('OAUTH ' + key, value, nvs)
              }
            }
            // Do not add the
          }
        }
      } else {
        if (valueP === 'USE-GLOBAL') {
          nvs = createTableValue(key, getProp(key) + ' [FROM GLOBAL]', nvs)
        } else {
          nvs = createTableValue(key, valueP, nvs)
        }
      }
    }
    // Print table
    pexTable(nvs, 'tibco-cloud-properties', getPEXConfig(), true)
  }
}

export function replaceAtSign (content: string, propFile: string) {
  if (content && content.includes('@{') && content.includes('}')) {
    let subProp = content.substring(content.indexOf('@{') + 2, content.indexOf('@{') + 2 + content.substring(content.indexOf('@{') + 2).indexOf('}'))
    // Check if subprop contains semicolon for replacements
    const piped = getPipe(subProp)
    subProp = piped.prop
    log(DEBUG, 'Looking for subprop: |' + subProp + '| on: |' + content + '| propFile: ' + propFile)
    content = content.replace(/@{.*?\}/, getPropFromFile(subProp, propFile))
    log(DEBUG, 'Replaced: ' + content)
    content = applyPipe(content, piped.pipe)
    content = replaceAtSign(content, propFile)
  }
  return content
}

export function replaceGlobal (content: string) {
  if (content && content.includes('~{') && content.includes('}')) {
    // TODO: Make sure you can replace consequent globals
    let GlobalProp = content.substring(content.indexOf('~{') + 2, content.indexOf('~{') + 2 + content.substring(content.indexOf('~{') + 2).indexOf('}'))
    log(DEBUG, 'Looking for Global: |' + GlobalProp + '| on: |' + content)
    const piped = getPipe(GlobalProp)
    GlobalProp = piped.prop
    switch (GlobalProp.toLowerCase()) {
      case 'organization':
        content = content.replace(/~{.*?\}/ig, getOrganization())
        break
        // TODO: Add other globals here
      case 'date':
        content = content.replace(/~{.*?\}/ig, new Date().getFullYear() + '_' + new Date().getMonth() + '_' + new Date().getDay())
        break
      case 'time':
        content = content.replace(/~{.*?\}/ig, new Date().getHours() + '_' + new Date().getMinutes())
        break
      case 'timestamp':
        content = content.replace(/~{.*?\}/ig, new Date().getTime() + '')
        break
      default:
        log(WARNING, 'Global: ' + GlobalProp + ' not found')
    }
    content = applyPipe(content, piped.pipe)
    log(DEBUG, 'Injected Global: ' + content)
    content = replaceGlobal(content)
  }
  return content
}

function getPipe (prop: string): { pipe: string, prop: string } {
  const re = {
    pipe: '',
    prop: prop
  }
  if (prop.includes(';')) {
    re.prop = trim(prop.split(';')[0]!)
    re.pipe = trim(prop.split(';')[1]!)
  }
  return re
}

function applyPipe (prop: string, pipe: string) {
  let re = prop
  if (pipe && pipe !== '') {
    const pipeToApply = pipe.toLowerCase()
    switch (pipeToApply) {
      case 'lower':
        // code block
        re = re.toLowerCase()
        log(INFO, 'Applied Pipe (LOWER): ' + re)
        break
      case 'upper':
        re = re.toUpperCase()
        log(INFO, 'Applied Pipe (UPPER): ' + re)
        break
        // TODO: Other Pipes: toBase64, fromBase64, obfuscate, deobfuscate(?)
      default:
        log(ERROR, 'Pipe Not found: ' + pipe)
    }
  }
  return re
}

export function getPropFromFile (property: string, file: string) {
  log(DEBUG, 'Getting Property: |' + property + '| from file: ' + file)
  const PropertiesReader = require('properties-reader')
  let propsToGet
  try {
    propsToGet = PropertiesReader(file).path()
  } catch (e) {
    log(ERROR, 'Error getting property from file: ', file, ' error: ' + e.message)
    process.exit(1)
  }
  const re = _.get(propsToGet, property)
  log(DEBUG, 'Returning Property(' + property + '): ', re)
  return re
}
