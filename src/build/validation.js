const colors = require('colors');
const LA = require('./liveApps');
const CFILES = require('./cloud-files');

// Function, that does all sorts of validations
export async function validate() {
    //console.log('Validate ',new Date());
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Validate');
    // TODO: Add; case_folder_exist,
    const valChoices = ['Property_exist', 'Property_is_set', 'Property_is_set_ask', 'LiveApps_app_exist', 'Live_Apps_group_exist', 'TCI_App_exist', 'Cloud_Starter_exist', 'Org_Folder_exist', 'Org_Folder_And_File_exist', 'Case_Exist', 'Case_Not_Exist', 'Case_In_State'];
    const valD = (await askMultipleChoiceQuestion('What would you like to validate ?', valChoices)).toLowerCase();
    log(INFO, 'Validating: ', valD);
    if (valD == 'property_exist' || valD == 'property_is_set' || valD == 'property_is_set_ask') {
        let propD = await askQuestion('Which property would you like to validate (Use plus character to validate multiple properties, for example: prop1+prop2) ?');
        let propDArray = propD.split('+');
        for (let prop of propDArray) {
            let val = null;
            let valueFound = true;
            try {
                val = getProp(prop)
            } catch (e) {
                valueFound = false;
            }
            if (val != null && valueFound) {
                validationOk('Property ' + colors.blue(prop) + '\x1b[0m exists...');
                if (valD == 'property_is_set' || valD == 'property_is_set_ask') {
                    if (getProp(prop).trim() != '') {
                        validationOk('Property ' + colors.blue(prop) + '\x1b[0m is set: ' + colors.yellow(getProp(prop)));
                    } else {
                        validationFailed('Property ' + prop + ' does not have a value...');
                        if (valD == 'property_is_set_ask') {
                            let propVal = await askQuestion('What value would you like to set for ' + prop + ' ?');
                            addOrUpdateProperty(getPropFileName(), prop, propVal, 'Set by validation on: ' + new Date());
                        }
                    }
                }
            } else {
                validationFailed('Property ' + prop + ' does not exist...');
                if (valD == 'property_is_set_ask') {
                    let propVal = await askQuestion('What value would you like to set for ' + prop + ' ?');
                    addOrUpdateProperty(getPropFileName(), prop, propVal, 'Set by validation on: ' + new Date());
                }
            }
        }
    }

    // Validate if a liveApps App exist
    if (valD == 'liveapps_app_exist') {
        const apps = showLiveApps(false, false);
        await validationItemHelper(apps, 'LiveApps App', 'name')
    }

    // Validate if a liveApps Group exist
    // Live_Apps_group_exist
    if (valD == 'live_apps_group_exist') {
        const groups = getGroupsTable(false);
        // console.log(iterateTable(groups));
        await validationItemHelper(iterateTable(groups), 'LiveApps Group', 'Name');
    }

    // Validate if a Flogo App exist
    if (valD == 'tci_app_exist') {
        const apps = showTCI(false);
        await validationItemHelper(iterateTable(apps), 'TCI App', 'Name');
    }

    // Validate if a Cloud Starter exist
    if (valD == 'cloud_starter_exist') {
        const apps = showAvailableApps(true);
        // console.log(apps);
        await validationItemHelper(apps, 'Cloudstarter', 'name');
    }

    // Validate if an org folder exist (and possibly contains file)
    if (valD == 'org_folder_exist' || valD == 'org_folder_and_file_exist') {
        const folders = CFILES.getOrgFolders(false, false);
        // console.log(folders);
        const chosenFolder = await validationItemHelper(iterateTable(folders), 'Org Folder', 'Name');
        if (valD == 'org_folder_and_file_exist') {
            const files = CFILES.getOrgFolderFiles(folders, chosenFolder, false);
            await validationItemHelper(iterateTable(files), 'Org File', 'Name');
        }
    }

    // Validate if a LiveApps Case exist or not
    if (valD == 'case_exist' || valD == 'case_not_exist') {
        const casesToValidate = await askQuestion('Which case reference would you like to validate (Use plus character to validate multiple case\'s, for example: caseRef1+caseRef2) ?');
        validateLACase(casesToValidate, valD);
    }

    // Validate if a LiveApps Case is in a specific state
    if (valD == 'case_in_state') {
        const caseRef = await askQuestion('For which case reference would you like to validate the state ?');
        const caseState = await askQuestion('For state would you like to validate ?');
        validateLACaseState(caseRef, caseState)
    }
}

// Validate the state of a case
function validateLACaseState(caseRefToValidate, stateToValidate) {
    // First check if case exists
    validateLACase(caseRefToValidate, 'case_exist');
    const caseData = JSON.parse(LA.getLaCaseByReference(caseRefToValidate).untaggedCasedata);
    if (caseData.state == stateToValidate) {
        validationOk('Case with Reference ' + colors.blue(caseRefToValidate) + '\x1b[0m is in the expected state ' + colors.blue(stateToValidate) + '\x1b[0m on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
    } else {
        validationFailed('Case with Reference ' + colors.blue(caseRefToValidate) + '\x1b[0m EXISTS BUT is NOT in the expected state ' + colors.yellow(stateToValidate) + '\x1b[0m But in this State: ' + colors.blue(caseData.state) + '\x1b[0m  on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
    }
}

// Validate if case exists or not
function validateLACase(casesToValidate, valType) {
    const caseRefArray = casesToValidate.split('+');
    for (let casRef of caseRefArray) {
        let validCase = false;
        const caseData = LA.getLaCaseByReference(casRef);
        if (caseData.casedata) {
            validCase = true;
        } else {
            if (caseData.errorCode == 'CM_CASEREF_NOTEXIST') {
                validCase = false;
            } else {
                log(ERROR, 'Unexpected error on validating case ', caseData);
            }
        }
        // console.log('Valid: ', validCase, ' casesToValidate: ', casesToValidate, ' valType: ', valType);
        if (validCase && valType == 'case_exist') {
            validationOk('Case with Reference ' + colors.blue(casRef) + '\x1b[0m exist on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        }
        if (!validCase && valType == 'case_exist') {
            validationFailed('Case with Reference ' + colors.blue(casRef) + '\x1b[0m does not exist on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        }
        if (!validCase && valType == 'case_not_exist') {
            validationOk('Case with Reference ' + colors.blue(casRef) + '\x1b[0m was NOT EXPECTED to exist on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        }
        if (validCase && valType == 'case_not_exist') {
            validationFailed('Case with Reference ' + colors.blue(casRef) + '\x1b[0m was NOT EXPECTED to exist(but it DOES) on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        }
    }
}

async function validationItemHelper(items, type, search) {
    let itemsToValidate = await askQuestion('Which ' + type + ' would you like to validate (Use plus character to validate multiple ' + type + 's, for example: item1+item2) ?');
    let itemArray = itemsToValidate.split('+');
    for (let app of itemArray) {
        let laApp = items.find(e => e[search] == app.trim());
        if (laApp != null) {
            validationOk(type + ' ' + colors.blue(app) + '\x1b[0m exist on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        } else {
            validationFailed(type + ' ' + colors.blue(app) + '\x1b[0m does not exist on organization: ' + colors.blue(getOrganization()) + '\x1b[0m...');
        }
    }
    return itemsToValidate;
}

function validationOk(message) {
    log(INFO, colors.green(' [VALIDATION --OK--] \x1b[0m' + message))
}

// TODO: Add option to exit on validation failure
function validationFailed(message) {
    log(ERROR, colors.red('[VALIDATION FAILED] \x1b[0m' + message));
    process.exit(1);
}
