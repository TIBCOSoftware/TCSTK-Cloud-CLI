// This file does not depend on any other files
// All inputs are provided as input to the functions
const globalTCpropFolder = __dirname + '/../../../common/';
const globalTCpropFile = globalTCpropFolder + 'global-tibco-cloud.properties';
const colors = require('colors');

// Display opening
displayOpeningMessage = function () {
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
displayGlobalConnectionConfig = function () {
    // console.log('Global Connection Config: ');
    let re = false;
    log(INFO, 'Global Tibco Cloud Propfile: ' + globalTCpropFile);
    //Global Prop file is __dirname (build folder in the global prop)
    // This folder ../../../ --> is the main node modules folder
    //         is: /Users/hpeters@tibco.com/.npm-global/lib
    //             /Users/hpeters@tibco.com/.npm-global/lib/node_modules/@tibco-tcstk/cloud-cli/build
    // Global: 	/node_modules/@tibco-tcstk/global/
    // ../../global/global-tibco-cloud.properties

    // Check if global connection file exists
    if (doesFileExist(globalTCpropFile)) {
        re = true;
        //file exists
        const PropertiesReader = require('properties-reader');
        const propsG = PropertiesReader(globalTCpropFile).path();
        let passType = "STORED IN PLAIN TEXT !";
        if (propsG.CloudLogin.pass === "") {
            passType = "NOT STORED";
        }
        // TODO: Add new obfuscation mechanism
        if (propsG.CloudLogin.pass.charAt(0) == '#') {
            passType = "OBFUSCATED";
        }
        log(INFO, 'Global Connection Configuration:');
        const globalConfig = {
            "CLOUD REGION": propsG.CloudLogin.Region,
            "EMAIL": propsG.CloudLogin.email,
            "CLIENT ID": propsG.CloudLogin.clientID,
            "PASSWORD": passType,
            "OAUTH TOKEN NAME" : propsG.CloudLogin.OAUTH_Generate_Token_Name
        };
        console.table(globalConfig);
        if(Object.keys(parseOAUTHToken(propsG.CloudLogin.OAUTH_Token, false)).length === 0){
            log(INFO, 'No Global OAUTH Configuration Set...');
        } else {
            log(INFO, 'Global OAUTH Configuration:');
            parseOAUTHToken(propsG.CloudLogin.OAUTH_Token, true);
        }
    } else {
        log(INFO, 'No Global Configuration Set...');
    }

    // Returns true if the global file exists and false if it does not exists.
    return re;
}

// Function to replace string in file
replaceInFile = function (from, to, filePattern) {
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
    for (result of results) {
        if (result.numReplacements > 0) {
            log(INFO, '\x1b[0m[REPLACED] [FROM: |\x1b[32m' + from + '\x1b[0m|] [TO: |\x1b[32m' + to + '\x1b[0m|]', '(Number of Replacements: ' + result.numReplacements + ')\nFILE: ', result.file);
        }
    }
    return results;
}

// function to set the global connection configuration
updateGlobalConnectionConfig = async function () {
    log(INFO, 'Update Connection Config: ');
    // update the config.
    // Check if the global propfile exists, if not create one
    if (!doesFileExist(globalTCpropFile)) {
        // Create Global config from template
        copyFile(global.PROJECT_ROOT + 'templates/global-tibco-cloud.properties', globalTCpropFile);
    }
    if (!doesFileExist(globalTCpropFolder + 'package.json')) {
        copyFile(global.PROJECT_ROOT + 'templates/package-common.json', globalTCpropFolder + 'package.json');
        log(INFO, 'Inserted package.json...');
    }
    // Get Cloud Environment
    await updateRegion(globalTCpropFile);
    // Get the login details

    // Bump up the OAUTH Token
    const OTokenName = getProp('CloudLogin.OAUTH_Generate_Token_Name');
    const tokenNumber = Number(OTokenName.split('_').pop().trim());
    if (!isNaN(tokenNumber)) {
        const newTokenNumber = tokenNumber + 1;
        const newTokenName = OTokenName.replace(tokenNumber, newTokenNumber);
        addOrUpdateProperty(globalTCpropFile, 'CloudLogin.OAUTH_Generate_Token_Name', newTokenName);
        log(INFO, 'Updating Global Token Name: ' , newTokenName);
    }
    await updateCloudLogin(globalTCpropFile, false, true);
}

// Function to get an indexed object wiht a String
indexObj = function (obj, is, value) {
    if (typeof is == 'string')
        return indexObj(obj, is.split('.'), value);
    else if (is.length == 1 && value !== undefined)
        return obj[is[0]] = value;
    else if (is.length == 0)
        return obj;
    else
        return indexObj(obj[is[0]], is.slice(1), value);
}

const PropertiesReader = require('properties-reader');
let globalProperties;
let propFileNameGl;
let propertiesGl;
let propsGl;
let globalMultipleOptions = {};
// Function to get a property
let globalOAUTH = null;
getOAUTHDetails = function () {
    log(DEBUG, 'Returning globalOAUTH: ', globalOAUTH);
    return globalOAUTH;
}

getProp = function (propName, forceRefresh, forceGlobalRefresh) {
    log(DEBUG, 'Getting Property: ' + propName, ' Forcing a Refresh: ', forceRefresh,  'Forcing a Global Refresh: ', forceGlobalRefresh);
    if(forceRefresh){
        propsGl = null;
    }
    if (propsGl == null) {
        if (doesFileExist(propFileNameGl)) {
            propertiesGl = PropertiesReader(propFileNameGl);
            propsGl = propertiesGl.path();
        }
    }
    let re;
    if (propsGl != null) {
        try {
            re = indexObj(propsGl, propName);
        } catch (e) {
            log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
            process.exit(1);
        }
        log(DEBUG, 'Returning Property: ', re);
        if (re == 'USE-GLOBAL') {
            if (doesFileExist(globalTCpropFile)) {
                if (globalProperties == null || forceGlobalRefresh) {
                    globalProperties = PropertiesReader(globalTCpropFile).path();
                }
                try {
                    re = indexObj(globalProperties, propName);
                } catch (e) {
                    log(ERROR, 'Unable to get Property: ' + propName + ' (error: ' + e.message + ')');
                    process.exit(1);
                }
                log(DEBUG, 'Got Property From Global: ', re);
            } else {
                log(DEBUG, 'No Global Configuration Set...');
                return false;
            }
        }
    } else {
        log(ERROR, 'Property file not set yet...')
    }
    if (re && propName == 'CloudLogin.OAUTH_Token') {
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
    return re;
}

parseOAUTHToken = function (stringToken, doLog) {
    let showLog = doLog || false;
    let re = {};
    log(DEBUG, 'Parsing OAUTH Token: ', stringToken);
    let elements = stringToken.match(/(?<=\[\s*).*?(?=\s*\])/gs);
    if (Symbol.iterator in Object(elements)) {
        for (let el of elements) {
            // let nameValue = el.split(':');
            let nameValue = el.split(/:/);
            let key = nameValue.shift().trim().replace(' ', '_');
            let val = nameValue.join(':').trim();
            if (key && val) {
                log(DEBUG, 'Name: |' + key + '| Value: |' + val + '|');
                if (key == 'Expiry_Date') {
                    //Parse expiry date
                    re[key + '_Display'] = val;
                    re[key] = Date.parse(val);
                } else {
                    re[key] = val;
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

// Function to get and set the Organization (after login)
let OrganizationGl = '';
getOrganization = function (forceRefresh) {
    if(forceRefresh){
        OrganizationGl = '';
    }
    if(OrganizationGl == '' && isOauthUsed()) {
        if (globalOAUTH == null) {
            getProp('CloudLogin.OAUTH_Token')
        }
        if(globalOAUTH.Org) {
            OrganizationGl = globalOAUTH.Org
        }
    }
    log(DEBUG, 'Returning org: ' + OrganizationGl);
    return OrganizationGl;
}
setOrganization = function (org) {
    log(DEBUG, 'Setting org: ' + org);
    OrganizationGl = org;
}

setProperty = function (name, value) {
    //console.log('BEFORE propsGl: ' , propsGl);
    log(DEBUG, 'Setting Property) Name: ', name, ' Value: ', value);
    if(propsGl == null){
        propsGl = {};
    }
    set(name, value, propsGl);
    //console.log('AFTER propsGl: ' , propsGl);
}

function set(path, value, obj) {
    let schema = obj;  // a moving reference to internal objects within obj
    const pList = path.split('.');
    const len = pList.length;
    for (let i = 0; i < len - 1; i++) {
        const elem = pList[i];
        if (!schema[elem]) schema[elem] = {}
        schema = schema[elem];
    }
    schema[pList[len - 1]] = value;
}

setPropFileName = function (propFileName) {
    propFileNameGl = propFileName;
    log(INFO, 'Using Property File: ' + propFileNameGl);
}
getPropFileName = function () {
    return propFileNameGl;
}
setMultipleOptions = function (mOptions) {
    globalMultipleOptions = mOptions;
    log(DEBUG, 'Using Multiple Options: ', globalMultipleOptions);
}
getMultipleOptions = function () {
    return globalMultipleOptions;
}

// Function to trim string
trim = function (value) {
    return value.replace(/^\s*/, "").replace(/\s*$/, "");
}

// Function to create a new multiple prop file
createMultiplePropertyFile = async function () {
    // 'manage-multiple-cloud-starters.properties'
    let mPropFileName = 'manage-multiple-cloud-starters.properties';
    let nameAnsw = await askQuestion('Please specify a name for the Multiple prop file (\x1b[34mDefault: manage-multiple-cloud-starters\033[0m) ?');
    // console.log('nameAnsw: ' + nameAnsw);
    if (nameAnsw != null && nameAnsw != '') {
        mPropFileName = nameAnsw + '.properties';
    }
    const targetFile = process.cwd() + '/' + mPropFileName;
    let doWrite = true;
    if (doesFileExist(targetFile)) {
        const doOverWrite = await askMultipleChoiceQuestion('The property file: \x1b[34m' + mPropFileName + '\033[0m already exists, do you want to Overwrite it ?', ['YES', 'NO']);
        if (doOverWrite == 'NO') {
            doWrite = false;
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    }
    if (doWrite) {
        log(INFO, 'Creating new multiple property file: ' + mPropFileName);
        copyFile(global.PROJECT_ROOT + 'templates/multiple.properties', targetFile);
        //'\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ' ,'\x1b[31m'
        log(INFO, 'Now configure the multiple property file and then run "\x1b[34mtcli -m\033[0m" (for default fileq name) \nor "\x1b[34mtcli -m <propfile name> [-j <job-name> -e <environment-name>]\033[0m" to execute...');
        log(INFO, 'Or run "\x1b[34mtcli -i\033[0m" to interact with multiple cloud environments...');
    }
}

// Function to copy a file
copyFile = function (fromFile, toFile) {
    log(INFO, 'Copying File from: ' + fromFile + ' to: ' + toFile);
    const fs = require('fs');
    fs.copyFileSync(fromFile, toFile);
}


// function to ask a question
askQuestion = async function (question, type = 'input') {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Type: ' , type);
        await inquirerF.prompt([{
            type: type,
            name: 'result',
            message: question,
            filter: function (val) {
                return val;
            }
        }]).then((answers) => {
            logO(DEBUG, answers);
            re = answers.result;
        });
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }
}

// function to ask a question
askMultipleChoiceQuestion = async function (question, options) {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Asking Question: ' , question);
        await inquirerF.prompt([{
            type: 'list',
            name: 'result',
            message: question,
            choices: options,
            filter: function (val) {
                return val;
            }
        }]).then((answers) => {
            logO(DEBUG, answers);
            re = answers.result;
            //return answers.result;
        }).catch(error => {
            log(ERROR, error);
        });
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }

}

let gOptions = [];
// Ask a question to a user, and allow the user to search through a possilbe set of options
askMultipleChoiceQuestionSearch = async function (question, options) {
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
        }]).then((answers) => {
            // console.log('answers: ' , answers);
            logO(DEBUG, answers);
            re = answers.command;
        });
    } else {
        return getLastGlobalAnswer(question);
    }
    return re;
}

//User interaction
const _F = require('lodash');
searchAnswerF = function (answers, input) {
    const fuzzyF = require('fuzzy');
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            const fuzzyResult = fuzzyF.filter(input, gOptions);
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _F.random(30, 60));
    });
}

