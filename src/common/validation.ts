import {
  col,
  getOrganization
} from './common-functions'
import {
  iterateTable
} from '../common/tables'
import { Global } from '../models/base'
import { askMultipleChoiceQuestion, askQuestion } from './user-interaction'
import { ERROR, INFO, log } from './logging'
import { addOrUpdateProperty, getProp, getPropFileName } from './property-file-management'
import { askTypes, getNameForSFType, listOnType } from '../tenants/spotfire'

declare let global: Global

const LA = require('../tenants/live-apps')
const CFILES = require('../tenants/cloud-files')
const USERGROUPS = require('../tenants/user-groups')
const TCI = require('../tenants/tci')
const CS = require('../cloud-starters/cloud-starters')

// Function, that does all sorts of validations
export async function validate () {
  // console.log('Validate ',new Date());
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Validate')
  // TODO: Add; case_folder_exist,
  const valChoices = ['Property_exist', 'Property_is_set', 'Property_is_set_ask', 'LiveApps_app_exist', 'Live_Apps_group_exist', 'TCI_App_exist', 'Cloud_Starter_exist', 'Org_Folder_exist', 'Org_Folder_And_File_exist', 'Case_exist', 'Case_not_exist', 'Case_in_state', 'Spotfire_Library_Item_exists']
  const valD = (await askMultipleChoiceQuestion('What would you like to validate ?', valChoices)).toLowerCase()
  log(INFO, 'Validating: ', valD)
  if (valD === 'property_exist' || valD === 'property_is_set' || valD === 'property_is_set_ask') {
    const propD = await askQuestion('Which property would you like to validate (Use plus character to validate multiple properties, for example: prop1+prop2) ?')
    const propDArray = propD.split('+')
    for (const prop of propDArray) {
      let val = null
      let valueFound = true
      try {
        val = getProp(prop)
      } catch (e) {
        valueFound = false
      }
      if (val != null && valueFound) {
        validationOk('Property ' + col.blue(prop) + '\x1b[0m exists...')
        if (valD === 'property_is_set' || valD === 'property_is_set_ask') {
          if (getProp(prop).trim() !== '') {
            validationOk('Property ' + col.blue(prop) + '\x1b[0m is set: ' + col.yellow(getProp(prop)))
          } else {
            validationFailed('Property ' + prop + ' does not have a value...')
            if (valD === 'property_is_set_ask') {
              const propVal = await askQuestion('What value would you like to set for ' + prop + ' ?')
              addOrUpdateProperty(getPropFileName(), prop, propVal, 'Set by validation on: ' + new Date())
            }
          }
        }
      } else {
        validationFailed('Property ' + prop + ' does not exist...')
        if (valD === 'property_is_set_ask') {
          const propVal = await askQuestion('What value would you like to set for ' + prop + ' ?')
          addOrUpdateProperty(getPropFileName(), prop, propVal, 'Set by validation on: ' + new Date())
        }
      }
    }
  }

  // Validate if a liveApps App exist
  if (valD === 'liveapps_app_exist') {
    const apps = await LA.showLiveApps(false, false)
    await validationItemHelper(apps, 'LiveApps App', 'name')
  }

  // Validate if a liveApps Group exist
  // Live_Apps_group_exist
  if (valD === 'live_apps_group_exist') {
    const groups = await USERGROUPS.getGroupsTable(false)
    // console.log(iterateTable(groups));
    await validationItemHelper(iterateTable(groups), 'LiveApps Group', 'Name')
  }

  // Validate if a Flogo App exist
  if (valD === 'tci_app_exist') {
    const apps = await TCI.showTCI(false)
    await validationItemHelper(iterateTable(apps), 'TCI App', 'Name')
  }

  // Validate if a Cloud Starter exist
  if (valD === 'cloud_starter_exist') {
    const apps = await CS.showAvailableApps(true)
    // console.log(apps);
    await validationItemHelper(apps, 'Cloudstarter', 'name')
  }

  // Validate if an org folder exist (and possibly contains file)
  if (valD === 'org_folder_exist' || valD === 'org_folder_and_file_exist') {
    const folders = await CFILES.getOrgFolderTable(false, false)
    // console.log(folders);
    const chosenFolder = await validationItemHelper(iterateTable(folders), 'Org Folder', 'Name')
    if (valD === 'org_folder_and_file_exist') {
      const files = await CFILES.getOrgFolderFiles(chosenFolder, false)
      await validationItemHelper(iterateTable(files), 'Org File', 'Name')
    }
  }

  // Validate if a LiveApps Case exist or not
  if (valD === 'case_exist' || valD === 'case_not_exist') {
    const casesToValidate = await askQuestion('Which case reference would you like to validate (Use plus character to validate multiple case\'s, for example: caseRef1+caseRef2) ?')
    await validateLACase(casesToValidate, valD)
  }

  // Validate if a LiveApps Case is in a specific state
  if (valD === 'case_in_state') {
    const caseRef = await askQuestion('For which case reference would you like to validate the state ?')
    const caseState = await askQuestion('For state would you like to validate ?')
    await validateLACaseState(caseRef, caseState)
  }

  if (valD === 'spotfire_library_item_exists') {
    const libType = await askTypes('What Spotfire Library item type would you like to validate ?', false, true)
    let typeList = await listOnType(libType, true, true)
    if (!typeList) {
      typeList = []
    }
    await validationItemHelper(typeList, 'Spotfire Library Item (' + getNameForSFType(libType) + ')', 'TCLIPath')
  }
}

