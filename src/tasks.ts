// import functions
import {
  col,
  createMultiplePropertyFile,
  deleteFolder,
  displayGlobalConnectionConfig, displayOpeningMessage, getCurrentRegion,
  getGit,
  getOrganization,
  getRegion,
  isOauthUsed,
  obfuscatePW,
  run,
  updateCloudPackages,
  updateGlobalConnectionConfig, updateRegion, updateTCLI
} from './common/common-functions'
import { Global } from './models/base'
import { TCLITask } from './models/tcli-models'
import {
  askMultipleChoiceQuestion,
  askMultipleChoiceQuestionSearch,
  askMultipleChoiceQuestionSync,
  askQuestion, askQuestionTask
} from './common/user-interaction'
import {
  addOrUpdateProperty,
  checkForLoginProps,
  getProp,
  getPropFileName,
  setProperty
} from './common/property-file-management'
import { DEBUG, INFO, log, RECORDER, setLogDebug, throb, WARNING } from './common/logging'
import { prepRecorderProps } from './common/recorder'
import { checkForLocalPropertyFileUpgrades } from './common/upgrades'
import { callTCA, cLogin, clURI } from './common/cloud-communications'
import { getOAUTHDetails } from './common/oauth'

declare let global: Global
// require('./tenants/common-functions');
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Common')
const version = require('../package.json').version

// Constants
const START_RECORDING = 'start-recording'
const STOP_RECORDING = 'stop-recording'
const BACK = 'BACK'
const BACK_TO_ALL = 'BACK TO ALL TASKS'
const CAT_QUESTION = 'From which category would you like to select a task ?'
const cliTaskConfig = require('./config/config-cli-task.json')
const cTsks = cliTaskConfig.cliTasks as TCLITask[]
// Comes from prop file
let gTasksDescr: string[] = []
let gTasksNames: string[] = []
const gCategory = ['ALL']
let globalLastCommand = 'help'

// Wrapper to main task
export async function mainT (cat?: string) {
  const catToUse = cat || 'ALL'
  prepRecorderProps()
  displayOpeningMessage()
  console.log('[TIBCO CLOUD CLI - V' + version + '] ("exit" to quit / "help" to display tasks)')
  const appRoot = process.cwd()
  if (getProp('CloudLogin.pass') === '' && !isOauthUsed()) {
    // When password is empty ask it manually for the session.
    const pass = await askQuestion('Please provide your password: ', 'password')
    setProperty('CloudLogin.pass', obfuscatePW(pass))
  }
  checkForLoginProps()
  await loadTasks(catToUse)
  await promptTask(__dirname, appRoot)
}

