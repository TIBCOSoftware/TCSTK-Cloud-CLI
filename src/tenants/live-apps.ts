import {
  col,
  copyFile, doesFileExist, getCurrentRegion, getOrganization,
  mkdirIfNotExist,
  sleep
} from '../common/common-functions'
import {
  createTable,
  getPEXConfig,
  pexTable
} from '../common/tables'
import { Global } from '../models/base'
import { changeOrganization, displayOrganizations, getCurrentOrganizationInfo } from '../common/organization-management'
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion } from '../common/user-interaction'
import { DEBUG, ERROR, INFO, log, logCancel, logLine, WARNING } from '../common/logging'
import { addOrUpdateProperty, getProp, getPropFileName } from '../common/property-file-management'
import { LADesignTimeApp, LApp } from '../models/live-apps'

declare let global: Global

const CCOM = require('../common/cloud-communications')
const VAL = require('../common/validation')

let globalProductionSandbox: string

export async function getProductionSandbox () {
  if (!globalProductionSandbox) {
    const claims = await CCOM.callTCA(CCOM.clURI.claims)
    for (const sb of claims.sandboxes) {
      if (sb.type === 'Production') {
        globalProductionSandbox = sb.id
      }
    }
    log(INFO, 'SANDBOX ID: ' + globalProductionSandbox)
  }
  return globalProductionSandbox
}

// Shared state folder (picked up from configuration if exists)
let CASE_FOLDER = './Cases/'

async function checkCaseFolder () {
  if (getProp('Case_Folder') != null) {
    CASE_FOLDER = getProp('Case_Folder')
  } else {
    addOrUpdateProperty(getPropFileName(), 'Case_Folder', CASE_FOLDER)
  }
  // Potentially use the organization name in the Case Folder property
  if (CASE_FOLDER.toLowerCase().indexOf('~{organization}') > 0) {
    if (!getOrganization()) {
      await CCOM.showCloudInfo(false)
    }
    CASE_FOLDER = CASE_FOLDER.replace(/\~\{organization\}/ig, getOrganization())
    log(INFO, 'Using Case Folder: ' + col.blue(CASE_FOLDER))
  }
}

// Get a LiveApps Case by Reference
export async function getLaCaseByReference (caseRef: string) {
  const caseData = await CCOM.callTCA(CCOM.clURI.la_cases + '/' + caseRef + '?$sandbox=' + await getProductionSandbox(), false, { handleErrorOutside: true })
  if (!caseData) {
    log(ERROR, 'Error Retrieving Case Data for ref: ', caseRef)
  }
  return caseData
}

// Function to show LiveApps cases
export async function showLiveApps (doShowTable: boolean, doCountCases: boolean): Promise<LApp[]> {
  // TODO: Call can be optimized by only requesting the basics
  const caseTypes = await CCOM.callTCA(CCOM.clURI.types + '?$sandbox=' + await getProductionSandbox() + '&$top=1000') as LApp[]
  log(DEBUG, 'Case Types: ', caseTypes)
  // TODO: (maybe) get case owner
  const cases: any = {}
  let appN = 1
  for (const curApp of caseTypes) {
    // console.log(curApp)
    const caseTemp: any = {}
    // const appN = parseInt(curCase) + 1;
    // log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
    caseTemp['CASE NAME'] = curApp.name
    caseTemp['APPLICATION ID'] = curApp.applicationId
    caseTemp.VERSION = curApp.applicationVersion
    caseTemp['IS CASE'] = curApp.isCase
    if (doCountCases) {
      logLine('Counting Cases: (' + appN + '/' + caseTypes.length + ')...')
      caseTemp['NUMBER OF CASES'] = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + curApp.applicationId + '&$count=true')
    }
    cases[appN] = caseTemp
    appN++
  }
  console.log('\n')
  pexTable(cases, 'live-apps', getPEXConfig(), doShowTable)
  return caseTypes
}

