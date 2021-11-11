// This file does not depend on any other files
// All inputs are provided as input to the functions
import { Global } from '../models/base'
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion } from './user-interaction'
import { DEBUG, ERROR, INFO, log, logCancel, WARNING } from './logging'
import {
  addOrUpdateProperty, GLOBALPropertyFileName,
  getProp, GLOBALTCPropFolder,
  setProperty
} from './property-file-management'
import { getOAUTHDetails, parseOAUTHToken } from './oauth'
import { callTCA, clURI } from './cloud-communications'
import { DateTime } from 'luxon'

declare let global: Global

const _ = require('lodash')

export const col = require('colors')

// Display opening
export function displayOpeningMessage (): void {
  // const pjson = require('./package.json');
  // console.log(process.env.npm_package_version);
  const version = require('../../package.json').version
  console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|')
  console.log('\x1b[35m%s\x1b[0m', '# |  *** T I B C O    C L O U D   C L I ***   |')
  console.log('\x1b[35m%s\x1b[0m', '# |            V' + version + '                         |')
  console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|')
  console.log('\x1b[35m%s\x1b[0m', '# |For more info see: https://cloud.tibco.com')
}

// function to view the global connection configuration, and display's none if not set
export function displayGlobalConnectionConfig (): boolean {
  // console.log('Global Connection Config: ');
  let re = false
  log(INFO, 'Global Tibco Cloud Propfile: ' + GLOBALPropertyFileName)
  // Global Prop file is __dirname (build folder in the global prop)
  // This folder ../../../ --> is the main node modules folder
  //         is: /Users/hpeters@tibco.com/.npm-global/lib
  //             /Users/hpeters@tibco.com/.npm-global/lib/node_modules/@tibco-tcstk/cloud-cli/build
  //     Global: /node_modules/@tibco-tcstk/global/
  // ../../global/global-tibco-cloud.properties

  // Check if global connection file exists
  if (doesFileExist(GLOBALPropertyFileName)) {
    re = true
    // file exists
    const propsG = require('properties-reader')(GLOBALPropertyFileName).path()
    let passType = 'STORED IN PLAIN TEXT !'
    if (_.get(propsG, 'CloudLogin.pass') === '') {
      passType = 'NOT STORED'
    }
    if (_.get(propsG, 'CloudLogin.pass').charAt(0) === '#' || _.get(propsG, 'CloudLogin.pass').startsWith('@#')) {
      passType = 'OBFUSCATED'
    }
    // log(INFO, 'Global Connection Configuration:')
    const globalConfig = {
      'CLOUD REGION': _.get(propsG, 'CloudLogin.Region'),
      EMAIL: _.get(propsG, 'CloudLogin.email'),
      'CLIENT ID': _.get(propsG, 'CloudLogin.clientID'),
      PASSWORD: passType,
      'OAUTH TOKEN NAME': _.get(propsG, 'CloudLogin.OAUTH_Generate_Token_Name')
    }
    console.table(globalConfig)
    // TODO: Use table display (shows up weird)
    // showTableFromTobject(globalConfig, 'Global Connection Configuration')
    if (isGlobalOauthDefined()) {
      log(INFO, 'Global OAUTH Configuration:')
      parseOAUTHToken(_.get(propsG, 'CloudLogin.OAUTH_Token'), true)
    } else {
      log(INFO, 'No Global OAUTH Configuration Set...')
    }
  } else {
    log(INFO, 'No Global Configuration Set...')
  }
  // Returns true if the global file exists and false if it does not exists.
  return re
}

export function isGlobalOauthDefined (): boolean {
  if (doesFileExist(GLOBALPropertyFileName)) {
    const propsG = require('properties-reader')(GLOBALPropertyFileName).path()
    if (_.get(propsG, 'CloudLogin.OAUTH_Token') === undefined) {
      return false
    } else {
      return Object.keys(parseOAUTHToken(_.get(propsG, 'CloudLogin.OAUTH_Token'), false)).length !== 0
    }
  } else {
    return false
  }
}

// Function to replace string in file
export function replaceInFile (from: string, to: string, filePattern: string): any {
  const patternToUse = filePattern || './**'
  const regex = new RegExp(from, 'g')
  const options = {
    files: patternToUse,
    from: regex,
    to: to,
    countMatches: true
  }
  const replace = require('replace-in-file')
  const results = replace.sync(options)
  for (const result of results) {
    if (result.numReplacements > 0) {
      log(INFO, '\x1b[0m    [FILE] ', result.file)
      log(INFO, '\x1b[0m[REPLACED] [FROM: |\x1b[32m' + from + '\x1b[0m|] [TO: |\x1b[32m' + to + '\x1b[0m|]', '(Number of Replacements: ' + result.numReplacements + ')')
    }
  }
  return results
}

