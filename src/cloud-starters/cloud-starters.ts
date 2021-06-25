// Package Definitions
import {
  copyDir,
  copyFile,
  deleteFile,
  deleteFolder, doesFileExist, getCurrentRegion,
  isIterable,
  isOauthUsed, isPortAvailable,
  mkdirIfNotExist, npmInstall,
  run
} from '../common/common-functions'
import {
  createTableValue,
  getPEXConfig,
  iterateTable,
  pexTable, showTableFromTobject
} from '../common/tables'
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch } from '../common/user-interaction'
import { ERROR, INFO, log, logCancel, logLine, WARNING } from '../common/logging'
import { addOrUpdateProperty, getProp, getPropFileName } from '../common/property-file-management'

const CCOM = require('../common/cloud-communications')
const OAUTH = require('../common/oauth')
const USERGROUPS = require('../tenants/user-groups')

export async function start () {
  log(INFO, 'Starting: ' + getProp('App_Name'))
  if (isOauthUsed()) {
    await OAUTH.validateAndRotateOauthToken(true)
    // Display OAUTH Details from Common
    OAUTH.displayCurrentOauthDetails()
  }
  // Check if port 4200 is available, if not use 4201, 4202 etc.
  const port = 4200
  const range = 50
  let portToUse = 0
  for (let i = 0; i < range; i++) {
    const pAv = await isPortAvailable(port + i)
    if (pAv) {
      portToUse = port + i
      i = range
    }
  }
  if (portToUse !== 0) {
    log('INFO', 'Using Port: ' + portToUse)
    const region = getProp('CloudLogin.Region').toLowerCase()
    if (portToUse === 4200) {
      // TODO: Fix bug, can not read includes of undefined (no global config, and no password)
      if (region === 'eu') {
        run('npm run serve_eu')
      } else {
        if (region === 'au') {
          run('npm run serve_au')
        } else {
          run('npm run serve_us')
        }
      }
    } else {
      if (region === 'eu') {
        run('ng serve --proxy-config proxy.conf.prod.eu.js --ssl true --source-map --aot --port ' + portToUse)
      } else {
        if (region === 'au') {
          run('ng serve --proxy-config proxy.conf.prod.au.js --ssl true --source-map --aot --port ' + portToUse)
        } else {
          run('ng serve --proxy-config proxy.conf.prod.us.js --ssl true --source-map --aot --port ' + portToUse)
        }
      }
    }
  } else {
    log('ERROR', 'No available port found (started at ' + port + ', with range: ' + range + ')')
  }
}

export async function cleanDist () {
  return deleteFolder('./dist/' + getProp('App_Name'))
}

export function generateCloudDescriptor () {
  // Add Descriptor
  if (!getProp('Add_Descriptor')) {
    log(INFO, 'No Add_Descriptor Property found; Adding Add_Descriptor to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Add_Descriptor', 'YES')
  }
  // Add Descriptor
  let ADD_DESCRIPTOR_TIMESTAMP = 'YES'
  if (getProp('Add_Descriptor_Timestamp') !== null) {
    ADD_DESCRIPTOR_TIMESTAMP = getProp('Add_Descriptor_Timestamp')
  } else {
    log(INFO, 'No Add_Descriptor_Timestamp Property found; Adding Add_Descriptor_Timestamp to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Add_Descriptor_Timestamp', 'YES')
  }
  // Add Descriptor
  let DESCRIPTOR_FILE = './src/assets/cloudstarter.json'
  if (getProp('Descriptor_File') !== null) {
    DESCRIPTOR_FILE = getProp('Descriptor_File')
  } else {
    log(INFO, 'No Descriptor_File Property found; Adding Descriptor_File to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Descriptor_File', './src/assets/cloudstarter.json')
  }
  log(INFO, 'Adding descriptor file: ' + DESCRIPTOR_FILE + ' Adding Timestamp: ' + ADD_DESCRIPTOR_TIMESTAMP)
  // Get the version from the JSON File
  const workdir = process.cwd()
  const path = require('path')
  const packageJson = workdir + path.sep + 'package.json'
  if (doesFileExist(packageJson)) {
    let now = ''
    let buildOn = ''
    if (ADD_DESCRIPTOR_TIMESTAMP === 'YES') {
      now = (new Date()).getTime().toString()
      buildOn = (new Date()).toUTCString()
    }
    const pJsonObj = require('jsonfile').readFileSync(packageJson)
    let name = ''
    if (pJsonObj.name) {
      name = pJsonObj.name
    }
    let version = ''
    if (pJsonObj.version) {
      version = pJsonObj.version
    }
    let description = ''
    if (pJsonObj.description) {
      description = pJsonObj.description
    }
    const csObject = {
      cloudstarter: {
        name: name,
        version: version + now,
        build_date: buildOn,
        description: description
      }
    }
    log(INFO, 'Adding Cloud Starter Descriptor: ', csObject)
    const storeOptions = { spaces: 2, EOL: '\r\n' }
    require('jsonfile').writeFileSync(DESCRIPTOR_FILE, csObject, storeOptions)
  } else {
    log(ERROR, packageJson + ' File not found...')
  }
  // Possibly add timestamp
  // TODO: Possibly use a descriptor template
  // TODO: Possibly add dependencies into the file
}