async function getLiveAppsDesignTime (): Promise<LADesignTimeApp[]> {
  let re
  if (getProp('Master_Account_Token')) {
    re = await CCOM.callTCA(CCOM.clURI.la_design, false, {
      forceOAUTH: true,
      manualOAUTH: getMasterToken()
    }) as LADesignTimeApp[]
  } else {
    re = await CCOM.callTCA(CCOM.clURI.la_design) as LADesignTimeApp[]
  }
  return re
}

// A function to get the master or name (only if Master_Account_Token is set)
async function getMasterOrgName () {
  let re = ''
  if (getProp('Master_Account_Token')) {
    const accInfo = await CCOM.callTCA(CCOM.clURI.account_info, false, {
      forceOAUTH: true,
      manualOAUTH: getMasterToken(),
      tenant: 'TSC',
      customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
    })
    if (accInfo && accInfo.selectedAccount && accInfo.selectedAccount.displayName) {
      re = accInfo.selectedAccount.displayName
    }
  }
  return re
}

// Function to get the master token (also if it is stored as a token standard)
function getMasterToken () {
  let re = getProp('Master_Account_Token')
  const key = 'Token:'
  if (re.indexOf(key) > 0) {
    // parseOAUTHToken(re, false);
    re = re.substring(re.indexOf(key) + key.length)
  }
  return re
}

// TODO: Add option to show details
// Function to show and return all the design time apps of LiveApps
export async function showLiveAppsDesign (doShowTable?: boolean) {
  let laDesignApps = await getLiveAppsDesignTime()
  if (getProp('Master_Account_Token')) {
    if (doShowTable) {
      log(INFO, 'MASTER ACCOUNT(' + (await getMasterOrgName()) + ') APPS: ')
    }
    const laDesignAppsTable = createTable(laDesignApps, CCOM.mappings.la_design_apps, false)
    pexTable(laDesignAppsTable, 'live-apps-design-apps-master', getPEXConfig(), true)
    laDesignApps = await CCOM.callTCA(CCOM.clURI.la_design) as LADesignTimeApp[]
  }
  if (doShowTable) {
    const laDesignAppsTable = createTable(laDesignApps, CCOM.mappings.la_design_apps, false)
    pexTable(laDesignAppsTable, 'live-apps-design-apps', getPEXConfig(), true)
  }
  // Always returns the apps of the current org
  return laDesignApps
}

// Function to get all the actions of a LiveApps App
export function stripLiveAppsActions (liveApp: LApp) {
  if (liveApp) {
    let re: any[] = []
    if (liveApp.creators) {
      re = re.concat(liveApp.creators.map(v => ({
        type: 'CREATOR',
        id: v.id,
        name: v.name
      })))
    }
    if (liveApp.actions) {
      re = re.concat(liveApp.actions.map(v => ({
        type: 'ACTION',
        id: v.id,
        name: v.name
      })))
    }
    return re
  }
  return null
}

// Show the actions for a LA App
function showActions (laApp: LApp, appName: string) {
  const laActions = stripLiveAppsActions(laApp)
  if (laActions) {
    log(INFO, 'Live Apps Actions For ' + col.bgBlue(laApp.name))
    pexTable(laActions, 'live-apps-actions', getPEXConfig(), true)
  } else {
    log(ERROR, 'App not found: ' + appName)
    process.exit(1)
  }
}

export async function showLiveAppsActions () {
  const apps = await showLiveApps(true, false)
  const laAppNameA = ['NONE', 'ALL'].concat(apps.map((v: { name: string; }) => v.name))
  const laAppD = await askMultipleChoiceQuestionSearch('For which LiveApp would you like to see the actions ?', laAppNameA)
  if (laAppD.toLowerCase() !== 'none') {
    if (laAppD.toLowerCase() === 'all') {
      apps.forEach((app: LApp) => {
        showActions(app, laAppD)
      })
    } else {
      showActions(apps.find((e) => e.name === laAppD.trim())!, laAppD)
    }
  } else {
    logCancel(true)
  }
}

