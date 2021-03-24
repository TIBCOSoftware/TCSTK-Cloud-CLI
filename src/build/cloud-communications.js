require('./common-functions');
const colors = require('colors');
const cloudConfig = require('../config/config-cloud.json');
// TODO: if Cloud_Location provided replace |cloud.tibco.com|
// see https://liveapps.tenant-integration.tcie.pro/webresource/apps/GatherSmart/index.html#/starterApp/splash
export const clURI = cloudConfig.endpoints;
export const mappings = cloudConfig.mappings;

let loginC = null;
let doOAuthNotify = true;
let isOAUTHValid;
let toldClientID = false;
let isOrgChecked = false;

// An HTTP request based on Axios library
// TODO: Look at managing Axios error handling
// https://stackoverflow.com/questions/43842711/can-i-throw-error-in-axios-post-based-on-response-status
export async function doRequest(url, options, data) {
    const axios = require('axios').default;
    axios.defaults.validateStatus = () => {
        return true;
    };
    // console.log(options);
    if (data) {
        options['data'] = data;
    }
    try {
        const responseAxios = await axios(url, options);
        const response = {};
        response.body = '';
        response.statusCode = responseAxios.status;
        response.headers = responseAxios.headers;
        try {
            response.body = JSON.parse(responseAxios.data);
        } catch (e) {
            response.body = responseAxios.data;
        }
        return response;
    } catch (error) {

        throw error;
    }
}

// We have replaced this manual request by Axios, to handle weird characters
export function doManualRequest(url, options, data) {
    const https = require('https');
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            res.setEncoding('utf8');
            // console.log(res);
            let responseTXT = '';
            let response = {};
            response.body = '';
            response.statusCode = res.statusCode;
            response.headers = res.headers;
            res.on('data', (chunk) => {
                responseTXT += chunk;
            });
            res.on('end', () => {
                try {
                    response.body = JSON.parse(responseTXT);
                } catch (e) {
                    response.body = responseTXT;
                }
                resolve(response);
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        if (data) {
            // console.log('Writing:' , data);
            // req.setEncoding('utf8');
            // req.write(data, 'utf-8');
            req.write(data);
        }
        req.end();
    });
}

// When called this will force a new login (when switching orgs for example)
export function invalidateLogin() {
    loginC = null;
    isOrgChecked = false;
    isOAUTHValid = null;
}

