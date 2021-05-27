// This file manages the applications
import {
  col,
  createTableValue, doesFileExist,
  getMultipleOptions,
  iterateTable,
  run, trim
} from './common/common-functions'
import { TCLITask } from './models/tcli-models'
import { askMultipleChoiceQuestionSearch, askQuestion } from './common/user-interaction'
import { addOrUpdateProperty, replaceAtSign } from './common/property-file-management'
import { parseOAUTHToken } from './common/oauth'
import { DEBUG, ERROR, INFO, log, WARNING } from './common/logging'

require('./common/common-functions')
let mFile = ''

const _ = require('lodash')

// Function to process the multiple property file
// processMultipleFile = function (propfileName) {
export function processMultipleFile () {
  // setLogDebug('true');
  const mOpts: any = getMultipleOptions()
  mFile = mOpts.name
  // log(INFO, '- Managing Multiple, Using file: ' + mFile);
  // Go Over All Cloud Starter Jobs
  let csJobs = getMProp('Cloud_Starter_JOBS')
  if (mOpts.job && mOpts.job.trim() !== '') {
    csJobs = mOpts.job
  }
  let environmentOverride = ''
  if (mOpts.environment && mOpts.environment.trim() !== '') {
    environmentOverride = mOpts.environment
  }
  if (!csJobs) {
    // Try to get from old definition for backwards compatibility.
    csJobs = getMProp('Cloud_Starters')
    if (csJobs != null) {
      log(WARNING, 'Using the |Cloud_Starters| property for backward compatibility but rename this to: |Cloud_Starter_JOBS|...')
    } else {
      log(ERROR, 'Please specify JOBS in the Cloud_Starter_JOBS property in: ' + mFile + ' (or the common file if used...)')
      process.exit(1)
    }
  }
  let failOnError = getMProp('Fail_On_Error')
  if (failOnError == null) {
    log(INFO, 'No Fail_On_Error Property found; Adding Fail_On_Error to ' + mFile)
    addOrUpdateProperty(mFile, 'Fail_On_Error', 'YES', 'Indicator if script needs to fail when an error occurs (Options: YES | NO)')
    failOnError = 'YES'
  }
  const doFailOnError = !(failOnError.toLowerCase() === 'no')

  // log(INFO, '- Looping over Configured Starter JOBS: ' + csJobs);
  let nvs = createTableValue('File', mFile)
  if (fileExtension.trim() !== '') {
    nvs = createTableValue('File Extension', fileExtension, nvs)
  }
  const csJobsA = csJobs.split(',')
  // let jobN = 0;
  for (let k = 0; k < csJobsA.length; k++) {
    const currentJob = csJobsA[k].trim()
    let environments = getMProp(currentJob + '_Environments')
    if (environmentOverride !== '') {
      environments = environmentOverride
    }
    if (!environments) {
      log(ERROR, 'Missing Environment specification for JOB: ' + currentJob + '. Please define the ' + currentJob + '_Environments property in ' + mFile)
      process.exit(1)
    }
    const environmentsA = environments.split(',')
    for (let l = 0; l < environmentsA.length; l++) {
      // jobN++;
      nvs = createTableValue(currentJob, environmentsA[l].trim(), nvs, 'JOB', 'ENVIRONMENT')
    }
  }
  log(INFO, col.blue('JOB SUMMARY]') + ' FILE: ' + mFile)
  console.table(nvs)

  for (let i = 0; i < csJobsA.length; i++) {
    const currentJob = trim(csJobsA[i])
    const logS = col.blue('[STARTER JOB: ' + currentJob + ']')
    // log(INFO, logS);
    // Per Starter Go Over the Configured Environments
    const currLoc = getMProp(currentJob + '_Location')
    if (!currLoc) {
      log(ERROR, 'Missing Location specification for JOB: ' + currentJob + '. Please define the ' + currentJob + '_Location property in ' + mFile)
      process.exit(1)
    }
    log(INFO, logS + ' Location: ' + currLoc)
    let environments = getMProp(currentJob + '_Environments')
    if (environmentOverride !== '') {
      environments = environmentOverride
    }
    log(INFO, logS + ' Environments: ' + environments)
    const environmentsA = environments.split(',')
    // TODO: Allow for a pre environment command (like git pulls or tenants)
    for (let j = 0; j < environmentsA.length; j++) {
      const currentEnvironment = trim(environmentsA[j])
      const logSE = logS + col.green(' [JOB: ' + currentEnvironment + '] ')
      const propFile = getMProp(currentEnvironment + '_PropertyFile')
      log(INFO, logSE + ' Property File: ' + propFile)
      // Per Environment Run the Configured Tasks
      const jobTasksP = getMProp(currentJob + '_Tasks')
      let jobTasksA = []
      if (jobTasksP != null) {
        jobTasksA = jobTasksP.split(',')
      }
      const tasks = getMProp(currentEnvironment + '_Tasks')
      if (tasks != null) {
        log(WARNING, 'Job tasks on an environment are discouraged; consider moving: ' + currentEnvironment + '_Tasks TO: ' + currentJob + '_Tasks')
        jobTasksA = jobTasksA.concat(tasks.split(','))
      }
      log(DEBUG, logSE + ' Tasks: ' + jobTasksA)
      let jvs = []
      if (jobTasksA.length > 0) {
        for (const jTask of jobTasksA) {
          let verbose = false
          let taskType = ''
          let task = ''

          let tObj: any = {}
          try {
            // console.log('Parsing: ', jTask);
            tObj = JSON.parse(jTask)
          } catch (e) {
            log(ERROR, 'Parsing error on: |' + jTask + '| (' + e.message + ')')
            process.exit(1)
          }
          if (tObj.T) {
            taskType = 'TCLI TASK'
            task = replaceAtSign(tObj.T, currLoc + propFile)
          }
          if (tObj.TV) {
            verbose = true
            taskType = 'TCLI TASK (Verbose)'
            task = replaceAtSign(tObj.TV, currLoc + propFile)
          }
          if (tObj.O) {
            taskType = 'OS TASK'
            task = replaceAtSign(tObj.O, currLoc + propFile)
          }
          if (tObj.OV) {
            verbose = true
            taskType = 'OS TASK (Verbose)'
            task = replaceAtSign(tObj.OV, currLoc + propFile)
          }
          if (tObj.S) {
            taskType = 'SCRIPT TASK'
            task = replaceAtSign(tObj.S, currLoc + propFile)
          }
          if (tObj.SV) {
            verbose = true
            taskType = 'SCRIPT TASK (Verbose)'
            task = replaceAtSign(tObj.SV, currLoc + propFile)
          }
          if (task && task.length > 77) {
            task = task.substr(0, 77) + '...'
          }
          if (!verbose) {
            jvs = createTableValue(taskType, task, jvs, 'TYPE', 'TASK')
          } else {
            jvs = createTableValue(taskType, '***', jvs, 'TYPE', 'TASK')
          }
        }
      }
      log(INFO, col.blue('TASK SUMMARY]') + ' ENVIRONMENT: ' + currentEnvironment)
      console.table(jvs)
      for (let k = 0; k < jobTasksA.length; k++) {
        // console.log('Parsing: ' , jobTasksA[k] , '|');
        const currentTask = jobTasksA[k].trim()
        // console.log('Parsing: ' , currentTask , '|');
        const tObj = JSON.parse(currentTask)
        // console.log(tObj);
        let logT = logSE
        let command = 'cd ' + currLoc + ' && '
        let showTask = true
        if (tObj.T) {
          logT += col.brightCyan('[' + (k + 1) + '] [TCLI TASK]\n')
          command += 'tcli -p "' + propFile + '" ' + tObj.T
        }
        if (tObj.TV) {
          showTask = false
          command += 'tcli -p "' + propFile + '" ' + tObj.TV
        }
        if (tObj.O) {
          logT += col.brightCyan('[' + (k + 1) + '] [OS TASK]\n')
          command += tObj.O
        }
        if (tObj.OV) {
          showTask = false
          command += tObj.OV
        }
        if (tObj.S || tObj.SV) {
          logT += col.brightCyan('[' + (k + 1) + '] [SCRIPT TASK]\n' + tObj.S)
          command += 'node ' + tObj.S
        }
        if (tObj.SV) {
          showTask = false
          command += 'node ' + tObj.SV
        }
        log(DEBUG, logT + 'Command (before replacing): ' + command)
        command = replaceAtSign(command, currLoc + propFile)
        if (showTask) {
          log(INFO, logT + ' Command: ' + command + ' (Fail on Error: ' + doFailOnError + ')')
        }
        run(command, doFailOnError)
      }
    }
  }
}

