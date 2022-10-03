import {
  col,
  getCurrentAWSRegion, getCurrentRegion, getOrganization, mkdirIfNotExist, replaceInFile,
  run
} from '../common/common-functions'
import {
  createTable, createTableFromObject,
  getPEXConfig, iterateTable,
  pexTable
} from '../common/tables'
import { askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion } from '../common/user-interaction'
import { DEBUG, ERROR, INFO, log, logCancel, WARNING } from '../common/logging'
import { addOrUpdateProperty, getProp, getPropFileName, prepProp } from '../common/property-file-management'
import { TCIAppDetails, TCIAppInfo, TCIEndpoint } from '../models/tci'
import fs from 'fs'
const _ = require('lodash')

const CCOM = require('../common/cloud-communications')

// TODO: Make configurable
const SUBSCRIPTION_LOCATOR = '0'

function checkGeneratorProperties () {
  prepProp('TCI_Generate_Code_Output_Folder', './code-output/', '----------------------------\n' +
        '# TCI - Client code generation\n' +
        '# ----------------------------\n' +
        '# Folder where the generated code goes to')
  prepProp('TCI_Generate_Code_Command', 'DEFAULT', 'Command to use (Use DEFAULT or a custom command)\n' +
        '# Example of a custom command: "npx openapi-generator-cli generate -i {SWAGGER_FILE} -g typescript-angular -o {OUTPUT_FOLDER} --generate-alias-as-model"\n' +
        '# In a custom command you can use {SWAGGER_FILE} which will be replaced with the Swagger file and {OUTPUT_FOLDER}, which will be replaced with the output folder.')

  prepProp('TCI_Generate_Code_SchemaDefinition', 'NONE', 'Optionally you can use this to replace the schema definitions schema1, schema2 etc. with something more meaning-full. (Options: NONE | <blank> | <filename>)\n' +
        '# This schema definition file would typically be the result of the export-tci-app command\n' +
        '# TCI_Generate_Code_SchemaDefinition=./flogo.json')
  mkdirIfNotExist(getProp('TCI_Generate_Code_Output_Folder'))
}

// Function to enable the API Access
async function enableAPIAccess () {
  const response = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_enable), false, { method: 'POST' })
  if (response && response.status && response.status === 'enabled') {
    log(INFO, col.green('Successfully enabled TCI API Access...'))
  }
}

// Function to disable the API Access
async function disableAPIAccess () {
  const response = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_enable), false, { method: 'DELETE' })
  if (response && response.status && response.status === 'disabled') {
    log(INFO, col.yellow('Successfully disabled TCI API Access...'))
  }
}

// Function to return the API Access
async function hasAPIAccess (): Promise<boolean> {
  let re = false
  const response = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_enable), false)
  if (response && response.status && response.status === 'enabled') {
    re = true
  }
  return re
}

// Function to validate the API Access
async function checkAPIAccess () {
  if (await hasAPIAccess()) {
    log(INFO, col.green('API Access is enabled'))
  } else {
    const decision = await askMultipleChoiceQuestion('You don\'t seem to have access to the TCI API, do you want to enable this now ?', ['YES', 'NO'])
    if (decision.toLowerCase() === 'yes') {
      await enableAPIAccess()
    } else {
      logCancel(true)
    }
  }
}

async function checkOpenApiGeneratorCli () {
  const resultLocal = run('npm ls @openapitools/openapi-generator-cli', false)
  // console.log('resultLocal: ', resultLocal)
  if (resultLocal) {
    log(INFO, col.green('Found @openapitools/openapi-generator-cli Locally...'))
  }
  const resultGlobal = run('npm ls @openapitools/openapi-generator-cli -g', false)
  if (resultGlobal) {
    log(INFO, col.green('Found @openapitools/openapi-generator-cli Globally...'))
  }
  // console.log('resultGlobal: ', resultGlobal)
  // If the package is not installed at all
  if (!resultLocal && !resultGlobal) {
    const decision = await askMultipleChoiceQuestion('The package @openapitools/openapi-generator-cli was not found, do you want to install it now (choose to install it locally if you are not sure...)?', ['NO', 'YES - Install it locally', 'YES - Install it globally'])
    if (decision.toLowerCase() !== 'no') {
      if (decision.toLowerCase() === 'yes - install it locally') {
        run('npm install --save-dev @openapitools/openapi-generator-cli')
      }
      if (decision.toLowerCase() === 'yes - install it globally') {
        run('npm install -g @openapitools/openapi-generator-cli')
      }
    } else {
      logCancel(true)
    }
  }
}