const storeOptions = { spaces: 2, EOL: '\r\n' }

// Function to export a LiveApps Case Definition
export async function exportLiveAppsCaseType () {
  await checkCaseFolder()
  const cTypes = await showLiveApps(true, false)
  const cTypeArray = cTypes.map(app => app.name)
  const typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray)
  const fName = await askQuestion('What file name would you like to export to ? (press enter or use DEFAULT for default):')
  let appFound = false
  for (const laApp of cTypes) {
    if (typeForExport === laApp.name) {
      appFound = true
      mkdirIfNotExist(CASE_FOLDER)
      let fileName = CASE_FOLDER + fName
      if (fName === '' || fName.toLowerCase() === 'default') {
        fileName = CASE_FOLDER + laApp.name + '.' + laApp.applicationVersion + '.type.json'
      }
      require('jsonfile').writeFileSync(fileName, laApp, storeOptions)
      log(INFO, 'Case Type File Stored: ' + fileName)
    }
  }
  if (!appFound) {
    log(ERROR, 'Live Apps Case-Type not found for export: ' + typeForExport)
    process.exit(1)
  }
}

const exportCaseStepSize = 30

// Function to export case data
export async function exportLiveAppsData () {
  await checkCaseFolder()
  const cTypes = await showLiveApps(true, true)
  const cTypeArray = cTypes.map(app => app.name)
  const typeForExport = await askMultipleChoiceQuestionSearch('Which Case-Type would you like to export ?', cTypeArray)
  const fName = await askQuestion('What Folder like to export to ? (press enter or use default, date get\'s added...)')
  // let oneFileStore = await askMultipleChoiceQuestion('Do you also want to store all contents in one file ? (this is used for import)', ['YES', 'NO']);
  let allCases: any[] = []
  let appFound = false
  for (const curCase in cTypeArray) {
    if (cTypeArray[curCase] === typeForExport) {
      const laApp = cTypes[curCase]!
      appFound = true
      // count cases
      const numberOfCasesForExport = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + laApp.applicationId + '&$count=true')
      log(INFO, 'Number of cases for export: ' + numberOfCasesForExport)
      const typeIdString = ' and typeId eq 1'
      // get cases in batch sizes
      for (let i = 0; i <= numberOfCasesForExport; i = i + exportCaseStepSize) {
        const exportBatch = await CCOM.callTCA(CCOM.clURI.la_cases + '?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + laApp.applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i)
        logLine('Exporting Case: (' + i + '/' + numberOfCasesForExport + ')...')
        allCases = allCases.concat(exportBatch)
      }
      // Print a newline after all the log entries
      console.log('')
      log(INFO, 'Number of Exported Cases: ' + allCases.length)
      // Write Cases
      let cfName = CASE_FOLDER + fName
      if (fName === '' || fName.toLowerCase() === 'default') {
        // Add date to the end of this
        const today = new Date()
        const dayAddition = '(' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '_h' + today.getHours() + 'm' + today.getMinutes() + ')'
        cfName = CASE_FOLDER + 'Export-' + typeForExport + dayAddition + '/'
      }
      mkdirIfNotExist(CASE_FOLDER)
      mkdirIfNotExist(cfName)
      mkdirIfNotExist(cfName + 'CONTENT/')
      const AllCaseArray = []
      for (const exCase of allCases) {
        const contextFileName = cfName + typeForExport + '-' + exCase.caseReference + '.json'
        let writeContentSeparate = false
        let contentObject = {}
        const contentFileName = cfName + 'CONTENT/' + typeForExport + '-' + exCase.caseReference + '.CONTENT.json'
        if (exCase.casedata != null) {
          try {
            // Get the details for every shared state entry
            contentObject = JSON.parse(' {  "' + cTypes[curCase]!.name + '" : ' + exCase.casedata + '}')
            AllCaseArray.push(contentObject)
            exCase.casedata = { FILESTORE: contentFileName }
            // And store them in a file / folder
            require('jsonfile').writeFileSync(contentFileName, contentObject, storeOptions)
            writeContentSeparate = true
            log(DEBUG, '[STORED CONTENT]: ' + contentFileName)
          } catch (e) {
            log(ERROR, 'Parse Error on: ' + exCase.name + 'Writing directly...')
          }
          require('jsonfile').writeFileSync(contextFileName, exCase, storeOptions)
          // log(INFO, 'Exported Case To: ' + cfName);
          log(INFO, '[STORED CONTEXT]: ' + contextFileName)
          if (writeContentSeparate) {
            log(INFO, '[STORED CONTENT]: ' + contentFileName)
          } else {
            log(ERROR, 'Stored all in: ' + contextFileName)
          }
        }
      }
      const AllCaseFileName = cfName + 'CONTENT/' + typeForExport + '-ALL.CONTENT.json'
      // TODO: Put the app name around the AllCaseArray
      require('jsonfile').writeFileSync(AllCaseFileName, AllCaseArray, storeOptions)
      log(INFO, '[STORED ALL CONTENT]: ' + AllCaseFileName)
      // }
    }
  }
  if (!appFound) {
    log(ERROR, 'Live Apps Case not found for export: ' + typeForExport)
    process.exit(1)
  }
}

