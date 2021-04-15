import {
    col,
    createTable,
    createTableValue, getCurrentRegion,
    getOrganization, getRegion,
    iterateTable
} from "./common-functions";
import {askMultipleChoiceQuestion} from "./user-interaction";
import {DEBUG, ERROR, INFO, log, WARNING} from "./logging";
import {OAUTHConfig} from "../models/tcli-models";
import {addOrUpdateProperty, getProp, getPropFileName} from "./property-file-management";

const CCOM = require('./cloud-communications');

let globalOAUTH:OAUTHConfig = null;

export function getOAUTHDetails() {
    log(DEBUG, 'Returning globalOAUTH: ', globalOAUTH);
    return globalOAUTH;
}

export function setOAUTHDetails(oConfig:OAUTHConfig) {
    log(DEBUG, 'Setting globalOAUTH: ', oConfig);
    globalOAUTH = oConfig;
}


export function parseOAUTHToken(token:string, doLog: boolean):OAUTHConfig {
    let showLog = doLog || false;
    let re:OAUTHConfig = {};
    log(DEBUG, 'Parsing OAUTH Token: ', token);
    let elements = token.match(/(?<=\[\s*).*?(?=\s*\])/gs);
    if (Symbol.iterator in Object(elements)) {
        if(elements) {
            for (let el of elements) {
                // let nameValue = el.split(':');
                let nameValue = el.split(/:/);
                if(nameValue && nameValue.length > 1) {
                    let key = nameValue.shift()!.trim().replace(' ', '_');
                    let val = nameValue.join(':').trim();
                    if (key && val) {
                        log(DEBUG, 'Name: |' + key + '| Value: |' + val + '|');
                        if (key === 'Expiry_Date') {
                            //Parse expiry date
                            re[key + '_Display'] = val;
                            re[key] = Date.parse(val);
                        } else {
                            re[key] = val;
                        }
                    }
                }
            }
        }
        if (showLog) {
            log(INFO, 'OAUTH Details:');
            console.table(re);
        }
    }
    return re;
}





// Function to display current configured OAUTH Settings...
export function displayCurrentOauthDetails() {
    if (getOAUTHDetails() == null) {
        getProp('CloudLogin.OAUTH_Token');
    }
    console.table(getOAUTHDetails());
}

// Function to display all OAUTH Tokens...
export async function showOauthToken() {
    log(INFO, 'Displaying OAUTH Tokens...');
    const response = await CCOM.callTCA(CCOM.clURI.get_oauth, false, {
        tenant: 'TSC',
        customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
    });
    // console.log(response);
    for (let rep in response) {
        if (response[rep]['lastAccessed']) {
            // response[rep]['used'] = 'IN USE';
            response[rep]['lastAccessed'] = response[rep]['lastAccessed'] * 1000;
        } else {
            response[rep]['lastAccessed'] = 'NEVER USED';
            // response[rep]['used'] = 'NEVER USED';
        }
        // Times need to be multiplied by 1000 (probalby UNIX Time)
        response[rep]['generatedTime'] = response[rep]['generatedTime'] * 1000;
        response[rep]['expirationTime'] = response[rep]['expirationTime'] * 1000;
    }
    const tObject = createTable(response, CCOM.mappings.oauth, true);
    log(DEBUG, 'OAUTH Object: ', tObject);
    return tObject;
}