async function loadTasks (catToUse: string) {
  let availableCategories = ['ALL']
  if (getProp('CloudLogin.OnStartup') && getProp('CloudLogin.OnStartup').toLowerCase() === 'yes') {
    const login = await cLogin('TSC', 'https://' + getCurrentRegion() + clURI.general_login, false, undefined, true)
    if (login !== 'ERROR') {
      if (getProp('CloudLogin.OnlyShowAvailableTasks') && getProp('CloudLogin.OnlyShowAvailableTasks').toLowerCase() === 'yes') {
        log(INFO, 'Successfully logged on, available categories: ')
        const userRoles = await callTCA(clURI.account_user_roles, false, {
          tenant: 'TSC',
          customLoginURL: 'https://' + getCurrentRegion() + clURI.general_login,
          handleErrorOutside: true
        })
        availableCategories = ['tcli', 'tibco-cloud', 'oauth']
        if (getProp('CloudLogin.AdditionalCategories')) {
          availableCategories = availableCategories.concat(getProp('CloudLogin.AdditionalCategories').split(','))
        }
        let scopeArray: string[] = []
        let checkOauthScope = false
        if (isOauthUsed()) {
          const oDetails = getOAUTHDetails()
          if (oDetails && oDetails.Scope) {
            scopeArray = oDetails.Scope.split(' ')
            scopeArray = scopeArray.map(v => v.toLowerCase())
            checkOauthScope = true
          }
        }
        const yellowCategories = []
        if (userRoles.userRolesDetailsForTenants) {
          for (const role of userRoles.userRolesDetailsForTenants) {
            if (role && role.tenantId) {
              switch (role.tenantId.toLowerCase()) {
                case 'spotfire':
                case 'tci':
                case 'nimbus':
                  if (checkOauthScope && scopeArray.indexOf(role.tenantId.toLowerCase()) === -1) {
                    yellowCategories.push(role.tenantId.toLowerCase())
                  } else {
                    availableCategories.push(role.tenantId.toLowerCase())
                  }
                  break
                case 'bpm':
                  if (checkOauthScope && scopeArray.indexOf(role.tenantId.toLowerCase()) === -1) {
                    yellowCategories.push('cloud-apps', 'live-apps', 'shared-state', 'cloud-files')
                  } else {
                    availableCategories.push('cloud-apps', 'live-apps', 'shared-state', 'cloud-files')
                  }
                  break
                case 'tcm':
                  if (checkOauthScope && scopeArray.indexOf(role.tenantId.toLowerCase()) === -1) {
                    yellowCategories.push('messaging')
                  } else {
                    availableCategories.push('messaging')
                  }
                  break
              }
            }
          }
        }
        const allCat = getAllCategories()
        let idX = 0
        let toStr = ''
        for (const cat of allCat) {
          idX++
          let check = ''
          let catCol = ''
          if (yellowCategories.indexOf(cat) > -1) {
            check += ' [' + col.yellow('X') + '] '
            catCol = col.yellow(cat)
          } else {
            if (availableCategories.indexOf(cat) > -1) {
              check += ' [' + col.green('V') + '] '
              catCol = col.green(cat)
            } else {
              check += ' [' + col.red('X') + '] '
              catCol = col.red(cat)
            }
          }
          toStr += check + catCol.padEnd(30)
          if (idX > 3) {
            log(INFO, toStr)
            toStr = ''
            idX = 0
          }
        }
        if (idX > 0) {
          // Show the left categories
          log(INFO, toStr)
        }
        // log(INFO, toStr)
        // TODO: to help
        // log(INFO, col.red('█') + '= No Access ' + col.yellow('█') + '= Access, but not in your OAUTH Scope. ' + col.green('█') + '= Access ')
      } else {
        log(INFO, col.green('Successfully logged on... '))
      }
    } else {
      log(WARNING, 'Login failed; only tcli tasks are available')
      availableCategories = ['tcli']
    }
  }
  loadTaskDesc(catToUse, availableCategories)
}

function getAllCategories () {
  const cats = []
  for (const cliTask in cTsks) {
    if (cTsks[cliTask]) {
      const task = cTsks[cliTask]!
      if (task.category) {
        if (!(cats.indexOf(task.category) > -1)) {
          cats.push(task.category)
        }
      }
    }
  }
  return cats
}

export function loadTaskDesc (category?: string, availableCat?: string[]) {
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Before task descriptions')
  if (!availableCat) {
    availableCat = ['ALL']
  }
  gTasksDescr = []
  gTasksNames = []
  const catToUse = category || 'ALL'
  if (catToUse !== 'ALL') {
    gTasksDescr.push(BACK, BACK_TO_ALL)
    gTasksNames.push(BACK, BACK_TO_ALL)
  }
  let taskCounter = 0
  for (const cliTask in cTsks) {
    if (cTsks[cliTask]) {
      const task = cTsks[cliTask]!
      let allowed = false
      if (task.availableOnOs != null) {
        for (const allowedOS of task.availableOnOs) {
          if (allowedOS === process.platform || allowedOS === 'all') {
            allowed = true
          }
        }
      }
      if (task.enabled && allowed && (availableCat.indexOf('ALL') > -1 || availableCat.indexOf(task.category) > -1)) {
        // Add to global category (if not exits)
        if (gCategory.indexOf(task.category) === -1) {
          gCategory.push(task.category)
        }
        if (!task.internal && !(cliTask === 'help' || cliTask === 'exit')) {
          if (task.category === catToUse || catToUse === 'ALL') {
            taskCounter++
            const tCounterStr = taskCounter + ') '
            const catStr = '[' + task.category + '] '
            // Remove the category from the name
            let taskName = cliTask.replace(task.category, '')
            // Special case for cloud starter since the category is called cloud starters
            taskName = taskName.replace('cloud-app', '')
            // Replace double --
            taskName = taskName.replace('--', '-')
            // Remove -'s at the end or beginning
            if (taskName.endsWith('-')) {
              taskName = taskName.substring(0, taskName.length - 1)
            }
            if (taskName.startsWith('-')) {
              taskName = taskName.substring(1, taskName.length)
            }
            gTasksDescr.push(tCounterStr.padStart(4) + taskName.padEnd(30) + catStr.padStart(17) + ' - ' + task.description)
            gTasksNames.push(cliTask)
          }
        } else {
          gTasksDescr.push(cliTask)
          gTasksNames.push(cliTask)
        }
      }
    }
  }
  if (getProp('Recorder_Use') && getProp('Recorder_Use').toLowerCase() === 'yes') {
    // TODO: Inject two before end
    gTasksDescr.splice(gTasksDescr.length - 2, 0, START_RECORDING)
    gTasksNames.splice(gTasksNames.length - 2, 0, START_RECORDING)
  }
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After task descriptions')
}

