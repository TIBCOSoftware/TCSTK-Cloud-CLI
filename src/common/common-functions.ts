// This file does not depend on any other files
// All inputs are provided as input to the functions
import {Global} from "../models/base";
import DateTimeFormatOptions = Intl.DateTimeFormatOptions;
import {Mapping, PEXConfig} from "../models/tcli-models";
import {askMultipleChoiceQuestion, askMultipleChoiceQuestionSearch, askQuestion} from "./user-interaction";
import {DEBUG, ERROR, INFO, log, WARNING} from "./logging";
import {
    addOrUpdateProperty, getGLOBALPropertyFileName,
    getProp, getPropFileName, globalTCpropFolder,
    setProperty
} from "./property-file-management";
import {getOAUTHDetails, parseOAUTHToken} from "./oauth";
declare var global: Global;

const _ = require('lodash');

export const col = require('colors');

// Display opening
export function displayOpeningMessage(): void {
    //const pjson = require('./package.json');
    //console.log(process.env.npm_package_version);
    const version = require('../../package.json').version;
    console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|');
    console.log('\x1b[35m%s\x1b[0m', '# |  *** T I B C O    C L O U D   C L I ***   |');
    console.log('\x1b[35m%s\x1b[0m', '# |            V' + version + '                         |');
    console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|');
    console.log('\x1b[35m%s\x1b[0m', '# |For more info see: https://cloud.tibco.com');
}

// function to view the global connection configuration, and display's none if not set
export function displayGlobalConnectionConfig(): boolean {
    // console.log('Global Connection Config: ');
    let re = false;
    log(INFO, 'Global Tibco Cloud Propfile: ' + getGLOBALPropertyFileName());
    //Global Prop file is __dirname (build folder in the global prop)
    // This folder ../../../ --> is the main node modules folder
    //         is: /Users/hpeters@tibco.com/.npm-global/lib
    //             /Users/hpeters@tibco.com/.npm-global/lib/node_modules/@tibco-tcstk/cloud-cli/build
    // Global: 	/node_modules/@tibco-tcstk/global/
    // ../../global/global-tibco-cloud.properties

    // Check if global connection file exists
    if (doesFileExist(getGLOBALPropertyFileName())) {
        re = true;
        //file exists
        const propsG = require('properties-reader')(getGLOBALPropertyFileName()).path();
        let passType = "STORED IN PLAIN TEXT !";
        if (_.get(propsG, 'CloudLogin.pass') === "") {
            passType = "NOT STORED";
        }
        if (_.get(propsG, 'CloudLogin.pass').charAt(0) === '#' || _.get(propsG, 'CloudLogin.pass').startsWith('@#')) {
            passType = "OBFUSCATED";
        }
        log(INFO, 'Global Connection Configuration:');
        const globalConfig = {
            "CLOUD REGION": _.get(propsG, 'CloudLogin.Region'),
            "EMAIL": _.get(propsG, 'CloudLogin.email'),
            "CLIENT ID": _.get(propsG, 'CloudLogin.clientID'),
            "PASSWORD": passType,
            "OAUTH TOKEN NAME": _.get(propsG, 'CloudLogin.OAUTH_Generate_Token_Name')
        };
        console.table(globalConfig);
        if (isGlobalOauthDefined()) {
            log(INFO, 'Global OAUTH Configuration:');
            parseOAUTHToken(_.get(propsG, 'CloudLogin.OAUTH_Token'), true);
        } else {
            log(INFO, 'No Global OAUTH Configuration Set...');
        }
    } else {
        log(INFO, 'No Global Configuration Set...');
    }
    // Returns true if the global file exists and false if it does not exists.
    return re;
}

export function isGlobalOauthDefined(): boolean {
    if (doesFileExist(getGLOBALPropertyFileName())) {
        const propsG = require('properties-reader')(getGLOBALPropertyFileName()).path();
        if (_.get(propsG, 'CloudLogin.OAUTH_Token') === undefined) {
            return false;
        } else {
            return Object.keys(parseOAUTHToken(_.get(propsG, 'CloudLogin.OAUTH_Token'), false)).length !== 0;
        }
    } else {
        return false;
    }
}

// Function to replace string in file
export function replaceInFile(from: string, to: string, filePattern:string):any {
    const patternToUse = filePattern || './**';
    const regex = new RegExp(from, 'g');
    const options = {
        files: patternToUse,
        from: regex,
        to: to,
        countMatches: true
    };
    const replace = require('replace-in-file');
    let results = replace.sync(options);
    for (const result of results) {
        if (result.numReplacements > 0) {
            log(INFO, '\x1b[0m    [FILE] ', result.file);
            log(INFO, '\x1b[0m[REPLACED] [FROM: |\x1b[32m' + from + '\x1b[0m|] [TO: |\x1b[32m' + to + '\x1b[0m|]', '(Number of Replacements: ' + result.numReplacements + ')');
        }
    }
    return results;
}