// Function to manage the API Access
export async function manageAPIAccess () {
  log(INFO, 'Managing TCI API Access...')
  if (await hasAPIAccess()) {
    log(INFO, col.green('You currently have access to the TCI API'))
  } else {
    log(INFO, col.red('You currently don\'t have access to the TCI API'))
  }
  const decision = await askMultipleChoiceQuestion('What would you like to do ?', ['Nothing', 'Enable API Access', 'Disable API Access'])
  if (decision.toLowerCase() === 'enable api access') {
    await enableAPIAccess()
  }
  if (decision.toLowerCase() === 'disable api access') {
    await disableAPIAccess()
  }
  if (decision.toLowerCase() === 'nothing') {
    logCancel(false)
  }
}

// Show TCI Apps
/*
export async function showTCI(showTable?: boolean, returnRaw?: boolean): Promise<any> {
    let doShowTable = true
    if (showTable != null) {
        doShowTable = showTable
    }
    log(INFO, 'Getting TCI Apps...')
    const loginEndpoint = 'https://' + getCurrentRegion(true) + 'integration.cloud.tibco.com/idm/v3/login-oauth'
    // const appEndpoint = 'https://' + getCurrentRegion() + 'integration.cloud.tibco.com/api/v1/apps';
    // const response = callURL(appEndpoint, 'GET', null, null, false, 'TCI', loginEndpoint, null, false, true);
    const response = await CCOM.callTCA(CCOM.clURI.tci_apps, false, {
        tenant: 'TCI',
        customLoginURL: loginEndpoint,
        forceCLIENTID: true
    })
    const tObject = createTable(response, CCOM.mappings.tci_apps, false)
    pexTable(tObject, 'tci-apps', getPEXConfig(), doShowTable)
    log(DEBUG, 'TCI Object: ', tObject)
    let re = tObject
    if (returnRaw) {
        re = response
    }
    return re
} */

function addLocator (url: string) {
  return url.replace('{subscriptionLocator}', SUBSCRIPTION_LOCATOR)
}

function addAppId (url:string, appID: string) {
  return url.replace('{appId}', appID)
}

// Get TCI Apps
export async function getTCIapps (showTable = false): Promise<TCIAppInfo[]> {
  log(INFO, 'Getting TCI Apps...')
  await checkAPIAccess()
  const response = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_apps), false) as TCIAppInfo[]
  const tObject = createTable(response, CCOM.mappings.tci_apps_api, false)
  pexTable(tObject, 'tci-apps', getPEXConfig(), showTable)
  return response
}

// Show TCI Apps
export async function showTCIApps () {
  const tciApps = await getTCIapps(true)
  const tAppsToChoose = ['NONE']
  tciApps.forEach(app => tAppsToChoose.push(app.appName))
  const appForDetails = await askMultipleChoiceQuestionSearch('Which TCI App would you like to see the details ?', tAppsToChoose)
  if (appForDetails.toLowerCase() !== 'none') {
    const app = tciApps.find(a => a.appName === appForDetails)
    if (app && app.appId) {
      const response = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_apps + '/' + app.appId)) as TCIAppDetails
      createTableFromObject(response, 'TCI Application: ' + appForDetails)
    } else {
      log(ERROR, 'App not found: ' + appForDetails)
    }
  } else {
    logCancel(true)
  }
}

// Build executable
export async function buildTCIApp () {
  const tciApps = await getTCIapps(true)
  const tAppsToChoose = ['NONE']
  tciApps.forEach(app => tAppsToChoose.push(app.appName))
  const appForDetails = await askMultipleChoiceQuestionSearch('Which TCI App would you like to build ?', tAppsToChoose)
  if (appForDetails.toLowerCase() !== 'none') {
    const app = tciApps.find(a => a.appName === appForDetails)
    if (app && app.appId) {
        console.log('App ID: ', app.appId)
      // tci_api_build_app
      const response = await CCOM.callTCA(addAppId(addLocator(CCOM.clURI.tci_api_build_app), app.appId), true) as any
      console.log('Response: ', response)
    }
  }
}