// Validate the state of a case
export async function validateLACaseState (caseRefToValidate: string, stateToValidate: string) {
  // First check if case exists
  await validateLACase(caseRefToValidate, 'case_exist')
  const caseData = JSON.parse((await LA.getLaCaseByReference(caseRefToValidate)).untaggedCasedata)
  if (caseData.state === stateToValidate) {
    validationOk('Case with Reference ' + col.blue(caseRefToValidate) + '\x1b[0m is in the expected state ' + col.blue(stateToValidate) + '\x1b[0m on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
  } else {
    validationFailed('Case with Reference ' + col.blue(caseRefToValidate) + '\x1b[0m EXISTS BUT is NOT in the expected state ' + col.yellow(stateToValidate) + '\x1b[0m But in this State: ' + col.blue(caseData.state) + '\x1b[0m  on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
  }
}

// Validate if case exists or not
export async function validateLACase (casesToValidate: string, valType: string) {
  const caseRefArray = casesToValidate.split('+')
  for (const casRef of caseRefArray) {
    let validCase = false
    const caseData = await LA.getLaCaseByReference(casRef)
    if (caseData.casedata) {
      validCase = true
    } else {
      if (caseData.errorCode === 'CM_CASEREF_NOTEXIST') {
        validCase = false
      } else {
        log(ERROR, 'Unexpected error on validating case ', caseData)
      }
    }
    // console.log('Valid: ', validCase, ' casesToValidate: ', casesToValidate, ' valType: ', valType);
    if (validCase && valType === 'case_exist') {
      validationOk('Case with Reference ' + col.blue(casRef) + '\x1b[0m exist on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    }
    if (!validCase && valType === 'case_exist') {
      validationFailed('Case with Reference ' + col.blue(casRef) + '\x1b[0m does not exist on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    }
    if (!validCase && valType === 'case_not_exist') {
      validationOk('Case with Reference ' + col.blue(casRef) + '\x1b[0m was NOT EXPECTED to exist on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    }
    if (validCase && valType === 'case_not_exist') {
      validationFailed('Case with Reference ' + col.blue(casRef) + '\x1b[0m was NOT EXPECTED to exist(but it DOES) on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    }
  }
}

async function validationItemHelper (items: any[], type: string, search: string) {
  const itemsToValidate = await askQuestion('Which ' + type + ' would you like to validate (Use plus character to validate multiple ' + type + 's, for example: item1+item2) ?')
  const itemArray = itemsToValidate.split('+')
  for (const item of itemArray) {
    const itemToFind = items.find(e => e[search] === item.trim())
    if (itemToFind != null) {
      validationOk(type + ' ' + col.blue(item) + '\x1b[0m exist on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    } else {
      validationFailed(type + ' ' + col.blue(item) + '\x1b[0m does not exist on organization: ' + col.blue(getOrganization()) + '\x1b[0m...')
    }
  }
  return itemsToValidate
}

function validationOk (message: string) {
  log(INFO, col.green(' [VALIDATION --OK--] \x1b[0m' + message))
}

// TODO: Add option to exit on validation failure
function validationFailed (message: string) {
  log(ERROR, col.red('[VALIDATION FAILED] \x1b[0m' + message))
  process.exit(1)
}
