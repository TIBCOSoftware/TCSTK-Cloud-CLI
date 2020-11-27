// This file does not depend on any other files
// All inputs are provided as input to the functions
const globalTCpropFolder = __dirname + '/../../../common/';
const globalTCpropFile = globalTCpropFolder + 'global-tibco-cloud.properties';
const colors = require('colors');

// Display opening
displayOpeningMessage = function () {
    //var pjson = require('./package.json');
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
    var re = false;
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
        var passType = "STORED IN PLAIN TEXT !";
        if (propsG.CloudLogin.pass === "") {
            passType = "NOT STORED";
        }
        if (propsG.CloudLogin.pass.charAt(0) == '#') {
            passType = "OBFUSCATED";
        }
        log(INFO, 'Global Connection Configuration:');
        var globalConfig = {
            "CLOUD HOST": propsG.cloudHost,
            "EMAIL": propsG.CloudLogin.email,
            "CLIENT ID": propsG.CloudLogin.clientID,
            "PASSWORD TYPE": passType
        };

        console.table(globalConfig);
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
        copyFile(__dirname + '/../templates/global-tibco-cloud.properties', globalTCpropFile);
    }
    if (!doesFileExist(globalTCpropFolder + 'package.json')) {
        copyFile(__dirname + '/../templates/package-common.json', globalTCpropFolder + 'package.json');
        log(INFO, 'Inserted package.json...');
    }
    // Get Cloud Environment
    await updateRegion(globalTCpropFile);
    // Get the login details
    await updateCloudLogin(globalTCpropFile);

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