// function to set the global connection configuration
export async function updateGlobalConnectionConfig () {
  // update the config.
  log(INFO, 'Update Connection Config: ')
  // Create the global common package if it does not exist.
  mkdirIfNotExist(GLOBALTCPropFolder)
  // Check if the global propfile exists, if not create one
  if (!doesFileExist(GLOBALPropertyFileName)) {
    // Create Global config from template
    copyFile(global.PROJECT_ROOT + 'templates/global-tibco-cloud.properties', GLOBALPropertyFileName)
  }
  /*
    if (!doesFileExist(GLOBALTCPropFolder + 'package.json')) {
      copyFile(global.PROJECT_ROOT + 'templates/package-common.json', GLOBALTCPropFolder + 'package.json')
      log(INFO, 'Inserted package.json...')
    } */
  // Get Cloud Environment
  await updateRegion(GLOBALPropertyFileName)
  // Get the login details
  // Bump up the OAUTH Token
  const OTokenName = getProp('CloudLogin.OAUTH_Generate_Token_Name')
  const tokenNumber = Number(OTokenName.split('_').pop()!.trim())
  if (!isNaN(tokenNumber)) {
    const newTokenNumber = tokenNumber + 1
    const newTokenName = OTokenName.replace(String(tokenNumber), String(newTokenNumber))
    addOrUpdateProperty(GLOBALPropertyFileName, 'CloudLogin.OAUTH_Generate_Token_Name', newTokenName)
    log(INFO, 'Updating Global Token Name: ', newTokenName)
  }
  const defEmail = getProp('CloudLogin.email')
  const defClientID = getProp('CloudLogin.clientID')
  await updateCloudLogin(GLOBALPropertyFileName, false, true, defClientID, defEmail)
}

let globalMultipleOptions = {}

// TODO: Add function to parse ClientID

// Function to get and set the Organization (after login)
let OrganizationGl = ''

export function getOrganization (forceRefresh?: boolean) {
  if (forceRefresh) {
    OrganizationGl = ''
    getProp('CloudLogin.OAUTH_Token', true, true)
  }
  if (OrganizationGl === '' && isOauthUsed()) {
    // It could be that there is just the OAUTH token
    if (getOAUTHDetails() && !getOAUTHDetails().Org) {
      getProp('CloudLogin.OAUTH_Token', true, true)
    }
    if (getOAUTHDetails() && getOAUTHDetails() != null && getOAUTHDetails().Org) {
      OrganizationGl = getOAUTHDetails().Org!
    }
  }
  log(DEBUG, 'Returning org: ' + OrganizationGl)
  return OrganizationGl
}

export function getFolderSafeOrganization (forceRefresh?: boolean) {
  let org = getOrganization(forceRefresh)
  if (org) {
    org = org.replace(/[^a-zA-Z ]/g, '')
  }
  return org
}

export function setOrganization (org: string) {
  log(DEBUG, 'Setting org: ' + org)
  OrganizationGl = org
}

export function setMultipleOptions (mOptions: { name?: string; job?: string; environment?: string; }) {
  globalMultipleOptions = mOptions
  log(DEBUG, 'Using Multiple Options: ', globalMultipleOptions)
}

export function getMultipleOptions () {
  return globalMultipleOptions
}

// Function to trim string
export function trim (value: string) {
  return value.replace(/^\s*/, '').replace(/\s*$/, '')
}

// Function to create a new multiple prop file
export async function createMultiplePropertyFile () {
  let mPropFileName = 'manage-multiple-cloud-organizations.properties'
  const nameAnsw = await askQuestion('Please specify a name for the Multiple prop file (Use DEFAULT or Enter for: ' + col.blue('manage-multiple-cloud-organizations') + ') ?')
  // console.log('nameAnsw: ' + nameAnsw);
  if (nameAnsw != null && nameAnsw !== '' && nameAnsw.toLowerCase() !== 'default') {
    mPropFileName = nameAnsw + '.properties'
  }
  const targetFile = process.cwd() + '/' + mPropFileName
  let doWrite = true
  if (doesFileExist(targetFile)) {
    const doOverWrite = await askMultipleChoiceQuestion('The property file: ' + col.yellow(mPropFileName) + ' already exists, do you want to Overwrite it ?', ['YES', 'NO'])
    if (doOverWrite === 'NO') {
      doWrite = false
      logCancel(true)
    }
  }
  if (doWrite) {
    log(INFO, 'Creating new multiple property file: ' + mPropFileName)
    copyFile(global.PROJECT_ROOT + 'templates/multiple.properties', targetFile)
    // '\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ' ,'\x1b[31m'
    log(INFO, 'Now configure the multiple property file and then run "' + col.blue('tcli -m') + '" (for default file name) \nor "' + col.blue('tcli -m <propfile name> [-j <job-name> -e <environment-name>]') + '" to execute...')
    log(INFO, 'Or run "' + col.blue('tcli -i') + '" to interact with multiple cloud environments...')
  }
}

