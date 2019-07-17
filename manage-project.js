// This file manages all the tasks within a project


const gulp = require('gulp');
//import functions
require('./build/functions');
// Read TIBCO cloud properties...
const PropertiesReader = require('properties-reader');
const propFileNameGulp = 'tibco-cloud.properties';
const properties = PropertiesReader('tibco-cloud.properties');
const props = properties.path();
const version = '0.2.0';

// Function to build the cloud starter
function build() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Building... ' + props.App_Name);
        buildCloudStarterZip(props.App_Name);
        resolve();
    });
};

// Function to delpoy the cloud starter
function deploy() {
    return new Promise(async function (resolve, reject) {
        await uploadApp(props.App_Name);
        log('INFO', "DONE DEPLOYING: " + props.App_Name);
        resolve();

    });
}

// Function to publish the cloud starter
function publish() {
    return new Promise(async function (resolve, reject) {
        await publishApp(props.App_Name);
        log('INFO', 'APP PUBLISHED: ' + props.App_Name);
        log('INFO', "LOCATION: " + props.Cloud_URL + "webresource/apps/" + props.App_Name + "/index.html");
        resolve();
    });
}

// Function to get the cloud library sources from GIT
getCLgit = function () {
    return getGit(props.GIT_Source_TCSTLocation, props.TCSTLocation, props.GIT_Tag_TCST);
}

// Function that injects the sources of the library into this project
function injectLibSources() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Injecting Lib Sources');
        //run('mkdir tmp');
        mkdirIfNotExist('./projects/tibco-tcstk');
        copyDir('./tmp/TCSDK-Angular/projects/tibco-tcstk', './projects/tibco-tcstk');
        //use debug versions
        var now = new Date();
        mkdirIfNotExist('./backup/');
        // Make Backups in the back up folder
        copyFile('./tsconfig.json', './backup/tsconfig-Before-Debug(' + now + ').json');
        copyFile('./angular.json', './backup/angular-Before-Debug(' + now + ').json');
        copyFile('./package.json', './backup/package-Before-Debug(' + now + ').json');
        copyFile('./tsconfig.debug.json', './tsconfig.json');
        copyFile('./angular.debug.json', './angular.json');
        copyFile('./package.debug.json', './package.json');
        //do NPM install
        npmInstall('./');
        npmInstall('./', 'lodash-es');
        log('INFO', 'Now you can debug the cloud library sources in your browser !!');
        resolve();
    });
}

// Function to go back to the compiled versions of the libraries
function undoLibSources() {
    return new Promise(function (resolve, reject) {
        log('INFO', 'Undo-ing Injecting Lib Sources');
        //Move back to Angular build files
        var now = new Date();
        mkdirIfNotExist('./backup/');
        // Make Backups in the back up folder
        copyFile('./tsconfig.json', './backup/tsconfig-Before-Build(' + now + ').json');
        copyFile('./angular.json', './backup/angular-Before-Build(' + now + ').json');
        copyFile('./package.json', './backup/package-Before-Build(' + now + ').json');
        copyFile('./tsconfig.build.json', './tsconfig.json');
        copyFile('./angular.build.json', './angular.json');
        copyFile('./package.build.json', './package.json');
        //Delete Project folder
        //FIX: Just delete those folders imported...
        deleteFolder('./projects/tibco-tcstk/tc-core-lib');
        deleteFolder('./projects/tibco-tcstk/tc-forms-lib');
        deleteFolder('./projects/tibco-tcstk/tc-liveapps-lib');
        deleteFolder('./projects/tibco-tcstk/tc-spotfire-lib');
        npmInstall('./');
        resolve();
    });
}

// Function to change the tenant in the properties file
changeTenant = function () {
    return new Promise( async function (resolve, reject) {
        await updateTenant(propFileNameGulp);
        resolve();
    });
};


