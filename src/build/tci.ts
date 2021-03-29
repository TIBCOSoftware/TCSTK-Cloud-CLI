import {
    addOrUpdateProperty, askMultipleChoiceQuestionSearch,
    askQuestion,
    createTable,
    DEBUG, getCurrentAWSRegion, getCurrentRegion, getOrganization, getPEXConfig, getProp,
    getPropFileName,
    INFO,
    iterateTable,
    log,
    pexTable,
    run, WARNING
} from "./common-functions";

const CCOM = require('./cloud-communications');
const colors = require('colors');

//const art = require('ascii-art');
//https://www.npmjs.com/package/ascii-art-font
// Show TCI Apps
export async function showTCI(showTable, returnRaw) {
    let doShowTable = true;
    if (showTable != null) {
        doShowTable = showTable;
    }
    log(INFO, 'Getting TCI Apps...');
    const loginEndpoint = 'https://' + getCurrentRegion(true) + 'integration.cloud.tibco.com/idm/v3/login-oauth';
    // const appEndpoint = 'https://' + getCurrentRegion() + 'integration.cloud.tibco.com/api/v1/apps';
    // const response = callURL(appEndpoint, 'GET', null, null, false, 'TCI', loginEndpoint, null, false, true);
    const response =  await CCOM.callTCA(CCOM.clURI.tci_apps, false, {tenant: 'TCI', customLoginURL: loginEndpoint, forceCLIENTID: true});
    let tObject = createTable(response, CCOM.mappings.tci_apps, false);
    pexTable(tObject, 'tci-apps', getPEXConfig(), doShowTable);
    log(DEBUG, 'TCI Object: ', tObject);
    let re = tObject;
    if(returnRaw){
        re = response;
    }
    return re;
}

export async function monitorTCI() {
    log(INFO, 'Monitoring a TCI App');
    // showCloudInfo(false);
    const tibCli = getTIBCli();
    const tciApps = await showTCI();
    let tAppsToChoose = ['NONE'];
    for (let tApp of iterateTable(tciApps)) {
        // console.log(tApp);
        if (tApp && tApp.Name) {
            tAppsToChoose.push(tApp.Name);
        }
    }
    let appToMonitor = await askMultipleChoiceQuestionSearch('Which TCI App would you like to monitor ?', tAppsToChoose);
    if (appToMonitor !== 'NONE') {
        // console.log(appToMonitor);
        // run(tibCli + ' logout');
        // TODO: move this logic to common lib
        let email = getProp('CloudLogin.email');
        let pass = getProp('CloudLogin.pass');
        if (pass === 'USE-GLOBAL') pass = propsG.CloudLogin.pass;
        if (email === 'USE-GLOBAL') email = propsG.CloudLogin.email;
        if (pass === '') {
            pass = require('yargs').argv.pass;
            // console.log('Pass from args: ' + pass);
        }
        if (pass && pass.charAt(0) == '#') {
            pass = Buffer.from(pass, 'base64').toString();
        }
        if (pass && pass.startsWith('@#')) {
            const fus = require('./fuzzy-search.js');
            pass = fus.find(pass);
        }
        pass = pass.replace('$', '\\$')
        run(tibCli + ' login -u "' + email + '" -p "' + pass + '" -o "' + getOrganization() + '" -r "' + getCurrentAWSRegion() + '"');
        log(INFO, 'Monitoring ' + colors.yellow('[' + appToMonitor + ']') + ' in organization ' + colors.blue('[' + getOrganization() + ']'))
        run(tibCli + ' monitor applog -s ' + appToMonitor);
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}


export async function exportTCIApp() {
    log(INFO, 'Exporting a TCI App');
    const tciApps = await showTCI(true, true);
    let tAppsToChoose = ['NONE'];
    for (let tApp of tciApps) {
        if (tApp && tApp.name && tApp.type && tApp.type.val && tApp.type.val === 'flogo') {
            tAppsToChoose.push(tApp.name);
        }
    }
    let appToExport = await askMultipleChoiceQuestionSearch('Which FLOGO-TCI App would you like to export ?', tAppsToChoose);
    if (appToExport !== 'NONE') {
        for (let tApp of tciApps) {
            if (appToExport === tApp.name) {
                const EXCLUDE_LIST = '&excludeList=git.tibco.com/git/product/ipaas/wi-contrib.git/contributions/General/trigger/rest';
                const loginEndpoint = 'https://' + getCurrentRegion(true) + 'integration.cloud.tibco.com/idm/v3/login-oauth';
                // TODO: Create timeout (if you are not the right user)
                const flogoAppExport =  await CCOM.callTCA(CCOM.clURI.tci_export_app + '/' + tApp.id + '?export=true' + EXCLUDE_LIST, false, {tenant: 'TCI', customLoginURL: loginEndpoint, forceCLIENTID: true});
                const storeOptions = {spaces: 2, EOL: '\r\n'};
                let manifestFileName = await askQuestion('Which filename would you like to use for the MANIFEST export ? (press enter or use DEFAULT to use manifest.json, or use NONE to not export the manifest)');
                if(manifestFileName === '' || manifestFileName.toLowerCase() === 'default'){
                    manifestFileName = 'manifest.json';
                }
                if(manifestFileName.toLowerCase() != 'none') {
                    require('jsonfile').writeFileSync(manifestFileName, flogoAppExport.manifest, storeOptions);
                    log(INFO, 'Stored Flogo Manifest: ' + colors.blue(manifestFileName));
                    log(WARNING, 'Not all components of the manifest are exported in the same way as a manual export...');
                }
                let flogoFileName = await askQuestion('Which filename would you like to use for the Flogo JSON export ? (press enter or use DEFAULT to use flogo.json, or use NONE to not export the Flogo JSON)');
                if(flogoFileName === '' || flogoFileName.toLowerCase() === 'default'){
                    flogoFileName = 'flogo.json';
                }
                if(flogoFileName.toLowerCase() != 'none'){
                    require('jsonfile').writeFileSync(flogoFileName, flogoAppExport.flogoJson, storeOptions);
                    log(INFO, 'Stored Flogo json: ' + colors.blue(flogoFileName));
                }
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}



function getTIBCli() {
    let re = '';
    if (getProp('TIBCLI_Location') != null) {
        re = getProp('TIBCLI_Location');
    } else {
        log(INFO, 'No TIBCLI_Location property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'TIBCLI_Location', '', 'The location of the TIBCLI Executable (including the executable name, for example: /folder/tibcli)');
        log(WARNING, 'Before continuing, please download TIBCO® Cloud - Command Line Interface from https://' + getCurrentRegion() + 'integration.cloud.tibco.com/envtools/download_tibcli, and add it\'s location to ' + getPropFileName());
        process.exit(0);
    }
    return re;
}

// Use WSU to generate TCI code
function wsuAddTci() {
    return new Promise(async function (resolve) {
        // TODO: Implement
        console.log('TODO: Implement');
        resolve();
    });
}

function wsuListTci() {
    return new Promise(async function (resolve) {
        // TODO: Remove web scaffolding utility ?
        /*const wsu = require('@tibco-tcstk/web-scaffolding-utility');
        console.log(wsu.API.getVersion());
        wsu.API.login(getProp('CloudLogin.clientID'), getProp('CloudLogin.email'), getProp('CloudLogin.pass'));
        // console.log(wsu.API.getArtefactList("TCI").createTable());
        const afList = wsu.API.getArtefactList(wsu.API.flavour.TCI);
        console.table(afList.createTable());
        */
        resolve();

    });
}