// DONE: Add Export Feature to one file. (Just the data and to use for import)
export async function createLAImportFile () {
  await checkCaseFolder()
  log(INFO, ' -- Generate Live Aps Import Configuration file --- ')
  // TODO: Create a generator for the input feature. (based on the template and ask to add steps)
  // TODO: Make sure you are not overwriting a current import file.
  // Check if default file exists:
  const importFolder = process.cwd() + '/' + CASE_FOLDER + 'Import/'
  let impConfFileName = 'import-live-apps-data-configuration.json'
  const nameAnsw = await askQuestion('Please specify a name for the Live Apps Import Config file (\x1b[34mDefault: import-live-apps-data-configuration\x1b[0m) ?')
  if (nameAnsw != null && nameAnsw !== '') {
    impConfFileName = nameAnsw + '.properties'
  }
  const targetFile = importFolder + impConfFileName
  let doWrite = true
  if (doesFileExist(targetFile)) {
    const doOverWrite = await askMultipleChoiceQuestion('The property file: \x1b[34m' + impConfFileName + '\x1b[0m already exists, do you want to Overwrite it ?', ['YES', 'NO'])
    if (doOverWrite === 'NO') {
      doWrite = false
      logCancel(true)
    }
  }
  if (doWrite) {
    mkdirIfNotExist(CASE_FOLDER)
    mkdirIfNotExist(importFolder)
    log(INFO, 'Creating new Live Aps Import Configuration file: ' + impConfFileName)
    copyFile(global.PROJECT_ROOT + 'templates/import-live-apps-data-configuration.json', targetFile)
    // log(INFO, 'Now configure the multiple propety file and then run "\x1b[34mtcli -m\033[0m" (for default propety name) or "\x1b[34mtcli -m <propfile name>\033[0m" to execute...');
  }
}

