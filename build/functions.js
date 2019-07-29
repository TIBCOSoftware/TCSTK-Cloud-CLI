// Package Definitions
const execSync = require('child_process').execSync;
const syncClient = require('sync-rest-client');
const git = require('gulp-git');
const fs = require('file-system');
const fse = require('fs-extra');
// const rimraf = require("rimraf");
const del = require('del');
const PropertiesReader = require('properties-reader');
const propertiesF = PropertiesReader('tibco-cloud.properties');
const propsF = propertiesF.path();


// Create a directory if it does not exists
mkdirIfNotExist = function (dir) {
    //var dir = './tmp';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// Clean temp folder
cleanTemp = function () {
    log(INFO, 'Cleaning Temp Directory: ' + propsF.Workspace_TMPFolder);
    return deleteFolder(propsF.Workspace_TMPFolder);
}

// Delete a folder
deleteFolder = function (folder) {
    log(INFO, 'Deleting Folder: ' + folder);
    return del([
        folder
    ]);
}


// Run an OS Command
run = function (command) {
    return new Promise(function (resolve, reject) {
        log(DEBUG, 'Executing Command: ' + command);
        try {
            execSync(
                command,
                {stdio: 'inherit'}
            );
        } catch (err) {
            reject(err);
        }
        resolve();
    }).catch(
        (reason => {
            logO(ERROR, reason);
            process.exit(1);
        })
    );
}

// Function that determines which cloud login method to use
// function to login to the cloud
var loginURL = propsF.Cloud_URL + propsF.loginURE;
var loginC = null;
var argv = require('yargs').argv;

cLogin = function() {
    // checkPW();
    var pass = propsF.CloudLogin.pass;
    if(pass == ''){
        pass = argv.pass;
        // console.log('Pass from args: ' + pass);
    }
    if (pass.charAt(0) == '#') {
        pass = Buffer.from(pass, 'base64').toString()
    }
    if (loginC == null) {
        loginC = cloudLoginV3(propsF.CloudLogin.tenantID, propsF.CloudLogin.clientID, propsF.CloudLogin.email, pass, loginURL);
    }
    if (loginC == 'ERROR') {
        // TODO: exit the gulp task properly
        log(INFO, 'Error Exiting..');
        process.exit();
    }
    // console.log("RETURN: " , loginC);
    return loginC;
}




// Function that logs into the cloud and returns a cookie
function cloudLoginV3(tenantID, clientID, email, pass, TCbaseURL) {
    log(DEBUG, 'cloudLoginV3]  tenantID=' + tenantID + ' clientID=' + clientID + ' email=' + email + ' TCbaseURL=' + TCbaseURL);
    var postForm = 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email + '&Password=' + pass;
    log(INFO, 'Calling: ' + TCbaseURL);
    //log(DEBUG,'With Form: ' + postForm);
    var response = syncClient.post(encodeURI(TCbaseURL), {
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        payload: postForm
    });
    var re = '';
    if (response.body.errorMsg != null) {
        log(ERROR, response.body.errorMsg);
        re = 'ERROR';
    } else {
        var loginCookie = response.headers['set-cookie'];
        logO(DEBUG, loginCookie);
        var rxd = /domain=(.*?);/g;
        var rxt = /tsc=(.*?);/g;
        re = {"domain": rxd.exec(loginCookie)[1], "tsc": rxt.exec(loginCookie)[1]};
        logO(DEBUG, re.domain);
        logO(DEBUG, re.tsc);
        logO(DEBUG, re);
        log(INFO, 'Login Successful...');
    }
    return re;
}

// Function that builds the zip for deployment
buildCloudStarterZip = function (cloudStarter) {
    return new Promise(function (resolve, reject) {
        const csURL = '/webresource/apps/' + cloudStarter + '/';
        run('ng build --prod --base-href ' + csURL + 'index.html --deploy-url ' + csURL);
        //copyFile('./tmp/' + cloudStarter + '/tsconfig.build.json', './tmp/' + cloudStarter + '/tsconfig.json');
        run('cd ./dist/' + cloudStarter + '/ && zip -r ./../' + cloudStarter + '.zip .');
        log(INFO, 'ZIP Created: ./dist/' + cloudStarter + '.zip');
        resolve();
    });
}

// function that shows all the availible applications in the cloud
const getAppURL = propsF.Cloud_URL + propsF.appURE + '?%24top=200';
showAvailableApps = function (showTable) {
    var doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    //return new Promise(function (resolve, reject) {
    var lCookie = cLogin();
    //log(INFO, 'Login Cookie: ', lCookie);
    var response = syncClient.get(getAppURL, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    //console.log(response.body);
    //console.table(response.body);
    var apps = {};
    for (var app in response.body) {
        var appTemp = {};
        var appN = parseInt(app) + 1;
        //log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
        appTemp['APP NAME'] = response.body[app].name;
        //appTemp['LINK'] = 'https://eu.liveapps.cloud.tibco.com/webresource/apps/'+response.body[app].name+'/index.html';
        // TODO: Use the API (get artifacts) to find an index.htm(l) and provide highest
        // TODO: Use right eu / us link
        var publV = parseInt(response.body[app].publishedVersion);
        appTemp['PUBLISHED VERSION'] = publV;
        var latestV = parseInt(response.body[app].latestVersion);
        appTemp['LATEST VERSION'] = latestV;
        //appTemp['PUBLISHED / LATEST VERSION'] = '(' + publV + '/' + latestV + ')';
        var latestDeployed = false;
        if (publV == latestV) {
            latestDeployed = true;
        }
        appTemp['LATEST DEPLOYED'] = latestDeployed;
        apps[appN] = appTemp;
        var created = new Date(response.body[app].creationDate);
        var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        var optionsT = {hour: 'numeric'};
        appTemp['CREATED'] = created.toLocaleDateString("en-US", options);
        //appTemp['CREATED TIME'] = created.toLocaleTimeString();
        var lastModified = new Date(response.body[app].lastModifiedDate);
        //appTemp['LAST MODIFIED'] = lastModified.toLocaleDateString("en-US", options);
        //appTemp['LAST MODIFIED TIME'] = lastModified.toLocaleTimeString();
        var now = new Date();
        appTemp['AGE(DAYS)'] = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        appTemp['LAST MODIFIED(DAYS)'] = Math.round((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
    }
    //logO(INFO,apps);
    if (doShowTable) console.table(apps);
    return response.body;
    // resolve();
    // });
};

showApps = function () {
    return new Promise(function (resolve, reject) {
        showAvailableApps(true);
        resolve();
    });
}


// Function to show claims for the configured user
const getClaimsURL = propsF.Cloud_URL + propsF.Claims_URE;
showClaims = function () {
    return new Promise(function (resolve, reject) {
        var lCookie = cLogin();
        log(DEBUG, 'Login Cookie: ', lCookie);
        var response = syncClient.get(getClaimsURL, {
            headers: {
                "accept": "application/json",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });
        logO(INFO, response.body);
        resolve();
    });
};


getCloud = function(url) {
    const lCookie = cLogin();
    log(DEBUG, 'Login Cookie: ', lCookie);
    const response = syncClient.get(url, {
        headers: {
            "accept": "application/json",
            "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
        }
    });
    var re = response.body;
    //let re = Object.assign({}, response.body);
    //logO(INFO, re);
    return re;
}

const getApplicationDetailsURL = propsF.Cloud_URL + propsF.appURE;
//const getApplicationDetailsURL = 'https://eu.liveapps.cloud.tibco.com/webresource/v1/applications/AppMadeWithSchematic3/applicationVersions/1/artifacts/';
getApplicationDetails = function (application, version, showTable) {
    var doShowTable = (typeof showTable === 'undefined') ? false : showTable;
    var details = {};
    //console.log(getApplicationDetailsURL +  application + '/applicationVersions/' + version + '/artifacts/');
    const appDet = getCloud(getApplicationDetailsURL + application + '/applicationVersions/' + version + '/artifacts/?%24top=200');
    //logO(INFO, appDet);
    var i = 0;
    for (var det in appDet) {
        var appTemp = {};
        appN = i;
        i++;
        appTemp['DETAIL NAME'] = appDet[det].name;
        details[appN] = appTemp;
    }
    if (doShowTable) console.table(details);
    return appDet;
};

//Show all the applications links
showLinks = function () {
    return new Promise(function (resolve, reject) {
        getAppLinks(true);
        resolve();
    });
}

//Get Links to all the applications
getAppLinks = function (showTable) {
    log(INFO, 'Getting Application Links...');
    var appLinkTable = {};
    var apps = showAvailableApps(false);
    var i = 1;
    for (app of apps) {
        var appTemp = {};
        appTemp['APP NAME'] = app.name;
        var appN = i++;
        appTemp['PUBLISHED VERSION'] = parseInt(app.publishedVersion);
        // console.log(app.name, app.publishedVersion);
        var tempDet = getApplicationDetails(app.name, app.publishedVersion, false);
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("Processing App: (" + appN + '/' + apps.length + ')...');
        for (appD of tempDet) {
            //console.log(appD.name);
            if (appD.name.includes("index.html")) {
                // console.log('FOUND INDEX of ' + app.name + ': ' + appD.name);
                var tempLink = propsF.Cloud_URL + 'webresource/apps/' + encodeURIComponent(app.name) + '/' + appD.name;
                // console.log('LOCATION: ' + tempLink);
                appTemp['LINK'] = tempLink;
            }
        }
        appLinkTable[appN] = appTemp;
    }
    process.stdout.write('\n');
    if (showTable) {
        console.table(appLinkTable);
    }
    return appLinkTable;
}

// Function to upload a zip to the LiveApps ContentManagment API
uploadApp = function (application) {
    return new Promise(function (resolve, reject) {
        var lCookie = cLogin();
        let formData = new require('form-data')();
        log(INFO, 'UPLOADING APP: ' + application);
        var uploadAppLocation = '/webresource/v1/applications/' + application + '/upload/';
        //formData.append('key1', 1);
        // formData.setHeader("cookie", "tsc="+lCookie.tsc + "; domain=" + lCookie.domain);
        formData.append('appContents', require("fs").createReadStream('./dist/' + application + '.zip'));
        let query = require('https').request({
            hostname: propsF.cloudHost,
            path: uploadAppLocation,
            method: 'POST',
            headers: {
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain,
                'Content-Type': 'multipart/form-data; charset=UTF-8'
            },
        }, (res) => {
            let data = '';
            res.on("data", (chunk) => {
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                console.log(data);
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

// Function to publish the application to the cloud
publishApp = function (application) {
    return new Promise(function (resolve, reject) {
        var lCookie = cLogin();
        // var lCookie = cloudLoginV3();
        // console.log('Login Cookie: ' , lCookie);
        var publishLocation = propsF.Cloud_URL + 'webresource/v1/applications/' + application + '/';
        var response = syncClient.put(publishLocation, {
            headers: {
                "accept": "application/json",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });
        console.log(response.body);
        resolve();
    });
}


// Get the TIBCO Cloud Starter Development Kit from GIT
getGit = function (source, target, tag) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    // git clone --branch bp-baseV1 https://github.com/TIBCOSoftware/TCSDK-Angular
    if (tag == 'LATEST') {
        return git.clone(source, {args: target}, function (err) {
        });
    } else {
        return git.clone(source, {args: '--branch ' + tag + ' ' + target}, function (err) {
        });
    }
}

// Function to install NPM packages
npmInstall = function (location, package) {
    return new Promise(function (resolve, reject) {
        if (package != null) {
            run('cd ' + location + ' && npm install ' + package);
        } else {
            run('cd ' + location + ' && npm install');
        }
        resolve();
    });
}

// Function to add or update property to a file
addOrUpdateProperty = function (location, property, value) {
    log(INFO, 'Updating: ' + property + ' to: ' + value + ' (in:' + location + ')');
    // Check if file exists
    const fs = require('fs');
    try {
        if (fs.existsSync(location)) {
            //file exists
            log(DEBUG, 'Property file found: ' + location);
            // Check if file contains property
            var data = fs.readFileSync(location, 'utf8');
            var reg = new RegExp(property + '\\s*=\\s*(.*)');
            if (data.search(reg) > -1) {
                // We found the property
                log(DEBUG, 'Property found: ' + property + ' We are updating it to: ' + value);
                var regRes = new RegExp(property + '\\s*=\\s*(.*)');
                var result = data.replace(regRes, property + '=' + value);
                fs.writeFileSync(location, result, 'utf8');
            } else {
                // append prop to the end.
                log(DEBUG, 'Property NOT found: ' + property + ' We are adding it and set it to: ' + value);
                var result = data + '\n' + property + '=' + value;
                fs.writeFileSync(location, result, 'utf8');
            }

        } else {
            log(ERROR, 'Property File does not exist: ' + location);
        }
    } catch (err) {
        console.error(err)
    }
}
const inquirerF = require('inquirer');
// function to ask a question
askMultipleChoiceQuestion = async function (question, options) {
    var re = 'result';
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
    });
    return re;
}

var gOptions = [];

askMultipleChoiceQuestionSearch = async function (question, options) {
    gOptions = options;
    var re = 'result';
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
        console.log('answers: ' , answers);
        logO(DEBUG, answers);
        re = answers.command;
    });
    return re;
}



const _F = require('lodash');
const fuzzyF = require('fuzzy');

//User interaction
searchAnswerF = function (answers, input) {
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


// function to ask a question
askQuestion = async function (question, type = 'input') {
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
}

// function to update the tenant
updateRegion = async function (propFile) {
    var re = await askMultipleChoiceQuestion('Which Region would you like to use ? ', ['US - Oregon', 'EU - Ireland', 'AU - Sydney']);
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

// Function to copy a directory
copyDir = function (fromDir, toDir) {
    log(INFO, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fse.copySync(fromDir, toDir, {overwrite: true});
}
// Function to copy a file
copyFile = function (fromFile, toFile) {
    log(INFO, 'Copying File from: ' + fromFile + ' to: ' + toFile);
    fs.copyFileSync(fromFile, toFile);
}

// Function to delete a file but does not fail when the file does not exits
deleteFile = function (file) {
    log(INFO, 'Deleting File: ' + file);
    try {
        fs.unlinkSync(file);
        //file removed
    } catch (err) {
        log(ERROR, 'Maybe file does not exist ?... (' + err.code + ')');
        //console.log(err)
    }
}


checkPW = function () {
    if (propsF.CloudLogin.pass == null || propsF.CloudLogin.pass == '') {
        log(ERROR, 'Please provide your password to login to the tibco cloud in the file tibco-cloud.properties (for property: CloudLogin.pass)');
        process.exit();
    }
}

var readline = require('readline');
var Writable = require('stream').Writable;

// Function to obfuscate a password
obfuscate = function () {
    return new Promise(function (resolve, reject) {
        var mutableStdout = new Writable({
            write: function (chunk, encoding, callback) {
                if (!this.muted)
                    process.stdout.write(chunk, encoding);
                callback();
            }
        });
        mutableStdout.muted = false;
        var rl = readline.createInterface({
            input: process.stdin,
            output: mutableStdout,
            terminal: true
        });
        log(INFO, 'Please provide the password...')
        rl.question('Password: ', (password) => {
            console.log('\nObfuscated password is is: ' + obfuscatePW(password));
            rl.close();
            resolve();
        });
        mutableStdout.muted = true;
    });
}

obfuscatePW = function (toObfuscate){
    // TODO: use stronger obfuscation
    return '#' + Buffer.from(toObfuscate).toString('base64');
}

// Use WSU to generate TCI code
wsuAddTci = function () {
    return new Promise(async function (resolve, reject) {
        // TODO: Implement
        console.log('TODO: Implement');
        resolve();
    });
}

wsuListTci = function () {
    return new Promise(async function (resolve, reject) {
        var wsu = require('@tibco-tcstk/web-scaffolding-utility');
        console.log(wsu.API.getVersion());
        wsu.API.login(propsF.CloudLogin.clientID, propsF.CloudLogin.email, propsF.CloudLogin.pass);
        // console.log(wsu.API.getArtefactList("TCI").createTable());
        var afList = wsu.API.getArtefactList(wsu.API.flavour.TCI);
        console.table(afList.createTable());
        resolve();
    });
}
//TODO: either inspect or get from config

const possibleSchematics = ["case-cockpit","home-cockpit","custom-form-creator","custom-form-action","custom-form-casedata"];

schematicAdd = function () {
    return new Promise(async function (resolve, reject) {
        log(INFO, 'Adding Schematic...');
        var sType = await askMultipleChoiceQuestion('What type of schematic would you like to add ?', possibleSchematics);
        var sName = await askQuestion('What is the name of your schematic ?');
        //TODO: Add choice for the type of schematic
        run('ng generate @tibco-tcstk/component-template:'+sType+' ' + sName);
        resolve();
    });
}



// Log function
const INFO = 'INFO';
const DEBUG = 'DEBUG';
const ERROR = 'ERROR';
const useDebug = (propsF.Use_Debug == 'true');
log = function (level, message) {
    if (!(level == DEBUG && !useDebug)) {
        var timeStamp = new Date();
        //console.log('(' + timeStamp + ')[' + level + ']  ' + message);
        console.log('\x1b[35m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ') ' , message);
    }
}
logO = function (level, message) {
    if (!(level == DEBUG && !useDebug)) {
        console.log(message);
    }
}
