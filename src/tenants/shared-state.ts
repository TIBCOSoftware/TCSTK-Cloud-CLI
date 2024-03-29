import {
  col, doesExist,
  doesFileExist, getOrganization,
  mkdirIfNotExist,
  run
} from '../common/common-functions'
import {
  getPEXConfig,
  pexTable, showTableFromTobject
} from '../common/tables'
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion } from '../common/user-interaction'
import { DEBUG, ERROR, INFO, log, logLine, WARNING } from '../common/logging'
import { addOrUpdateProperty, getProp, getPropFileName } from '../common/property-file-management'
import { SharedStateINFO } from '../models/live-apps'

const CCOM = require('../common/cloud-communications')
const LA = require('./live-apps')

// TODO: Move this to prop file
const SHARED_STATE_STEP_SIZE = 400
const SHARED_STATE_MAX_CALLS = 20
let SHARED_STATE_FILTER = 'APPLICATION'
let SHARED_STATE_DOUBLE_CHECK = 'YES'
let SHARED_STATE_FOLDER = './Shared_State/'
let DO_SHARED_STATE_DOUBLE_CHECK = true

let ssInformed = false

async function prepSharedStateProps () {
  // Shared state filter (picked up from configuration if exists)
  if (getProp('Shared_State_Filter') != null) {
    SHARED_STATE_FILTER = getProp('Shared_State_Filter')
  } else {
    log(INFO, 'No Shared State Filter Property found; Adding APPLICATION to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Filter', 'APPLICATION')
  }
  // Shared state filter (picked up from configuration if exists)
  if (getProp('Shared_State_Double_Check') != null) {
    SHARED_STATE_DOUBLE_CHECK = getProp('Shared_State_Double_Check')
  } else {
    log(INFO, 'No Shared State Filter Double Check Property found; Adding YES to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Double_Check', 'YES')
  }
  DO_SHARED_STATE_DOUBLE_CHECK = (!(SHARED_STATE_DOUBLE_CHECK.toLowerCase() === 'no'))
  // Shared state folder (picked up from configuration if exists)
  if (getProp('Shared_State_Folder') != null) {
    SHARED_STATE_FOLDER = getProp('Shared_State_Folder')
  } else {
    addOrUpdateProperty(getPropFileName(), 'Shared_State_Folder', SHARED_STATE_FOLDER)
  }
  // Potentially use the organization name in the Folder property
  if (SHARED_STATE_FOLDER.toLowerCase().indexOf('~{organization}') > 0) {
    if (!getOrganization()) {
      await CCOM.showCloudInfo(false)
    }
    SHARED_STATE_FOLDER = SHARED_STATE_FOLDER.replace(/\~\{organization\}/ig, getOrganization())
    if (!ssInformed) {
      log(INFO, 'Using Shared State Folder: ' + col.blue(SHARED_STATE_FOLDER))
      ssInformed = true
    }
  }
}

async function getAllSharedStates (): Promise<SharedStateINFO[]> {
  await prepSharedStateProps()
  let ALLsState: SharedStateINFO[] = []
  let i = 0
  let moreStates = true
  let filterType = 'PUBLIC'
  if (getProp('Shared_State_Type') != null) {
    filterType = getProp('Shared_State_Type')
  }
  log(INFO, 'Type of Shared State: ' + col.blue(filterType))
  while (moreStates && i < SHARED_STATE_MAX_CALLS) {
    const start = i * SHARED_STATE_STEP_SIZE
    const filter = '&$filter=type=' + filterType
    const sStateTemp = await CCOM.callTCA(CCOM.clURI.shared_state + '?$top=' + SHARED_STATE_STEP_SIZE + '&$skip=' + start + filter) as SharedStateINFO[]
    if (sStateTemp.length < 1) {
      moreStates = false
    }
    // log(INFO, 'Got ' + sStateTemp.length);
    ALLsState = ALLsState.concat(sStateTemp)
    i++
    logLine('Got Shared States: ' + ALLsState.length)
  }
  console.log('')
  return ALLsState
}