getProp = function (propName) {
    log(DEBUG, 'Getting Property: ' + propName);
    if (propsGl == null) {
        propertiesGl = PropertiesReader(propFileNameGl);
        propsGl = propertiesGl.path();
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
                if (globalProperties == null) {
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
getOrganization = function () {
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
    set(name, value, propsGl);
    //console.log('AFTER propsGl: ' , propsGl);
}

function set(path, value, obj) {
    var schema = obj;  // a moving reference to internal objects within obj
    var pList = path.split('.');
    var len = pList.length;
    for (var i = 0; i < len - 1; i++) {
        var elem = pList[i];
        if (!schema[elem]) schema[elem] = {}
        schema = schema[elem];
    }
    schema[pList[len - 1]] = value;
}

setPropFileName = function (propFileName) {
    propFileNameGl = propFileName;
    log(DEBUG, 'Using Property File: ' + propFileNameGl);
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
        copyFile(__dirname + '/../templates/multiple.properties', targetFile);
        //'\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ' ,'\x1b[31m'
        log(INFO, 'Now configure the multiple property file and then run "\x1b[34mtcli -m\033[0m" (for default fileq name) \nor "\x1b[34mtcli -m <propfile name> [-j <job-name> -e <environment-name>]\033[0m" to execute...');
        log(INFO, 'Or run "\x1b[34mtcli -i\033[0m" to interact with multiple cloud environments...');
    }
}

// Function to copy a file
copyFile = function (fromFile, toFile) {
    log(INFO, 'Copying File from: ' + fromFile + ' to: ' + toFile);
    const fs = require('file-system');
    fs.copyFileSync(fromFile, toFile);
}


// function to ask a question
askQuestion = async function (question, type = 'input') {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        var re = 'result';
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
        //let name = require.resolve('inquirer');
        //delete require.cache[name];
        //console.log(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }

}

var gOptions = [];
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
            pageSize: 4/*,
            validate: function (val) {
                return val ? true : 'Type something!';
            }*/
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
            var fuzzyResult = fuzzyF.filter(input, gOptions);
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
updateCloudLogin = async function (propFile) {
    // Client ID
    log('INFO', 'Get yout client ID from https://cloud.tibco.com/ --> Settings --> Advanced Settings --> Display Client ID (See Tutorial)');
    // TODO: did not get question for  client ID... ???
    console.log('CLIENT ID');
    var cid = await askQuestion('What is your Client ID ?');
    addOrUpdateProperty(propFile, 'CloudLogin.clientID', cid);
    // Username & Password (obfuscate)
    var email = await askQuestion('What is your User Name (Email) ?');
    addOrUpdateProperty(propFile, 'CloudLogin.email', email);
    log('INFO', 'Your password will be obfuscated, but is not unbreakable (press enter to skip and enter manually later)');
    var pass = await askQuestion('What is your Password ?', 'password');
    if (pass != '') {
        addOrUpdateProperty(propFile, 'CloudLogin.pass', obfuscatePW(pass));
    }
}

// Obfuscate a password
obfuscatePW = function (toObfuscate) {
    // TODO: use stronger obfuscation
    return '#' + Buffer.from(toObfuscate).toString('base64');
}


// function to update the tenant
updateRegion = async function (propFile) {
    let re = await askMultipleChoiceQuestionSearch('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
    switch (re) {
        case 'US - Oregon':
            addOrUpdateProperty(propFile, 'cloudHost', 'liveapps.cloud.tibco.com');
            addOrUpdateProperty(propFile, 'Cloud_URL', 'https://liveapps.cloud.tibco.com/');
            break;
        case 'EU - Ireland':
            addOrUpdateProperty(propFile, 'cloudHost', 'eu.liveapps.cloud.tibco.com');
            addOrUpdateProperty(propFile, 'Cloud_URL', 'https://eu.liveapps.cloud.tibco.com/');
            break;
        case 'AU - Sydney':
            addOrUpdateProperty(propFile, 'cloudHost', 'au.liveapps.cloud.tibco.com');
            addOrUpdateProperty(propFile, 'Cloud_URL', 'https://au.liveapps.cloud.tibco.com/');
            break;
    }
}

getCurrentRegion = function (showRegion) {
    let displayRegion = false;
    if (showRegion) {
        displayRegion = showRegion;
    }
    let host = getProp('cloudHost').toLowerCase();
    let curl = getProp('Cloud_URL').toLowerCase();
    let re = '';
    if (host.includes('eu') && curl.includes('eu')) {
        re = 'eu.';
    }
    if (host.includes('au') && curl.includes('au')) {
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

// Function to add or update property to a file, and possibly adds a comment if the property does not exists
addOrUpdateProperty = function (location, property, value, comment) {
    log(DEBUG, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ')');
    // Check if file exists
    const fs = require('fs');
    try {
        if (fs.existsSync(location)) {
            //file exists
            log(DEBUG, 'Property file found: ' + location);
            // Check if file contains property
            // var data = fs.readFileSync(location, 'utf8');
            var dataLines = fs.readFileSync(location, 'utf8').split('\n');
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
            for (let line of dataLines) {
                dataForFile += line + '\n';
            }
            // TODO: cut off the last \n
            if (propFound) {
                log(INFO, 'Updated: ' + colors.blue(property) + ' to: ' + colors.yellow(value) + ' (in:' + location + ')');
            } else {
                // append prop to the end.
                log(INFO, 'Property NOT found: ' + colors.blue(property) + ' We are adding it and set it to: ' + colors.yellow(value) + ' (in:' + location + ')');
                if (comment) {
                    dataForFile += '\n# ' + comment;
                }
                dataForFile += '\n' + property + '=' + value;
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
    // const globalTCpropFile = __dirname + '/../../common/global-tibco-cloud.properties';
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
    return new Promise(function (resolve, reject) {
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
            reject(err);
        }
        resolve();
    })
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
    const fs = require('file-system');
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
        console.error(err);
    }
}

// function to deternmine enabled tasks for workspace
determineEnabledTasks = function (cliTaskConfig) {
    var cTsks = cliTaskConfig.cliTasks;
    var re = [];
    for (cliTask in cTsks) {
        console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
        var allowed = false;
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
    var tableObject = {};
    for (var element in arrayObject) {
        var tableRow = {};
        var rowNumber = parseInt(element) + 1;
        // TODO: Change to debug
        //log(INFO, rowNumber + ') APP NAME: ' + response.body[element].name  + ' Published Version: ' +  response.body[element].publishedVersion + ' (Latest:' + response.body[element].publishedVersion + ')') ;
        for (let conf of config.entries) {
            if (conf.format && conf.format.toLowerCase() == 'date') {
                var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
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
            const fs = require('file-system');
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


isOauthUsed = function () {
    let re = false;
    if (getProp('CloudLogin.OAUTH_Token') != undefined) {
        if (getProp('CloudLogin.OAUTH_Token').trim() != '') {
            re = true
        }
    }
    // console.log('Is Oauth used: ' , re);
    return re;
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
        var timeStamp = new Date();
        //console.log('(' + timeStamp + ')[' + level + ']  ' + message);

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
    //process.stdout.clearLine();
    //process.stdout.cursorTo(0);
    process.stdout.write(message);
}