let globalDoRecord = false

// Main Cloud CLI Questions
export async function promptTask (stDir: string, cwdDir: string): Promise<void> {
  const inquirer = require('inquirer')
  log(DEBUG, 'PromptTask)           stDir dir: ' + stDir)
  log(DEBUG, 'PromptTask) current working dir: ' + cwdDir)
  return new Promise<void>(async function (resolve) {
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
    let pMes = '[TCLI - ' + col.blue(getRegion(true, true)) + ' - ' + col.yellow(getProp('App_Name')) + ']: '
    // If there is an org, show it
    const org = getOrganization(true)
    if (org) {
      pMes = '[TCLI - ' + col.blue(getRegion(true, true) + ' - ' + org) + ' - ' + col.yellow(getProp('App_Name')) + ']: '
    }
    const command = await askMultipleChoiceQuestionSearch(pMes, gTasksDescr, 5)
    let selectedTask = gTasksNames[gTasksDescr.findIndex((el) => command === el)]
    // In case an answer was injected
    if (!selectedTask) {
      selectedTask = command
    }
    log(INFO, 'Selected task] ' + col.blue(selectedTask))
    const com = selectedTask
    // Special case for help, call the inline help directly
    if (com === 'help') {
      await helptcliWrapper()
      return promptTask(stDir, cwdDir)
    }
    // Logic to browse by task
    if (com === BACK_TO_ALL) {
      loadTaskDesc('ALL')
      return promptTask(stDir, cwdDir)
    }
    if (com === START_RECORDING) {
      globalDoRecord = true
      await throb(' Starting Recording...', [col.reset.bgWhite('[RECORDER]') + col.red(' ●'), col.reset.bgWhite('[RECORDER]') + '  '], 3)
      log(RECORDER, col.red('●') + ' Started Recording...')
      // Change task to stop recording
      gTasksDescr[gTasksDescr.findIndex(des => des === START_RECORDING)] = STOP_RECORDING
      gTasksNames[gTasksNames.findIndex(name => name === START_RECORDING)] = STOP_RECORDING
      return promptTask(stDir, cwdDir)
    }
    if (com === STOP_RECORDING) {
      globalDoRecord = false
      log(RECORDER, col.white(' ● ') + ' Recording Stopped...')
      gTasksDescr[gTasksDescr.findIndex(des => des === STOP_RECORDING)] = START_RECORDING
      gTasksNames[gTasksNames.findIndex(name => name === STOP_RECORDING)] = START_RECORDING
      return promptTask(stDir, cwdDir)
    }
    if (com === 'browse-tasks' || com === BACK) {
      const chosenCat = await askMultipleChoiceQuestionSearch(CAT_QUESTION, gCategory)
      loadTaskDesc(chosenCat)
      return promptTask(stDir, cwdDir)
    }
    if (com === 'quit') {
      if (Math.random() < 0.1) {
        // Quit with a quote
        console.log(col.bgWhite(QUOTES[Math.floor(Math.random() * QUOTES.length)]))
      }
      console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ')
      return resolve()
    }
    // Check if we need to repeat the last task
    let comToInject = selectedTask
    if (com === 'repeat-last-task') {
      log('INFO', 'Repeating Last Task: ' + globalLastCommand)
      comToInject = globalLastCommand
    } else {
      globalLastCommand = comToInject!
    }
    let additionalArugments = ''
    for (const arg in process.argv) {
      // TODO: Should not all arguments be propagated >?
      if (process.argv[arg] === '--debug' || process.argv[arg] === '-d') {
        additionalArugments += ' -d '
      }
    }
    if (getProp('CloudLogin.pass')) {
      additionalArugments += ' --pass "' + getProp('CloudLogin.pass') + '"'
    }
    if (getOrganization(true) !== '') {
      additionalArugments += ' --org "' + getOrganization(true) + '"'
    }
    if (getProp('Recorder_Use') && getProp('Recorder_Use').toLowerCase() === 'yes') {
      additionalArugments += ' --showReplay'
    }
    if (getProp('Recorder_Do_Record_From_Start') && getProp('Recorder_Do_Record_From_Start').toLowerCase() === 'yes') {
      globalDoRecord = true
    }
    if (globalDoRecord) {
      additionalArugments += ' --record "' + getProp('Recorder_File_To_Record_To') + '"'
    }
    const commandTcli = 'tcli ' + comToInject + ' -p "' + getPropFileName() + '" ' + additionalArugments
    // TODO: Don't call tcli again but create a CLIRun Class
    run(commandTcli, false)
    // If organization was changed re-check the tasks
    if (selectedTask === 'change-tibco-cloud-organization') {
      await loadTasks('ALL')
    }
    return promptTask(stDir, cwdDir)
  })
  // });
}