// Function to return a JSON with the shared state entries from a set filter
export async function getSharedState (showTable?: boolean) {
  // TODO: Think about applying a filter when getting the entries (instead of client side filtering)
  await prepSharedStateProps()
  const ALLsState = await getAllSharedStates()
  log(INFO, 'Total Number of Shared State Entries: ' + ALLsState.length)

  if (SHARED_STATE_FILTER === 'APPLICATION') {
    SHARED_STATE_FILTER = getProp('App_Name')
  }
  let sState:SharedStateINFO[] = []
  log(INFO, 'Applying Shared State Filter: ' + SHARED_STATE_FILTER)
  if (SHARED_STATE_FILTER !== '*') {
    for (const state in ALLsState) {
      if (ALLsState[state] && ALLsState[state]!.name && ALLsState[state]!.name.startsWith(SHARED_STATE_FILTER)) {
        sState.push(ALLsState[state]!)
      }
    }
  } else {
    sState = ALLsState
  }
  log(INFO, 'Filtered Shared State Entries: ' + sState.length)
  // Sort shared state by old date till new
  sState.sort(function (a, b) {
    const comp1 = new Date(a.createdDate!)
    const comp2 = new Date(b.createdDate!)
    return comp1 > comp2 ? 1 : comp1 < comp2 ? -1 : 0
  })
  const states:any = {}
  const statesDisplay:any = {}
  let appN = 0
  for (const state of sState) {
    const sTemp:any = {}
    appN++
    sTemp.ID = state.id
    sTemp.NAME = state.name
    sTemp.SCOPE = state.type
    // console.log(state);
    sTemp['CREATED BY'] = state.createdByName
    const created = new Date(state.createdDate!)
    const options:DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    sTemp['CREATED ON'] = created.toLocaleDateString('en-US', options)
    sTemp['MODIFIED BY'] = state.modifiedByName
    const modified = new Date(state.modifiedDate!)
    sTemp['MODIFIED ON'] = modified.toLocaleDateString('en-US', options)
    states[appN] = sTemp
    const sTempDisplay = { ...sTemp }
    delete sTempDisplay['CREATED BY']
    delete sTempDisplay['CREATED ON']
    statesDisplay[appN] = sTempDisplay
  }
  pexTable(states, 'shared-states', getPEXConfig(), false)
  if (showTable) {
    // log(INFO, col.blue('TABLE] shared-states'))
    // console.table(statesDisplay)
    showTableFromTobject(statesDisplay, 'shared-states')
  }
  return sState
}

export async function selectSharedState (sharedStateEntries: any[], question: string) {
  // console.log('Shared State Entries: ' , sharedStateEntries);
  const stateNames = []
  for (const state of sharedStateEntries) {
    stateNames.push(state.name)
  }
  // console.log('Shared state names: ' , stateNames);
  // Pick Item from the list
  const answer = await askMultipleChoiceQuestionSearch(question, stateNames)
  let re = {}
  for (const state of sharedStateEntries) {
    if (state.name === answer) {
      re = state
    }
  }
  return re
}

// Function to delete a shared state based on it's ID
async function deleteSharedState (sharedStateID: string) {
  const response = await CCOM.callTCA(CCOM.clURI.shared_state + '/' + sharedStateID, false, { method: 'DELETE' })
  let ok = true
  if (response != null) {
    if (response.errorMsg != null) {
      log(ERROR, response.errorMsg)
      ok = false
    }
  }
  if (ok) {
    log(INFO, 'Successfully removed shared state with ID: ' + sharedStateID)
  }
}

// Display the details of a shared state
export async function showSharedStateDetails () {
  // Show Shared State list
  const sStateList = await getSharedState(true)
  if (sStateList.length > 0) {
    // Pick Item from the list
    const selectedState: any = await selectSharedState(sStateList, 'Which Shared State do you like to get the Details from ?')
    // Show details on the item
    log(INFO, 'CONTEXT:' + selectedState.name + ' (' + selectedState.id + ')\n', selectedState, '\n------------------------------')
    log(INFO, 'JSON CONTENT: ' + selectedState.name + ' (' + selectedState.id + ')\n', JSON.parse(selectedState.content.json), '\n------------------------------')

    // Show Details:  /states/{id}
    // TODO: Think about:

    // Show Links From
    // Show Links To

    // Show Attributes
    // Show Attribute Details

    // Get Roles
    // Show Role Details

    // Show State Links
    // Show State Link Details
  } else {
    log(WARNING, 'No Shared States available to show details of in the filter: ' + getProp('Shared_State_Filter'))
  }
}