let useGlobalAnswers = false;
let globalAnswers = [];

setGlobalAnswers = function (answers) {
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

getLastGlobalAnswer = function (question) {
    let re = '';
    if (globalAnswers && globalAnswers.length > 0) {
        re = globalAnswers.shift();
        log(INFO, 'Injected answer: ', colors.blue(re), ' For question: ', question);
    } else {
        log(ERROR, 'No answer left for question: ' + question);
        process.exit(1);
    }
    return re;
}

// Update the cloud login properties
updateCloudLogin = async function (propFile, forceRefresh, forceGlobalRefresh) {
    // Client ID
    log('INFO', 'Get yout client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)');
    const cid = await askQuestion('What is your Client ID ?');
    addOrUpdateProperty(propFile, 'CloudLogin.clientID', cid);
    // Username & Password (obfuscate)
    const email = await askQuestion('What is your User Name (Email) ?');
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
    if (pass != '' && storePW == 'YES') {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', obfuscatePW(pass));
    } else {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', '');
    }
}

// Obfuscate a password
obfuscatePW = function (toObfuscate) {
    // TODO: use stronger obfuscation
    return '#' + Buffer.from(toObfuscate).toString('base64');
}

// function to update the tenant
updateRegion = async function (propFile) {
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

getCurrentRegion = function (showRegion) {
    let displayRegion = false;
    if (showRegion) {
        displayRegion = showRegion;
    }
    // let host = getProp('cloudHost').toLowerCase();
    // let curl = getProp('Cloud_URL').toLowerCase();
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
                log(INFO, 'Current Region: ' + colors.blue('US - Oregon'));
                break;
            case 'eu.':
                log(INFO, 'Current Region: ' + colors.blue('EU - Ireland'));
                break;
            case 'au.':
                log(INFO, 'Current Region: ' + colors.blue('AU - Sydney'));
                break;
        }
    }
    return re;
}