const TCLI_INTERACTVIE = 'tcli-interactive'

export async function multipleInteraction () {
  const PropertiesReader = require('properties-reader')
  const mOpts: any = getMultipleOptions()
  mFile = mOpts.name
  let failOnError = getMProp('Fail_On_Error')
  if (failOnError == null) {
    failOnError = 'YES'
  }
  const doFailOnError = !(failOnError.toLowerCase() === 'no')
  log(INFO, 'Multiple Cloud Interactions')
  log(INFO, '- Managing Multiple, Using file: ' + mFile + ' (Fail on error:', doFailOnError, ')')
  let taskOverRide = false
  let miTask = getMProp('Multiple_Interaction_CLITask')

  // Start a loop till the user end's it (interactive), do reload prop files every time
  while (true) {
    const miPropFolder = getMProp('Multiple_Interaction_Property_File_Folder')
    const miPropFiles = getMProp('Multiple_Interaction_Property_Files')
    if (!miPropFiles) {
      log(ERROR, 'Please specify environment property files in the Multiple_Interaction_Property_Files property in ' + mFile)
      process.exit(1)
    }
    if (!taskOverRide) {
      miTask = getMProp('Multiple_Interaction_CLITask')
    }
    let displayTask = miTask
    if (miTask === '') {
      displayTask = TCLI_INTERACTVIE
    }

    // 1. Get list of property files to use and which task to execute
    const miPropFilesA = miPropFiles.split(',')
    const environmentsTable: any = {}
    let rowNumber = 0
    for (const miP in miPropFilesA) {
      const eRow: any = {}
      rowNumber++
      // console.log('Prop file: ' + miPropFile);
      // TODO: Check for ALL and Exclude
      // # A comma separated list of environment property files to connect to for interactions (Use ALL for All property files, and EXCEPT:<filename>, to exclude file).
      // # Multiple_Interaction_Property_Files=ALL,EXCEPT:tibco-cloud.properties
      if (!(miPropFilesA[miP].indexOf('.properties') > 0)) {
        miPropFilesA[miP] += '.properties'
      }
      eRow.NAME = miPropFilesA[miP].replace('.properties', '').replace('tibco-cloud-', '').replace('tibco-cloud', '')
      // 2. Open the property files one by one and get the ClientID / OAUTH details
      if (!doesFileExist(miPropFolder + miPropFilesA[miP])) {
        log(ERROR, 'The configured environment property file ' + miPropFolder + miPropFilesA[miP] + ' is missing...')
        process.exit(1)
      }
      const curProps = PropertiesReader(miPropFolder + miPropFilesA[miP]).path()
      eRow['AUTHENTICATION TYPE'] = ''
      if (curProps && curProps.CloudLogin) {
        if (curProps.CloudLogin.clientID) {
          if (curProps.CloudLogin.clientID.trim() !== '') {
            eRow['AUTHENTICATION TYPE'] = 'CLIENT ID'
          }
        }
        // Pick up OAUTH
        if (curProps.CloudLogin.OAUTH_Token) {
          if (curProps.CloudLogin.OAUTH_Token.trim() !== '') {
            eRow['AUTHENTICATION TYPE'] = 'OAUTH'
            const oauthO = parseOAUTHToken(curProps.CloudLogin.OAUTH_Token, false)
            if (oauthO) {
              eRow.REGION = oauthO.Region
              eRow.USER = oauthO.User
              eRow.ORGANIZATION = oauthO.Org
            }
          }
        }
      }
      // console.log(getMProp('CloudLogin.clientID', miPropFolder + miPropFile))
      environmentsTable[rowNumber] = eRow
    }
    console.log(col.blue('|------------------------------------------------|'))
    console.log(col.blue('|     M U L T I P L E    I N T E R A C T I O N   |'))
    console.log(col.blue('|------------------------------------------------|'))
    console.log(col.blue(`|- TASK: ${displayTask} `))
    // console.log(col.blue('|------------------------------------------------|'));
    // console.log(col.blue('ENVIRONMENTS:'));
    // 3. Display a table of all environments
    console.table(environmentsTable)
    // 4. Let the user choose an environment to execute on (include All and None/Quit, or Change the Task)
    const environmentOptions = []
    let i = 0
    for (const env of iterateTable(environmentsTable)) {
      i++
      // console.log('Env: ' ,env);
      environmentOptions.push(i + '. ' + env.NAME)
    }
    // TODO: Add change task
    const userOptions = ['ALL ENVIRONMENTS', ...environmentOptions]
    userOptions.push('QUIT', 'EXIT', 'CHANGE TASK', 'CHANGE TO INTERACTIVE CLI TASK')
    const chosenEnv = await askMultipleChoiceQuestionSearch('On which environment would you like to run ' + col.blue(displayTask) + ' ?', userOptions)
    if (chosenEnv === 'QUIT' || chosenEnv === 'EXIT') {
      console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ')
      process.exit(0)
    }
    //
    if (chosenEnv === 'CHANGE TO INTERACTIVE CLI TASK') {
      log(INFO, 'Setting task to: ' + TCLI_INTERACTVIE)
      miTask = ''
      taskOverRide = true
      displayTask = TCLI_INTERACTVIE
    } else {
      if (chosenEnv === 'CHANGE TASK') {
        const cTsks = require('./config/config-cli-task.json').cliTasks as TCLITask[]
        const taskDescription = [TCLI_INTERACTVIE]
        const taskTarget = ['']
        for (const cliTask in cTsks) {
          if (cTsks[cliTask]) {
            const task = cTsks[cliTask]!
            if (task.enabled && !task.internal && task.multipleInteraction) {
              // console.log('\x1b[36m%s\x1b[0m',':', ' ' + cTsks[cliTask].description);
              taskDescription.push(cliTask + ') ' + task.description)
              taskTarget.push(cliTask)
            }
          }
        }
        const chosenTask = await askMultipleChoiceQuestionSearch('Which cli task would you like to switch to ?', taskDescription)
        for (const taskN in taskDescription) {
          if (taskDescription[taskN] === chosenTask) {
            taskOverRide = true
            miTask = taskTarget[taskN]
          }
        }
      } else {
        // 5. Execute the task, when it was none go back directly when it was a task have pause message before displaying the table again
        let propFileToUse = ''
        for (const envNumber in environmentOptions) {
          propFileToUse = miPropFilesA[envNumber]
          const command = 'tcli -p "' + miPropFolder + propFileToUse + '" ' + miTask
          if (chosenEnv === 'ALL ENVIRONMENTS') {
            console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'))
            run(command, doFailOnError)
            // await askQuestion('Press [enter] to continue...');
          } else {
            if (environmentOptions[envNumber] === chosenEnv) {
              console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'))
              // console.log('Propfile to use: ', miPropFilesA[envNumber]);
              run(command, doFailOnError)
            }
          }
        }
        if (miTask !== '') {
          await askQuestion('Press [enter] to continue...')
        }
      }
    }
  }
}