// Removes a Shared State Entry
export async function createSharedState () {
  await prepSharedStateProps()
  const ssType = getProp('Shared_State_Type')
  log(INFO, 'Creating Shared State Entry. Type: ' + col.blue(ssType))
  const ssName = await askQuestion('What is the name of the Shared State entry that you want to create ?')
  const allStates = await getAllSharedStates()
  const ssNameTyped = ssName + '.' + ssType
  if (!doesExist(allStates.map(g => g.name), ssNameTyped, `The shared state ${ssNameTyped} already exists, we will not try to create it again...`)) {
    const postSS = {
      name: ssNameTyped,
      content: {
        json: '{}'
      },
      type: ssType,
      sandboxId: await LA.getProductionSandbox()
    }
    const result = await CCOM.callTCA(CCOM.clURI.shared_state, false, { method: 'POST', postRequest: postSS })
    if (result != null) {
      log(INFO, 'Successfully created ' + col.yellow('EMPTY') + ' shared state entry, with ID: ' + col.green(result) + ' and Name: ' + col.green(ssName) + ' (' + col.blue(ssType) + ')...')
    }
  }
}

// Removes a Shared State Entry
export async function removeSharedStateEntry () {
  // Show Shared State list
  const sStateList = await getSharedState(true)
  if (sStateList.length > 0) {
    // Pick Item from the list
    const selectedState: any = await selectSharedState(sStateList, 'Which Shared State would you like to remove ?')
    log(INFO, 'Removing Shared State: ' + selectedState.name + ' (' + selectedState.id + ')')
    // Ask if you really want to delete the selected shared state entry
    let decision = 'YES'
    if (DO_SHARED_STATE_DOUBLE_CHECK) {
      decision = await askMultipleChoiceQuestion('Are you sure ?', ['YES', 'NO'])
    }
    // Remove shared state entry
    if (decision === 'YES') {
      await deleteSharedState(selectedState.id)
    } else {
      log(INFO, 'Don\'t worry I have not removed anything :-) ... ')
    }
  } else {
    log(WARNING, 'No Shared States available to remove in the filter: ' + getProp('Shared_State_Filter'))
  }
}

// Removes a Shared State Filter
export async function clearSharedState () {
  // Show Shared State list
  const sStateList = await getSharedState(true)
  if (sStateList.length > 0) {
    // Ask if you really want to delete this shared state filter
    let decision = 'YES'

    if (DO_SHARED_STATE_DOUBLE_CHECK) {
      decision = await askMultipleChoiceQuestion('ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (Filter: ' + getProp('Shared_State_Filter') + ') ?', ['YES', 'NO'])
    }
    // If the filter is set to * then really double check...
    if (getProp('Shared_State_Filter') === '*') {
      decision = 'NO'
      const secondDecision = await askMultipleChoiceQuestion('YOU ARE ABOUT TO REMOVE THE ENTIRE SHARED STATE ARE YOU REALLY REALLY SURE ? ', ['YES', 'NO'])
      if (secondDecision === 'YES') {
        decision = 'YES'
      }
    }
    // Remove shared state entries
    if (decision === 'YES') {
      for (const sStateToDelete of sStateList) {
        // Remove entries one by one
        log(INFO, 'REMOVING SHARED STATE - NAME: ' + sStateToDelete.name + ' ID: ' + sStateToDelete.id)
        await deleteSharedState(sStateToDelete.id)
      }
    } else {
      log(INFO, 'Don\'t worry I have not removed anything :-) ... ')
    }
  } else {
    log(WARNING, 'No Shared States available to remove in the filter: ' + getProp('Shared_State_Filter'))
  }
}