helptcli = function () {
    return new Promise(async function (resolve, reject) {
        log('INFO', 'GULP DETAILS:');
        var cwdir = process.cwd();
        run('gulp --version  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
        log('INFO', 'These are the available TIBCO CLOUD CLI Tasks:');
        run('gulp -T  --cwd "' + cwdir + '" --gulpfile "' + __filename + '"');
        console.log('# |-------------------------------------------|');
        console.log('# |  *** T I B C O    C L O U D   C L I ***   |');
        console.log('# |            V'+version+'                         |');
        console.log('# |-------------------------------------------|');
        console.log('# |For more info see: https://cloud.tibco.com');

        resolve();
    });
}

// Start Cloudstarter Locally
start = function () {
    return new Promise(async function (resolve, reject) {
        log('INFO', 'Starting: ' + props.App_Name);
        if (props.cloudHost.includes('eu')) {
            run('npm run serve_eu');
        } else {
            if (props.cloudHost.includes('au')) {
                run('npm run serve_au');
            } else {
                run('npm run serve_us');
            }
        }
        resolve();
    });
}

mainT = function () {
    return new Promise(async function (resolve, reject) {
        console.log('[TIBCO CLOUD CLI - V '+version+'] ("exit" to quit / "help" to display tasks)');
        // checkPW();
        resolve();
        var appRoot = process.env.PWD;
        if (props.CloudLogin.pass == ''){
            // When password is empty ask it manually for the session.
            var pass = await askQuestion('Please provide your password: ', 'password');
            properties.set('CloudLogin.pass', obfuscatePW(pass));
        }

        await promptGulp(__dirname, appRoot);
    });
};


testCallService = function() {
    return new Promise( async function (resolve, reject) {
        const lCookie = cLogin();
        const sc = require('sync-rest-client');
        const SwaggerURL = 'https://integration.cloud.tibco.com/domain/v1/sandboxes/MyDefaultSandbox/applications/swjmdg2ejqafrb72j5bjqpyaf3wxvtmy/endpoints/5xzfupsbcgwbfsslyrzlsu6swvpbwdpq/swagger';
        const responseSW = sc.get(SwaggerURL, {
            headers: {
                "accept": "application/json, text/plain, */*",
                "authority": "integration.cloud.tibco.com",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });
        console.log(responseSW.body);

        // EXAMPLE TO CALL THE SERVICE
        const Swagger = require('swagger-client');
        Swagger({spec: responseSW.body}).then((client) => {
            console.log('API: ', client.apis);
            client.apis.default.getNumber().then((result) => {
                    console.log('Result: ', result.body.number);
                }
            );
            resolve();
        });
    });
}


testWSU = function () {
    return new Promise(async function (resolve, reject) {
        console.log('test...');
        var now = new Date();
        console.log(now);
        var wsu = require('wsu');
        console.log(wsu.API.getVersion());

        var id = 'ivXo63MVxNPpsoPzQ-D_bDBO7sSnu4fv5HJlqI-OiVgXfRgWVDSgH_NgC5ws94idTPRDgNqI5XJR0hNPKwHyAHtVjApNLj-nJB3w';
        var user = 'segliveapps@outlook.com';
        var pass = 'Tibco123.';
        wsu.API.login(id,user,pass);
        console.log(wsu.API.getArtefactList("TCI"));

        resolve();
    });
}

const getAppOwner = false;

test = function () {
    return new Promise( async function (resolve, reject) {
        console.log('test...');
        var now = new Date();
        console.log(now);


        const lCookie = cLogin();
        const sc = require('sync-rest-client');

        //const response = sc.get('https://integration.cloud.tibco.com/domain/v1/sandboxes/MyDefaultSandbox/applications/swjmdg2ejqafrb72j5bjqpyaf3wxvtmy/endpoints/5xzfupsbcgwbfsslyrzlsu6swvpbwdpq/swagger', {
        const response = sc.get('https://integration.cloud.tibco.com/domain/v1/applications?scope=all', {
            headers: {
                "accept": "application/json, text/plain, */*",
                "authority": "integration.cloud.tibco.com",
                "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
            }
        });





        var TCI_Applications = response.body.applications;

        var apps = {};
        var appNames = new Array();
        for (var app in TCI_Applications) {


            var appTemp = {};
            var appN = parseInt(app) + 1;
            //log(INFO, appN + ') APP NAME: ' + response.body[app].name  + ' Published Version: ' +  response.body[app].publishedVersion + ' (Latest:' + response.body[app].publishedVersion + ')') ;
            var thisApp = TCI_Applications[app];


            appTemp['APP NAME'] = thisApp.applicationName;
            if(getAppOwner) {
                // console.log(thisApp.id);
                var responseApp = sc.get('https://integration.cloud.tibco.com/domain/v1/sandboxes/MyDefaultSandbox/applications/' + thisApp.id, {
                    headers: {
                        "accept": "application/json, text/plain, */*",
                        "authority": "integration.cloud.tibco.com",
                        "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
                    }
                });
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write("Processing App: (" + appN + '/' + TCI_Applications.length + ')...');
                // console.log(responseApp.body.ownerName);
                appTemp['OWNER'] = responseApp.body.ownerName;
            }
            appNames.push(thisApp.applicationName + ' ['+ thisApp.id + ']');
            appTemp['SANDBOX'] = thisApp.sandboxName;
            appTemp['TYPE'] = thisApp.appType;
            var updated = new Date(thisApp.lastUpdatedTime);
            var options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
            if(!getAppOwner) {
                appTemp['UPDATED'] = updated.toLocaleDateString("en-US", options);
            }
            apps[appN] = appTemp;

        }
        //logO(INFO,apps);
        console.table(apps);

        // Select an App
        askMultipleChoiceQuestionSearch('Which app do you want to generate the source for ? ', appNames).then( (selectedApp) => {
            console.log('Selected App: ' + selectedApp);
            var matches = selectedApp.match(/\[(.*?)\]/);

            if (matches) {
                var selectedID = matches[1];
            }
            console.log('Selected ID: ' + selectedID);
            var SwaggerURL = '';

            for (var app in TCI_Applications) {
                var thisApp = TCI_Applications[app];
                if(thisApp.id == selectedID){
                    console.log('Application Details: ' , thisApp);
                    // TODO: Select Right endpoint
                    SwaggerURL = 'https://integration.cloud.tibco.com/domain/v1/sandboxes/'+ thisApp.sandboxName +'/applications/'+thisApp.id+'/endpoints/'+thisApp.endpointIds[0]+'/swagger';
                }

            }
            // https://integration.cloud.tibco.com/domain/v1/sandboxes/MyDefaultSandbox/applications/swjmdg2ejqafrb72j5bjqpyaf3wxvtmy
            console.log('Swagger URL: ' + SwaggerURL);
            //const SwaggerURL = 'https://integration.cloud.tibco.com/domain/v1/sandboxes/MyDefaultSandbox/applications/swjmdg2ejqafrb72j5bjqpyaf3wxvtmy/endpoints/5xzfupsbcgwbfsslyrzlsu6swvpbwdpq/swagger';
            const responseSW = sc.get(SwaggerURL, {
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "authority": "integration.cloud.tibco.com",
                    "cookie": "tsc=" + lCookie.tsc + "; domain=" + lCookie.domain
                }
            });

            var myJson = JSON.stringify(responseSW.body);
            deleteFolder('swaggerTmp').then(() => {
                run('mkdir swaggerTmp');
                var fs = require('fs');
                fs.writeFileSync('swaggerTmp/swagger.json', myJson, 'utf8');
                console.log('Defininition: ', myJson);
                run('cd swaggerTmp &&  ng-swagger-gen -i swagger.json -c ./../ng-swagger-gen-config.json');
            });



        });


        // Download the JSON

        // Run the creator of the sources








        resolve();

    });
};



gulp.task('test-call-service', testCallService);

gulp.task('test', test);
gulp.task('test-wsu', testWSU);
gulp.task('help-tcli', helptcli);
helptcli.description = 'Displays this message';
gulp.task('main', mainT);

gulp.task('default', gulp.series('help-tcli', 'main'));
// gulp.task('default', test);
gulp.task('start', start);
start.description = 'Starts the cloud starter locally';

gulp.task('change-tenant', changeTenant);
changeTenant.description = 'Change the tenant to login to';

gulp.task('obfuscate', obfuscate);
obfuscate.description = 'Obfuscates a Password';
mainT.description = 'Displays this message';
gulp.task('show-cloud', showClaims);
showClaims.description = 'Shows basic information on your cloud login. (use this to test your cloud login details)';
gulp.task('show-apps', showApps);
showAvailableApps.description = 'Shows all the applications that are deployed in the cloud and their versions.';
gulp.task('show-application-links', showLinks);
showLinks.description = 'Shows all the links to the deployed applications (that have and index.html file).';

gulp.task('build', build);
build.description = 'Build the ZIP file for your project.';
gulp.task('deploy', deploy);
deploy.description = 'Deploys your application to the cloud.';
gulp.task('publish', publish);
publish.description = 'Publishes the latest version of your application.';
gulp.task('build-deploy-publish', gulp.series('build', 'deploy', 'publish'));

gulp.task('get-cloud-libs-from-git', getCLgit);
getCLgit.description = 'Get the library sources from GIT';
gulp.task('format-project-for-lib-sources', injectLibSources);
injectLibSources.description = '(INTERNAL TASK) Used to reformat your project so you can work with the library sources (for debugging)';
gulp.task('clean', cleanTemp);
cleanTemp.description = '(INTERNAL TASK) Used to clean the temporary folders';
gulp.task('inject-lib-sources', gulp.series('clean', 'get-cloud-libs-from-git', 'format-project-for-lib-sources', 'clean'));
gulp.task('undo-lib-sources', undoLibSources);
undoLibSources.description = 'UNDO task for inject-lib-sources, use this when you want to go back to normal mode';


/*
TODO: Additional Cloud CLI Capabilities

- List properties
- Add Schematics
- Revert app to older version (revert and publish)
- Show Shared State
- Remove Shared State
- List TCI Endpoints
- List Cloud Event Channels
- List Spotfire Reports
- Swap between different tennants (EU / US / AUS)

-- perhaps provide a gate into the various CLI's

-- Get the token from the cloud

 */



var globalLastCommand = 'help-tcli';
var inquirer = require('inquirer');
//Main Cloud CLI Questions
promptGulp = function (stDir, cwdDir) {
    log('DEBUG', 'PromtGulp)           stDir dir: ' + stDir);
    log('DEBUG', 'PromtGulp) current working dir: ' + cwdDir);
    return new Promise(function (resolve, reject) {
        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        inquirer.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: '[TIBCO CLOUD CLI]: ',
            source: searchAnswer,
            pageSize: 4/*,
            validate: function (val) {
                return val ? true : 'Type something!';
            }*/
        }]).then(function (answers) {
            //console.log(answers);
            // console.log('Command: ' + answers.command);
            var com = answers.command;
            if (com == 'q' || com == 'quit' || com == 'exit') {
                console.log('Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
                return resolve();
            } else {
                // Check if we need to repeat the last task
                if (com == 'repeat-last-task'){
                    log('INFO', 'Repeating Last Task: ' + globalLastCommand);
                    com = globalLastCommand;
                }
                globalLastCommand = com;
                run('cd ' + stDir + ' && gulp ' + com + ' --cwd "' + cwdDir + '" --gulpfile "' + stDir + '/gulpfile.js" --pass "' + props.CloudLogin.pass + '"');
                return promptGulp(stDir, cwdDir);
            }
        });
    });
}


const gtasks = ['show-cloud', 'show-apps', 'show-application-links','change-tenant', 'obfuscate', 'start', 'build', 'deploy', 'publish', 'clean', 'build-deploy-publish', 'get-cloud-libs-from-git', 'inject-lib-sources', 'undo-lib-sources', 'q', 'exit', 'quit', 'help-tcli' , 'repeat-last-task'];

const _ = require('lodash');
const fuzzy = require('fuzzy');

//User interaction
searchAnswer = function (answers, input) {
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            var fuzzyResult = fuzzy.filter(input, gtasks);
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