export async function cLogin(tenant, customLoginURL, forceClientID) {
    const fClientID = forceClientID || false;
    if (isOauthUsed() && !fClientID) {
        log(DEBUG, 'Using OAUTH for Authentication...');
        // isOAUTHValid = true;
        // Getting the organization info
        // console.log('Get Org: ' , getOrganization());
        // TODO: think of a fix for OAUTH Tokens that just have LA Access (get orgname from a live apps api)
        // if (getOrganization() == null || getOrganization().trim() == '') {
        if (!isOrgChecked) {
            // Setting this to temp so it breaks the call stack
            // setOrganization('TEMP');
            const response = await callURLA('https://' + getCurrentRegion() + clURI.account_info, null, null, null, false, null, null, null, true, false, true);
            log(DEBUG, 'Got Account info: ', response);
            if (response == 'Unauthorized') {
                log(WARNING, 'OAUTH Token Invalid... Falling back to Normal Authentication. Consider rotating your OAUTH Token or generate a new one... ');
                isOAUTHValid = false;
                if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') == '') {
                    const tempPass = await askQuestion('Provide your password to Continue: ', 'password');
                    // console.log('SETTING PASS');
                    setProperty('CloudLogin.pass', obfuscatePW(tempPass));
                }
            }
            if (response.selectedAccount) {
                if (doOAuthNotify) {
                    log(INFO, 'Using OAUTH Authentication, ORGANIZATION: ' + colors.blue(response.selectedAccount.displayName));
                    doOAuthNotify = false;
                }
                setOrganization(response.selectedAccount.displayName);
                isOAUTHValid = true;
            } else {
                isOAUTHValid = false;
            }
            isOrgChecked = true;
        }
    }
    if (!isOauthUsed() || !isOAUTHValid || fClientID) {
        if (!toldClientID) {
            log(INFO, 'Using CLIENT-ID Authentication (consider using OAUTH)...');
            toldClientID = true;
        }
        if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') == '') {
            const tempPass = await askQuestion('Provide your password to Continue: ', 'password');
            // console.log('SETTING PASS');
            setProperty('CloudLogin.pass', obfuscatePW(tempPass));
        }
        let setLoginURL = 'https://' + getCurrentRegion() + clURI.login;
        if (customLoginURL) {
            setLoginURL = customLoginURL;
            // Delete the previous cookie on a custom login
            loginC = null;
        }
        // For default use BPM
        let tenantID = 'bpm';
        if (tenant) {
            tenantID = tenant;
        }
        //TODO: Set a timer, if login was too long ago login again...
        const clientID = getProp('CloudLogin.clientID');
        const email = getProp('CloudLogin.email');
        let pass = getProp('CloudLogin.pass');
        if (pass == '') {
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

        if (loginC == null) {
            loginC = await cloudLoginV3(tenantID, clientID, email, pass, setLoginURL);
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
async function cloudLoginV3(tenantID, clientID, email, pass, TCbaseURL) {
    const postForm = 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email + '&Password=' + encodeURIComponent(pass);
    log(DEBUG, 'cloudLoginV3]   URL: ' + TCbaseURL);
    log(DEBUG, 'cloudLoginV3]  POST: ' + 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email);
    // log(INFO, 'With Form: ' + postForm);
    const header = {};
    header['Content-Type'] = 'application/x-www-form-urlencoded';
    header['Content-Length'] = postForm.length;
    const response = await doRequest(encodeURI(TCbaseURL), {
        headers: header,
        method: 'POST'
    }, postForm);
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
async function callURLA(url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside, customHeaders) {
    const doErrorOutside = handleErrorOutside || false;
    const fOAUTH = forceOAUTH || false;
    const fCLIENTID = forceCLIENTID || false;
    const reResponse = returnResponse || false;
    let lCookie = {};
    if (!fOAUTH) {
        lCookie = await cLogin(tenant, customLoginURL);
    }
    if (fCLIENTID) {
        lCookie = await cLogin(tenant, customLoginURL, true);
    }
    const cMethod = method || 'GET';
    let cdoLog = false;
    if (doLog != null) {
        cdoLog = doLog;
    }
    const cType = contentType || 'application/json';
    let body = '';
    if (cMethod.toLowerCase() !== 'get') {
        if (cType === 'application/json') {
            body = JSON.stringify(postRequest);
        } else {
            body = postRequest;
        }
    }
    let header = {};
    if (customHeaders) {
        header = customHeaders;
    }
    if (!header["accept"]) {
        header["accept"] = 'application/json';
    }

    header["Content-Type"] = cType;
    // Check if we need to provide the OAUTH token
    if ((isOauthUsed() && isOAUTHValid) || fOAUTH) {
        header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
    } else {
        if (header["cookie"]) {
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
        log(INFO, '- CONTENT: ' + cType);
        log(DEBUG, '-  HEADER: ', header);
    }
    if (!(cMethod.toLowerCase() == 'get' || cMethod.toLowerCase() == 'delete')) {
        if (cdoLog) {
            log(INFO, '-    BODY: ' + body);
        }
    }
    let response = {};
    if (cMethod.toLowerCase() === 'get') {
        response = await doRequest(encodeURI(url), {
            headers: header
        })
    } else {
        if (body != null) {
            header['Content-Length'] = body.length;
        }
        response = await doRequest(encodeURI(url), {
            headers: header,
            method: cMethod.toUpperCase()
        }, body)
    }
    if (response.statusCode != 200 && !doErrorOutside) {
        if (response.body != null) {
            log(ERROR, 'Error Calling URL: ' + url + ' Status: ' + response.statusCode + ' \n Message: ', response.body);
        } else {
            log(ERROR, 'Error Calling URL: ' + url + ' Status: ' + response.statusCode);
        }
        process.exit(1);
    }
    if (response.body != null) {
        if (response.body.errorMsg != null) {
            if (doErrorOutside) {
                return response.body;
            } else {
                log(ERROR, response.body.errorMsg);
                // log(ERROR, response.body);
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
export async function callTCA(url, doLog, conf) {
    if (conf == null) {
        conf = {};
    }
    // Check for another Cloud Location
    if (getProp('CloudLogin.Cloud_Location') != null && getProp('CloudLogin.Cloud_Location') != 'cloud.tibco.com') {
        url = url.replace('cloud.tibco.com', getProp('CloudLogin.Cloud_Location'));
        log(WARNING, 'Using another BASE URL: ', getProp('CloudLogin.Cloud_Location'))
    }
    const urlToCall = 'https://' + getCurrentRegion() + url;
    //url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside
    return await callURLA(urlToCall, conf.method, conf.postRequest, conf.contentType, doLog, conf.tenant, conf.customLoginURL, conf.returnResponse, conf.forceOAUTH, conf.forceCLIENTID, conf.handleErrorOutside, conf.customHeaders);
}

// Function to upload something to the TIBCO Cloud (for example app deployment or upload files)
export async function uploadToCloud(formDataType, localFileLocation, uploadFileURI) {
    return new Promise(async function (resolve, reject) {
        let formData = new require('form-data')();
        const fs = require('fs');
        const {size: fileSize} = fs.statSync(localFileLocation);
        log(INFO, 'UPLOADING FILE: ' + colors.blue(localFileLocation) + ' (to:' + uploadFileURI + ')'  + ' Filesize: ' + readableSize(fileSize));
        formData.append(formDataType, fs.createReadStream(localFileLocation));
        const header = {};
        header['Content-Type'] = 'multipart/form-data; charset=UTF-8';
        // Possibly add OAUTH Header...
        if (isOauthUsed() && await isOAUTHLoginValid()) {
            header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
        } else {
            const lCookie = await cLogin();
            // console.log(lCookie);
            header["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
        let query = require('https').request({
            hostname: getCurrentRegion() + clURI.la_host,   //cloudHost,*/
            path: uploadFileURI,
            method: 'POST',
            headers: header
        }, (res) => {
            let data = '';
            res.on("data", (chunk) => {
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                // console.log(data);
                if (data) {
                    const dataObj = JSON.parse(data);
                    if (dataObj && dataObj.message) {
                        log(INFO, ' UPLOAD RESULT:', colors.green(dataObj.message));
                    } else {
                        log(WARNING, ' UPLOAD RESULT:', data);
                        reject();
                    }
                } else {
                    log(WARNING, ' UPLOAD RESULT:', data);
                    reject();
                }
                resolve();
            })
        });
        query.on("error", (e) => {
            console.error(e);
            resolve();
        });
        formData.pipe(query);
    });
}


// Function to upload something to the TIBCO Cloud (for example app deployment or upload files)
export async function downloadFromCloud(localFileLocation, downloadFileURI) {
    return new Promise(async function (resolve, reject) {
        const downloadURL = 'https://' + getCurrentRegion() + downloadFileURI;
        log(INFO, '     DOWNLOADING: ' + colors.blue(downloadURL));
        log(INFO, '              TO: ' + colors.blue(localFileLocation));
        let headers = {};
        if (isOauthUsed() && await isOAUTHLoginValid()) {
            headers["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
        } else {
            const lCookie = await cLogin();
            // console.log(lCookie);
            headers["cookie"] = "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain;
        }
        const axios = require('axios').default;
        axios.get(downloadURL, {
            responseType: 'arraybuffer',
            headers
        })
            .then(response => {
                try {
                    const fs = require('fs');
                    fs.writeFileSync(localFileLocation, response.data, 'utf8');
                    const {size: fileSize} = fs.statSync(localFileLocation);
                    log(INFO, ' DOWNLOAD RESULT: ' + colors.green('DONE')  + ' Filesize: ' + readableSize(fileSize));
                    resolve()
                } catch (err) {
                    log(INFO, ' DOWNLOAD RESULT: ' + colors.red('ERROR'));
                    log(ERROR, 'Problem Storing the file: ' + err);
                    reject(err);
                }
            })
            .catch(ex => {
                log(ERROR, 'Problem downloading the file: ' + ex);
                reject(ex);
            });
    });
}

function readableSize(sizeBytes) {
    if(sizeBytes < 1024) {
        return sizeBytes + ' Bytes';
    } else {
        const fsKb = Math.round(sizeBytes / 1024 * 100) / 100;
        if(fsKb < 1024) {
            return fsKb + ' KB';
        } else {
            const fsMb = Math.round(fsKb / 1024 * 100) / 100;
            if(fsMb < 1024) {
                return fsMb + ' MB';
            } else {
                if (fsMb < 1024) {
                    const fsGb = Math.round(fsMb / 1024 * 100) / 100;
                    return fsGb + ' GB';
                }
            }
        }

    }



}

// Function to show claims for the configured user
export async function showCloudInfo(showTable, showSandbox) {
    const doShowSandbox = showSandbox || false;
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Show Cloud');
    let doShowTable = true;
    if (showTable != null) {
        doShowTable = showTable;
    }
    const response = await callTCA(clURI.claims);
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After Show Cloud');
    let nvs = createTableValue('REGION', getRegion());
    nvs = createTableValue('ORGANIZATION', getOrganization(), nvs);
    nvs = createTableValue('FIRST NAME', response.firstName, nvs);
    nvs = createTableValue('LAST NAME', response.lastName, nvs);
    nvs = createTableValue('EMAIL', response.email, nvs);
    if (response.sandboxes && doShowSandbox) {
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

export async function isOAUTHLoginValid() {
    if (isOAUTHValid == null) {
        await cLogin();
    }
    return isOAUTHValid;
}