export async function monitorTCI () {
  log(INFO, 'Monitoring a TCI App')
  // showCloudInfo(false);
  const tibCli = getTIBCli()
  const tciApps = await getTCIapps(true)
  const tAppsToChoose = ['NONE']
  tciApps.forEach(app => tAppsToChoose.push(app.appName))
  const appToMonitor = await askMultipleChoiceQuestionSearch('Which TCI App would you like to monitor ?', tAppsToChoose)
  if (appToMonitor.toLowerCase() !== 'none') {
    // console.log(appToMonitor);
    // run(tibCli + ' logout');
    // TODO: move this logic to common lib
    const email = getProp('CloudLogin.email')
    let pass = getProp('CloudLogin.pass')
    // if (pass === 'USE-GLOBAL') pass = propsG.CloudLogin.pass;
    // if (email === 'USE-GLOBAL') email = propsG.CloudLogin.email;
    if (pass === '') {
      pass = require('yargs').argv.pass
      // console.log('Pass from args: ' + pass);
    }
    if (pass && pass.charAt(0) === '#') {
      pass = Buffer.from(pass, 'base64').toString()
    }
    if (pass && pass.startsWith('@#')) {
      const fus = require('../common/fuzzy-search.js')
      pass = fus.find(pass)
    }
    pass = pass.replace('$', '\\$')
    run(tibCli + ' login -u "' + email + '" -p "' + pass + '" -o "' + getOrganization() + '" -r "' + getCurrentAWSRegion() + '"')
    log(INFO, 'Monitoring ' + col.yellow('[' + appToMonitor + ']') + ' in organization ' + col.blue('[' + getOrganization() + ']'))
    run(tibCli + ' monitor applog -s ' + appToMonitor)
  } else {
    logCancel(true)
  }
}

export async function exportTCIApp () {
  log(INFO, 'Exporting a TCI App')
  const tciApps = await getTCIapps(true)
  const tAppsToChoose = ['NONE']
  for (const tApp of tciApps) {
    if (tApp && tApp.appName && tApp.appType && tApp.appType === 'flogo') {
      tAppsToChoose.push(tApp.appName)
    }
  }
  const appToExport = await askMultipleChoiceQuestionSearch('Which FLOGO-TCI App would you like to export ?', tAppsToChoose)
  if (appToExport !== 'NONE') {
    for (const tApp of tciApps) {
      if (appToExport === tApp.appName) {
        const EXCLUDE_LIST = '&excludeList=git.tibco.com/git/product/ipaas/wi-contrib.git/contributions/General/trigger/rest'
        const loginEndpoint = 'https://' + getCurrentRegion(true) + 'integration.cloud.tibco.com/idm/v3/login-oauth'
        // TODO: Create timeout (if you are not the right user)
        const flogoAppExport = await CCOM.callTCA(CCOM.clURI.tci_export_app + '/' + tApp.appId + '?export=true' + EXCLUDE_LIST, false, {
          tenant: 'TCI',
          customLoginURL: loginEndpoint,
          forceCLIENTID: true
        })
        const storeOptions = { spaces: 2, EOL: '\r\n' }
        let manifestFileName = await askQuestion('Which filename would you like to use for the MANIFEST export ? (press enter or use DEFAULT to use manifest.json, or use NONE to not export the manifest)')
        if (manifestFileName === '' || manifestFileName.toLowerCase() === 'default') {
          manifestFileName = 'manifest.json'
        }
        if (manifestFileName.toLowerCase() !== 'none') {
          require('jsonfile').writeFileSync(manifestFileName, flogoAppExport.manifest, storeOptions)
          log(INFO, 'Stored Flogo Manifest: ' + col.blue(manifestFileName))
          log(WARNING, 'Not all components of the manifest are exported in the same way as a manual export...')
        }
        let flogoFileName = await askQuestion('Which filename would you like to use for the Flogo JSON export ? (press enter or use DEFAULT to use flogo.json, or use NONE to not export the Flogo JSON)')
        if (flogoFileName === '' || flogoFileName.toLowerCase() === 'default') {
          flogoFileName = 'flogo.json'
        }
        if (flogoFileName.toLowerCase() !== 'none') {
          require('jsonfile').writeFileSync(flogoFileName, flogoAppExport.flogoJson, storeOptions)
          log(INFO, 'Stored Flogo json: ' + col.blue(flogoFileName))
        }
      }
    }
  } else {
    logCancel(true)
  }
}

