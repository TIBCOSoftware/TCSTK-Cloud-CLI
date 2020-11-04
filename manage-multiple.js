// This file manages the applications
require('./build/common-functions');
const gulp = require('gulp');
let mFile = '';
const colors = require('colors');


// Function to process the multiple property file
// processMultipleFile = function (propfileName) {
processMultipleFile = function () {
    return new Promise(async function (resolve, reject) {
        // setLogDebug('true');
        mFile = getMultipleFileName();
        log(INFO, '- Managing Multiple, Using file: ' + mFile);
        // Go Over All Cloud Starter Jobs
        let cloudStarters = getMProp('Cloud_Starter_JOBS');
        if (cloudStarters == null) {
            //Try to get from old definition for backwards compatibility.
            cloudStarters = getMProp('Cloud_Starters');
            if (cloudStarters != null) {
                log(WARNING, "Using the |Cloud_Starters| property for backward compatibility but rename this to: |Cloud_Starter_JOBS|...");
            }
        }
        let failOnError = getMProp('Fail_On_Error');
        if (failOnError == null) {
            log(INFO, 'No Fail_On_Error Property found; Adding Fail_On_Error to ' + mFile);
            addOrUpdateProperty(mFile, 'Fail_On_Error', 'YES', 'Indicator if script needs to fail when an error occurs (Options: YES | NO)');
            failOnError = 'YES';
        }
        const doFailOnError = !(failOnError.toLowerCase() == 'no');

        log(INFO, '- Looping over Configured Starter JOBS: ' + cloudStarters);
        const cloudStartersA = cloudStarters.split(',');
        for (var i = 0; i < cloudStartersA.length; i++) {
            const currentStarter = trim(cloudStartersA[i]);
            const logS = colors.blue('[STARTER JOB: ' + currentStarter + ']');
            // log(INFO, logS);
            // Per Starter Go Over the Configured Environments
            const currLoc = getMProp(currentStarter + '_Location');
            log(INFO, logS + ' Location: ' + currLoc);
            const environments = getMProp(currentStarter + '_Environments');
            log(INFO, logS + ' Environments: ' + environments);
            const environmentsA = environments.split(',');
            // TODO: Allow for a pre environment command (like git pulls or build)
            for (var j = 0; j < environmentsA.length; j++) {
                const currentEnvironment = trim(environmentsA[j]);
                const logSE = logS + colors.green(' [JOB: ' + currentEnvironment + '] ');
                const propFile = getMProp(currentEnvironment + '_PropertyFile');
                log(INFO, logSE + ' Property File: ' + propFile);
                // Per Environment Run the Configured Tasks
                const tasks = getMProp(currentEnvironment + '_Tasks');
                log(INFO, logSE + ' Tasks: ' + tasks);
                const tasksA = tasks.split(',');
                for (var k = 0; k < tasksA.length; k++) {
                    const currentTask = trim(tasksA[k]);
                    console.log('Parsing: ' , currentTask , '|');
                    let tObj = JSON.parse(currentTask);
                    // console.log(tObj);
                    let logT = logSE;
                    let command = 'cd ' + currLoc + ' && ';
                    if (tObj.T != null) {
                        let ansCom = '';
                        if(tObj.ANSWERS != null){
                            ansCom = ' -a ' + tObj.ANSWERS;
                        }
                        logT += colors.brightCyan('[' + (k + 1) + '] [TCLI TASK]');
                        //TODO: USE Absolute path ? We can't for the moment, since -p option only takes relative path.
                        //const absPropFile = process.env.PWD + '/' + propFile;
                        //console.log('absPropFile: ' + absPropFile)
                        //command += 'tcli -p "' + absPropFile + '" ' + tObj.T;
                        command += 'tcli -p "' + propFile + '" ' + tObj.T + ansCom;
                    }
                    if (tObj.O != null) {
                        logT += colors.brightCyan('[' + (k + 1) + '] [OS TASK]');
                        command += tObj.O;
                    }
                    if (tObj.S != null) {
                        logT += colors.brightCyan('[' + (k + 1) + '] [SCRIPT TASK]' + tObj.S);
                        command += 'node ' + tObj.S;
                    }
                    log(DEBUG, logT + 'Command (before replacing): ' + command);
                    command = replaceAtSign(command, currLoc + propFile);
                    log(INFO, logT + ' Command: ' + command);
                    run(command, doFailOnError);
                }
            }
        }
        resolve();
    });
}

const TCLI_INTERACTVIE = 'tcli-interactive';