// A function to get directly into the browse mode
export async function browseTasks () {
  // Load categories
  loadTaskDesc('ALL')
  const chosenCat = await askMultipleChoiceQuestionSearch(CAT_QUESTION, gCategory)
  mainT(chosenCat)
}

export async function testTask () {
  console.log('Test...')
  // const Watcher = require('./common/watcher')
  // const myWatcher = new Watcher('/Users/hpeters@tibco.com/WebstormProjects/TEST_TCLI_Listing/TestWatch', 'discover.labs.tibcocloud.com/configuration')
  // await myWatcher.pullFiles()
  // await myWatcher.watch()
  const result = askMultipleChoiceQuestionSync('Question ', ['yes', 'no'])
  console.log('After question: ', result)
}

// Function to display help
export async function helptcliWrapper () {
  const HELP = require('./common/help')
  await HELP.showInteractiveHelp()
}

// Assisting function to ask a question
export async function askQuestionWrapper () {
  await askQuestionTask()
}

// Function to show cloud info
export async function showCloud () {
  const CCOM = require('./common/cloud-communications')
  await CCOM.showCloudInfo()
}

// Function to show cloud roles
export async function showCloudRolesWrapper () {
  const CCOM = require('./common/cloud-communications')
  await CCOM.showCloudInfo(true, false, true)
}

// Start Cloud Starter Locally
export async function startWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.start()
}

// Test Cloud Starter Locally
export async function testCSWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.testCS()
}

// Test Cloud Starter Locally Headless
export async function testCSHeadlessWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.testCSHeadless()
}

// Function to publish the cloud starter
export async function publish () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.publishApp(getProp('App_Name'))
  log(INFO, 'APP PUBLISHED: ' + getProp('App_Name'))
  CS.showAppLinkInfo()
}

// Show all the cloud starters
export async function showApps () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.showAvailableApps(true)
}

// Show all the cloud starters
export async function deleteAppWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.deleteApp()
}

// Show all the cloud starter links
export async function showLinks () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.getAppLinks(true)
}

// Function to tenants the cloud starter
export async function buildCloudStarter () {
  const CS = require('./cloud-starters/cloud-starters')
  await CS.cleanDist()
  log('INFO', 'Building... ' + getProp('App_Name'))
  CS.buildCloudStarterZip(getProp('App_Name'))
}

// Function to delpoy the cloud starter
export async function deploy () {
  const CCOM = require('./common/cloud-communications')
  const CS = require('./cloud-starters/cloud-starters')
  log(INFO, 'Deploying ' + getProp('App_Name') + ' to)')
  await CCOM.showCloudInfo()
  await CS.uploadApp(getProp('App_Name'))
  log('INFO', 'DONE DEPLOYING: ' + getProp('App_Name'))
  await CS.showAppLinkInfo()
}

export async function buildDeploy () {
  // Getting these functions from self
  await buildCloudStarter()
  await deploy()
}

// Clean temp folder
export async function cleanTemp () {
  // Getting this from common
  log(INFO, 'Cleaning Temp Directory: ' + getProp('Workspace_TMPFolder'))
  return deleteFolder(getProp('Workspace_TMPFolder'))
}