// Function to Import LiveApps Case Data based on Config File
export async function importLiveAppsData () {
  await checkCaseFolder()
  log(INFO, ' -- Gathering Import Configuration --- ')
  const importFolder = process.cwd() + '/' + CASE_FOLDER + 'Import/'
  let importFile = importFolder + 'import-live-apps-data-configuration.json'
  // TODO: Choose import file (if there are more) --> Starts with import && ends with json

  // If default import file does not exist, ask for a custom one.
  if (!doesFileExist(importFile)) {
    importFile = process.cwd() + '/' + await askQuestion('Default Import file (' + importFile + ') not found, which import configuration file would you like to use ?')
  }
  const impConf = require('jsonfile').readFileSync(importFile)
  const cSteps = impConf['import-steps']
  log(INFO, 'Configured Steps: ', cSteps)

  // TODO: check if data of all steps has the same size
  // TODO: Check if there is a creator (how to map the caseID)
  // TODO: Check if the first step is a creator

  // Loop over all the data
  let numberOfImports = 1
  let dataForImport = []
  if (impConf[impConf['import-steps'][0]].data) {
    if (impConf[impConf[impConf['import-steps'][0]].data].FILESTORE != null) {
      dataForImport = require('jsonfile').readFileSync(importFolder + impConf[impConf[impConf['import-steps'][0]].data].FILESTORE)
    } else {
      dataForImport = impConf[impConf['import-steps'][0]].data
    }
    numberOfImports = dataForImport.length
  }
  const sBid = await getProductionSandbox()
  let importAppName = ''
  let importAppId = ''
  let numberOfImportSteps = 0
  if (impConf['la-application-name'] != null) {
    importAppName = impConf['la-application-name']
    log(INFO, 'Getting App Id for LA Application ' + importAppName)
    const apps = await showLiveApps(false, false)
    // console.log(apps);
    let appData: any = {}
    for (const app of apps) {
      if (app.name === importAppName) {
        importAppId = app.applicationId
        appData = app
      }
    }
    numberOfImportSteps = impConf['import-steps'].length
    for (const step of impConf['import-steps']) {
      const stepConf = impConf[step]
      // console.log(stepConf)
      impConf[step].applicationId = importAppId
      if (stepConf.type === 'CREATOR') {
        // Look in the creators
        if (appData.creators != null) {
          for (const creator of appData.creators) {
            if (creator.name === stepConf.name) {
              impConf[step]['process-id'] = creator.id
            }
          }
        }
      }
      if (stepConf.type === 'ACTION') {
        // Look in the creators
        if (appData.actions != null) {
          for (const action of appData.actions) {
            if (action.name === stepConf.name) {
              impConf[step]['process-id'] = action.id
            }
          }
        }
      }
    }
  }
  // console.log(impConf);
  await CCOM.showCloudInfo()
  log(INFO, '\x1b[34m                   -- IMPORT SUMMARY --- ')
  log(INFO, '\x1b[34m -       Number of Imports: ' + numberOfImports)
  log(INFO, '\x1b[34m -              Sandbox ID: ' + sBid)
  log(INFO, '\x1b[34m -         Import App Name: ' + importAppName)
  log(INFO, '\x1b[34m -           Import App ID: ' + importAppId)
  log(INFO, '\x1b[34m -  Number of Import Steps: ' + numberOfImportSteps)
  let stepN = 1
  // Show Summary Table (Step Number, Step Name, SandboxID, Application Name, Application ID, Process Type, Process Name, Process ID, Sleep Time)

  for (const step of impConf['import-steps']) {
    const stepConf = impConf[step]
    log(INFO, '\x1b[33m -                    STEP: ' + stepN)
    log(INFO, '\x1b[34m -                    NAME: ' + stepConf.name)
    log(INFO, '\x1b[34m -                    TYPE: ' + stepConf.type)
    if (stepConf.type.toString().toLowerCase() !== 'validate') {
      log(INFO, '\x1b[34m -              PROCESS ID: ' + stepConf['process-id'])
    } else {
      log(INFO, '\x1b[34m -       VALIDATION ACTION: ' + stepConf['validation-action'])
      if (stepConf['validation-action'].toLowerCase() === 'case_in_state') {
        log(INFO, '\x1b[34m -          EXPECTED STATE: ' + stepConf['expected-state'])
      }
    }
    if (stepConf.sleep) {
      stepConf['sleep-min'] = +(stepConf.sleep / 60000).toFixed(2)
      log(INFO, '\x1b[34m -              SLEEP TIME: ' + stepConf.sleep + 'ms (' + stepConf['sleep-min'] + ' Minutes)')
    }
    stepN++
  }

  log(INFO, '\x1b[0m')
  const doImport = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO START THE IMPORT ?', ['YES', 'NO'])
  if (doImport.toLowerCase() === 'yes') {
    for (let i = 0; i < numberOfImports; i++) {
      // Loop over all cases
      let caseRef = ''
      for (const impStep of impConf['import-steps']) {
        const stepConf = impConf[impStep]
        // TODO: Add option to provide process name and type and then look up the application ID an process ID
        log(INFO, '           Step: ' + impStep)
        // Option to point to file for importing data
        let dataForImport = []
        let dataToImport
        if (stepConf.type.toString().toLowerCase() !== 'validate') {
          log(INFO, '     Process ID: ' + stepConf['process-id'])
          log(INFO, ' Application ID: ' + stepConf.applicationId)
          // TODO: put this in seperate function
          if (impConf[stepConf.data].FILESTORE != null) {
            dataForImport = require('jsonfile').readFileSync(importFolder + impConf[stepConf.data].FILESTORE)
          } else {
            dataForImport = impConf[stepConf.data]
          }
          dataToImport = dataForImport[i]
        }
        if (stepConf.type.toString().toLowerCase() === 'creator') {
          log(INFO, 'Creating LiveApps Case (' + i + ')')
          const postRequest = {
            id: stepConf['process-id'],
            sandboxId: sBid,
            applicationId: stepConf.applicationId,
            data: JSON.stringify(dataToImport)
          }
          const response = await CCOM.callTCA(CCOM.clURI.la_process, false, {
            method: 'POST',
            postRequest: postRequest
          })
          log(INFO, 'Response: ', response)
          // Get Case ID
          caseRef = response.caseReference
        }
        if (stepConf.type.toString().toLowerCase() === 'action') {
          if (stepConf.caseref) { // TODO: Duplicate code, move to one function
            if (Number.isInteger(stepConf.caseref)) {
              caseRef = stepConf.caseref
            } else {
              if (stepConf.caseref.toString().toLowerCase() === 'from-creator') {
                if (caseRef === '') {
                  log(ERROR, 'Caseref to be configured from creator but no caseref is set...')
                }
              } else {
                const _F = require('lodash')
                caseRef = _F.get(dataToImport, stepConf.caseref)
                log(INFO, 'Using CaseRef: ' + caseRef)
                if (stepConf['delete-caseref'].toLowerCase() === 'true') {
                  _F.unset(dataToImport, stepConf.caseref)
                }
              }
            }
          }
          log(INFO, 'Actioning LiveApps Case (' + i + ') Ref ' + caseRef)
          const postRequest = {
            id: stepConf['process-id'],
            sandboxId: sBid,
            applicationId: stepConf.applicationId,
            /* TODO: look at bug .replace is not a function */
            data: JSON.stringify(dataToImport).replace('@@CASEREF@@', caseRef),
            caseReference: caseRef
          }
          const response = await CCOM.callTCA(CCOM.clURI.la_process, true, {
            method: 'POST',
            postRequest: postRequest
          })
          log(DEBUG, 'Response: ', response)
        }
        if (stepConf.type.toString().toLowerCase() === 'validate') {
          // TODO: Add this to config: "fail-on-validation-error": true,
          if (stepConf.caseref) {
            if (Number.isInteger(stepConf.caseref)) {
              caseRef = stepConf.caseref
            } else {
              if (stepConf.caseref.toString().toLowerCase() === 'from-creator') {
                if (caseRef === '') {
                  log(ERROR, 'Caseref to be configured from creator but no caseref is set...')
                  process.exit(1)
                }
              } else {
                const _F = require('lodash')
                caseRef = _F.get(dataToImport, stepConf.caseref)
                log(INFO, 'Using CaseRef for Validation: ' + caseRef)
                if (stepConf['delete-caseref'].toLowerCase() === 'true') {
                  _F.unset(dataToImport, stepConf.caseref)
                }
              }
            }
          } else {
            log(ERROR, 'caseref not found on ', stepConf)
            process.exit(1)
          }
          if (stepConf['validation-action']) {
            const vAction = stepConf['validation-action'].toLowerCase().trim()
            let actFound = false
            if (vAction === 'case_exist' || vAction === 'case_not_exist') {
              await VAL.validateLACase(caseRef.toString(), vAction)
              actFound = true
            }
            if (vAction === 'case_in_state') {
              if (stepConf['expected-state'] != null) {
                await VAL.validateLACaseState(caseRef.toString(), stepConf['expected-state'])
              } else {
                log(ERROR, 'expected-state not found on ', stepConf)
              }
              actFound = true
            }
            if (!actFound) {
              log(ERROR, 'validation-action not recognized: |', vAction + '|')
              process.exit(1)
            }
          } else {
            log(ERROR, 'validation-action not found on ', stepConf)
            process.exit(1)
          }
        }
        if (stepConf.sleep && stepConf.sleep > 0) {
          log(INFO, 'Sleeping for ' + stepConf.sleep + ' ms (' + stepConf['sleep-min'] + ' Minutes)...')
          await sleep(stepConf.sleep)
        }
      }
    }
  } else {
    logCancel(true)
  }
}

