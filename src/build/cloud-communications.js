require('./common-functions');
const colors = require('colors');

const cloudConfig = require('../config/config-cloud.json');
// TODO: if Cloud_Location provided replace |cloud.tibco.com|
// see https://liveapps.tenant-integration.tcie.pro/webresource/apps/GatherSmart/index.html#/starterApp/splash
export const clURI = cloudConfig.endpoints;
export const mappings = cloudConfig.mappings;

let loginC = null;
// let cloudURL = getProp('Cloud_URL');
// let cloudHost = getProp('cloudHost');

let loginURL = 'https://' + getCurrentRegion() + clURI.login; // cloudURL + getProp('loginURE');
let doOAuthNotify = true;
let isOAUTHValid = false;
let toldClientID = false;

export function cLogin(tenant, customLoginURL, forceClientID) {
    const fClientID = forceClientID || false;
    if (isOauthUsed() && !fClientID) {
        log(DEBUG, 'Using OAUTH for Authentication...');
        // isOAUTHValid = true;
        // Getting the organization info
        // console.log('Get Org: ' , getOrganization());
        // TODO: think of a fix for OAUTH Tokens that just have LA Access (get orgname from a live apps api)
        if (getOrganization() == null || getOrganization().trim() == '') {
            // Setting this to temp so it breaks the call stack
            // setOrganization('TEMP');
            const response = callURL('https://' + getCurrentRegion() + clURI.account_info, null, null, null, false, null, null, null, true);
            log(DEBUG, 'Got Account info: ', response);
            if (response == 'Unauthorized') {
                log(WARNING, 'OAUTH Token Invalid... Falling back to Normal Authentication. Consider rotating your OAUTH Token or generate a new one... ');
                // process.exit();
            }
            if (response.selectedAccount) {
                if (doOAuthNotify) {
                    log(INFO, 'Using OAUTH Authentication, ORGANIZATION: ' + colors.blue(response.selectedAccount.displayName));
                    doOAuthNotify = false;
                }

                setOrganization(response.selectedAccount.displayName);
                isOAUTHValid = true;
            }
        }
    }
    if (!isOauthUsed() || !isOAUTHValid || fClientID) {
        if (!toldClientID) {
            log(INFO, 'Using CLIENT-ID Authentication (consider using OAUTH)...');
            toldClientID = true;
        }
        let setLoginURL = loginURL;
        if (customLoginURL) {
            setLoginURL = customLoginURL;
            // Delete the previous cookie on a custom login
            loginC = null;
        }

        let tentantID = getProp('CloudLogin.tenantID');
        if (tenant) {
            tentantID = tenant;
        }
        //TODO: Set a timer, if login was too long ago login again...
        let pass = getProp('CloudLogin.pass');
        let clientID = getProp('CloudLogin.clientID');
        let email = getProp('CloudLogin.email');
        //
        //TODO: Manage global config in common functions
        if (getGlobalConfig()) {
            const propsG = getGlobalConfig();
            if (pass == 'USE-GLOBAL') pass = propsG.CloudLogin.pass;
            if (tentantID == 'USE-GLOBAL') tentantID = propsG.CloudLogin.tenantID;
            if (clientID == 'USE-GLOBAL') clientID = propsG.CloudLogin.clientID;
            if (email == 'USE-GLOBAL') email = propsG.CloudLogin.email;
        }

        if (pass == '') {
            pass = require('yargs').argv.pass;
            // console.log('Pass from args: ' + pass);
        }
        if (pass.charAt(0) == '#') {
            pass = Buffer.from(pass, 'base64').toString()
        }
        if (loginC == null) {
            loginC = cloudLoginV3(tentantID, clientID, email, pass, setLoginURL);
        }
        if (loginC == 'ERROR') {
            // TODO: exit the task properly
            log(INFO, 'Error Exiting..');
            process.exit(1);
        }
        // console.log("RETURN: " , loginC);
    }
    return loginC;
}


// Function that logs into the cloud and returns a cookie
function cloudLoginV3(tenantID, clientID, email, pass, TCbaseURL) {
    const postForm = 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email + '&Password=' + pass;
    log(DEBUG, 'cloudLoginV3]   URL: ' + TCbaseURL);
    log(DEBUG, 'cloudLoginV3]  POST: ' + 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email);
    //log(DEBUG,'With Form: ' + postForm);
    const syncClient = require('sync-rest-client');
    const response = syncClient.post(encodeURI(TCbaseURL), {
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        payload: postForm
    });
    let re = '';
    //console.log(response.body);
    if (response.body.errorMsg != null) {
        log(ERROR, response.body.errorMsg);
        re = 'ERROR';
    } else {
        if (response.body.orgName) {
            setOrganization(response.body.orgName);
        }
        const loginCookie = response.headers['set-cookie'];
        logO(DEBUG, loginCookie);
        const rxd = /domain=(.*?);/g;
        const rxt = /tsc=(.*?);/g;
        re = {"domain": rxd.exec(loginCookie)[1], "tsc": rxt.exec(loginCookie)[1]};
        logO(DEBUG, re.domain);
        logO(DEBUG, re.tsc);
        logO(DEBUG, re);
        log(INFO, 'Login Successful of ' + email + '(' + tenantID + ')...');
    }
    return re;
}


