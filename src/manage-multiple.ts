// This file manages the applications
import {
    col,
    doesFileExist,
    getMultipleOptions,
    run, trim
} from './common/common-functions'
import {
    createTableValue,
    iterateTable, showTableFromTobject
} from './common/tables'
import {TCLITask} from './models/tcli-models'
import {askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion} from './common/user-interaction'
import {addOrUpdateProperty, replaceAtSign} from './common/property-file-management'
import {parseOAUTHToken} from './common/oauth'
import {DEBUG, ERROR, INFO, log, WARNING} from './common/logging'

require('./common/common-functions')
let mFile = ''

const _ = require('lodash')

// Function to process the multiple property file
// processMultipleFile = function (propfileName) {
export function processMultipleFile() {
    // setLogDebug('true');
    const mOpts: any = getMultipleOptions()
    mFile = mOpts.name
    if (!doesFileExist(mFile) && doesFileExist('manage-multiple-cloud-starters.properties')) {
        mFile = 'manage-multiple-cloud-starters.properties'
        log(WARNING, 'Falling back to the multiple file ' + mFile + ', for backwards compatability. Please consider renaming this file to manage-multiple-cloud-organizations.properties...')
    }
    // log(INFO, '- Managing Multiple, Using file: ' + mFile);
    // Go Over All Cloud Starter Jobs
    let csJobs = getMProp('TIBCO_CLOUD_JOBS')
    if (mOpts.job && mOpts.job.trim() !== '') {
        csJobs = mOpts.job
    }
    let environmentOverride = ''
    if (mOpts.environment && mOpts.environment.trim() !== '') {
        environmentOverride = mOpts.environment
    }
    if (!csJobs) {
        // Try to get from old definition for backwards compatibility.
        csJobs = getMProp('Cloud_Starter_JOBS')
        if (csJobs != null) {
            log(WARNING, 'Using the |Cloud_Starter_JOBS| property for backward compatibility but rename this to: |TIBCO_CLOUD_JOBS|...')
        } else {
            csJobs = getMProp('Cloud_Starters')
            if (csJobs != null) {
                log(WARNING, 'Using the |Cloud_Starters| property for backward compatibility but rename this to: |TIBCO_CLOUD_JOBS|...')
            } else {
                log(ERROR, 'Please specify JOBS in the TIBCO_CLOUD_JOBS property in: ' + mFile + ' (or the common file if used...)')
                process.exit(1)
            }
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
    const nvs = [{NAME: 'File', VALUE: col.blue(mFile), JOB: '', ENVIRONMENT: ''}]
    // let nvs = createTableValue('File', mFile)
    if (fileExtension.trim() !== '') {
        // nvs = createTableValue('File Extension', fileExtension, nvs)
        nvs.push({NAME: 'File Extension', VALUE: fileExtension, JOB: '', ENVIRONMENT: ''})
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
            nvs.push({NAME: '', VALUE: '', JOB: col.blue(currentJob), ENVIRONMENT: col.yellow(environmentsA[l].trim())})
            // nvs = createTableValue(currentJob, environmentsA[l].trim(), nvs, 'JOB', 'ENVIRONMENT')
        }
    }
    log(INFO, col.blue('JOB SUMMARY]') + ' FILE: ' + mFile)
    showTableFromTobject(nvs, '[JOB SUMMARY] FILE: ' + mFile)
    for (let i = 0; i < csJobsA.length; i++) {
        const currentJob = trim(csJobsA[i])
        const logS = col.blue('[TIBCO CLOUD JOB: ' + currentJob + ']')
        // log(INFO, logS);
        // Per Starter Go Over the Configured Environments
        const currLoc = getMProp(currentJob + '_Location')
        if (!currLoc && currLoc !== '') {
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
            let taskString = ''
            if (jobTasksP != null) {
                taskString = jobTasksP
            }
            const tasks = getMProp(currentEnvironment + '_Tasks')

            if (tasks != null) {
                log(WARNING, 'Job tasks on an environment are discouraged; consider moving: ' + currentEnvironment + '_Tasks TO: ' + currentJob + '_Tasks')
                // taskString = jobTasksA.concat(tasks.split(','))
                if (taskString === '') {
                    taskString = tasks
                } else {
                    taskString += ',' + tasks
                }
            }
            let level = 0
            const toReplaceArray = []
            for (let i = 0; i < taskString.length; i++) {
                const char = taskString.charAt(i)
                if (char === '{') {
                    level++
                }
                if (char === '}') {
                    level--
                }
                if (char === ',' && level === 0) {
                    toReplaceArray.push(i)
                }
            }
            for (let i = toReplaceArray.length - 1; i >= 0; i--) {
                // this.abSets.splice(setsToDropArray[i]!, 1);
                taskString = taskString.substring(0, toReplaceArray[i]) + '-TASKDIVIDER-' + taskString.substring(toReplaceArray[i]! + 1);
            }
            const jobTasksA = taskString.split('-TASKDIVIDER-')
            log(DEBUG, logSE + ' Tasks: ', jobTasksA)
            let jvs = []
            if (jobTasksA.length > 0) {
                for (const jTask of jobTasksA) {
                    let verbose = false
                    let taskType = ''
                    let task = ''

                    let tObj: any = {}
                    try {
                        tObj = JSON.parse(jTask)
                    } catch (e: any) {
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
                    if (tObj.IF) {
                        taskType += col.yellow(' (Conditional)')
                    }
                    if (task && task.length > 150) {
                        task = task.substr(0, 150) + '...'
                    }
                    if (!verbose) {
                        jvs = createTableValue(taskType, task, jvs, 'TYPE', 'TASK')
                    } else {
                        jvs = createTableValue(taskType, '***', jvs, 'TYPE', 'TASK')
                    }
                }
            }
            // log(INFO, col.blue('TASK SUMMARY]') + ' ENVIRONMENT: ' + currentEnvironment)
            // console.table(jvs)
            showTableFromTobject(jvs, '[TASK SUMMARY] ENVIRONMENT: ' + currentEnvironment)
            for (let k = 0; k < jobTasksA.length; k++) {
                // console.log('Parsing: ' , jobTasksA[k] , '|');
                const currentTask = jobTasksA[k]!.trim()
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
                // command = replaceGlobal(replaceAtSign(command, currLoc + propFile))
                command = replaceAtSign(command, currLoc + propFile)
                if (showTask) {
                    log(INFO, logT + ' Command: ' + command + ' (Fail on Error: ' + doFailOnError + ')')
                }
                let doRun = true
                let testValue = tObj.VALUE
                if (tObj.IF && !testValue) {
                    log(WARNING, 'Specify a value for check: ', tObj.IF, ' We assume YES...')
                    testValue = 'YES'
                }
                if (tObj.IF && testValue) {
                    log(INFO, 'Evaluating: ', col.blue(testValue) + ' == ' + col.blue(tObj.IF))
                    const test = replaceAtSign(replaceDollar(tObj.IF), currLoc + propFile)
                    log(INFO, 'Evaluating: ', col.blue(testValue) + ' == ' + col.blue(test))
                    doRun = test == testValue
                    if (doRun) {
                        log(INFO, col.green('Running: ' + command))
                    } else {
                        log(WARNING, col.yellow('Skipping: ' + command))
                    }
                }
                if (doRun) {
                    run(command, doFailOnError)
                }
            }
        }
    }
}

const TCLI_INTERACTVIE = 'tcli-interactive'

export async function multipleInteraction() {
    log(INFO, 'Interacting with Multiple Cloud Organizations')
    const PropertiesReader = require('properties-reader')
    const mOpts: any = getMultipleOptions()
    mFile = mOpts.name
    let failOnError = getMProp('Fail_On_Error')
    if (failOnError == null) {
        failOnError = 'YES'
    }
    const doFailOnError = !(failOnError.toLowerCase() === 'no')
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
        // console.table(environmentsTable)
        showTableFromTobject(environmentsTable, 'Environments')
        // 4. Let the user choose an environment to execute on (include All and None/Quit, or Change the Task)
        const environmentOptions = []
        const environmentName = []
        let i = 0
        for (const env of iterateTable(environmentsTable)) {
            i++
            // console.log('Env: ' ,env);
            environmentOptions.push(i + '. ' + env.NAME)
            environmentName.push(env.NAME)
        }
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
                let answerToPass = ''
                // Check if we want to pass answers
                const answer = getMProp('Multiple_Interaction_Answer')
                // only if there is a specific task
                if (answer && miTask) {
                    log(INFO, 'Found answer for multiple interactions: ' + col.blue(answer))
                    const addA = await askMultipleChoiceQuestion('Do you want to add this answers with your tasks ?', ['YES', 'NO'])
                    if (addA.toLowerCase() === 'yes') {
                        answerToPass = '-a "' + answer + '"'
                    }
                }
                const commandResultTable: any = {}
                const baseCommmand = 'tcli ' + miTask + ' ' + answerToPass
                for (const envNumber in environmentOptions) {
                    propFileToUse = miPropFilesA[envNumber]

                    let command = baseCommmand + ' -p "' + miPropFolder + propFileToUse + '"'
                    if (chosenEnv === 'ALL ENVIRONMENTS') {
                        const row: any = {}
                        console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'))
                        row['ENVIRONMENT'] = environmentName[envNumber]
                        row['TASK'] = displayTask

                        row['RESULT'] = run(command, doFailOnError)
                        // await askQuestion('Press [enter] to continue...');
                        commandResultTable[envNumber] = row
                    } else {
                        if (environmentOptions[envNumber] === chosenEnv) {
                            console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'))
                            // console.log('Propfile to use: ', miPropFilesA[envNumber]);
                            run(command, doFailOnError)
                        }
                    }
                }
                if (chosenEnv === 'ALL ENVIRONMENTS') {
                    // Show result table
                    showTableFromTobject(commandResultTable, 'Command: ' + baseCommmand)
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
let showExtenstion = true

function getMProp(property: string, propFileName?: string) {
    let propFileToUse = mFile
    if (propFileName && propFileName.trim() != null) {
        propFileToUse = propFileName
    }
    if (doesFileExist(propFileToUse)) {
        log(DEBUG, 'Getting Property: |' + property + '|')
        const PropertiesReader = require('properties-reader')
        propsM = PropertiesReader(propFileToUse).path()
        if (propsM.PROPERTY_EXTENSION_FILE != null && propsM.PROPERTY_EXTENSION_FILE.trim() !== '') {
            if(showExtenstion) {
                log(INFO, 'Adding extension to propfile(' + propFileToUse + ') : ' + propsM.PROPERTY_EXTENSION_FILE)
                showExtenstion = false
            }
            const propsTwo = PropertiesReader(propsM.PROPERTY_EXTENSION_FILE).path()
            fileExtension = propsM.PROPERTY_EXTENSION_FILE
            const objectTemp = {...propsTwo, ...propsM}
            propsM = objectTemp
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

function replaceDollar(content: string) {
    if (content.includes('${') && content.includes('}')) {
        const subProp = content.substring(content.indexOf('${') + 2, content.indexOf('${') + 2 + content.substring(content.indexOf('${') + 2).indexOf('}'))
        log(DEBUG, 'Looking for subprop: ' + subProp)
        content = content.replace(/\${.*?\}/, getMProp(subProp))
        log(DEBUG, 'Replaced: ' + content)
        content = replaceDollar(content)
    }
    return content
}
