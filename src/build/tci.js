const CCOM = require('./cloud-communications');
const colors = require('colors');

//const art = require('ascii-art');
//https://www.npmjs.com/package/ascii-art-font
// Show TCI Apps
export async function showTCI(showTable) {
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
    return tObject;
}

export async function monitorTCI() {
    log(INFO, 'Monitoring a TCI App');
    // showCloudInfo(false);
    const tibCli = getTIBCli();
    const tciApps = showTCI();
    let tAppsToChoose = ['Nothing'];
    for (let tApp of iterateTable(tciApps)) {
        // console.log(tApp);
        if (tApp && tApp.Name) {
            tAppsToChoose.push(tApp.Name);
        }
    }
    let appToMonitor = await askMultipleChoiceQuestionSearch('Which TCI App would you like to monitor ?', tAppsToChoose);
    if (appToMonitor != 'Nothing') {
        // console.log(appToMonitor);
        // run(tibCli + ' logout');
        // TODO: move this logic to common lib
        let email = getProp('CloudLogin.email');
        let pass = getProp('CloudLogin.pass');
        if (pass == 'USE-GLOBAL') pass = propsG.CloudLogin.pass;
        if (email == 'USE-GLOBAL') email = propsG.CloudLogin.email;
        if (pass == '') {
            pass = require('yargs').argv.pass;
            // console.log('Pass from args: ' + pass);
        }
        if (pass.charAt(0) == '#') {
            pass = Buffer.from(pass, 'base64').toString()
        }
        pass = pass.replace('$', '\\$')
        run(tibCli + ' login -u "' + email + '" -p "' + pass + '" -o "' + getOrganization() + '" -r "' + getCurrentAWSRegion() + '"');
        log(INFO, 'Monitoring ' + colors.yellow('[' + appToMonitor + ']') + ' in organization ' + colors.blue('[' + getOrganization() + ']'))
        run(tibCli + ' monitor applog -s ' + appToMonitor);
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
    return new Promise(async function (resolve, reject) {
        // TODO: Implement
        console.log('TODO: Implement');
        resolve();
    });
}

function wsuListTci() {
    return new Promise(async function (resolve, reject) {
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