// Export the Shared state filter to a folder
export async function exportSharedState (verbose?: boolean) {
  let reNumberOfStates = 0
  const doVerbose = verbose || false
  // Show Shared State List
  const sharedStateEntries = await getSharedState(true)
  let decision = 'YES'
  if (DO_SHARED_STATE_DOUBLE_CHECK && !doVerbose) {
    decision = await askMultipleChoiceQuestion('Are you sure you want to export all the states above ?', ['YES', 'NO'])
  }
  if (decision === 'YES') {
    // Check if folder exist
    const ssExportFolder = SHARED_STATE_FOLDER
    mkdirIfNotExist(ssExportFolder)
    mkdirIfNotExist(ssExportFolder + 'CONTENT/')
    // Create 2 files per shared state: description (name of the state.json) and content ( name.CONTENT.json)
    const storeOptions = { spaces: 2, EOL: '\r\n' }
    for (const sSEntry of sharedStateEntries) {
      let writeContentSeparate = false
      let contentObject = {}
      let scopeAdd = ''
      if (sSEntry.scope) {
        log(INFO, 'Scope Found: ' + col.blue(sSEntry.scope) + ' For Shared State: ' + col.blue(sSEntry.name))
        scopeAdd = '.[SCOPE ' + sSEntry.scope + ']'
      }
      const contextFileName = ssExportFolder + sSEntry.name + scopeAdd + '.json'
      const contentFileName = ssExportFolder + 'CONTENT/' + sSEntry.name + '.CONTENT' + scopeAdd + '.json'
      if (sSEntry.content != null) {
        if (sSEntry.content.json != null) {
          try {
            // Get the details for every shared state entry
            contentObject = JSON.parse(sSEntry.content.json)
            sSEntry.content.json = { FILESTORE: contentFileName }
            writeContentSeparate = true
            // And store them in a file / folder
            require('jsonfile').writeFileSync(contentFileName, contentObject, storeOptions)
            log(INFO, '[STORED CONTENT]: ' + contentFileName)
            reNumberOfStates++
          } catch (e) {
            log(ERROR, 'Parse Error on: ' + sSEntry.name + 'Writing directly...')
          }
        }
      }
      require('jsonfile').writeFileSync(contextFileName, sSEntry, storeOptions)
      log(INFO, '[STORED CONTEXT]: ' + contextFileName)
      if (!writeContentSeparate) {
        log(ERROR, 'Stored all in: ' + contextFileName)
      }
    }
  } else {
    log(INFO, 'Don\'t worry I have not exported anything :-) ... ')
  }
  return reNumberOfStates
}

// Load shared state contents from a file
async function importSharedStateFile (ssFile: string) {
  await prepSharedStateProps()
  log(DEBUG, 'Importing: ' + ssFile)
  const fs = require('fs')
  const contentContextFile = fs.readFileSync(ssFile).toString()
  let ssObject: any = {}
  try {
    ssObject = JSON.parse(contentContextFile)
  } catch (e:any) {
    log(ERROR, 'Parse Error on: ' + ssFile)
    log(ERROR, e.message)
    process.exit(1)
  }
  if (ssObject.content != null) {
    if (ssObject.content.json != null) {
      if (ssObject.content.json.FILESTORE != null) {
        const contentFile = ssObject.content.json.FILESTORE
        log(INFO, 'Getting content from: ' + contentFile)
        const contentContentFile = fs.readFileSync(contentFile, 'utf8')
        // console.log('GOT: ' , contentContentFile);
        try {
          // Parse JSON to make it shorter (and Axios is handling weir characters)
          const shortJSONString = JSON.stringify(JSON.parse(contentContentFile))
          // console.log('shortJsonString: ', shortJSONString);
          ssObject.content.json = shortJSONString
        } catch (e:any) {
          log(WARNING, 'Parse Error on: ' + contentFile)
          log(WARNING, e.message)
          // process.exit(1);
          return null
          // throw new Error('PARSE');
        }
        // ssObject.content.json = ssObject.content.json;
      }
    }
  }
  // console.log(ssObject);
  return ssObject
}

async function putSharedState (sharedStateObject: any | string) {
  await prepSharedStateProps()
  if (sharedStateObject != null && sharedStateObject !== '' && sharedStateObject !== {}) {
    log(DEBUG, 'POSTING Shared State', sharedStateObject)
    await CCOM.callTCA(CCOM.clURI.shared_state, false, { method: 'PUT', postRequest: [sharedStateObject] })
    log(INFO, '\x1b[32m', 'Updated: ' + sharedStateObject.name)
  } else {
    log(ERROR, 'NOT Posting Shared State... ')
  }
}