multipleInteraction = function () {
    return new Promise(async function (resolve, reject) {
        const PropertiesReader = require('properties-reader');
        mFile = getMultipleFileName();
        let failOnError = getMProp('Fail_On_Error');
        if (failOnError == null) {
            failOnError = 'YES';
        }
        const doFailOnError = !(failOnError.toLowerCase() == 'no');
        log(INFO, 'Multiple Cloud Interactions');
        log(INFO, '- Managing Multiple, Using file: ' + mFile + ' (Fail on error:', doFailOnError, ')');
        let taskOverRide = false;
        let miTask = getMProp('Multiple_Interaction_CLITask');

        //Start a loop till the user end's it (interactive), do reload prop files every time
        while (true) {
            console.log(miTask);
            let miPropFolder = getMProp('Multiple_Interaction_Property_File_Folder');
            let miPropFiles = getMProp('Multiple_Interaction_Property_Files');
            if (!taskOverRide) {
                miTask = getMProp('Multiple_Interaction_CLITask');
            }
            let displayTask = miTask;
            if (miTask == '') {
                displayTask = TCLI_INTERACTVIE;
            }

            // 1. Get list of property files to use and which task to execute
            const miPropFilesA = miPropFiles.split(',');
            const environmentsTable = {};
            let rowNumber = 0;
            for (let miP in miPropFilesA) {
                var eRow = {};
                rowNumber++;
                // console.log('Prop file: ' + miPropFile);
                // TODO: Check for ALL and Exclude
                if (!(miPropFilesA[miP].indexOf('.properties') > 0)) {
                    miPropFilesA[miP] += '.properties';
                }
                eRow['NAME'] = miPropFilesA[miP].replace('.properties', '').replace('tibco-cloud-', '').replace('tibco-cloud', '');
                // 2. Open the property files one by one and get the ClientID / OAUTH details
                const curProps = PropertiesReader(miPropFolder + miPropFilesA[miP]).path();
                eRow['AUTHENTICATION TYPE'] = '';
                if (curProps && curProps.CloudLogin) {
                    if (curProps.CloudLogin.clientID) {
                        if (curProps.CloudLogin.clientID.trim() != '') {
                            eRow['AUTHENTICATION TYPE'] = 'CLIENT ID';
                        }
                    }
                    //TODO: Pick up OAUTH
                    if (curProps.CloudLogin.OAUTH_Token) {
                        if (curProps.CloudLogin.OAUTH_Token.trim() != '') {
                            eRow['AUTHENTICATION TYPE'] = 'OAUTH';
                            const oauthO = parseOAUTHToken(curProps.CloudLogin.OAUTH_Token, false);
                            if (oauthO) {
                                eRow['REGION'] = oauthO['Region'];
                                eRow['USER'] = oauthO['User'];
                                eRow['ORGANIZATION'] = oauthO['Org'];
                            }
                        }
                    }
                }
                // console.log(getMProp('CloudLogin.clientID', miPropFolder + miPropFile))
                environmentsTable[rowNumber] = eRow;
            }
            console.log(colors.blue('|------------------------------------------------|'));
            console.log(colors.blue('|     M U L T I P L E    I N T E R A C T I O N   |'));
            console.log(colors.blue('|------------------------------------------------|'));
            console.log(colors.blue(`|- TASK: ${displayTask} `));
            //console.log(colors.blue('|------------------------------------------------|'));
            //console.log(colors.blue('ENVIRONMENTS:'));
            // 3. Display a table of all environments
            console.table(environmentsTable);
            // 4. Let the user choose an environment to execute on (include All and None/Quit, or Change the Task)
            const environmentOptions = [];
            let i = 0;
            for (let env of iterateTable(environmentsTable)) {
                i++;
                // console.log('Env: ' ,env);
                environmentOptions.push(i + '. ' + env.NAME);
            }
            // TODO: Add change task
            let userOptions = ['ALL ENVIRONMENTS', ...environmentOptions]
            userOptions.push('QUIT', 'EXIT', 'CHANGE TASK', 'CHANGE TO INTERACTIVE CLI TASK');
            let chosenEnv = await askMultipleChoiceQuestionSearch('On which environment would you like to run ' + colors.blue(displayTask) + ' ?', userOptions);
            if (chosenEnv == 'QUIT' || chosenEnv == 'EXIT') {
                console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
                process.exit(0);
            }
            //
            if (chosenEnv == 'CHANGE TO INTERACTIVE CLI TASK') {
                log(INFO, 'Setting task to: ' + TCLI_INTERACTVIE);
                miTask = '';
                taskOverRide = true;
                displayTask = TCLI_INTERACTVIE;
            } else {
                if (chosenEnv == 'CHANGE TASK') {
                    const cliTaskConfigCLI = require('./config-cli-task.json');
                    let cTsks = cliTaskConfigCLI.cliTasks;

                    const taskDescription = ['0) ' + TCLI_INTERACTVIE];
                    const taskTarget = [''];
                    for (let cliTask in cTsks) {
                        if (cTsks[cliTask].enabled && !cTsks[cliTask].internal && cTsks[cliTask].multipleInteraction) {
                            // console.log('\x1b[36m%s\x1b[0m',':', ' ' + cTsks[cliTask].description);
                            taskDescription.push(cliTask + ') ' + cTsks[cliTask].description);
                            taskTarget.push(cTsks[cliTask].gulpTask);
                        }
                    }
                    let chosenTask = await askMultipleChoiceQuestionSearch('Which cli task would you like to switch to ?', taskDescription);
                    for (let taskN in taskDescription) {
                        if (taskDescription[taskN] == chosenTask) {
                            taskOverRide = true;
                            miTask = taskTarget[taskN];
                        }
                    }
                } else {
                    // 5. Execute the task, when it was none go back directly when it was a task have pause message before displaying the table again
                    let propFileToUse = '';

                    for (let envNumber in environmentOptions) {
                        propFileToUse = miPropFilesA[envNumber];
                        let command = 'tcli -p ' + miPropFolder + propFileToUse + ' ' + miTask;
                        if (chosenEnv == 'ALL ENVIRONMENTS') {
                            console.log(colors.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'));
                            run(command, doFailOnError);
                            // await askQuestion('Press [enter] to continue...');
                        } else {
                            if (environmentOptions[envNumber] == chosenEnv) {
                                console.log(colors.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'));
                                // console.log('Propfile to use: ', miPropFilesA[envNumber]);
                                run(command, doFailOnError);

                            }
                        }
                    }
                    if (miTask != '') {
                        await askQuestion('Press [enter] to continue...');
                    }
                }
            }
        }
        resolve();
    });
}

// Gulp task definition
gulp.task('run-multiple', processMultipleFile);
gulp.task('run-multiple-interaction', multipleInteraction);


// TODO: Move this to global (merge with other property function)
let propsM;

getMProp = function (property, propFileName) {
    let propFileToUse = mFile;
    if (propFileName && propFileName.trim() != null) {
        propFileToUse = propFileName;
    }
    log(DEBUG, 'Getting Property: |' + property + '|');
    if (propsM == null) {
        const PropertiesReader = require('properties-reader');
        propsM = PropertiesReader(propFileToUse).path();
        //console.log(propsM);
    }
    let re;
    if (propsM != null) {
        re = indexObj(propsM, property);
        if (re != null) {
            re = replaceDollar(re);
        }
    } else {
        log(ERROR, 'Property file not set yet...')
    }
    log(DEBUG, 'Returning Property(' + property + '): ', re);
    return re;
}


replaceDollar = function (content) {
    if (content.includes('${') && content.includes('}')) {
        const subProp = content.substring(content.indexOf('${') + 2, content.indexOf('${') + 2 + content.substring(content.indexOf('${') + 2).indexOf('}'));
        log(DEBUG, 'Looking for subprop: ' + subProp);
        content = content.replace(/\${.*?\}/, getMProp(subProp));
        log(DEBUG, 'Replaced: ' + content);
        content = replaceDollar(content);
    }
    return content;
}

replaceAtSign = function (content, propFile) {
    if (content.includes('@{') && content.includes('}')) {
        const subProp = content.substring(content.indexOf('@{') + 2, content.indexOf('@{') + 2 + content.substring(content.indexOf('@{') + 2).indexOf('}'));
        log(DEBUG, 'Looking for subprop: |' + subProp + '| on: |' + content + '| propFile: ' + propFile);
        content = content.replace(/@{.*?\}/, getPropFromFile(subProp, propFile));
        log(DEBUG, 'Replaced: ' + content);
        content = replaceAtSign(content, propFile);
    }
    return content;
}

getPropFromFile = function (property, file) {
    log(DEBUG, 'Getting Property: |' + property + '| from file: ' + file);
    const PropertiesReader = require('properties-reader');
    const propsToGet = PropertiesReader(file).path();
    const re = indexObj(propsToGet, property);
    log(DEBUG, 'Returning Property(' + property + '): ', re);
    return re;
}