// Function to revoke an OAUTH Token
export async function revokeOauthToken(tokenName: string) {
    if (!tokenName) {
        //No token name provided so choose on from list
        const possibleTokensArrObj = await showOauthToken();
        let possibleTokens = ['NO TOKEN'];
        for (let tok of iterateTable(possibleTokensArrObj)) {
            possibleTokens = possibleTokens.filter(f => f !== tok.Name).concat([tok.Name])
        }
        // console.log(possibleTokens);
        tokenName = await askMultipleChoiceQuestion('Which token would you like to revoke ?', possibleTokens);
    }
    if (tokenName !== 'NO TOKEN') {
        log(INFO, 'Revoking OAUTH Token:  ' + tokenName);
        const postRequest = 'name=' + tokenName;
        const response = await CCOM.callTCA(CCOM.clURI.revoke_oauth, false, {
            method: 'POST',
            postRequest: postRequest,
            contentType: 'application/x-www-form-urlencoded',
            tenant: 'TSC',
            customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
        });
        log(INFO, 'Result: ', col.blue(response.message));
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to rotate an OAUTH Token
export async function rotateOauthToken() {
    if (getProp('CloudLogin.OAUTH_Generate_Token_Name') != null) {
        const tokenName = getProp('CloudLogin.OAUTH_Generate_Token_Name');
        let tokenNumber = 0;
        try {
            tokenNumber = Number(tokenName.split('_').pop()!.trim());
        } catch (e) {
            log(ERROR, 'For token rotation use this pattern: <TOKEN NAME>_<TOKEN NUMBER> (For example: MyToken_1) token name: ' + col.yellow(tokenName));
        }
        let newTokenNumber = 0;
        let newTokenName = '';
        let doRotate = false;
        //console.log('Token Number: |' + tokenNumber + '|');
        newTokenNumber = tokenNumber + 1;
        newTokenName = tokenName.replace(String(tokenNumber), String(newTokenNumber));
        doRotate = true;
        //console.log('New Token Number: ' , newTokenNumber);
        // console.log('New Token Name: ' , newTokenName);
        if (doRotate) {
            log(INFO, 'Rotating OAUTH Token:  ' + tokenName);
            log(INFO, '     New OAUTH Token:  ' + newTokenName);
            // Generate new Token
            await generateOauthToken(newTokenName, true);
            // Update token name
            addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Generate_Token_Name', newTokenName);
            // Revoke old token
            await revokeOauthToken(tokenName);
            log(INFO, 'Successfully Rotated Token: ' + tokenName + ' --> ' + newTokenName);

        }
    } else {
        log(ERROR, 'No CloudLogin.OAUTH_Generate_Token_Name Property found (Perhaps you want to run generate-oauth-token first...)')
    }
}

// Function that validates and rotates the OAUTH token if needed
export async function validateAndRotateOauthToken(isInteractive?: boolean) {
    let doInteraction = true;
    if (isInteractive != null) {
        doInteraction = isInteractive;
    }
    log(INFO, 'Validating and Rotating OAUTH Token...');
    // Ask for prop to force the parsing
    getProp('CloudLogin.OAUTH_Token');
    let oauth_required_hours_valid = 168;
    if (getProp('CloudLogin.OAUTH_Required_Hours_Valid') != null) {
        oauth_required_hours_valid = Number(getProp('CloudLogin.OAUTH_Required_Hours_Valid'));
    } else {
        log(INFO, 'No CloudLogin.OAUTH_Required_Hours_Valid property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Required_Hours_Valid', oauth_required_hours_valid, 'Number of hours that the OAUTH Token should be valid for (168 hours is 1 week), Checked on Startup and on with the validate-and-rotate-oauth-token task.');
    }
    const oDetails = getOAUTHDetails();
    if (oDetails && oDetails['Expiry_Date']) {
        const now = new Date();
        // See if Expiry date is more than 24 hours, if not ask to rotate.
        if (oDetails['Expiry_Date'] < (now.getTime() + oauth_required_hours_valid * 3600 * 1000)) {
            log(WARNING, 'Your OAUTH key is expired or about to expire within ' + oauth_required_hours_valid + ' hours.');
            let decision = 'YES';
            if (doInteraction) {
                decision = await askMultipleChoiceQuestion('Would you like to rotate your OAUTH key ?', ['YES', 'NO']);
            }
            if (decision === 'YES') {
                await rotateOauthToken();
            } else {
                log(INFO, 'Ok I won\'t do anything...');
            }
        } else {
            log(INFO, 'OAUTH Key(' + oDetails['Token_Name'] + ') is valid for more than ' + oauth_required_hours_valid + ' hours :-)...');
        }
    } else {
        log(WARNING, 'No OAUTH (expiry) Details Found...');
    }
}

// Function to generate an OAUTH Token
export async function generateOauthToken(tokenNameOverride: string, verbose: boolean, returnProp?: boolean) {
    log(INFO, 'Generating OAUTH Token...');
    // const generateOauthUrl = 'https://' + getCurrentRegion() + CCOM.clURI.generate_oauth
    let skipCall = false;
    // Check for Token name
    let OauthTokenName = 'MyCLIToken_1';
    if (getProp('CloudLogin.OAUTH_Generate_Token_Name') != null) {
        OauthTokenName = getProp('CloudLogin.OAUTH_Generate_Token_Name');
    } else {
        log(INFO, 'No OAUTH_Generate_Token_Name found; This is needed to specify the name of your OAUTH Token.');
        let decision = await askMultipleChoiceQuestion('Would you like to add this to ' + getPropFileName() + ' ?', ['YES', 'NO']);
        if (decision === 'YES') {
            addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Generate_Token_Name', 'MyCLIToken_1', 'Name of the OAUTH token to be generated.');
        } else {
            skipCall = true;
        }
    }
    // Override name in case of rotation
    if (tokenNameOverride) {
        OauthTokenName = tokenNameOverride;
    }
    // Check for Tenants
    let OauthTenants = 'TSC+BPM';
    //TODO: Add the following subs: TSC BPM SPOTFIRE TCE TCI TCM TCMD TCTA
    if (getProp('CloudLogin.OAUTH_Generate_For_Tenants') != null) {
        OauthTenants = getProp('CloudLogin.OAUTH_Generate_For_Tenants').replace(/,/g, "+");
    } else {
        log(INFO, 'No OAUTH_Generate_For_Tenants Property found; This is needed to specify for which tenants you would like to generate an OAUTH Token');
        let decision = await askMultipleChoiceQuestion('Would you like to add this to ' + getPropFileName() + ' ?', ['YES', 'NO']);
        if (decision === 'YES') {
            addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Generate_For_Tenants', 'TSC,BPM', 'Comma separated list of tenants for which the OAUTH Token gets generated. (Options: TSC,BPM,TCDS,TCE,TCI,TCM,SPOTFIRE,TCMD)\n#  TSC: General Cloud Authentication\n#  BPM: LiveApps Authentication\n# TCDS: TIBCO Cloud Data Streams Authentication\n#  TCE: TIBCO Cloud Events Authentication\n#  TCI: TIBCO Cloud Integration Authentication\n#  TCM: TIBCO Cloud Messaging Authentication\n#  SPOTFIRE: TIBCO Cloud Spotfire Authentication\n#  TCMD: TIBCO Cloud Meta Data Authentication\n# NOTE: You need to be part of the specified subscription.');
        } else {
            skipCall = true;
        }
    }
    // Check for valid hours (336 by default; 2 weeks)
    let OauthHours = 336;
    if (getProp('CloudLogin.OAUTH_Generate_Valid_Hours') != null) {
        OauthHours = Number(getProp('CloudLogin.OAUTH_Generate_Valid_Hours'));
    } else {
        log(INFO, 'No OAuthKey_Generate_Valid_Hours found; This is needed to specify how log the OAUTH Token is valid for');
        let decision = await askMultipleChoiceQuestion('Would you like to add this to ' + getPropFileName() + ' ?', ['YES', 'NO']);
        if (decision === 'YES') {
            addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Generate_Valid_Hours', '336', 'Number of Hours the generated OAUTH token should be valid.');
        } else {
            skipCall = true;
        }
    }
    let OauthSeconds = OauthHours * 3600;
    const postRequest = 'maximum_validity=' + OauthSeconds + '&name=' + OauthTokenName + '&scope=' + OauthTenants;
    if (!skipCall) {
        // console.log('URL: ', generateOauthUrl, '\nPOST: ', postRequest)
        // A bit of a hack to do this call before re-authorizing... (TODO: put call in update token again)
        const responseClaims = await CCOM.callTCA(CCOM.clURI.claims);
        const response = await CCOM.callTCA(CCOM.clURI.generate_oauth, false, {
            method: 'POST',
            postRequest: postRequest,
            contentType: 'application/x-www-form-urlencoded',
            tenant: 'TSC',
            customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
        });
        if (response) {
            if (response.error) {
                log(ERROR, response.error_description);
            } else {
                // Display Table
                let nvs = createTableValue('OAUTH TOKEN NAME', OauthTokenName);
                nvs = createTableValue('NEW OAUTH TOKEN', response.access_token, nvs);
                nvs = createTableValue('VALID TENANTS', response.scope, nvs);
                nvs = createTableValue('TYPE', response.token_type, nvs);
                nvs = createTableValue('EXPIRY (SECONDS)', response.expires_in, nvs);
                nvs = createTableValue('EXPIRY (HOURS)', ((response.expires_in) / 3600), nvs);
                nvs = createTableValue('EXPIRY (DAYS)', (((response.expires_in) / 3600) / 24), nvs);
                console.table(nvs);
                // Ask to update
                let decision;
                if (verbose) {
                    decision = 'YES';
                } else {
                    decision = await askMultipleChoiceQuestion('Do you want to update ' + getPropFileName() + ' with the new token ?', ['YES', 'NO']);
                }
                if (decision === 'YES') {
                    //console.log('Response: ', response);
                    const expiryDate = new Date((new Date()).getTime() + (response.expires_in * 1000));
                    // ADD Get Claims Call here...
                    // console.log(responseClaims);
                    const tokenToInject = '[Token Name: ' + OauthTokenName + '][Region: ' + getRegion() + '][User: ' + responseClaims.email + '][Org: ' + getOrganization() + '][Scope: ' + response.scope + '][Expiry Date: ' + expiryDate + ']Token:' + response.access_token;
                    // console.log(tokenToInject);
                    if (returnProp) {
                        return tokenToInject;
                    } else {
                        addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Token', tokenToInject);
                    }
                }
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
    return;
}
