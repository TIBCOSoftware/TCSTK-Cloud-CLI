import arg from 'arg'
import {
  col, copyFileInteractiveIfNotExists,
  displayOpeningMessage, getGlobalConfig,
  isGlobalOauthDefined,
  obfuscatePW,
  setMultipleOptions, setOrganization, trim, updateCloudLogin, updateRegion,
  updateTCLI
} from './common/common-functions'
import { multipleInteraction, processMultipleFile } from './manage-multiple'
import { Global } from './models/base'
import { TCLITask } from './models/tcli-models'
import {
  askMultipleChoiceQuestion, escapeColon,
  getGivenAnswers,
  isGlobalAnswersUsed,
  setGlobalAnswers
} from './common/user-interaction'
import { addOrUpdateProperty, getProp, setProperty, setPropFileName } from './common/property-file-management'
import { DEBUG, disableLogging, ERROR, INFO, log, RECORDER, setLogCategory, WARNING } from './common/logging'

declare let global: Global

let propFileName

// const version = require('./package.json').version;

function parseArgumentsIntoOptions (rawArgs: any) {
  let args
  try {
    args = arg(
      {
        '--debug': Boolean,
        '-d': '--debug',
        '--template': String,
        '-t': '--template',
        '--createCP': Boolean,
        '-c': '--createCP',
        '--createCPL': Boolean,
        '--createGlobalConfig': Boolean,
        '-g': '--createGlobalConfig',
        '--help': Boolean,
        '-h': '--help',
        '--version': Boolean,
        '-v': '--version',
        '--update': Boolean,
        '-u': '--update',
        '--propfile': String,
        '-p': '--propfile',
        '--multiple': Boolean,
        '-m': '--multiple',
        '--multipleInteraction': Boolean,
        '-i': '--multipleInteraction',
        '--multipleFile': String,
        '-f': '--multipleFile',
        '--surpressStart': Boolean,
        '-s': '--surpressStart',
        '--pass': String,
        '--org': String,
        '--answers': String,
        '-a': '--answers',
        '--job': String,
        '-j': '--job',
        '--environment': String,
        '-e': '--environment',
        '--browse': Boolean,
        '-b': '--browse',
        '--record': String,
        '-r': '--record',
        '--showReplay': Boolean,
        '-l': '--showReplay',
        '--noLog': Boolean
      },
      {
        argv: rawArgs.slice(2)
      }
    )
  } catch (e:any) {
    log(ERROR, e.message)
    process.exit(1)
  }
  return {
    template: args['--template'] || '',
    debug: args['--debug'] || false,
    help: args['--help'] || false,
    createCP: args['--createCP'] || false,
    createCPL: args['--createCPL'] || false,
    createGlobalConfig: args['--createGlobalConfig'] || false,
    version: args['--version'] || false,
    update: args['--update'] || false,
    propfile: args['--propfile'] || 'tibco-cloud.properties',
    doMultiple: args['--multiple'] || false,
    doMultipleInteraction: args['--multipleInteraction'] || false,
    multipleFile: args['--multipleFile'] || 'manage-multiple-cloud-organizations.properties',
    surpressStart: args['--surpressStart'] || false,
    task: args._[0] || '',
    taskHelp: args._[1] || '',
    pass: args['--pass'] || '',
    org: args['--org'] || '',
    answers: args['--answers'] || '',
    job: args['--job'] || '',
    environment: args['--environment'] || '',
    browse: args['--browse'] || false,
    record: args['--record'] || '',
    showReplay: args['--showReplay'] || false,
    noLog: args['--noLog'] || false
  }
}

const isWindows = process.platform === 'win32'
// const dirDelimiter = isWindows ? '\\' : '/';