// Function to get the cloud library sources from GIT
export async function getCLgit () {
  // Getting this from common
  return getGit(getProp('GIT_Source_TCSTLocation'), getProp('TCSTLocation'), getProp('GIT_Tag_TCST'))
}

// Inject the sources from the libs into a cloud starter project
export async function injectLibSourcesWrapper () {
  // 'clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'
  const CS = require('./cloud-starters/cloud-starters')
  await CS.cleanDist()
  await getCLgit()
  CS.injectLibSources()
  await CS.cleanDist()
}

// Inject the sources from the libs into a cloud starter project
export async function undoLibSourcesWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  CS.undoLibSources()
}

// Function to generate the cloud descriptor
export function generateCloudDescriptorWrapper () {
  const CS = require('./cloud-starters/cloud-starters')
  CS.generateCloudDescriptor()
}

// Function to change the tenant in the properties file
export async function changeRegion () {
  // Getting this from common
  await updateRegion(getPropFileName())
}

// Function to change the organization in the properties file
export async function changeOrganizationWrapper () {
  const ORGS = require('./common/organization-management')
  await ORGS.changeOrganization()
}

// Function to change the organization in the properties file
export async function showOrganizationWrapper () {
  const ORGS = require('./common/organization-management')
  await ORGS.showOrganization()
}

export async function obfuscate () {
  const password = await askQuestion('Please provide the password...', 'password')
  // Getting this from common
  const decision = await askMultipleChoiceQuestion('Do you want to update your cloud property file ?', ['YES', 'NO'])
  const obPW = obfuscatePW(password)
  if (decision.toLowerCase() === 'yes') {
    addOrUpdateProperty(getPropFileName(), 'CloudLogin.pass', obPW)
  } else {
    log(INFO, 'Obfuscated password is: ' + col.blue(obPW))
  }
}

export function viewGlobalConfig () {
  // Is coming from Common
  displayGlobalConnectionConfig()
}

export async function updateGlobalConfig () {
  // Is coming from Common
  await updateGlobalConnectionConfig()
}

// Function to replace multiple strings in files
export function replaceStringInFileWrapper () {
  const PROPM = require('./common/property-file-management')
  PROPM.replaceStringInFile()
}

// Function to replace multiple strings in files
export async function replaceValuesInFileWrapper () {
  const PROPM = require('./common/property-file-management')
  await PROPM.replaceValuesInFile()
}

// Wrapper to create a multiple prop file
export async function createMultiplePropertyFileWrapper () {
  // Is coming from Common
  await createMultiplePropertyFile()
}

// Display the shared state entries to a user
export async function createSharedStateWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.createSharedState()
}

// Display the shared state entries to a user
export async function showSharedState () {
  const SHST = require('./tenants/shared-state')
  await SHST.getSharedState(true)
}

// Display the details of a shared state
export async function showSharedStateDetailsWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.showSharedStateDetails()
}

export async function removeSharedStateEntryWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.removeSharedStateEntry()
}

export async function clearSharedStateWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.clearSharedState()
}

export async function exportSharedStateWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.exportSharedState()
}

export async function importSharedStateWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.importSharedState()
}

export async function watchSharedStateMainWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.watchSharedStateMain()
}

export async function watchSharedStateWrapper () {
  const SHST = require('./tenants/shared-state')
  await SHST.watchSharedState()
}

// Function to show liveApps
export async function showLiveAppsWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.showLiveApps(true, true)
}

// Function to show liveApps Design time Apps
export async function showLiveAppsDesignTimeAppsWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.showLiveAppsDesign(true)
}

// Function to show liveApps Actions
export async function showLiveAppsActionsWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.showLiveAppsActions()
}

// Function to show liveApps Actions
export async function showLiveAppsSandboxWrapper () {
  const CCOM = require('./common/cloud-communications')
  await CCOM.showCloudInfo(true, true)
}

// Function to export liveApps cases
export async function exportLiveAppsDataWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.exportLiveAppsData()
}

export async function generateLiveAppsImportConfiguration () {
  const LA = require('./tenants/live-apps')
  await LA.createLAImportFile()
}

// Function to
export async function importLiveAppsDataWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.importLiveAppsData()
}

// Function to
export async function csvToJsonLiveAppsDataWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.csvToJsonLiveAppsData()
}