// Function to copy LiveApps application between organizations
export async function copyLiveApps () {
  log(INFO, 'Copying LiveApps Application between organizations...')
  let doCopyFromMaster = false
  let appQuestion = 'Which LiveApps Application would you like to copy between organizations ?'
  let masterOrgName
  if (getProp('Master_Account_Token')) {
    doCopyFromMaster = true
    masterOrgName = await getMasterOrgName()
    appQuestion = 'Which LiveApps Application would you like to copy from the MASTER(' + col.blue(masterOrgName) + ') Organization to Your Organization ?'
  }
  // Step 1: Display the current LiveApps Apps
  await showLiveAppsDesign(true)
  const laApps = await getLiveAppsDesignTime()
  // Step 2: Select a LiveApps App (and it's id)
  const laAppNameToCopy = await askMultipleChoiceQuestionSearch(appQuestion, ['NONE', ...laApps.map((v: { name: string; }) => v.name)])
  if (laAppNameToCopy.toLowerCase() !== 'none') {
    const laAppToCopy = laApps.find(v => v.name === laAppNameToCopy)
    // Step 3: Display all organizations (preferably the ones that have LiveApps)
    if (!doCopyFromMaster) {
      // Step 4: Select a target organization
      const targetOrgInfo = await displayOrganizations(true, true, 'To which organization would you like to copy ' + laAppToCopy!.name + ' ?')
      // console.log(targetOrgInfo);
      if (laAppToCopy && laAppToCopy.latestVersionId && targetOrgInfo && targetOrgInfo.accountDisplayName) {
        const targetOrgName = targetOrgInfo.accountDisplayName
        // Step 5: Send a share command to the current organization
        const shareReq = {
          message: 'Application shared through tcli',
          disableEmailNotification: true,
          recipients: [getProp('CloudLogin.email')]
        }
        const shareRes = await CCOM.callTCA(CCOM.clURI.la_design_apps + '/' + laAppToCopy.latestVersionId + '/applicationShare', false, {
          method: 'POST',
          postRequest: shareReq
        })
        log(INFO, 'Application shared on current organization with id:', col.blue(shareRes))
        // Step 6: Switch to the target organization
        const currentOrgInfo = await getCurrentOrganizationInfo()
        log(INFO, '    Current Organization: ', col.blue(currentOrgInfo.displayName))
        log(INFO, 'Changing to Organization: ', col.blue(targetOrgInfo.accountDisplayName))
        await changeOrganization(targetOrgInfo.accountId)
        // Check if the app does not exist already
        const targetOrgApplications = await getLiveAppsDesignTime()
        let doCopy = true
        if (targetOrgApplications && targetOrgApplications.length > 0) {
          let appExist = false
          for (const cuApp of targetOrgApplications) {
            if (laAppNameToCopy === cuApp.name) {
              appExist = true
            }
          }
          if (appExist) {
            const copyAns = await askMultipleChoiceQuestion('An app with the name ' + col.blue(laAppNameToCopy) + ' already exists in the target organization, are you sure you want to copy (the new app will get different name) ?', ['YES', 'NO'])
            if (copyAns.toLowerCase() === 'no') {
              doCopy = false
            }
          }
        }
        if (doCopy) {
          // Step 7: Receive the LiveApps App
          const receiveRes = await receiveLApp(shareRes)
          log(INFO, 'LiveApps Applications on TARGET Organization:')
          await showLiveAppsDesign(true)
          // Step 8: Switch back to the original organization
          await changeOrganization(currentOrgInfo.accountId)
          if (receiveRes) {
            // await showLiveAppsDesign(true);
            log(INFO, 'Successfully copied: ', col.green(laAppNameToCopy) + ' to ' + col.green(targetOrgName) + ' (new id: ' + receiveRes + ')')
          } else {
            log(ERROR, 'Something went wrong while copying; ' + laAppNameToCopy + ' to ' + targetOrgName)
          }
        } else {
          await changeOrganization(currentOrgInfo.accountId)
          log(WARNING, 'Application ' + laAppToCopy.name + ' not copied, since it already existed...')
        }
      }
    } else {
      // Check if the application exists already.
      const masterApplications = await getLiveAppsDesignTime()
      const currentOrgApplications = await showLiveAppsDesign(false)
      let doCopy = true
      if (masterApplications && masterApplications.length > 0 && currentOrgApplications && currentOrgApplications.length > 0) {
        let appExist = false
        for (const cuApp of currentOrgApplications) {
          if (laAppNameToCopy === cuApp.name) {
            appExist = true
          }
        }
        if (appExist) {
          const copyAns = await askMultipleChoiceQuestion('An app with the name ' + col.blue(laAppNameToCopy) + ' already exists in the current organization, are you sure you want to copy (the new app will get different name) ?', ['YES', 'NO'])
          if (copyAns.toLowerCase() === 'no') {
            doCopy = false
          }
        }
      }
      if (doCopy) {
        // Copy from master
        if (laAppToCopy && laAppToCopy.latestVersionId) {
          const shareReq = {
            message: 'Application shared through tcli',
            disableEmailNotification: true,
            recipients: [getProp('CloudLogin.email')]
          }
          const shareRes = await CCOM.callTCA(CCOM.clURI.la_design_apps + '/' + laAppToCopy.latestVersionId + '/applicationShare', false, {
            method: 'POST',
            postRequest: shareReq,
            forceOAUTH: true,
            manualOAUTH: getMasterToken()
          })
          log(INFO, 'Application shared from MASTER(' + col.blue(masterOrgName) + ') with id:', col.blue(shareRes))
          const receiveRes = await receiveLApp(shareRes)
          if (receiveRes) {
            await showLiveAppsDesign(true)
            log(INFO, 'Successfully copied: ', col.green(laAppNameToCopy) + ' from the MASTER(' + col.blue(masterOrgName) + ') Org (new id: ' + receiveRes + ')')
          } else {
            log(ERROR, 'Something went wrong while copying; ' + laAppNameToCopy + ' from the MASTER(' + col.blue(masterOrgName) + ') Org ')
          }
        } else {
          log(ERROR, 'No App to copy: ', laAppToCopy)
        }
      } else {
        log(WARNING, 'Application ' + laAppToCopy!.name + ' not copied, since it already existed...')
      }
    }
  } else {
    logCancel(true)
  }
}

async function receiveLApp (shareRes: number) {
  const receiveReq = {
    shareId: shareRes,
    governanceState: 'PUBLISHED'
  }
  return await CCOM.callTCA(CCOM.clURI.la_design_apps, false, {
    method: 'POST',
    postRequest: receiveReq
  })
}

// Function to
export function csvToJsonLiveAppsData () {
// TODO: Implement
}

// Function to
export function jsonToCsvLiveAppsData () {
// TODO: Implement
}
