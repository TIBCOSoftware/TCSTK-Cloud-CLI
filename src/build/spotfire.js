const CCOM = require('./cloud-communications');
const colors = require('colors');

let jSession;
let xSRF;

async function callSpotfire(url, doLog, conf) {
    // https://eu.spotfire-next.cloud.tibco.com/spotfire/wp/settings
    if(isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
        if (!jSession || !xSRF) {
            const originalConf = conf;
            if (conf) {
                conf['returnResponse'] = true;
                conf['handleErrorOutside'] = true;
            } else {
                conf = {returnResponse: true, handleErrorOutside: true };
            }
            const response =  await CCOM.callTCA(url, doLog, conf);
            const loginCookie = response.headers['set-cookie'];
            //  logO(DEBUG, loginCookie);
            jSession = /JSESSIONID=(.*?);/g.exec(loginCookie)[1];
            xSRF = /XSRF-TOKEN=(.*?);/g.exec(loginCookie)[1];

            log(DEBUG, 'Got Spotfire Details] jSession: ', jSession);
            log(DEBUG, 'Got Spotfire Details]     xSRF: ', xSRF);
            return callSpotfire(url, doLog, originalConf);
        } else {
            const header = {};
            header["cookie"] = "JSESSIONID=" + jSession;
            header["X-XSRF-TOKEN"] = xSRF;
            header["referer"] = 'https://' + getCurrentRegion() + 'spotfire-next.cloud.tibco.com/spotfire/wp/startPage';
            if (conf) {
                conf['customHeaders'] = header;
            } else {
                conf = {customHeaders: header};
            }
            return  await CCOM.callTCA(url, doLog, conf);
        }
    } else {
        log(ERROR, 'OAUTH Needs to be enabled for communication with SPOTFIRE, Please generate an OAUTH Token. Make sure it is enabled for TSC as well as SPOTFIRE.');
        process.exit(1);
    }
}

// Function to browse spotfire reports
export async function browseSpotfire() {
    const SFSettings = await callSpotfire(CCOM.clURI.sf_settings, false);
    let currentFolderID = SFSettings.HomeFolderId;
    // console.log('Initial Folder ID: ' , SFSettings.HomeFolderId);
    let doBrowse = true;
    while(doBrowse) {
        const request = {
            "folderId": currentFolderID,
            "types": ["spotfire.folder", "spotfire.dxp", "spotfire.sbdf", "spotfire.mod"]
        }
        const sfReports = await callSpotfire(CCOM.clURI.sf_reports, false,{ method: 'POST', postRequest: request});
        // console.log('sfReports ', sfReports);
        let currentFolder = sfReports.CurrentFolder.Title;
        if(sfReports.CurrentFolder.DisplayPath){
            currentFolder = sfReports.CurrentFolder.DisplayPath;
        }
        log(INFO, 'Current folder: ', colors.blue(currentFolder));
        let items = [];
        for(let parent of sfReports.Ancestors) {
            if (parent.ItemType === 'spotfire.folder'){
                let name = parent.Title;
                if(parent.DisplayName){
                    name = parent.DisplayName;
                }
                items.push({
                    type: 'Parent',
                    id: parent.Id,
                    name: 'Parent) ' + name
                });
            }
        }
        for(let child of sfReports.Children){
            let name = child.Title;
            if(child.DisplayName){
                name = child.DisplayName;
            }
            if (child.ItemType === 'spotfire.folder') {
                items.push({
                    type: 'Child',
                    id: child.Id,
                    name: 'Child) ' + name
                });
            } else {
                if (child.ItemType === 'spotfire.dxp') {
                    items.push({
                        type: 'DXP',
                        id: child.Id,
                        name: 'DXP) ' + name,
                        item: child
                    });
                }
                if (child.ItemType === 'spotfire.mod') {
                    items.push({
                        type: 'MOD',
                        id: child.Id,
                        name: 'MOD) ' + name,
                        item: child
                    });
                }
            }
        }
        let tObject = createTable(sfReports.Children, CCOM.mappings.sf_reports, false);
        pexTable(tObject, 'spotfire-reports', getPEXConfig(), true);
        let itemArray = ['NONE'];
        for (const item of items) {
            itemArray.push(item.name);
        }
        const answer = await askMultipleChoiceQuestionSearch('On which Item would you like more details ?', itemArray);
        if(answer === 'NONE'){
            doBrowse = false;
        } else {
            for (const item of items) {
                if(item.name === answer){
                    if(item.type === 'DXP' || item.type === 'MOD'){
                        // show more info on DXP
                        console.table(item.item);
                        await askQuestion('Press [enter] to continue...');
                    } else {
                        currentFolderID = item.id;
                    }
                }
            }
        }
    }
}