// Function to copy a file
export function copyFile (fromFile: string, toFile: string) {
  log(INFO, 'Copying File from: ' + fromFile + ' to: ' + toFile)
  const fs = require('fs')
  fs.copyFileSync(fromFile, toFile)
}

// Function to copy a file if not exist, and ask about it
export async function copyFileInteractiveIfNotExists (source: string, destination: string, fileName: string): Promise<boolean> {
  let doCopy = true
  if (doesFileExist(destination)) {
    const decision = await askMultipleChoiceQuestion('The file ' + fileName + ' exists, do you want to override it', ['YES', 'NO'])
    if (decision.toLowerCase() !== 'yes') {
      doCopy = false
      logCancel(true)
    }
  }
  if (doCopy) {
    log(DEBUG, 'Copying File from: ' + source + ' to: ' + destination)
    const fs = require('fs')
    fs.copyFileSync(source, destination)
  }
  return doCopy
}

export function getFilesFromFolder (folder: string, folderFilter? : string): string[] {
  const re:string[] = []
  if (folder) {
    const fs = require('fs')
    fs.readdirSync(folder).forEach((file: string) => {
      let doAdd = true
      if (folderFilter) {
        if (!(file.indexOf(folderFilter) > -1)) {
          doAdd = false
        }
      }
      if (doAdd) {
        log(INFO, 'Found file: ' + col.blue(file))
        re.push(file)
      }
    })
  }
  return re
}

// fs.copyFileSync(global.PROJECT_ROOT + 'templates/tibco-cloud_global.properties', cwdir + '/' + propFileName);

// Update the cloud login properties
export async function updateCloudLogin (propFile: string, forceRefresh?: boolean, forceGlobalRefresh?: boolean, defaultClientID?: string, defaultEmail?: string) {
  const oKeyAns = await askMultipleChoiceQuestion('Do you want to provide an initial OAUTH Key ? ', ['YES', 'NO'])
  if (oKeyAns.toLowerCase() === 'yes') {
    // Store the OAUTH Key
    const oKey = await askQuestion('Provide the initial OAUTH Key:')
    addOrUpdateProperty(propFile, 'CloudLogin.OAUTH_Token', oKey)
    // Get the email from claims
    const claims = await callTCA(clURI.claims, false, { forceOAUTH: true, manualOAUTH: oKey })
    addOrUpdateProperty(propFile, 'CloudLogin.email', claims.email)
    const email = getProp('CloudLogin.email', true)
    log(INFO, 'Updated email: ' + email)
    // await rotateOauthToken();
    // TODO: See if we can get the client ID
    addOrUpdateProperty(propFile, 'CloudLogin.clientID', '')
  } else {
    // Client ID
    let cidQuestion = 'What is your Client ID ?'
    let useCID = ''
    if (defaultClientID != null) {
      useCID = defaultClientID
      cidQuestion += ' (Press enter to use: ' + useCID + ')'
    }
    log('INFO', 'Get your client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)')
    let cid = await askQuestion(cidQuestion)
    if (useCID !== '' && cid === '') {
      cid = useCID
    }
    addOrUpdateProperty(propFile, 'CloudLogin.clientID', cid)
    let emailQuestion = 'What is your User Name (Email) ?'
    let useEMAIL = ''
    if (defaultEmail != null) {
      useEMAIL = defaultEmail
      emailQuestion += ' (Press enter to use: ' + useEMAIL + ')'
    }
    // Username & Password (obfuscate)
    let email = await askQuestion(emailQuestion)
    if (useEMAIL !== '' && email === '') {
      email = useEMAIL
    }
    addOrUpdateProperty(propFile, 'CloudLogin.email', email)
    // Force a refresh on the tibco-cloud property file
    getRegion(forceRefresh, forceGlobalRefresh)
    const pass = await askQuestion('Provide your password to Generate an OAUTH Token: ', 'password')
    setProperty('CloudLogin.pass', obfuscatePW(pass))
    const OAUTH = require('./oauth')
    const token = await OAUTH.generateOauthToken(null, true, true)
    addOrUpdateProperty(propFile, 'CloudLogin.OAUTH_Token', token)
    log('INFO', 'Your password will be obfuscated locally, but this is not unbreakable.')
    const storePW = await askMultipleChoiceQuestion('Do you want to store your password (as a fallback mechanism) ? ', ['YES', 'NO'])
    if (pass !== '' && storePW.toLowerCase() === 'yes') {
      addOrUpdateProperty(propFile, 'CloudLogin.pass', obfuscatePW(pass))
    } else {
      addOrUpdateProperty(propFile, 'CloudLogin.pass', '')
    }
  }
}