getCurrentAWSRegion = function () {
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

// Gets region (in Capitals)
getRegion = function (forceRefresh, forceGlobalRefresh) {
    return getProp('CloudLogin.Region', forceRefresh, forceGlobalRefresh).toString().toUpperCase();
}

/*
// gets region (in Capitals)
getRegion = function () {
    let re = 'US';
    let myHost = getProp('cloudHost').toString().toUpperCase();
    if (myHost.includes('EU.')) {
        re = 'EU';
    }
    if (myHost.includes('AU.')) {
        re = 'AU';
    }
    return re;
}*/

updateTCLI = function () {
    log(INFO, 'Updating Cloud CLI) Current Version: ' + require('../../package.json').version);
    run('npm -g install @tibco-tcstk/cloud-cli');
    log(INFO, 'New Cloud CLI Version: ');
    run('tcli -v');
}

updateCloudPackages = function () {
    log(INFO, 'Updating all packages starting with @tibco-tcstk in your package.json');
    // TODO: Investigate if we can install update-by-scope in node_modules of the cli
    run('npm install -g update-by-scope && npx update-by-scope @tibco-tcstk npm install');
    //const colors = require('colors');
    log(INFO, colors.blue('Done Updating Cloud Packages...'));
}


updateTCLIwrapper = function () {
    return new Promise(async function (resolve, reject) {
        updateTCLI();
        resolve();
    });
}

// TODO: Move this function to PropFileManagement
// TODO: Implement Check for global (see if the old value is USE-GLOBAL, and then update the global file)
// Function to add or update property to a file, and possibly adds a comment if the property does not exists
addOrUpdateProperty = function (location, property, value, comment, checkForGlobal) {
    log(DEBUG, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ')');
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
            for (let line in dataLines) {
                if(line != (dataLines.length - 1)){
                    dataForFile += dataLines[line] + '\n';
                } else {
                    // The last one:
                    dataForFile += dataLines[line];
                }
            }
            if (propFound) {
                log(INFO, 'Updated: ' + colors.blue(property) + ' to: ' + colors.yellow(value) + ' (in:' + location + ')');
            } else {
                // append prop to the end.
                log(INFO, 'Property NOT found: ' + colors.blue(property) + ' We are adding it and set it to: ' + colors.yellow(value) + ' (in:' + location + ')');
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

// Get the global configuration
// TODO: Get rid of this function
getGlobalConfig = function () {
    if (doesFileExist(globalTCpropFile)) {
        const PropertiesReader = require('properties-reader');
        return PropertiesReader(globalTCpropFile).path();
    } else {
        log(INFO, 'No Global Configuration Set...');
        return false;
    }
}

// Run an OS Command
run = function (command, failOnError) {
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
copyDir = function (fromDir, toDir) {
    const fse = require('fs-extra');
    log(INFO, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fse.copySync(fromDir, toDir, {overwrite: true});
}

// Function to delete a file but does not fail when the file does not exits
deleteFile = function (file) {
    log(INFO, 'Deleting File: ' + file);
    try {
        fs.unlinkSync(file);
        //file removed
    } catch (err) {
        log(INFO, 'Could not delete file, maybe file does not exist ?... (' + err.code + ')');
        //console.log(err)
    }
}

// Delete a folder
deleteFolder = function (folder) {
    const del = require('del');
    log(INFO, 'Deleting Folder: ' + folder);
    return del([
        folder
    ]);
}

// Create a directory if it does not exists
mkdirIfNotExist = function (dir) {
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// Check if a file exists
doesFileExist = function (checkFile) {
    const fsCom = require('fs');
    log(DEBUG, "Checking if file exists: " + checkFile);
    try {
        if (fsCom.existsSync(checkFile)) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        // console.error(err);
        log(ERROR, 'Error on checking if file exists: ', err);
    }
}

// function to deternmine enabled tasks for workspace
determineEnabledTasks = function (cliTaskConfig) {
    const cTsks = cliTaskConfig.cliTasks;
    const re = [];
    for (cliTask in cTsks) {
        console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
        let allowed = false;
        if (cTsks[cliTask].availableOnOs != null) {
            for (allowedOS of cTsks[cliTask].availableOnOs) {
                console.log('OS:' + allowedOS);
                if (allowedOS == process.platform || allowedOS == 'all') {
                    allowed = true;
                }
            }
        }
        if (cTsks[cliTask].enabled && allowed) {
            re.push(cliTask + ' (' + cTsks[cliTask].description + ')');
        }
    }
    return re;
}

isPortAvailable = async function (port) {
    log(DEBUG, 'Checking Port Availability: ' + port);
    const tcpPortUsed = require('tcp-port-used');
    const pUsed = await tcpPortUsed.check(port, '127.0.0.1');
    return !pUsed;
}


sleep = async function (ms) {
    //TODO: Add moving dots..
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

createTable = function (arrayObject, config, doShowTable) {
    const tableObject = {};
    for (const element in arrayObject) {
        const tableRow = {};
        const rowNumber = parseInt(element) + 1;
        // TODO: Change to debug
        //log(INFO, rowNumber + ') APP NAME: ' + response.body[element].name  + ' Published Version: ' +  response.body[element].publishedVersion + ' (Latest:' + response.body[element].publishedVersion + ')') ;
        for (let conf of config.entries) {
            if (conf.format && conf.format.toLowerCase() == 'date') {
                const options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
                tableRow[conf.header] = new Date(_F.get(arrayObject[element], conf.field)).toLocaleDateString("en-US", options);
            } else {
                tableRow[conf.header] = _F.get(arrayObject[element], conf.field);
            }
        }
        tableObject[rowNumber] = tableRow;
    }
    //logO(INFO,tableObject);
    if (doShowTable) console.table(tableObject);
    return tableObject;
}

iterateTable = function (tObject) {
    const re = [];
    for (const property in tObject) {
        re.push(tObject[property]);
    }
    return re;
}

// Creates a flat table with names and values
createTableValue = function (name, value, table, headerName, headerValue) {
    let hName = headerName || 'NAME';
    let hValue = headerValue || 'VALUE';
    table = table || [];
    let entry = {};
    entry[hName] = name;
    entry[hValue] = value;
    table[table.length] = entry;
    return table;
}

// Print and possibly export Table to CSV
pexTable = function (tObject, tName, config, doPrint) {
    if (!config) {
        config = {};
        config.export = false;
    }
    let printT = true;
    if (doPrint == null) {
        printT = true;
    } else {
        printT = doPrint;
    }
    // console.log(config);
    if (config.export) {
        let doExport = false;
        if (config.tables && config.tables.trim() != '') {
            if (config.tables.toLowerCase() == 'all') {
                doExport = true;
            } else {
                let tableArr = config.tables.split(',');
                for (let tab of tableArr) {
                    if (tab == tName) {
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
                    // console.log(`${key}: ${value}`);
                    if ((key && key.indexOf && key.indexOf(',') > 0) || (value && value.indexOf && value.indexOf(',') > 0)) {
                        log(DEBUG, `Data for CSV file(${fileName}) contains comma(${key}: ${value}); we are removing it...`);
                        additionalMessage = colors.yellow(' (We have removed some comma\'s from the data...)');
                        if (key.replaceAll) {
                            key = key.replaceAll(',', '');
                        }
                        if (value.replaceAll) {
                            value = value.replaceAll(',', '');
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
                log(INFO, '--> (New File) Exported table to ' + colors.blue(fileName) + additionalMessage);
            } else {
                fs.appendFileSync(fileName, dataForFile, 'utf8');
                log(INFO, '--> (Appended) Exported table data to ' + colors.blue(fileName) + additionalMessage);
            }
        }
    }
    if (printT) {
        log(INFO, colors.blue('TABLE] ' + tName));
        console.table(tObject);
    }
}

// Provide configuration for exporting table
getPEXConfig = function () {
    const re = {};
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
    re.export = table_export_to_csv.toLowerCase() == 'yes';
    re.folder = table_export_folder;
    re.filePreFix = table_export_file_prefix;
    re.tables = table_export_tables;
    return re;
}

isOauthUsed = function () {
    let re = false;
    if (getProp('CloudLogin.OAUTH_Token') != undefined) {
        if (getProp('CloudLogin.OAUTH_Token').trim() != '') {
            re = true
        }
    }
    return re;
}

isIterable = function (obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

// Get the TIBCO Cloud Starter Development Kit from GIT
getGit = function (source, target, tag) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    if (tag == null || tag === 'LATEST' || tag === '') {
        run('git clone "' + source + '" "' + target + '" ');
    } else {
        run('git clone "' + source + '" "' + target + '" -b ' + tag);
    }
}

// Function to install NPM packages
npmInstall = function (location, packageToUse) {
    return new Promise(function (resolve, reject) {
        if (packageToUse != null) {
            run('cd ' + location + ' && npm install ' + packageToUse);
        } else {
            run('cd ' + location + ' && npm install');
        }
        resolve();
    });
}

// Function to display an MD File in the Console
displayMDFile = function (mdFile) {
    const fs = require('fs');
    console.log(global.PROJECT_ROOT + mdFile);
    const mdFileContent = fs.readFileSync(global.PROJECT_ROOT + mdFile, 'utf8');
    const ECHOMD = require('./../echomd/echomd').echomd;
    console.log(ECHOMD(mdFileContent));
}

//Common log function
global.INFO = 'INFO';
global.WARNING = 'WARNING';
global.DEBUG = 'DEBUG';
global.ERROR = 'ERROR';
//const useDebug = (propsF.Use_Debug == 'true');
let useDebug = false;

setLogDebug = function (debug) {
    // console.log('Setting debug to: ' + debug)
    useDebug = (debug == 'true');
}

// Function moved to TS
log = function (level, ...message) {
    // console.log('LOG: ' ,useDebug , level, message);
    if (!(level == DEBUG && !useDebug)) {
        const timeStamp = new Date();
        // console.log('(' + timeStamp + ')[' + level + ']  ' + message);
        if (level == global.ERROR) {
            console.log('\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ')', '\x1b[31m', ...message, '\033[0m');
            process.exitCode = 1;
        } else {
            if (level == global.WARNING) {
                console.log(colors.yellow('TIBCO CLOUD CLI] (' + level + ') ', ...message));
            } else {
                console.log('\x1b[35m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ', ...message, '\033[0m');
            }
        }
    }
}


logO = function (level, message) {
    if (!(level == DEBUG && !useDebug)) {
        console.log(message);
    }
}

//Function to log on one line...
logLine = function (message) {
    const readline = require('readline');
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(message);
}



// For future versions: if(getProp('Cloud_Properties_Version') != 'V3'){
const DisableMessage = '  --> AUTOMATICALLY DISABLED by Upgrade to TIBCO Property File V2 (You can remove this...)';
const EnableMessage = '  --> AUTOMATICALLY CREATED by Upgrade to TIBCO Property File V2';

upgradeToV2 = function(isGlobal, propFile){
    let host = '';
    let curl = '';
    if(isGlobal){
        const propsG = PropertiesReader(globalTCpropFile).path();
        host = propsG.cloudHost || '';
        curl = propsG.Cloud_URL || '';
    } else {
        host = getProp('cloudHost') || '';
        curl = getProp('Cloud_URL') || '';
    }
    let newORG = 'US';
    if (host.toLowerCase().includes('eu') && curl.toLowerCase().includes('eu')) {
        newORG = 'EU';
    }
    if (host.toLowerCase().includes('au') && curl.toLowerCase().includes('au')) {
        newORG = 'AU';
    }
    log(INFO, colors.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    if(isGlobal){
        log(INFO, colors.rainbow('* AUTOMATICALLY Updating GLOBAL property file to V2.*'));
    } else {
        log(INFO, colors.rainbow('* AUTOMATICALLY Updating you property file to V2... *'));
    }
    log(INFO, colors.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    log(INFO, colors.rainbow('* * * ') + ' Disabling Properties...');
    const PROPM = require('./property-file-management');
    PROPM.disableProperty(propFile, 'CloudLogin.tenantID', DisableMessage);
    PROPM.disableProperty(propFile, 'cloudHost', DisableMessage);
    PROPM.disableProperty(propFile, 'Cloud_URL', DisableMessage);
    PROPM.disableProperty(propFile, 'loginURE', DisableMessage);
    PROPM.disableProperty(propFile, 'appURE', DisableMessage);
    PROPM.disableProperty(propFile, 'Claims_URE', DisableMessage);
    log(INFO, colors.rainbow('* * * * * * * * * * * * * * * * * * * * * * * * * * *'));
    log(INFO, colors.rainbow('* * * ') + ' Adding new Properties...');
    addOrUpdateProperty(propFile, 'Cloud_Properties_Version', 'V2', EnableMessage + '\n# Property File Version');
    addOrUpdateProperty(propFile, 'CloudLogin.Region', newORG, EnableMessage + '\n# Use:\n#  US Cloud (Orgeon) - US\n#  EU Cloud (Orgeon) - EU\n# AUS Cloud (Orgeon) - AU\n# Options: US | EU | AU');
    addOrUpdateProperty(propFile, '# CloudLogin.Cloud_Location', 'cloud.tibco.com', 'Optional, if provided it uses a different cloud URL than cloud.tibco.com');
    createPropINE(propFile,'CloudLogin.OAUTH_Generate_Token_Name','MyCLIToken_1' , 'Name of the OAUTH token to be generated.');
    createPropINE(propFile,'CloudLogin.OAUTH_Generate_For_Tenants','TSC,BPM' , 'Comma separated list of tenants for which the OAUTH Token gets generated. (Options: TSC,BPM,TCDS,TCE,TCI,TCM,SPOTFIRE,TCMD)\n#  TSC: General Cloud Authentication\n#  BPM: LiveApps Authentication\n# TCDS: TIBCO Cloud Data Streams Authentication\n#  TCE: TIBCO Cloud Events Authentication\n#  TCI: TIBCO Cloud Integration Authentication\n#  TCM: TIBCO Cloud Messaging Authentication\n#  SPOTFIRE: TIBCO Cloud Spotfire Authentication\n#  TCMD: TIBCO Cloud Meta Data Authentication\n# NOTE: You need to be part of the specified subscription.');
    createPropINE(propFile,'CloudLogin.OAUTH_Generate_Valid_Hours','336', 'Number of Hours the generated OAUTH token should be valid.');
    createPropINE(propFile,'CloudLogin.OAUTH_Required_Hours_Valid','168', 'Number of hours that the OAUTH Token should be valid for (168 hours is 1 week), Checked on Startup and on with the validate-and-rotate-oauth-token task.');
    if(!isGlobal) {
        createPropINE(propFile, 'TIBCLI_Location', 'tibcli', 'The location of the TIBCLI Executable (including the executable name, for example: /folder/tibcli)');
    }
    // Force a Refresh
    getProp('CloudLogin.Region',true, true);

    // --> TODO: Update Password if needed to new obfuscation method.
}


// Upgrade Helper: Create Propety If Not Exists
function createPropINE (propFile, propName, value ,comment) {
    if(getProp(propName) == undefined){
        addOrUpdateProperty(propFile, propName, value, EnableMessage + '\n# ' + comment);
    } else {
        log(INFO, 'Not changed the value of ' + colors.green(propName) + '...')
    }
}


checkGlobalForUpgrade = function() {
    if (doesFileExist(globalTCpropFile)) {
        const PropertiesReader = require('properties-reader');
        const propsG = PropertiesReader(globalTCpropFile).path();
        if(propsG.Cloud_Properties_Version == null) {
            log(WARNING, 'Global file need to be upgraded...');
            upgradeToV2(true, globalTCpropFile);
        }
    }
}
checkGlobalForUpgrade();