// Function to display the location on the deployed cloudstarter and possilby the descriptor.
export function showAppLinkInfo () {
  // TODO: Get from global file
  // let cloudURLdisp = getProp('Cloud_URL');
  log('INFO', 'LOCATION: https://' + getCurrentRegion() + CCOM.clURI.apps + getProp('App_Name') + '/index.html')
  if (getProp('Add_Descriptor') === 'YES') {
    log('INFO', 'DESCRIPTOR LOCATION: https://' + getCurrentRegion() + CCOM.clURI.apps + getProp('App_Name') + getProp('Descriptor_File').replace('./src', ''))
  }
}

// Build the zip for deployment
export function buildCloudStarterZip (cloudStarter: string) {
  // Check for Build Command
  let BUILD_COMMAND = 'HASHROUTING'
  if (getProp('BUILD_COMMAND') !== null) {
    BUILD_COMMAND = getProp('BUILD_COMMAND')
  } else {
    log(INFO, 'No BUILD_COMMAND Property found; Adding BUILD_COMMAND to ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'BUILD_COMMAND', 'HASHROUTING', 'Build command to use: Options: HASHROUTING | NON-HASHROUTING | <a custom command (example: ng tenants --prod )>')
  }
  const csURL = '/webresource/apps/' + cloudStarter + '/'
  deleteFile('./dist/' + cloudStarter + '.zip')
  // Add the cloudstarter.json file
  if (getProp('Add_Descriptor') === 'YES') {
    generateCloudDescriptor()
  }
  // hashrouting tenants configurable
  let buildCommand = BUILD_COMMAND
  let bType = 'CUSTOM'
  if (BUILD_COMMAND === 'HASHROUTING') {
    bType = 'HASHROUTING'
    buildCommand = 'ng build --prod --base-href ' + csURL + 'index.html --deploy-url ' + csURL
  }
  if (BUILD_COMMAND === 'NON-HASHROUTING') {
    bType = 'NON-HASHROUTING'
    buildCommand = 'ng build --prod --base-href ' + csURL + ' --deploy-url ' + csURL
  }
  log(INFO, 'Building Cloudstarter Using Command(Type: ' + bType + '): ' + buildCommand)
  run(buildCommand)
  // TODO: Use NPM to zip a folder, fix bug on extraction when upload to cloud... (perhaps use no compression)
  // const folderToZip = './dist/' + cloudStarter + '/';
  // const fileForZip = './dist/' + cloudStarter + '.zip';
  run('cd ./dist/' + cloudStarter + '/ && zip -r ./../' + cloudStarter + '.zip .')
  log(INFO, 'ZIP Created: ./dist/' + cloudStarter + '.zip')
}

// function that shows all the availible applications in the cloud
export async function showAvailableApps (showTable?: boolean) {
  // TODO: Use table config
  const doShowTable = (typeof showTable === 'undefined') ? false : showTable
  // TODO: loop over if there are more than 200
  const response = await CCOM.callTCA(CCOM.clURI.app_info + '?$top=200', false, { handleErrorOutside: true })
  // console.log(response)
  if (response.errorMsg) {
    if (response.errorMsg === 'Application does not exist') {
      log(WARNING, 'No Cloud Starters deployed yet...')
      return null
    } else {
      log(ERROR, response.errorMsg)
      process.exit(1)
    }
  } else {
    // console.log('APPS: ' , response);
    const users = iterateTable(await USERGROUPS.showLiveAppsUsers(false, true))
    // console.log('USERS: ', users);
    // TODO: Apparently apps can have tags, look into this...
    const apps:any = {}
    const appsDisplay:any = {}
    for (const app in response) {
      const appTemp:any = {}
      // const appTempDisplay = {};
      const appN = parseInt(app) + 1
      // log(INFO, appN + ') APP NAME: ' + response[app].name  + ' Published Version: ' +  response[app].publishedVersion + ' (Latest:' + response[app].publishedVersion + ')') ;
      appTemp['APP NAME'] = response[app].name
      let owner = 'Unknown'
      for (const user of users) {
        if (user.Id === response[app].owner) {
          owner = user['First Name'] + ' ' + user['Last Name']
        }
      }
      appTemp.OWNER = owner
      // TODO: Use the API (get artifacts) to find an index.htm(l) and provide highest
      const publV = parseInt(response[app].publishedVersion)
      appTemp['PUBLISHED VERSION'] = publV
      const latestV = parseInt(response[app].latestVersion)
      appTemp['LATEST VERSION'] = latestV
      // appTemp['PUBLISHED / LATEST VERSION'] = '(' + publV + '/' + latestV + ')';
      let latestDeployed = false
      if (publV === latestV) {
        latestDeployed = true
      }
      appTemp['LATEST DEPLOYED'] = latestDeployed
      const created = new Date(response[app].creationDate)
      const options:DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      // const optionsT = {hour: 'numeric'};
      appTemp.CREATED = created.toLocaleDateString('en-US', options)
      // appTemp['CREATED TIME'] = created.toLocaleTimeString();
      const lastModified = new Date(response[app].lastModifiedDate)
      // appTemp['LAST MODIFIED'] = lastModified.toLocaleDateString("en-US", options);
      // appTemp['LAST MODIFIED TIME'] = lastModified.toLocaleTimeString();
      const now = new Date()
      appTemp['AGE(DAYS)'] = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      appTemp['LAST MODIFIED(DAYS)'] = Math.round((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24))
      apps[appN] = appTemp
      const appTempDisplay = { ...appTemp }
      delete appTempDisplay['LATEST VERSION']
      delete appTempDisplay['LATEST DEPLOYED']
      appsDisplay[appN] = appTempDisplay
    }
    pexTable(apps, 'cloud-starters', getPEXConfig(), false)
    if (doShowTable) {
      // log(INFO, col.blue('TABLE] cloud-starters'))
      // console.table(appsDisplay)
      showTableFromTobject(appsDisplay, 'cloud-starters')
    }
    return response
  }
}

// Function to delete a WebApplication
export async function deleteApp () {
  // Get the list of applications
  log(INFO, 'Getting Applications...')
  const appArray = []
  appArray.push('NONE')
  let deleteApp = false
  const apps = await showAvailableApps(true)
  for (const app of apps) {
    appArray.push(app.name)
  }
  const appToDelete = await askMultipleChoiceQuestionSearch('Which APP Would you like to delete ? ', appArray)
  if (appToDelete !== 'NONE') {
    const confirm = await askMultipleChoiceQuestion('Are you sure you want to delete ? ' + appToDelete, ['YES', 'NO'])
    if (confirm === 'YES') {
      deleteApp = true
    }
  }
  if (deleteApp) {
    log(INFO, 'Deleting ' + appToDelete + '...')
    const da = await CCOM.callTCA(CCOM.clURI.app_info + appToDelete + '/', false, { method: 'DELETE' })
    if (da) {
      if (da.message) {
        log(INFO, da.message)
      } else {
        log(ERROR, 'Error On Delete: ', da)
      }
    } else {
      log(ERROR, 'No Body Returned on Delete:  ', da)
    }
  } else {
    logCancel(true)
  }
}

// Get details of a cloud starter
async function getApplicationDetails (application: any, version: string, showTable: boolean) {
  const doShowTable = (typeof showTable === 'undefined') ? false : showTable
  const details:any = {}
  // console.log(getApplicationDetailsURL +  application + '/applicationVersions/' + version + '/artifacts/');
  const artefactStepSize = 200
  let hasMoreArtefacts = true
  let allArteFacts:any[] = []
  for (let i = 0; hasMoreArtefacts; i = i + artefactStepSize) {
    // let exportBatch = callURL(cloudURL + 'case/v1/cases?$sandbox=' + await getProductionSandbox() + '&$filter=applicationId eq ' + cTypes[curCase].applicationId + typeIdString + '&$top=' + exportCaseStepSize + '&$skip=' + i, 'GET', null, null, false);
    let skip = ''
    if (i !== 0) {
      skip = '&$skip=' + i
    }
    const appDet = await CCOM.callTCA(CCOM.clURI.app_info + application + '/applicationVersions/' + version + '/artifacts/?&$top=' + artefactStepSize + skip)
    if (appDet) {
      if (appDet.length < artefactStepSize) {
        hasMoreArtefacts = false
      }
      allArteFacts = allArteFacts.concat(appDet)
    } else {
      hasMoreArtefacts = false
    }
  }
  let i = 0
  for (const det in allArteFacts) {
    const appTemp:any = {}
    const appN = i
    i++
    appTemp['CLOUD STARTER'] = application
    appTemp['DETAIL NAME'] = allArteFacts[det].name
    details[appN] = appTemp
  }
  pexTable(details, 'cloud-starter-details', getPEXConfig(), doShowTable)
  return allArteFacts
}

// Get Links to all the applications
export async function getAppLinks (showTable?: boolean) {
  log(INFO, 'Getting Cloud Starter Links...')
  const appLinkTable:any = {}
  const apps = await showAvailableApps(false)
  if (apps) {
    let i = 1
    let nvs:any[] = []
    for (const app of apps) {
      const appTemp:any = {}
      appTemp['APP NAME'] = app.name
      // nvs = createTableValue('CLOUD STARTER ' + i, '*** C L O U D    S T A R T E R ***', nvs)
      nvs = createTableValue('CLOUD STARTER ' + i, '', nvs)
      nvs = createTableValue('NAME', app.name, nvs)
      const appN = i++
      const tempDet:any = await getApplicationDetails(app.name, app.publishedVersion, false)
      logLine('Processing App: (' + appN + '/' + apps.length + ')...')
      if (isIterable(tempDet)) {
        for (const appD of tempDet) {
          // Get file after last slash in Descriptor file name; expected cloudstarter.json
          if (appD.name.includes(/[^/]*$/.exec(getProp('Descriptor_File'))![0])) {
            const csInfo = await CCOM.callTCA(CCOM.clURI.apps + encodeURIComponent(app.name) + '/' + appD.name, false)
            // const csInfo = callURL(cloudURL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name, null, null, null, false);
            if (csInfo && csInfo.cloudstarter) {
              appTemp['CS VERSION'] = csInfo.cloudstarter.version
              nvs = createTableValue('VERSION', csInfo.cloudstarter.version, nvs)
              appTemp['BUILD DATE'] = csInfo.cloudstarter.build_date
              nvs = createTableValue('BUILD DATE', csInfo.cloudstarter.build_date, nvs)
            }
          }
          if (appD.name.includes('index.html')) {
            const tempLink = 'https://' + getCurrentRegion() + CCOM.clURI.apps + encodeURIComponent(app.name) + '/' + appD.name
            appTemp.LINK = tempLink
            nvs = createTableValue('LINK', tempLink, nvs)
          }
        }
      } else {
        if (app.name && tempDet && tempDet.errorMsg) {
          log(ERROR, 'App: ' + app.name + ', Error: ' + tempDet.errorMsg)
        } else {
          log(ERROR, 'Something is wrong with ', app, tempDet)
        }
      }
      appLinkTable[appN] = appTemp
    }
    process.stdout.write('\n')
    pexTable(appLinkTable, 'cloud-starter-links', getPEXConfig(), false)
    if (showTable) {
      // console.table(nvs)
      showTableFromTobject(nvs, 'cloud-starter-links')
    }
  }
  return appLinkTable
}

// Function to upload a zip to the LiveApps ContentManagment API
export async function uploadApp (application: string) {
  // We use the location here because the way the call is setup (with the host)
  const uploadAppLocation = '/webresource/v1/applications/' + application + '/upload/'
  const appLocation = './dist/' + application + '.zip'
  await CCOM.uploadToCloud('appContents', appLocation, uploadAppLocation)
}

// Function to publish the application to the cloud
export async function publishApp (application: string) {
  // const publishLocation = cloudURL + 'webresource/v1/applications/' + application + '/';
  const response = await CCOM.callTCA(CCOM.clURI.app_info + application + '/', false, { method: 'PUT' })
  log(INFO, 'Publish Result: ', response)
}

// Function that injects the sources of the library into this project
export function injectLibSources () {
  log('INFO', 'Injecting Lib Sources')
  // run('mkdir tmp');
  mkdirIfNotExist('./projects')
  mkdirIfNotExist('./projects/tibco-tcstk')
  copyDir('./tmp/TCSDK-Angular/projects/tibco-tcstk', './projects/tibco-tcstk')
  // use debug versions
  const now = new Date()
  mkdirIfNotExist('./backup/')
  // Make Backups in the back up folder
  copyFile('./tsconfig.json', './backup/tsconfig-Before-Debug(' + now + ').json')
  copyFile('./angular.json', './backup/angular-Before-Debug(' + now + ').json')
  copyFile('./package.json', './backup/package-Before-Debug(' + now + ').json')
  copyFile('./tsconfig.debug.json', './tsconfig.json')
  copyFile('./angular.debug.json', './angular.json')
  // copyFile('./package.debug.json', './package.json');
  run('npm uninstall ' + getProp('TCSTDebugPackages'))
  // do NPM install
  // npmInstall('./');
  npmInstall('./', 'lodash-es')
  log('INFO', 'Now you can debug the cloud library sources in your browser !!')
}

// Function to go back to the compiled versions of the libraries
export function undoLibSources () {
  log('INFO', 'Undo-ing Injecting Lib Sources')
  // Move back to Angular tenants files
  const now = new Date()
  mkdirIfNotExist('./backup/')
  // Make Backups in the back up folder
  copyFile('./tsconfig.json', './backup/tsconfig-Before-Build(' + now + ').json')
  copyFile('./angular.json', './backup/angular-Before-Build(' + now + ').json')
  copyFile('./package.json', './backup/package-Before-Build(' + now + ').json')
  copyFile('./tsconfig.tenants.json', './tsconfig.json')
  copyFile('./angular.tenants.json', './angular.json')
  // copyFile('./package.tenants.json', './package.json');
  // Delete Project folder
  // FIX: Just delete those folders imported...
  deleteFolder('./projects/tibco-tcstk/tc-core-lib')
  deleteFolder('./projects/tibco-tcstk/tc-forms-lib')
  deleteFolder('./projects/tibco-tcstk/tc-liveapps-lib')
  deleteFolder('./projects/tibco-tcstk/tc-spotfire-lib')
  // FIX: just install those npm packages (instead of removing the entire package.json file...)
  run('npm install ' + getProp('TCSTDebugPackages') + ' --legacy-peer-deps')
}

// Function to test
export function testCS () {
  log(INFO, 'Running Testcases...')
  // TODO: See if we can call Jasmine directly and generate a nicer testreport
  run('npm run test')
}

// Function to test headless
export function testCSHeadless () {
  log(INFO, 'Running Headless Testcases...')
  // TODO: See if we can call Jasmine directly and generate a nicer testreport
  run('ng test --code-coverage --watch=false --browsers=ChromeHeadless')
}