// Import the Shared state filter from a folder
export async function importSharedState () {
  await prepSharedStateProps()
  // console.log('ORG: ', getOrganization());
  const importOptions: string[] = []
  // Go Over Shared State files
  const states:any = {}
  let it = 1
  const fs = require('fs')
  fs.readdirSync(SHARED_STATE_FOLDER).forEach((file: string) => {
    if (file !== 'CONTENT') {
      importOptions.push(file)
      const sTemp:any = {}
      const appN = it
      sTemp.FILE = file
      states[appN] = sTemp
      it++
    }
  })
  if (importOptions.length > 0) {
    log(INFO, 'Shared states found in: ' + SHARED_STATE_FOLDER)
    console.table(states)
    // TODO: Invalid range value
    // showTableFromTobject(states, 'Shared states found in: ' + SHARED_STATE_FOLDER)
    importOptions.unshift('ALL SHARED STATES')
    // Provide the option to select one or upload all
    const answer = await askMultipleChoiceQuestionSearch('Which shared state would you like to import', importOptions)
    if (answer === 'ALL SHARED STATES') {
      // Import all shared states
      for (const curState of importOptions) {
        if (curState !== 'ALL SHARED STATES') {
          // console.log('Updating: ' + SHARED_STATE_FOLDER + curState);

          putSharedState((await importSharedStateFile(SHARED_STATE_FOLDER + curState)))
        }
      }
    } else {
      putSharedState((await importSharedStateFile(SHARED_STATE_FOLDER + answer)))
    }
  } else {
    log(ERROR, 'No Shared States found for import in: ' + SHARED_STATE_FOLDER)
  }
  // TODO: Check which shared states will be overwritten
  // Provide a summary to the user
  // Ask if you are sure to import the shared state ?
  // Upload the shared states one by one
}

// wrapper function around the watcher on shared state
export async function watchSharedStateMain () {
  await prepSharedStateProps()
  const commandSTDO = 'tcli watch-shared-state-do -p "' + getPropFileName() + '"'
  const decision = await askMultipleChoiceQuestion('Before you watch the files for changes, do you want to do an export of the latest shared state (filtered) ?', ['YES', 'NO'])
  if (decision === 'YES') {
    await exportSharedState()
  }
  run(commandSTDO)
}

let ignoreChanges = 0

// A shared state watcher (every time the file changes, the shared state is updated)
export function watchSharedState () {
  const chokidar = require('chokidar')
  return new Promise<void>(async function (resolve) {
    // Do the login now, so it does not have to be done later
    await prepSharedStateProps()
    await CCOM.cLogin()
    log(INFO, 'Waiting for FILE Changes in: ' + SHARED_STATE_FOLDER)
    const watcher = chokidar.watch(SHARED_STATE_FOLDER).on('all', async (event: string, path: string) => {
      if (event === 'change') {
        if (ignoreChanges <= 0) {
          let pS = '/'
          if (process.platform === 'win32') {
            pS = '\\'
          }
          if (path.includes(pS + 'CONTENT' + pS)) {
            log(INFO, 'CONTENT File UPDATED: ' + path)
          } else {
            log(INFO, 'CONTEXT File UPDATED: ' + path)
          }
          const contextFile = path.replace(pS + 'CONTENT' + pS, pS).replace('.CONTENT.', '.')
          if (doesFileExist(contextFile)) {
            putSharedState((await importSharedStateFile(contextFile)))
          } else {
            log(ERROR, 'Can\'t find context file: ' + contextFile)
          }
        } else {
          ignoreChanges--
        }
      }
    })
    const readline = require('readline')
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.on('keypress', async (_str, key) => {
      if (key.ctrl && key.name === 'c') {
        process.exit()
      }
      if (key.name === 'r') {
        // Reload Shared State
        log(INFO, 'Reloading Shared State from Cloud...')
        // Two files per update..
        ignoreChanges = (await exportSharedState(true)) * 2
      }
      if (key.name === 'escape' || key.name === 'q') {
        // console.log('ESCAPE...');
        resolve()
        watcher.close().then(() => {
          log(INFO, 'Stopped Listening for File changes...')
          process.exit()
        })
      }
    })
    console.log('Press Escape key or the \'q\'-key to stop listening for file changes, or the \'r\'-key to reload from cloud...')
  })
}