// Return the location of TIBCLI
function getTIBCli (): string {
  let re = ''
  if (getProp('TIBCLI_Location') != null) {
    re = getProp('TIBCLI_Location')
  } else {
    log(INFO, 'No TIBCLI_Location property found; We are adding it to: ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'TIBCLI_Location', '', 'The location of the TIBCLI Executable (including the executable name, for example: /folder/tibcli)')
    log(WARNING, 'Before continuing, please download TIBCO® Cloud - Command Line Interface from https://' + getCurrentRegion() + 'integration.cloud.tibco.com/envtools/download_tibcli, and add it\'s location to ' + getPropFileName())
    process.exit(0)
  }
  return re
}

// Function to generate the client code based on the swagger spec
export async function generateClientCodeForTCIApp () {
  log(INFO, 'Generating client code for a Flogo Application...')
  checkGeneratorProperties()
  await checkOpenApiGeneratorCli()
  const tciApps = await getTCIapps(true)
  const tAppsToChoose = ['NONE']
  tciApps.forEach(app => tAppsToChoose.push(app.appName))
  const appForDetails = await askMultipleChoiceQuestionSearch('Which TCI App would you like to generate the client code ?', tAppsToChoose)
  if (appForDetails.toLowerCase() !== 'none') {
    // TODO: Hier verder; get the app endpoints

    const app = tciApps.find(a => a.appName === appForDetails)
    if (app && app.appId) {
      const endpoints = await CCOM.callTCA(addLocator(CCOM.clURI.tci_api_apps + '/' + app.appId + '/endpoints'), false) as TCIEndpoint[]
      // console.log('endpoints ', endpoints)
      const tObject = createTable(endpoints, CCOM.mappings.tci_endpoints, false)
      pexTable(tObject, 'tci-endpoints', getPEXConfig(), true)
      const tEndpointToChoose = ['NONE']
      iterateTable(tObject).forEach(ep => tEndpointToChoose.push(ep.Title + '(' + ep.Description + ')'))
      const endpointName = await askMultipleChoiceQuestionSearch('For which TCI Endpoint would you like to generate the client code ?', tEndpointToChoose)
      if (endpointName.toLowerCase() !== 'none') {
        const endPointToGenerate = endpoints.find(endP => endpointName === endP.apiSpec.info.title + '(' + endP.apiSpec.info.description + ')')
        if (endPointToGenerate) {
          // TODO: Remove the $schema entries
          const schemaToWrite = JSON.parse(JSON.stringify(endPointToGenerate.apiSpec))
          for (const [key, value] of Object.entries(schemaToWrite.definitions)) {
            log(DEBUG, 'Checking for $schema in ', key)
            const valueP = value as any
            if (valueP && valueP.$schema) {
              delete valueP.$schema
              log(INFO, 'Deleted $schema entry in: ' + key)
            }
          }
          // Writing JSON Swagger file
          mkdirIfNotExist(getProp('TCI_Generate_Code_Output_Folder'))
          const swaggerFile = getProp('TCI_Generate_Code_Output_Folder') + '/swagger' + new Date().getTime() + '.json'
          require('jsonfile').writeFileSync(swaggerFile, schemaToWrite, { spaces: 2, EOL: '\r\n' })

          // TODO: Get schema names from JSON file
          if (getProp('TCI_Generate_Code_SchemaDefinition').toLowerCase() !== '' && getProp('TCI_Generate_Code_SchemaDefinition').toLowerCase() !== 'none') {
            log(INFO, 'Getting schema from file: ' + col.blue(getProp('TCI_Generate_Code_SchemaDefinition')))
            try {
              const rawdata = fs.readFileSync(getProp('TCI_Generate_Code_SchemaDefinition')).toString()
              const schemaObj = JSON.parse(rawdata)
              // console.log('schemaObj: ', schemaObj)
              const mappedSchemas = []
              if (schemaObj && schemaObj.schemas) {
                const swaggerSchemas = endPointToGenerate.apiSpec.definitions
                const defitionSchemas = schemaObj.schemas
                for (const [keySwa, swaggerSchema] of Object.entries(swaggerSchemas)) {
                  // console.log(key)
                  const swaggerSchemaToUse = swaggerSchema as any
                  for (const [keyDef, defSchema] of Object.entries(defitionSchemas)) {
                    // console.log(key)

                    const definitionSchema = JSON.parse((defSchema as any).value)
                    if (definitionSchema.$schema) {
                      delete definitionSchema.$schema
                    }
                    if (swaggerSchemaToUse.$schema) {
                      delete swaggerSchemaToUse.$schema
                    }
                    // console.log('swaggerSchema: ', swaggerSchema)
                    // console.log('definitionSchema: ', definitionSchema)
                    const isEqual = _.isEqual(swaggerSchemaToUse, definitionSchema)
                    // log(INFO, 'Comparing ' + keySwa + ' <-> ' + keyDef +  ' --> ' ,  isEqual)
                    if (isEqual) {
                      log(INFO, 'Schema ' + col.blue(keySwa) + ' maps to  --> ' + col.blue(keyDef))
                      if (!(mappedSchemas.indexOf(keyDef) > -1)) {
                        replaceInFile(keySwa, keyDef, swaggerFile)
                        mappedSchemas.push(keyDef)
                      } else {
                        log(WARNING, 'Schema already mapped: ', keyDef)
                        // TODO: The schema needs to be mapped (replaced) and then the duplicates should be removed
                      }
                    }
                  }
                }
              }
            } catch (e: any) {
              log(ERROR, 'Error with schema definition file: ', getProp('TCI_Generate_Code_SchemaDefinition'))
              log(ERROR, '', e.message)
              process.exit(1)
            }
          }
          const confirm = await askMultipleChoiceQuestion('Swagger file created: (' + swaggerFile + ')Are you ready to generate the code ? ', ['YES', 'NO'])
          if (confirm.toLowerCase() === 'yes') {
            // Get output folder from config
            let command = 'npx openapi-generator-cli generate -i ' + swaggerFile + ' -g typescript-angular -o ' + getProp('TCI_Generate_Code_Output_Folder') + ' --generate-alias-as-model'
            if (getProp('TCI_Generate_Code_Command') !== '' && getProp('TCI_Generate_Code_Command').toLowerCase() !== 'default') {
              // Allow for custom generator command
              command = getProp('TCI_Generate_Code_Command').replace('{SWAGGER_FILE}', swaggerFile).replace('{OUTPUT_FOLDER}', getProp('TCI_Generate_Code_Output_Folder'))
            }
            log(INFO, 'Running command: ' + command)
            run(command)
            log(INFO, 'Code generated in: ' + getProp('TCI_Generate_Code_Output_Folder'))
          } else {
            logCancel(true)
          }
          // npx openapi-generator-cli generate -i ./swagger.json -g typescript-angular -o ./out --generate-alias-as-model
        } else {
          log(ERROR, 'Endpoint not found: ', endpointName)
        }
      } else {
        logCancel(true)
      }
    } else {
      log(ERROR, 'App not found: ' + appForDetails)
    }
  } else {
    logCancel(true)
  }
}

/*
https://eu.integration.cloud.tibco.com/api/v1/apps/tzo4xtyx4nkohpuiaf52yynhbhot3yr2/endpoints/ta7uajne7ouopjij3ihtne6qexk6ns6c/swagger

https://eu.integration.cloud.tibco.com/api/v1/apps/tzo4xtyx4nkohpuiaf52yynhbhot3yr2/endpoints/ta7uajne7ouopjij3ihtne6qexk6ns6c/swagger
https://eu.integration.cloud.tibco.com/api/v1/apps/tzo4xtyx4nkohpuiaf52yynhbhot3yr2/endpoints/ta7uajne7ouopjij3ihtne6qexk6ns6c/swagger
 */