// Obfuscate a password
export function obfuscatePW (toObfuscate: string) {
  const fus = require('./fuzzy-search.js')
  // return '#' + Buffer.from(toObfuscate).toString('base64');
  return fus.search(toObfuscate)
}

// function to update the tenant
export async function updateRegion (propFile: string) {
  const re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney'])
  if (re === 'US - Oregon') {
    addOrUpdateProperty(propFile, 'CloudLogin.Region', 'US')
  }
  if (re === 'EU - Ireland') {
    addOrUpdateProperty(propFile, 'CloudLogin.Region', 'EU')
  }
  if (re === 'AU - Sydney') {
    addOrUpdateProperty(propFile, 'CloudLogin.Region', 'AU')
  }
}

export function getCurrentRegion (showRegion?: boolean) {
  let displayRegion = false
  if (showRegion) {
    displayRegion = showRegion
  }
  const region = getRegion().toLowerCase()
  let re = ''
  if (region.includes('eu')) {
    re = 'eu.'
  }
  if (region.includes('au')) {
    re = 'au.'
  }
  if (displayRegion) {
    switch (re) {
      case '':
        log(INFO, 'Current Region: ' + col.blue('US - Oregon'))
        break
      case 'eu.':
        log(INFO, 'Current Region: ' + col.blue('EU - Ireland'))
        break
      case 'au.':
        log(INFO, 'Current Region: ' + col.blue('AU - Sydney'))
        break
    }
  }
  return re
}

export function getCurrentAWSRegion () {
  // Oregon
  let re = 'us-west-2'
  switch (getCurrentRegion()) {
    case 'eu.':
      // Ireland
      re = 'eu-west-1'
      break
    case 'au.':
      // Sydney
      re = 'ap-southeast-2'
      break
  }
  return re
}

// Translates an AWS region into normal region description.
export function translateAWSRegion (awsRegion: string) {
  switch (awsRegion) {
    case 'us-west-2':
      return 'US - Oregon'
    case 'eu-west-1':
      return 'EU - Ireland'
    case 'ap-southeast-2':
      return 'AU - Sydney'
  }
  return ''
}

// Gets region (in Capitals)
export function getRegion (forceRefresh?: boolean, forceGlobalRefresh?: boolean) {
  const re = getProp('CloudLogin.Region', forceRefresh, forceGlobalRefresh)
  if (re) {
    return re.toString().toUpperCase()
  } else {
    log(ERROR, 'Region not specified, please set the CloudLogin.Region property...')
    process.exit(1)
  }
}

export function updateTCLI () {
  log(INFO, 'Updating Cloud CLI) Current Version: ' + require('../../package.json').version)
  run('npm -g install @tibco-tcstk/cloud-cli')
  log(INFO, 'New Cloud CLI Version: ')
  run('tcli -v')
}

export function updateCloudPackages () {
  log(INFO, 'Updating all packages starting with @tibco-tcstk in your package.json')
  // TODO: Investigate if we can install update-by-scope in node_modules of the cli
  run('npm install -g update-by-scope && npx update-by-scope @tibco-tcstk npm install')
  //
  log(INFO, col.blue('Done Updating Cloud Packages...'))
}

// Get the global configuration
export function getGlobalConfig () {
  if (doesFileExist(GLOBALPropertyFileName)) {
    return require('properties-reader')(GLOBALPropertyFileName).path()
  } else {
    log(INFO, 'No Global Configuration Set...')
    return false
  }
}