let propsM: any
let fileExtension = ''

function getMProp (property: string, propFileName?: string) {
  let propFileToUse = mFile
  if (propFileName && propFileName.trim() != null) {
    propFileToUse = propFileName
  }
  if (doesFileExist(propFileToUse)) {
    log(DEBUG, 'Getting Property: |' + property + '|')
    if (propsM == null) {
      const PropertiesReader = require('properties-reader')
      propsM = PropertiesReader(propFileToUse).path()
      if (propsM.PROPERTY_EXTENSION_FILE != null && propsM.PROPERTY_EXTENSION_FILE.trim() !== '') {
        log(INFO, 'Adding extension to propfile(' + propFileToUse + ') : ' + propsM.PROPERTY_EXTENSION_FILE)
        const propsTwo = PropertiesReader(propsM.PROPERTY_EXTENSION_FILE).path()
        fileExtension = propsM.PROPERTY_EXTENSION_FILE
        const objectTemp = { ...propsTwo, ...propsM }
        propsM = objectTemp
      }
      // console.log(propsM);
    }
    let re
    if (propsM != null) {
      re = _.get(propsM, property)
      if (re != null) {
        re = replaceDollar(re)
      }
    } else {
      log(ERROR, 'Property file not set yet...')
    }
    log(DEBUG, 'Returning Property(' + property + '): ', re)
    return re
  } else {
    log(ERROR, 'The file ' + propFileToUse + ' does not exist, please run the command from a folder where it exist or generate it first (with "tcli create-multiple-property-file")...')
    process.exit(1)
  }
}

function replaceDollar (content: string) {
  if (content.includes('${') && content.includes('}')) {
    const subProp = content.substring(content.indexOf('${') + 2, content.indexOf('${') + 2 + content.substring(content.indexOf('${') + 2).indexOf('}'))
    log(DEBUG, 'Looking for subprop: ' + subProp)
    content = content.replace(/\${.*?\}/, getMProp(subProp))
    log(DEBUG, 'Replaced: ' + content)
    content = replaceDollar(content)
  }
  return content
}