// Function to
export async function jsonToCsvLiveAppsDataWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.jsonToCsvLiveAppsData()
}

export async function exportLiveAppsCaseTypeWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.exportLiveAppsCaseType()
}

export async function copyLiveAppsWrapper () {
  const LA = require('./tenants/live-apps')
  await LA.copyLiveApps()
}

export function updateCloudPackagesWrapper () {
  // Is coming from common
  updateCloudPackages()
}

export async function manageAPIAccessTCIWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.manageAPIAccess()
}

export async function showTCIWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.showTCIApps()
}

export async function monitorTCIWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.monitorTCI()
}

export async function exportTCIAppWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.exportTCIApp()
}

export async function generateClientCodeForTCIAppWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.generateClientCodeForTCIApp()
}

export async function buildTCIAppWrapper () {
  const TCI = require('./tenants/tci')
  await TCI.buildTCIApp()
}

export async function browseSpotfireLibraryWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.browseSpotfire()
}

export async function listSpotfireLibraryWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.listSpotfire()
}

export async function copySpotfireLibraryWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.copySpotfire()
}

export async function renameSpotfireLibraryItemWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.renameSpotfireLibraryItem()
}

export async function shareSpotfireLibraryFolderWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.shareSpotfireLibraryFolder()
}

export async function deleteSpotfireLibraryWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.deleteSpotfireLibraryItem()
}

export async function uploadDXPWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.uploadSpotfireDXP()
}

export async function downloadDXPWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.downloadSpotfireDXP()
}

export async function createSpotfireLibraryFolderWrapper () {
  const SPOTFIRE = require('./tenants/spotfire')
  await SPOTFIRE.createSpotfireLibraryFolder()
}

export async function generateOauthTokenWrapper () {
  const OAUTH = require('./common/oauth')
  await OAUTH.generateOauthToken()
}

export async function showOauthTokenWrapper () {
  const OAUTH = require('./common/oauth')
  await OAUTH.showOauthToken()
}

export async function revokeOauthTokenWrapper () {
  const OAUTH = require('./common/oauth')
  await OAUTH.revokeOauthToken()
}

export async function rotateOauthTokenWrapper () {
  const OAUTH = require('./common/oauth')
  await OAUTH.rotateOauthToken()
}

export async function validateAndRotateOauthTokenWrapper () {
  const OAUTH = require('./common/oauth')
  await OAUTH.validateAndRotateOauthToken(false)
}

export async function showOrgFoldersWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.showOrgFolders()
}

export async function createOrgFolderWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.createOrgFolder()
}

export async function uploadFileWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.uploadFileToOrgFolder()
}

export async function downloadFileWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.downloadFileFromOrgFolder()
}

export async function deleteFileWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.deleteFileFromOrgFolder()
}

export async function showPropertiesWrapper () {
  const PROPM = require('./common/property-file-management')
  await PROPM.showPropertiesTable()
}

export async function generateCloudPropertyFilesWrapper () {
  const PROPM = require('./common/property-file-management')
  await PROPM.generateCloudPropertyFiles()
}

export async function exportOrgFolderWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.exportOrgFolder()
}

export async function importOrgFolderWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.importOrgFolder()
}

export async function watchOrgFolderWrapper () {
  const CFILES = require('./tenants/cloud-files')
  await CFILES.watchOrgFolder()
}

export async function showLiveAppsGroupsWrapper () {
  const USERGROUPS = require('./tenants/user-groups')
  await USERGROUPS.showLiveAppsGroups()
}

export async function createLiveAppsGroupWrapper () {
  const USERGROUPS = require('./tenants/user-groups')
  await USERGROUPS.createLiveAppsGroup()
}

export async function showLiveAppsUsersWrapper () {
  const USERGROUPS = require('./tenants/user-groups')
  await USERGROUPS.showLiveAppsUsers(true, false)
}

export async function addUserToGroupWrapper () {
  const USERGROUPS = require('./tenants/user-groups')
  await USERGROUPS.addUserToGroup()
}

export async function validateWrapper () {
  const VAL = require('./common/validation')
  await VAL.validate()
}

export async function updatePropertyWrapper () {
  const PROPM = require('./common/property-file-management')
  await PROPM.updateProperty()
}

export async function schematicAddWrapper () {
  const SCHEMATICS = require('./cloud-starters/schematics')
  await SCHEMATICS.schematicAdd()
}