// Run an OS Command
export function run (command: string, failOnError?: boolean) {
  let doFail = true
  if (failOnError != null) {
    doFail = failOnError
  }
  const execSync = require('child_process').execSync
  // return new Promise(function (resolve, reject) {
  log(DEBUG, 'Executing Command: ' + command)
  try {
    execSync(
      command,
      { stdio: 'inherit' }
    )
  } catch (err:any) {
    // console.log('Got Error ' , err);
    // logO(DEBUG, reason);
    log(ERROR, 'Error Running command: ' + err.message)
    if (doFail) {
      process.exit(1)
    }
    // reject(err);
  }
  // resolve();
  // })
}

// Function to copy a directory

export function copyDir (fromDir: string, toDir: string) {
  const fse = require('fs-extra')
  log(INFO, 'Copying Directory from: ' + fromDir + ' to: ' + toDir)
  fse.copySync(fromDir, toDir, { overwrite: true })
}

// Function to delete a file but does not fail when the file does not exits
export function deleteFile (file: string) {
  log(INFO, 'Deleting File: ' + file)
  try {
    const fs = require('fs')
    fs.unlinkSync(file)
    // file removed
  } catch (err:any) {
    log(INFO, 'Could not delete file, maybe file does not exist ?... (' + err.code + ')')
    // console.log(err)
  }
}

// Delete a folder
export function deleteFolder (folder: string) {
  const del = require('del')
  log(INFO, 'Deleting Folder: ' + folder)
  return del([
    folder
  ])
}

// Create a directory if it does not exists
export function mkdirIfNotExist (dir: string) {
  const fs = require('fs')
  if (!fs.existsSync(dir)) {
    log(INFO, 'Creating folder: ' + col.blue(dir))
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Check if a file exists
export function doesFileExist (checkFile: string) {
  const fsCom = require('fs')
  log(DEBUG, 'Checking if file exists: ' + checkFile)
  try {
    return fsCom.existsSync(checkFile)
  } catch (err) {
    // console.error(err);
    log(ERROR, 'Error on checking if file exists: ', err)
  }
}

// Function that checks if something exists in an array and return false if so and displays a warning message
export function doesExist (array: string[], item: string, message: string): boolean {
  const re = array.indexOf(item) >= 0
  if (re) {
    log(WARNING, message)
  }
  return re
}

export async function isPortAvailable (port: string | number) {
  log(DEBUG, 'Checking Port Availability: ' + port)
  const tcpPortUsed = require('tcp-port-used')
  const pUsed = await tcpPortUsed.check(port, '127.0.0.1')
  return !pUsed
}

export async function sleep (ms: number) {
  // TODO: Add moving dots..
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function isOauthUsed () {
  let re = false
  if (getProp('CloudLogin.OAUTH_Token', true, true)) {
    if (getProp('CloudLogin.OAUTH_Token', true, true).trim() !== '') {
      re = true
    }
  }
  return re
}

export function isIterable (obj: any) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

// Get the TIBCO Cloud Starter Development Kit from GIT
export function getGit (source: string, target: string, tag?: string) {
  log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag)
  if (tag == null || tag === 'LATEST' || tag === '') {
    run('git clone "' + source + '" "' + target + '" ')
  } else {
    run('git clone "' + source + '" "' + target + '" -b ' + tag)
  }
}

// Function to install NPM packages
export function npmInstall (location: string, packageToUse?: string) {
  return new Promise<void>(function (resolve) {
    if (packageToUse != null) {
      run('cd ' + location + ' && npm install ' + packageToUse)
    } else {
      run('cd ' + location + ' && npm install')
    }
    resolve()
  })
}

export function getRelativeTime (millisec: number) {
  const diff = new Date().getTime() - new Date(millisec).getTime()
  if (diff < 60000 && diff > 0) {
    return 'Less than a minute ago...'
  }
  const re = millisec ? DateTime.fromMillis(millisec).toRelative() : ''
  if (re) {
    switch (true) {
      case re.indexOf('days') > -1:
        return col.blue(re)
      case re.indexOf('month') > -1:
        return col.cyan(re)
      case re.indexOf('years') > -1:
        return col.red(re)
      case re.indexOf('year') > -1:
        return col.yellow(re)
      default:
        return re
    }
  }
  return re
}

// function to store a JSON to a file
export function storeJsonToFile (contentFileName: string, contentObject: any) {
  try {
    require('jsonfile').writeFileSync(contentFileName, contentObject, { spaces: 2, EOL: '\r\n' })
    log(INFO, 'Stored JSON file: ' + col.blue(contentFileName))
  } catch (e:any) {
    log(ERROR, 'Error storing JSON: ', contentObject, '\n To File: ' + contentFileName, '\n Error: ' + e.message)
  }
}