// Function to call the Tibco Cloud
// TODO: Accept, URL, doLog and possible config
function callURL(url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside, customHeaders) {
    const doErrorOutside = handleErrorOutside || false;
    const fOAUTH = forceOAUTH || false;
    const fCLIENTID = forceCLIENTID || false;
    const reResponse = returnResponse || false;
    let lCookie = {};
    if (!fOAUTH) {
        lCookie = cLogin(tenant, customLoginURL);
    }
    if (fCLIENTID) {
        lCookie = cLogin(tenant, customLoginURL, true);
    }
    const cMethod = method || 'GET';
    let cdoLog = false;
    if (doLog != null) {
        cdoLog = doLog;
    }
    const cType = contentType || 'application/json';
    let body = null;
    if (cMethod.toLowerCase() != 'get') {
        if (cType === 'application/json') {
            body = JSON.stringify(postRequest);
        } else {
            body = postRequest;
        }
    }
    let header = {};
    if(customHeaders) {
        header = customHeaders;
    }
    header["accept"] = 'application/json';
    header["Content-Type"] = cType;
    // Check if we need to provide the OAUTH token
    if ((isOauthUsed() && isOAUTHValid) || fOAUTH) {
        header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
    } else {
        if(header["cookie"]){
            header["cookie"] += "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        } else {
            header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
    }
    if (fCLIENTID) {
        header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        delete header.Authorization;
    }

    if (cdoLog) {
        log(INFO, '--- CALLING SERVICE ---');
        log(INFO, '- URL(' + cMethod + '): ' + url);
        log(DEBUG, '-  METHOD: ' + cMethod);
        log(DEBUG, '- CONTENT: ' + cType);
        log(INFO, '-  HEADER: ', header);
    }
    if (!(cMethod.toLowerCase() == 'get' || cMethod.toLowerCase() == 'del')) {
        if (cdoLog) {
            log(INFO, '-    BODY: ' + body);
        }
    }

    let response = {};
    const syncClient = require('sync-rest-client');
    if (cMethod.toLowerCase() === 'get') {
        response = syncClient[cMethod.toLowerCase()](encodeURI(url), {
            headers: header
        });
    } else {
        response = syncClient[cMethod.toLowerCase()](encodeURI(url), {
            headers: header,
            payload: body
        });
        // console.log('Response: ', response.statusCode);
    }
    // console.log('Response: ', response.body);
    if (response.body) {
        if (response.body.errorMsg != null) {
            if (doErrorOutside) {
                return response.body;
            } else {
                log(ERROR, response.body.errorMsg);
                log(ERROR, response.body);
            }
            return null;
        } else {
            if (reResponse) {
                return response;
            }
            // log(INFO, '-  RESPONSE: ', response.body);
            return response.body;
        }
    } else {
        if (reResponse) {
            return response;
        } else {
            log(ERROR, 'No Body Returned, Status: ', response.statusCode);
        }
    }
}

// Wrapper around the callURL function that takes a config object
export function callTC(url, doLog, conf) {
    if (conf == null) {
        conf = {};
    }
    const urlToCall = 'https://' + getCurrentRegion() + url;
    //url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside
    return callURL(urlToCall, conf.method, conf.postRequest, conf.contentType, doLog, conf.tenant, conf.customLoginURL, conf.returnResponse, conf.forceOAUTH, conf.forceCLIENTID, conf.handleErrorOutside, conf.customHeaders);
}


// Function to show claims for the configured user
export function showCloudInfo(showTable) {
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Show Cloud');
    let doShowTable = true;
    if (showTable != null) {
        doShowTable = showTable;
    }
    const response = callTC(clURI.claims);
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After Show Cloud');
    let nvs = createTableValue('REGION', getRegion());
    nvs = createTableValue('ORGANIZATION', getOrganization(), nvs);
    nvs = createTableValue('FIRST NAME', response.firstName, nvs);
    nvs = createTableValue('LAST NAME', response.lastName, nvs);
    nvs = createTableValue('EMAIL', response.email, nvs);
    if (response.sandboxes) {
        for (let i = 0; i < response.sandboxes.length; i++) {
            nvs = createTableValue('SANDBOX ' + i, response.sandboxes[i].type, nvs);
            nvs = createTableValue('SANDBOX ' + i + ' ID', response.sandboxes[i].id, nvs);
        }
    }
    // TODO: display groups
    if (doShowTable) {
        console.table(nvs);
    }
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Final Show Cloud');
}

// TODO: What to do with passwords and where is this used ?
function checkPW() {
    if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') === '') {
        log(ERROR, 'Please provide your password to login to the tibco cloud in the file tibco-cloud.properties (for property: CloudLogin.pass)');
        process.exit();
    }
}