// function to set the global connection configuration
export async function updateGlobalConnectionConfig() {
    // update the config.
    log(INFO, 'Update Connection Config: ');
    // Create the global common package if it does not exist.
    mkdirIfNotExist(globalTCpropFolder);
    // Check if the global propfile exists, if not create one
    if (!doesFileExist(getGLOBALPropertyFileName())) {
        // Create Global config from template
        copyFile(global.PROJECT_ROOT + 'templates/global-tibco-cloud.properties', getGLOBALPropertyFileName());
    }
    if (!doesFileExist(globalTCpropFolder + 'package.json')) {
        copyFile(global.PROJECT_ROOT + 'templates/package-common.json', globalTCpropFolder + 'package.json');
        log(INFO, 'Inserted package.json...');
    }
    // Get Cloud Environment
    await updateRegion(getGLOBALPropertyFileName());
    // Get the login details

    // Bump up the OAUTH Token
    const OTokenName = getProp('CloudLogin.OAUTH_Generate_Token_Name');
    const tokenNumber = Number(OTokenName.split('_').pop()!.trim());
    if (!isNaN(tokenNumber)) {
        const newTokenNumber = tokenNumber + 1;
        const newTokenName = OTokenName.replace(String(tokenNumber), String(newTokenNumber));
        addOrUpdateProperty(getGLOBALPropertyFileName(), 'CloudLogin.OAUTH_Generate_Token_Name', newTokenName);
        log(INFO, 'Updating Global Token Name: ', newTokenName);
    }
    const defEmail = getProp('CloudLogin.email');
    const defClientID = getProp('CloudLogin.clientID');
    await updateCloudLogin(getGLOBALPropertyFileName(), false, true, defClientID, defEmail);
}


let globalMultipleOptions = {};
// Function to get a property

/*
export function getProp(propName:string, forceRefresh?:boolean, forceGlobalRefresh?:boolean): string {
    log(DEBUG, 'Getting Property: ' + propName, ' Forcing a Refresh: ', forceRefresh, 'Forcing a Global Refresh: ', forceGlobalRefresh);
    if (forceRefresh) {
        propsGl = null;
    }
    if (propsGl == null) {
        if (doesFileExist(LOCALPropertyFileName)) {
            const propLoad = require('properties-reader')(LOCALPropertyFileName);
            propsGl = propLoad.path();
        }
    }
    let re = null;
    if (propsGl != null) {
        try {
            re = _.get(propsGl, propName);
        } catch (e) {
            log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
            process.exit(1);
        }
        log(DEBUG, 'Returning Property: ', re);
        if (re === 'USE-GLOBAL') {
            re = getPropertyFromGlobal(propName, forceGlobalRefresh);
        }
    } else {
        log(DEBUG, 'Local Property file not set yet, trying to get it from global');
        // No local property file, try to get it from global
        re = getPropertyFromGlobal(propName, forceGlobalRefresh);
    }
    if (re && propName === 'CloudLogin.OAUTH_Token') {
        const key = 'Token:';
        if (re.indexOf(key) > 0) {
            const orgOInfo = re;
            re = re.substring(re.indexOf(key) + key.length);
            // Look for other token parts
            if (globalOAUTH == null) {
                globalOAUTH = parseOAUTHToken(orgOInfo, false);
            }
        }
    }
    log(DEBUG, 'Returning Property [END]: ', re);
    return re;
}

function getPropertyFromGlobal(propName: string, forceGlobalRefresh?:boolean) {
    let re = null;
    if (doesFileExist(getGLOBALPropertyFileName())) {
        if (globalProperties == null || forceGlobalRefresh) {
            globalProperties = require('properties-reader')(getGLOBALPropertyFileName()).path();
        }
        try {
            re = _.get(globalProperties, propName);
        } catch (e) {
            log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
            process.exit(1);
        }
        log(DEBUG, 'Got Property From Global: ', re);
    } else {
        log(DEBUG, 'No Global Configuration Set...');
        return false;
    }
    return re;
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


 */

// TODO: Add function to parse ClientID

// Function to get and set the Organization (after login)
let OrganizationGl = '';

export function getOrganization(forceRefresh?: boolean) {
    if (forceRefresh) {
        OrganizationGl = '';
        // setOAUTHDetails(null);
        getProp('CloudLogin.OAUTH_Token', true, true);
    }
    if (OrganizationGl === '' && isOauthUsed()) {
        // if (getOAUTHDetails() != null) {
        // TODO: Run a test case with just the OAUTH Token
        if (!getOAUTHDetails().Org) {
            getProp('CloudLogin.OAUTH_Token', true, true);
            // It could be that there is just the OAUTH token
        }
        if (getOAUTHDetails() != null && getOAUTHDetails().Org) {
            OrganizationGl = getOAUTHDetails().Org!;
        }
    }
    log(DEBUG, 'Returning org: ' + OrganizationGl);
    return OrganizationGl;
}

export function setOrganization(org: string) {
    log(DEBUG, 'Setting org: ' + org);
    OrganizationGl = org;
}

/*

export function setProperty(name: string, value: string) {
    //console.log('BEFORE propsGl: ' , propsGl);
    log(DEBUG, 'Setting Property) Name: ', name, ' Value: ', value);
    if (propsGl == null) {
        propsGl = {};
    }
    set(name, value, propsGl);
    //console.log('AFTER propsGl: ' , propsGl);
}


function set(path: string, value: string, obj: any) {
    let schema = obj;  // a moving reference to internal objects within obj
    const pList = path.split('.');
    const len = pList.length;
    for (let i = 0; i < len - 1; i++) {
        const elem = pList[i]!;
        if (!schema[elem]) schema[elem] = {}
        schema = schema[elem];
    }
    schema[pList[len - 1]!] = value;
}

export function setPropFileName(propFileName: string) {
    LOCALPropertyFileName = propFileName;
    log(DEBUG, 'Using Property File: ' + LOCALPropertyFileName);
}

export function getPropFileName() {
    return LOCALPropertyFileName;
}


 */