export async function showMessagingSummaryWrapper () {
  const MESSAGING = require('./tenants/messaging')
  await MESSAGING.showSummary()
}

export async function showMessagingClientsWrapper () {
  const MESSAGING = require('./tenants/messaging')
  await MESSAGING.showClients()
}

export async function showDiscoverNMSPAWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.showProcessAnalysis()
}

export async function showDiscoverPAWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.getProcessAnalysis(true)
}

export async function showDiscoverDSWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.showDataSets()
}

export async function showDiscoverNMSDSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.showDataSets()
}

export async function showDiscoverTempWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.getTemplates(true)
}

export async function showDiscoverNMSTempWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.showTemplates()
}

export async function showDiscoverNMSConnectionWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.showConnections()
}

export async function showDiscoverDSFilesWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.getDataSetFiles(true)
}

export async function exportDiscoverDSWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.exportDataSets()
}

export async function exportDiscoverDSNMSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.exportDataSets()
}

export async function exportDiscoverPANMSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.exportProcessAnalysis()
}

export async function exportDiscoverCONMSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.exportConnections()
}

export async function exportDiscoverTEMPNMSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.exportTemplates()
}

export async function exportDiscoverAllNMSWrapper () {
  const DISCOVER = require('./tenants/discover-new-ms')
  await DISCOVER.exportAllDiscoverObjects()
}

export async function uploadDiscoverDSFileWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.uploadDataSetFile()
}

export async function removeDiscoverDSFileWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.removeDataSetFile()
}

export async function createDiscoverDSWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.createDataSet()
}

export async function removeDiscoverDSWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.removeDataSet()
}

export async function runDiscoverPAWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.runProcessAnalysis()
}

export async function actionDiscoverPAWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.actionProcessAnalysis()
}

export async function exportDiscoverConfigWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.exportDiscoverConfig()
}

export async function exportDiscoverNMSConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.exportDiscoverConfig()
}

export async function importDiscoverNMSConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.importDiscoverConfig()
}

export async function importDiscoverNMSConnectionWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.importDiscoverConnection()
}
//
export async function importDiscoverNMSDatasetWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.importDiscoverDataset()
}

export async function watchDiscoverNMSConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.watchDiscoverConfig()
}

export async function deleteDiscoverNMSInvestigationConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.deleteDiscoverInvestigationConfig()
}

//

export async function showDiscoverMessageConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.showDiscoverMessageConfig()
}

export async function deleteDiscoverNMSMessageConfigWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.deleteDiscoverMessageConfig()
}

export async function importDiscoverConfigWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.importDiscoverConfig()
}

export async function watchDiscoverConfigWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.watchDiscoverConfig()
}

export async function uploadDiscoverLandingPageFileWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.uploadDiscoverLandingPageFile()
}

export async function uploadDiscoverNMSAssetWrapper () {
  const DISCOVER_NEW_MS = require('./tenants/discover-new-ms')
  await DISCOVER_NEW_MS.uploadDiscoverAsset()
}

export async function updateDxpDiscoverManagementWrapper () {
  const DISCOVER_MANAGEMENT = require('./tenants/discover-management')
  await DISCOVER_MANAGEMENT.updateDxp()
}

/*
export async function removeDiscoverPAWrapper () {
  const DISCOVER = require('./tenants/discover')
  await DISCOVER.removeProcessAnalysis()
} */

export async function showNimbusMapsWrapper () {
  const NIMBUS = require('./tenants/nimbus')
  await NIMBUS.showNimbusMaps()
}

export async function updateTCLIwrapper () {
  await updateTCLI()
}

// Set log debug level from local property
setLogDebug(getProp('Use_Debug'))
checkForLocalPropertyFileUpgrades()

const QUOTES = [
  "Everyone's a nerd inside. I don't care how cool you are. - Channing Tatum",
  'Never argue with the data. - Sheen',
  "Be nice to nerds. Chances are you'll end up working for one. - Bill Gates",
  'Geeks are people who love something so much that all the details matter. - Marissa Mayer',
  'Q. How does a computer get drunk? A. It takes screenshots....',
  'Q. Why did the PowerPoint Presentation cross the road? A. To get to the other slide....',
  'Q: Why did the computer show up at work late? A: It had a hard drive....',
  'Autocorrect has become my worst enema....'
]