// Main function
export async function cli (args: any) {
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' CLI INIT')
  // console.log('start');
  const options = parseArgumentsIntoOptions(args)
  if (options.noLog) {
    disableLogging()
  }
  // eslint-disable-next-line dot-notation
  const appRoot = process.env['PWD']
  const cwdir = process.cwd()
  propFileName = options.propfile
  setPropFileName(propFileName)
  // TODO: Allow for multiple Jobs and environments
  setMultipleOptions({ name: options.multipleFile, job: options.job, environment: options.environment })
  if (options.debug) {
    console.log(' Options: ', options)
    console.log('    Task: ' + options.task)
    console.log('PropFile: ' + options.propfile)
    console.log('Project Root: ' + appRoot)
    console.log('Current Working Directory: ' + cwdir)
    console.log('__dirname: ' + __dirname)
    console.log('__filename: ' + __filename)
    console.log(' Platform: ' + process.platform)
    console.log('isWindows: ' + isWindows)
    console.log('doMultiple: ' + options.doMultiple)
    console.log('multipleFile: ' + options.multipleFile)
    console.log('pass: ' + options.pass)
    console.log('org: ' + options.org)
    console.log('answers: ' + options.answers)
    console.log('job: ' + options.job)
    console.log('environment: ' + options.environment)
    console.log('browse: ' + options.browse)
  }
  if (options.pass !== '') {
    // This call sets the properties object, to be able to add a property to it.
    getProp('CloudLogin.pass')
    if (options.pass.charAt(0) === '#' || options.pass.startsWith('@#')) {
      setProperty('CloudLogin.pass', options.pass)
    } else {
      setProperty('CloudLogin.pass', obfuscatePW(options.pass))
    }
  }
  if (options.org !== '') {
    setOrganization(options.org)
  }

  if (options.answers !== '') {
    setGlobalAnswers(options.answers)
  }

  if (options.browse) options.task = 'browse-tasks'

  // Show help
  if (options.help || options.task === 'help') {
    const HELP = require('./common/help')
    if (options.task !== '' && options.task !== 'help') {
      await HELP.showHelpOnTask(options.task)
    } else {
      // helptcli();
      await HELP.showInlineHelp()
      // console.log('To get specific help on a task type: tcli -h <TASKNAME> or tcli --help <TASKNAME>');
    }
    process.exit(0)
    // options.task = 'help-tcli';
  }
  // Run multiple management
  if (options.doMultiple || options.doMultipleInteraction) {
    require('./manage-multiple')
    if (options.doMultiple) {
      await processMultipleFile()
    }
    if (options.doMultipleInteraction) {
      await multipleInteraction()
    }
    process.exit(0)
  }
  // Show the version
  if (options.version) {
    console.log('TIBCO Cloud CLI Version: ' + require('../package.json').version)
    process.exit(0)
  }
  // Update the TCLI
  if (options.update) {
    updateTCLI()
    process.exit(0)
  }
  // Manage global configuration
  if(options.createGlobalConfig){
    await require('./manage-application').manageGlobalConfig()
    process.exit(0)
  }
  const projectManagementMode = true
  if (!(options.doMultiple || options.doMultipleInteraction)) {
    if (options.task === 'new' || options.task === 'new-starter' || options.task === 'new-application') {
      // options.task = 'new-starter';
      await require('./manage-application').newStarter()
      process.exit()
      // const projectManagementMode = false;
    } else {
      // Test if tibco-cloud.properties exists
      const fs = require('fs')
      const tCreate = 'Compose New Cloud Application'
      const tCProp = 'Create New TIBCO Cloud properties file'
      const tManageG = 'Manage Global Cloud Connection Configuration'
      const tMultiple = 'Create New Multiple Properties file'
      const tNothing = 'Nothing'
      // if (!fs.existsSync(cwdir + dirDelimiter + propFileName) || options.createCP) {
      // console.log('Workdir: ' + cwdir);
      if (!fs.existsSync(propFileName) || options.createCP || options.createCPL) {
        let cif = tCProp
        if (!options.createCP && !options.createCPL) {
          displayOpeningMessage()
          console.log('\x1b[36m%s\x1b[0m', '[TIBCO Cloud Composer CLI ' + require('../package.json').version + ']')
          console.log('No TIBCO Cloud Properties file found...')
          cif = await askMultipleChoiceQuestion('What would you like to do ? ', [tCreate, tCProp, tMultiple, tManageG, tNothing])
        }
        switch (cif) {
          case tCProp:
            let copiedFile = true
            // if we use a global config
            if (getGlobalConfig() && !options.createCPL) {
              log(DEBUG, 'Using Global Connection Configuration...')
              // console.log(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties')
              copiedFile = await copyFileInteractiveIfNotExists(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties', cwdir + '/' + propFileName, propFileName)
              // fs.copyFileSync(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties', cwdir + '/' + propFileName);
              if (copiedFile) {
                if (!isGlobalOauthDefined()) {
                  const PROPM = require('./common/property-file-management')
                  PROPM.disableProperty(cwdir + '/' + propFileName, 'CloudLogin.OAUTH_Token', ' --> Automatically Disabled; No Global OAUTH Token Defined Yet...')
                }
                log(INFO, 'Created New TIBCO Cloud Property file ' + col.green('(Using GLOBAL configuration)') + ': ' + col.blue(cwdir + '/' + propFileName))
              }
            } else {
              log(DEBUG, 'Using Local Connection Configuration...')
              copiedFile = await copyFileInteractiveIfNotExists(global.PROJECT_ROOT + 'templates/tibco-cloud.properties', cwdir + '/' + propFileName, propFileName)
              // fs.copyFileSync(global.PROJECT_ROOT + 'templates/tibco-cloud.properties', cwdir + '/' + propFileName);
              if (copiedFile) {
                log(INFO, 'Created New TIBCO Cloud Property file ' + col.green('(Using LOCAL configuration)') + ': ' + col.blue(cwdir + '/' + propFileName))
                await updateRegion(propFileName)
                await updateCloudLogin(propFileName, true)
              }
            }
            if (copiedFile) {
              // Get the AppName Automatically from the package.json
              try {
                if (fs.existsSync('package.json')) {
                  const rawdata = fs.readFileSync('package.json')
                  const jsonp = JSON.parse(rawdata)
                  // console.log(jsonp);
                  // console.log(jsonp.name);
                  addOrUpdateProperty(propFileName, 'App_Name', jsonp.name)
                } else {
                  log(WARNING, 'No Package.json file found to insert the application name. You can update: App_Name=<YOUR APP NAME>')
                }
              } catch (e) {
                log(ERROR, e)
              }
              // Add used template to property file
              if (options.template) {
                addOrUpdateProperty(propFileName, 'App_Type', options.template)
              }
            }
            break
          case tMultiple:
            await require('./manage-application').createMultiplePropertyFileWrapper()
            process.exit()
          case tManageG:
            await require('./manage-application').manageGlobalConfig()
            process.exit()
          case tCreate:
            log(DEBUG, 'Creating new Cloud Application...')
            // create a new cloud starter
            await require('./manage-application').newStarter()
            process.exit()
          default:
            console.log('\x1b[36m%s\x1b[0m', "Ok I won't do anything :-(  ...")
            process.exit()
        }
      } else {
        if (options.debug) {
          console.log(propFileName + ' found...')
        }
      }
    }
  }

  if (!options.createCP && !options.createCPL && !(options.doMultiple || options.doMultipleInteraction)) {
    // Start the specified Task
    if (projectManagementMode) {
      if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Loading Tasks')
      require('./tasks')
      if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' AFTER Loading Tasks')
    } else {
      require('./manage-application')
    }
    // TODO: Maybe call run here to prevent two times asking of PW on new file

    if (options.task === '') {
      await require('./tasks').mainT()
    } else {
      if (options.task === 'help') {
        options.task = 'help-tcli'
      }
      // Check if the task exists...
      const cliTaskConfigCLI = require('./config/config-cli-task.json')
      const cTsks = cliTaskConfigCLI.cliTasks as TCLITask[]
      const taskArray = ['new', 'new-starter', 'new-application', 'manage-global-config', 'create-multiple-property-file', 'run-multiple', 'watch-shared-state-do']
      let taskExist = false
      let directTask = false
      let directTaskMethod = ''
      let directTaskName = options.task
      for (const cliTask of taskArray) {
        if (cliTask === options.task) {
          taskExist = true
        }
      }
      for (const cliTask in cTsks) {
        if (cTsks[cliTask]) {
          const taskTemp = cTsks[cliTask]!
          if (taskTemp.taskAlternativeNames) {
            for (const altName of taskTemp.taskAlternativeNames) {
              if (altName === options.task) {
                taskExist = true
                if (taskTemp.task) {
                  directTask = true
                  directTaskMethod = taskTemp.task
                  directTaskName = cliTask
                  log(INFO, 'Task: ' + options.task + ' --> ' + col.blue(cliTask))
                }
              }
            }
          }
          if (cliTask === options.task) {
            taskExist = true
            if (taskTemp.task) {
              directTask = true
              // directTaskFile = cTsks[cliTask].taskFile;
              setLogCategory(taskTemp.category)
              directTaskMethod = taskTemp.task
            }
          }
          taskArray.push(cliTask)
        }
      }
      if (!taskExist) {
        log(ERROR, 'TASK: ' + options.task + ' does not exist...')
        const stringSimilarity = require('string-similarity')
        const matches = stringSimilarity.findBestMatch(options.task, taskArray)
        log(INFO, 'Did you mean ? \x1b[34m' + taskArray[matches.bestMatchIndex])
      } else {
        if (directTask) {
          const tasks = require('./tasks')
          try {
            await tasks[directTaskMethod]()
            // Task has run, if we haven't specified global answers upfront then display answers for next time
            // Do not record the obfuscate password task
            if (!isGlobalAnswersUsed() && (options.showReplay || options.record) && directTaskName !== 'obfuscate-password' && directTaskName !== 'update-global-config') {
              let taskCommand = 'tcli ' + options.task + ' '
              let answers = ''
              getGivenAnswers().forEach(ans => {
                answers += escapeColon(ans) + ':'
              })
              if (answers !== '') {
                // Remove last semicolon
                answers = answers.substring(0, answers.length - 1)
                taskCommand += '-a "' + answers + '"'
              }
              // Add different property file (if used)
              if (options.propfile !== 'tibco-cloud.properties') {
                taskCommand += ' -p "' + options.propfile + '"'
              }
              let rec = col.white('● ')
              if (options.record !== '') {
                rec = col.red('● ')
                const recordFile = trim(options.record)
                log(RECORDER, rec + 'Adding command to: ' + col.underline(recordFile))
                const fs = require('fs')
                fs.appendFileSync(recordFile, taskCommand + '\n')
                rec += '   '
              }
              log(RECORDER, rec + 'Replay command: ' + col.underline(taskCommand))
            }
          } catch (err:any) {
            log(ERROR, 'Task ' + options.task + ' failed: ' + err.message)
            console.log(err)
          }
        } else {
          log(ERROR, 'No Implementation Task found for ' + options.task)
        }
      }
    }
  }
}