export function setMultipleOptions(mOptions: { name?: string; job?: string; environment?: string; }) {
    globalMultipleOptions = mOptions;
    log(DEBUG, 'Using Multiple Options: ', globalMultipleOptions);
}

export function getMultipleOptions() {
    return globalMultipleOptions;
}

// Function to trim string
export function trim(value: string) {
    return value.replace(/^\s*/, "").replace(/\s*$/, "");
}

// Function to create a new multiple prop file
export async function createMultiplePropertyFile() {
    // 'manage-multiple-cloud-starters.properties'
    let mPropFileName = 'manage-multiple-cloud-starters.properties';
    let nameAnsw = await askQuestion('Please specify a name for the Multiple prop file (Use DEFAULT or Enter for: ' + col.blue('manage-multiple-cloud-starters') + ') ?');
    // console.log('nameAnsw: ' + nameAnsw);
    if (nameAnsw != null && nameAnsw !== '' && nameAnsw.toLowerCase() !== 'default') {
        mPropFileName = nameAnsw + '.properties';
    }
    const targetFile = process.cwd() + '/' + mPropFileName;
    let doWrite = true;
    if (doesFileExist(targetFile)) {
        const doOverWrite = await askMultipleChoiceQuestion('The property file: ' + col.yellow(mPropFileName) + ' already exists, do you want to Overwrite it ?', ['YES', 'NO']);
        if (doOverWrite === 'NO') {
            doWrite = false;
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    }
    if (doWrite) {
        log(INFO, 'Creating new multiple property file: ' + mPropFileName);
        copyFile(global.PROJECT_ROOT + 'templates/multiple.properties', targetFile);
        //'\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ' ,'\x1b[31m'
        log(INFO, 'Now configure the multiple property file and then run "' + col.blue('tcli -m') + '" (for default file name) \nor "' + col.blue('tcli -m <propfile name> [-j <job-name> -e <environment-name>]') + '" to execute...');
        log(INFO, 'Or run "' + col.blue('tcli -i') + '" to interact with multiple cloud environments...');
    }
}

// Function to copy a file
export function copyFile(fromFile: string, toFile: string) {
    log(INFO, 'Copying File from: ' + fromFile + ' to: ' + toFile);
    const fs = require('fs');
    fs.copyFileSync(fromFile, toFile);
}

/*


// function to ask a question
export async function askQuestion(question: string, type = 'input') {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Type: ' , type);
        await inquirerF.prompt([{
            type: type,
            name: 'result',
            message: question,
            filter: (val:any) => {
                return val;
            }
        }]).then((answers:any) => {
            logO(DEBUG, answers);
            re = answers.result;
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }
}

// function to ask a question
export async function askMultipleChoiceQuestion(question: string, options: any[]) {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Asking Question: ' , question);
        await inquirerF.prompt([{
            type: 'list',
            name: 'result',
            message: question,
            choices: options,
            filter: (val:any) => {
                return val;
            }
        }]).then((answers:any) => {
            logO(DEBUG, answers);
            re = answers.result;
            //return answers.result;
        }).catch((error: any) => {
            log(ERROR, error);
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }

}

let gOptions: any[] = [];

// Ask a question to a user, and allow the user to search through a possilbe set of options
export async function askMultipleChoiceQuestionSearch(question: string, options: any[]) {
    let re = '';
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        gOptions = options;
        inquirerF.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        await inquirerF.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: question,
            source: searchAnswerF,
            pageSize: 4
        }]).then((answers: { command: string; }) => {
            // console.log('answers: ' , answers);
            logO(DEBUG, answers);
            re = answers.command;
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }
}

//User interaction
export function searchAnswerF(_answers: any, input: string) {
    const fuzzyF = require('fuzzy');
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            const fuzzyResult = fuzzyF.filter(input, gOptions);
            resolve(
                fuzzyResult.map(function (el: { original: any; }) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

let useGlobalAnswers = false;
let globalAnswers: string[] = [];
let givenAnswers: string[] = [];

export function getGivenAnswers(){
    return givenAnswers;
}
export function isGlobalAnswersUsed(){
    return useGlobalAnswers;
}

export function setGlobalAnswers(answers: string) {
    // console.log('Answers: ' , answers);
    if (answers) {
        // Try to split on ':' double colon for the global manage multiple file (comma is reserved there)
        if (answers.indexOf(':') > 0) {
            globalAnswers = answers.split(':');
        } else {
            globalAnswers = answers.split(',');
        }
        if (globalAnswers.length > 0) {
            useGlobalAnswers = true;
            log(INFO, 'Global Answers set: ', globalAnswers)
        }
    }
}

export function getLastGlobalAnswer(question: string) {
    let re = '';
    if (globalAnswers && globalAnswers.length > 0) {
        re = globalAnswers.shift()!;
        log(INFO, 'Injected answer: ', col.blue(re), ' For question: ', question);
    } else {
        log(ERROR, 'No answer left for question: ' + question);
        process.exit(1);
    }
    return re;
} */

// Update the cloud login properties
export async function updateCloudLogin(propFile: string, forceRefresh?: boolean, forceGlobalRefresh?: boolean, defaultClientID?: string, defaultEmail?: string) {
    // Client ID
    let cidQuestion = 'What is your Client ID ?';
    let useCID = '';
    if (defaultClientID != null) {
        useCID = defaultClientID;
        cidQuestion += ' (Press enter to use: ' + useCID + ')';
    }
    log('INFO', 'Get your client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)');
    let cid = await askQuestion(cidQuestion);
    if (useCID !== '' && cid === '') {
        cid = useCID;
    }
    addOrUpdateProperty(propFile, 'CloudLogin.clientID', cid);
    let emailQuestion = 'What is your User Name (Email) ?'
    let useEMAIL = '';
    if (defaultEmail != null) {
        useEMAIL = defaultEmail;
        emailQuestion += ' (Press enter to use: ' + useEMAIL + ')';
    }
    // Username & Password (obfuscate)
    let email = await askQuestion(emailQuestion);
    if (useEMAIL !== '' && email === '') {
        email = useEMAIL;
    }
    addOrUpdateProperty(propFile, 'CloudLogin.email', email);
    // Force a refresh on the tibco-cloud property file
    getRegion(forceRefresh, forceGlobalRefresh);
    const pass = await askQuestion('Provide your password to Generate an OAUTH Token: ', 'password');
    setProperty('CloudLogin.pass', obfuscatePW(pass));
    const OAUTH = require('./oauth');
    const token = await OAUTH.generateOauthToken(null, true, true);
    addOrUpdateProperty(propFile, 'CloudLogin.OAUTH_Token', token);
    log('INFO', 'Your password will be obfuscated locally, but this is not unbreakable.');
    const storePW = await askMultipleChoiceQuestionSearch('Do you want to store your password (as a fallback mechanism) ? ', ['YES', 'NO']);
    if (pass !== '' && storePW === 'YES') {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', obfuscatePW(pass));
    } else {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', '');
    }
}

// Obfuscate a password
export function obfuscatePW(toObfuscate: string) {
    const fus = require('./fuzzy-search.js');
    // return '#' + Buffer.from(toObfuscate).toString('base64');
    return fus.search(toObfuscate);
}

// function to update the tenant
export async function updateRegion(propFile: string) {
    const re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
    if (re === 'US - Oregon') {
        addOrUpdateProperty(propFile, 'CloudLogin.Region', 'US');
    }
    if (re === 'EU - Ireland') {
        addOrUpdateProperty(propFile, 'CloudLogin.Region', 'EU');
    }
    if (re === 'AU - Sydney') {
        addOrUpdateProperty(propFile, 'CloudLogin.Region', 'AU');
    }
}

export function getCurrentRegion(showRegion?: boolean) {
    let displayRegion = false;
    if (showRegion) {
        displayRegion = showRegion;
    }
    let region = getRegion().toLowerCase();
    let re = '';
    if (region.includes('eu')) {
        re = 'eu.';
    }
    if (region.includes('au')) {
        re = 'au.';
    }
    if (displayRegion) {
        switch (re) {
            case '':
                log(INFO, 'Current Region: ' + col.blue('US - Oregon'));
                break;
            case 'eu.':
                log(INFO, 'Current Region: ' + col.blue('EU - Ireland'));
                break;
            case 'au.':
                log(INFO, 'Current Region: ' + col.blue('AU - Sydney'));
                break;
        }
    }
    return re;
}

export function getCurrentAWSRegion() {
    // Oregon
    let re = 'us-west-2';
    switch (getCurrentRegion()) {
        case 'eu.':
            // Ireland
            re = 'eu-west-1';
            break;
        case 'au.':
            // Sydney
            re = 'ap-southeast-2';
            break;
    }
    return re
}

// Translates an AWS region into normal region description.
export function translateAWSRegion(awsRegion: string) {
    switch (awsRegion) {
        case 'us-west-2':
            return 'US - Oregon';
            break;
        case 'eu-west-1':
            return 'EU - Ireland';
            break;
        case 'ap-southeast-2':
            return 'AU - Sydney';
            break;
    }
    return '';
}

// Gets region (in Capitals)
export function getRegion(forceRefresh?: boolean, forceGlobalRefresh?: boolean) {
    const re = getProp('CloudLogin.Region', forceRefresh, forceGlobalRefresh);
    if(re){
        return re.toString().toUpperCase();
    } else {
        log(ERROR, 'Region not specified, please set the CloudLogin.Region property...');
        process.exit(1);
    }
}

export function updateTCLI() {
    log(INFO, 'Updating Cloud CLI) Current Version: ' + require('../../package.json').version);
    run('npm -g install @tibco-tcstk/cloud-cli');
    log(INFO, 'New Cloud CLI Version: ');
    run('tcli -v');
}

export function updateCloudPackages() {
    log(INFO, 'Updating all packages starting with @tibco-tcstk in your package.json');
    // TODO: Investigate if we can install update-by-scope in node_modules of the cli
    run('npm install -g update-by-scope && npx update-by-scope @tibco-tcstk npm install');
    //
    log(INFO, col.blue('Done Updating Cloud Packages...'));
}


export function updateTCLIwrapper() {
    return new Promise<void>(async function (resolve) {
        updateTCLI();
        resolve();
    });
}
/*

// TODO: Implement Check for global (see if the old value is USE-GLOBAL, and then update the global file)
// Function to add or update property to a file, and possibly adds a comment if the property does not exists
export function addOrUpdateProperty(location: string, property: string, value: string | number, comment?: string, checkForGlobal?: boolean) {
    log(DEBUG, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ') Use Global: ', checkForGlobal);
    // Check for global is true by default
    let doCheckForGlobal = true;
    if (checkForGlobal != null) {
        doCheckForGlobal = checkForGlobal
    }
    // If we check for global and if the global file exist, see if we need to update the global file instead.
    if (doCheckForGlobal && location === LOCALPropertyFileName && doesFileExist(getGLOBALPropertyFileName())) {
        // We are updating the local prop file
        const localProps = require('properties-reader')(LOCALPropertyFileName).path();
        if (_.get(localProps, property) === 'USE-GLOBAL') {
            location = getGLOBALPropertyFileName();
            log(INFO, 'Found ' + col.blue('USE-GLOBAL') + ' for property: ' + col.blue(property) + ', so updating the GLOBAL Property file...')
        }
    }
    // Check if file exists
    const fs = require('fs');
    try {
        if (fs.existsSync(location)) {
            //file exists
            log(DEBUG, 'Property file found: ' + location);
            // Check if file contains property
            // const data = fs.readFileSync(location, 'utf8');
            const dataLines = fs.readFileSync(location, 'utf8').split('\n');
            let propFound = false;
            for (let lineNumber in dataLines) {
                if (!dataLines[lineNumber].startsWith('#')) {
                    // console.log('Line: ', dataLines[lineNumber]);
                    const reg = new RegExp(property + '\\s*=\\s*(.*)');
                    const regNl = new RegExp(property + '\\s*=');
                    if (dataLines[lineNumber].search(reg) > -1 || dataLines[lineNumber].search(regNl) > -1) {
                        // We found the property
                        log(DEBUG, `Property found: ${property} We are updating it to: ${value}`);
                        dataLines[lineNumber] = property + '=' + value;
                        propFound = true;
                    }

                }
            }
            let dataForFile = '';
            for (let lineN = 0; lineN < dataLines.length; lineN++) {
                if (lineN !== (dataLines.length - 1)) {
                    dataForFile += dataLines[lineN] + '\n';
                } else {
                    // The last one:
                    dataForFile += dataLines[lineN];
                }
            }
            if (propFound) {
                let doLog = true;
                if (property === 'CloudLogin.clientID') {
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW CLIENT ID]') + ' (in:' + location + ')');
                    doLog = false;
                }
                if (property === 'CloudLogin.OAUTH_Token') {
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow('[NEW OAUTH TOKEN]') + ' (in:' + location + ')');
                    doLog = false;
                }
                if (doLog){
                    log(INFO, 'Updated: ' + col.blue(property) + ' to: ' + col.yellow(value) + ' (in:' + location + ')');
                }
            } else {
                // append prop to the end.
                log(INFO, 'Property NOT found: ' + col.blue(property) + ' We are adding it and set it to: ' + col.yellow(value) + ' (in:' + location + ')');
                if (comment) {
                    dataForFile += '\n# ' + comment;
                }
                dataForFile += '\n' + property + '=' + value + '\n';
            }
            fs.writeFileSync(location, dataForFile, 'utf8');
        } else {
            log(ERROR, 'Property File does not exist: ' + location);
        }
    } catch (err) {
        console.error(err)
    }
}


 */
// Get the global configuration
export function getGlobalConfig() {
    if (doesFileExist(getGLOBALPropertyFileName())) {
        return require('properties-reader')(getGLOBALPropertyFileName()).path();
    } else {
        log(INFO, 'No Global Configuration Set...');
        return false;
    }
}

// Run an OS Command
export function run(command: string, failOnError?: boolean) {
    let doFail = true;
    if (failOnError != null) {
        doFail = failOnError;
    }
    const execSync = require('child_process').execSync;
    // return new Promise(function (resolve, reject) {
    log(DEBUG, 'Executing Command: ' + command);
    try {
        execSync(
            command,
            {stdio: 'inherit'}
        )
    } catch (err) {
        // console.log('Got Error ' , err);
        // logO(DEBUG, reason);
        log(ERROR, 'Error Running command: ' + err.message);
        if (doFail) {
            process.exit(1);
        }
        // reject(err);
    }
    // resolve();
    // })
}

// Function to copy a directory

export function copyDir(fromDir: string, toDir: string) {
    const fse = require('fs-extra');
    log(INFO, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fse.copySync(fromDir, toDir, {overwrite: true});
}

// Function to delete a file but does not fail when the file does not exits
export function deleteFile(file: string) {
    log(INFO, 'Deleting File: ' + file);
    try {
        const fs = require('fs');
        fs.unlinkSync(file);
        //file removed
    } catch (err) {
        log(INFO, 'Could not delete file, maybe file does not exist ?... (' + err.code + ')');
        //console.log(err)
    }
}

// Delete a folder
export function deleteFolder(folder: string) {
    const del = require('del');
    log(INFO, 'Deleting Folder: ' + folder);
    return del([
        folder
    ]);
}

// Create a directory if it does not exists
export function mkdirIfNotExist(dir: string) {
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// Check if a file exists
export function doesFileExist(checkFile: string) {
    const fsCom = require('fs');
    log(DEBUG, "Checking if file exists: " + checkFile);
    try {
        return fsCom.existsSync(checkFile);
    } catch (err) {
        // console.error(err);
        log(ERROR, 'Error on checking if file exists: ', err);
    }
}

// function to deternmine enabled tasks for workspace
/*
export function determineEnabledTasks(cliTaskConfig: { cliTasks: any; }) {
    const cTsks = cliTaskConfig.cliTasks;
    const re = [];
    for (const cliTask in cTsks) {
        console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (const allowedOS of cTsks[cliTask].availableOnOs) {
                console.log('OS:' + allowedOS);
                if (allowedOS === process.platform || allowedOS === 'all') {
                    allowed = true;
                }
            }
        }
        if (cTsks[cliTask].enabled && allowed) {
            re.push(cliTask + ' (' + cTsks[cliTask].description + ')');
        }
    }
    return re;
}*/

export async function isPortAvailable(port: string | number) {
    log(DEBUG, 'Checking Port Availability: ' + port);
    const tcpPortUsed = require('tcp-port-used');
    const pUsed = await tcpPortUsed.check(port, '127.0.0.1');
    return !pUsed;
}


export async function sleep(ms: number) {
    //TODO: Add moving dots..
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function createTable(arrayObject:any[], config: Mapping, doShowTable:boolean):any {
    const tableObject:any = {};
    for (const element in arrayObject) {
        const tableRow:any = {};
        const rowNumber = parseInt(element) + 1;
        // TODO: Change to debug
        //log(INFO, rowNumber + ') APP NAME: ' + response.body[element].name  + ' Published Version: ' +  response.body[element].publishedVersion + ' (Latest:' + response.body[element].publishedVersion + ')') ;
        for (let conf of config.entries) {
            if (conf.format && conf.format.toLowerCase() === 'date') {
                const options:DateTimeFormatOptions = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
                tableRow[conf.header] = new Date(_.get(arrayObject[element], conf.field)).toLocaleDateString("en-US", options);
            } else {
                tableRow[conf.header] = _.get(arrayObject[element], conf.field);
            }
        }
        tableObject[rowNumber] = tableRow;
    }
    //logO(INFO,tableObject);
    if (doShowTable) console.table(tableObject);
    return tableObject;
}

export function iterateTable(tObject:any): any[] {
    const re = [];
    for (const property in tObject) {
        re.push(tObject[property]);
    }
    return re;
}

// Creates a flat table with names and values
export function createTableValue(name:string, value:any, table?:any, headerName?:string, headerValue?:string) {
    let hName = headerName || 'NAME';
    let hValue = headerValue || 'VALUE';
    table = table || [];
    let entry:any = {};
    entry[hName] = name;
    entry[hValue] = value;
    table[table.length] = entry;
    return table;
}

// Print and possibly export Table to CSV
export function pexTable(tObject: any, tName: string, config: PEXConfig, doPrint: boolean) {
    let printT;
    if (doPrint == null) {
        printT = true;
    } else {
        printT = doPrint;
    }
    // console.log(config);
    if (config.export) {
        let doExport = false;
        if (config.tables && config.tables.trim() !== '') {
            if (config.tables.toLowerCase() === 'all') {
                doExport = true;
            } else {
                let tableArr = config.tables.split(',');
                for (let tab of tableArr) {
                    if (tab === tName) {
                        doExport = true;
                    }
                }
            }
        }
        if (doExport) {
            const fs = require('fs');
            const fileName = config.folder + config.filePreFix + tName + '.csv';
            let additionalMessage = '';
            mkdirIfNotExist(config.folder);
            // If file does not exist create headerLine
            const newFile = !doesFileExist(fileName);
            let dataForFile = '';
            let headerForFile = '';
            const now = new Date()
            for (let line of iterateTable(tObject)) {
                // console.log(line);
                // Add organization and Now
                headerForFile = 'ORGANIZATION, EXPORT TIME';
                let lineForFile = getOrganization() + ',' + now;
                for (let [key, value] of Object.entries(line)) {
                    let myValue:any = value;
                    // console.log(`${key}: ${value}`);
                    if(myValue) {
                        if ((key && key.indexOf && key.indexOf(',') > 0) || (myValue && myValue.indexOf && myValue.indexOf(',') > 0)) {
                            log(DEBUG, `Data for CSV file(${fileName}) contains comma(${key}: ${myValue}); we are removing it...`);
                            additionalMessage = col.yellow(' (We have removed some comma\'s from the data...)');
                            if (key.replaceAll) {
                                key = key.replaceAll(',', '');
                            }
                            if (myValue.replaceAll) {
                                myValue = myValue.replaceAll(',', '');
                            }
                        }
                    }
                    if (newFile) {
                        headerForFile += ',' + key;
                    }
                    lineForFile += ',' + value;
                }
                // Add data to file
                dataForFile += lineForFile + '\n';
            }
            if (newFile) {
                dataForFile = headerForFile + '\n' + dataForFile;
                fs.writeFileSync(fileName, dataForFile, 'utf8');
                log(INFO, '--> (New File) Exported table to ' + col.blue(fileName) + additionalMessage);
            } else {
                fs.appendFileSync(fileName, dataForFile, 'utf8');
                log(INFO, '--> (Appended) Exported table data to ' + col.blue(fileName) + additionalMessage);
            }
        }
    }
    if (printT) {
        log(INFO, col.blue('TABLE] ' + tName));
        console.table(tObject);
    }
}

// Provide configuration for exporting table
export function getPEXConfig(): PEXConfig {
    // table-export-to-csv= YES | NO
    let table_export_to_csv = 'NO';
    if (getProp('Table_Export_To_CSV') != null) {
        table_export_to_csv = getProp('Table_Export_To_CSV');
    } else {
        log(INFO, 'No Table_Export_To_CSV property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Table_Export_To_CSV', table_export_to_csv, 'Export tables to CSV files. Possible values YES | NO');
    }
    // table-export-folder= ./table-exports
    let table_export_folder = './table-exports/';
    if (getProp('Table_Export_Folder') != null) {
        table_export_folder = getProp('Table_Export_Folder');
    } else {
        log(INFO, 'No Table_Export_Folder property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Table_Export_Folder', table_export_folder, 'Folder to export the CSV files to.');
    }

    // table-export-file-prefix=table-export-
    let table_export_file_prefix = 'table-export-';
    if (getProp('Table_Export_File_Prefix') != null) {
        table_export_file_prefix = getProp('Table_Export_File_Prefix');
    } else {
        log(INFO, 'No Table_Export_File_Prefix property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Table_Export_File_Prefix', table_export_file_prefix, 'Prefix to use for the export to table CSV files.');
    }
    // table-export-tables=cloud-starters,cloud-starter-links,cloud-starter-details,live-apps,shared-states
    let table_export_tables = 'ALL';
    if (getProp('Table_Export_Tables') != null) {
        table_export_tables = getProp('Table_Export_Tables');
    } else {
        log(INFO, 'No Table_Export_Tables property found; We are adding it to: ' + getPropFileName());
        addOrUpdateProperty(getPropFileName(), 'Table_Export_Tables', table_export_tables, 'Which tables to export, Possible values: ALL (OR any of) cloud-starters,cloud-starter-links,cloud-starter-details,live-apps,shared-states');
    }
    return {
        export: table_export_to_csv.toLowerCase() === 'yes',
        folder: table_export_folder,
        filePreFix: table_export_file_prefix,
        tables: table_export_tables
    };
}

export function isOauthUsed() {
    let re = false;
    if (getProp('CloudLogin.OAUTH_Token', true, true)) {
        if (getProp('CloudLogin.OAUTH_Token', true, true).trim() !== '') {
            re = true
        }
    }
    return re;
}

export function isIterable(obj:any) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

// Get the TIBCO Cloud Starter Development Kit from GIT
export function getGit(source: string, target: string, tag?: string) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    if (tag == null || tag === 'LATEST' || tag === '') {
        run('git clone "' + source + '" "' + target + '" ');
    } else {
        run('git clone "' + source + '" "' + target + '" -b ' + tag);
    }
}

// Function to install NPM packages
export function npmInstall(location: string, packageToUse?: string) {
    return new Promise<void>(function (resolve) {
        if (packageToUse != null) {
            run('cd ' + location + ' && npm install ' + packageToUse);
        } else {
            run('cd ' + location + ' && npm install');
        }
        resolve();
    });
}


// For future versions: if(getProp('Cloud_Properties_Version') != 'V3'){
const DisableMessage = '  --> AUTOMATICALLY DISABLED by Upgrade to TIBCO Cloud Property File V2 (You can remove this...)';
const EnableMessage = '  --> AUTOMATICALLY CREATED by Upgrade to TIBCO Cloud Property File V2 (You can remove this...)';

export function upgradeToV2(isGlobal: boolean, propFile: string) {
    let host = '';
    let curl = '';
    let newORG = 'US';
    let newPW = '';
    let propsTemp;
    let defaultSharedStateFilter = 'APPLICATION'
    if (isGlobal) {
        propsTemp = require('properties-reader')(getGLOBALPropertyFileName()).path();
        host = propsTemp.cloudHost || '';
        curl = propsTemp.Cloud_URL || '';
    } else {
        host = getProp('cloudHost') || '';
        curl = getProp('Cloud_URL') || '';
        // Old Local Props
        propsTemp = require('properties-reader')(getPropFileName()).path();
        if (propsTemp.Shared_State_Scope != null) {
            defaultSharedStateFilter = propsTemp.Shared_State_Scope;
        }
        if (propsTemp.cloudHost === 'USE-GLOBAL' || propsTemp.Cloud_URL === 'USE-GLOBAL') {
            newORG = 'USE-GLOBAL';
        }
    }
    let pass = _.get(propsTemp, 'CloudLogin.pass');
    if (pass && pass !== '' && pass !== 'USE-GLOBAL' && !pass.startsWith('@#')) {
        const fus = require('./fuzzy-search.js');
        if (pass.startsWith('#')) {
            newPW = fus.search(Buffer.from(pass, 'base64').toString());
        } else {
            newPW = fus.search(pass);
        }
    }
    if (host.toLowerCase().includes('eu') && curl.toLowerCase().includes('eu')) {
        newORG = 'EU';
    }
    if (host.toLowerCase().includes('au') && curl.toLowerCase().includes('au')) {
        newORG = 'AU';
    }
    // console.log('newORG: ', newORG, 'host',host, 'curl',curl);
    let initialTokenName = 'MyCLIToken_1'
    log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    if (isGlobal) {
        initialTokenName = 'MyGlobalCLIToken_1'
        log(INFO, col.rainbow('* AUTOMATICALLY Updating GLOBAL property file to V2.*'));
    } else {
        log(INFO, col.rainbow('* AUTOMATICALLY Updating you property file to V2... *'));
    }
    log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    log(INFO, col.rainbow('* * * ') + ' Disabling Properties...');
    const PROPM = require('./property-file-management');
    PROPM.disableProperty(propFile, 'CloudLogin.tenantID', DisableMessage);
    PROPM.disableProperty(propFile, 'cloudHost', DisableMessage);
    PROPM.disableProperty(propFile, 'Cloud_URL', DisableMessage);
    PROPM.disableProperty(propFile, 'loginURE', DisableMessage);
    PROPM.disableProperty(propFile, 'appURE', DisableMessage);
    PROPM.disableProperty(propFile, 'Claims_URE', DisableMessage);
    log(INFO, col.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    log(INFO, col.rainbow('* * * ') + ' Adding new Properties...');
    addOrUpdateProperty(propFile, 'Cloud_Properties_Version', 'V2', EnableMessage + '\n# Property File Version', false);
    addOrUpdateProperty(propFile, 'CloudLogin.Region', newORG, EnableMessage + '\n# Use:\n#  US Cloud (Oregon) - US\n#  EU Cloud (Ireland) - EU\n# AUS Cloud (Sydney) - AU\n# Options: US | EU | AU', false);
    // addOrUpdateProperty(propFile, '# CloudLogin.Cloud_Location', 'cloud.tibco.com', 'Optional, if provided it uses a different cloud URL than cloud.tibco.com', false);
    createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_Token_Name', initialTokenName, 'Name of the OAUTH token to be generated.');
    createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_For_Tenants', 'TSC,BPM', 'Comma separated list of tenants for which the OAUTH Token gets generated. (Options: TSC,BPM,TCDS,TCE,TCI,TCM,SPOTFIRE,TCMD)\n#  TSC: General Cloud Authentication\n#  BPM: LiveApps Authentication\n# TCDS: TIBCO Cloud Data Streams Authentication\n#  TCE: TIBCO Cloud Events Authentication\n#  TCI: TIBCO Cloud Integration Authentication\n#  TCM: TIBCO Cloud Messaging Authentication\n#  SPOTFIRE: TIBCO Cloud Spotfire Authentication\n#  TCMD: TIBCO Cloud Meta Data Authentication\n# NOTE: You need to be part of the specified subscription.');
    createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Generate_Valid_Hours', '336', 'Number of Hours the generated OAUTH token should be valid.');
    createPropINE(isGlobal, propFile, 'CloudLogin.OAUTH_Required_Hours_Valid', '168', 'Number of hours that the OAUTH Token should be valid for (168 hours is 1 week), Checked on Startup and on with the validate-and-rotate-oauth-token task.');
    if (newPW !== '') {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', newPW, '', false);
    }
    if (!isGlobal) {
        // Translate Shared_State_Scope to Shared_State_Filter
        PROPM.disableProperty(propFile, 'Shared_State_Scope', DisableMessage);
        createPropINE(isGlobal, propFile, 'Shared_State_Filter', defaultSharedStateFilter, 'Shared_State_Scope was renamed to Shared_State_Filter\n# Filter for the shared state to manage (all shared states starting with this value will be managed)\n' +
            '#  Use \'\'(empty) or APPLICATION for the current application. Use * for all values, or use a specific value to apply a filter.\n' +
            '#  ( <Filter> | APPLICATION | * )');
        createPropINE(isGlobal, propFile, 'TIBCLI_Location', 'tibcli', 'The location of the TIBCLI Executable (including the executable name, for example: /folder/tibcli)');
        // Force a Refresh (not needed for global)
        getProp('CloudLogin.Region', true, true);
    }
}


// Upgrade Helper: Create Propety If Not Exists
function createPropINE(isGlobal: boolean, propFile: string, propName: string, value: string, comment: string) {
    let doUpdate;
    if (isGlobal) {
        const propsG = require('properties-reader')(getGLOBALPropertyFileName()).path();
        doUpdate = propsG[propName] === undefined;
    } else {
        doUpdate = getProp(propName) === undefined;
    }
    if (doUpdate) {
        addOrUpdateProperty(propFile, propName, value, EnableMessage + '\n# ' + comment, false);
    } else {
        log(INFO, 'Not changed the value of ' + col.green(propName) + '...')
    }
}

if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'BEFORE Check for Global Upgrade');

export function checkGlobalForUpgrade() {
    if (doesFileExist(getGLOBALPropertyFileName())) {
        const propsG = require('properties-reader')(getGLOBALPropertyFileName()).path();
        if (propsG.Cloud_Properties_Version == null) {
            log(WARNING, 'Global file need to be upgraded...');
            upgradeToV2(true, getGLOBALPropertyFileName());
        }
    }
    if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'AFTER Check for Global Upgrade');
}

checkGlobalForUpgrade();
