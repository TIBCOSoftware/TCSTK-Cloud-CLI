// This file manages the applications
import {
    addOrUpdateProperty, col,
    createTableValue, DEBUG, ERROR,
    getMultipleOptions, INFO,
    iterateTable,
    log,
    parseOAUTHToken,
    run, trim, WARNING
} from "./common/common-functions";
import {TCLITask} from "./models/tcli-models";
import {askMultipleChoiceQuestionSearch, askQuestion} from "./common/user-interaction";

require('./common/common-functions');
let mFile = '';

const _ = require('lodash');


// Function to process the multiple property file
// processMultipleFile = function (propfileName) {
export function processMultipleFile() {
    // setLogDebug('true');
    let mOpts:any = getMultipleOptions();
    mFile = mOpts.name;
    // log(INFO, '- Managing Multiple, Using file: ' + mFile);
    // Go Over All Cloud Starter Jobs
    let csJobs = getMProp('Cloud_Starter_JOBS');
    if (mOpts.job && mOpts.job.trim() !== '') {
        csJobs = mOpts.job;
    }
    let environmentOverride = '';
    if (mOpts.environment && mOpts.environment.trim() !== '') {
        environmentOverride = mOpts.environment;
    }
    if (csJobs == null) {
        //Try to get from old definition for backwards compatibility.
        csJobs = getMProp('Cloud_Starters');
        if (csJobs != null) {
            log(WARNING, "Using the |Cloud_Starters| property for backward compatibility but rename this to: |Cloud_Starter_JOBS|...");
        } else {
            log(ERROR, "Please specify the Cloud_Starter_JOBS property in: " + mFile +' (or the common file if used...)');
            process.exit(1);
        }
    }
    let failOnError = getMProp('Fail_On_Error');
    if (failOnError == null) {
        log(INFO, 'No Fail_On_Error Property found; Adding Fail_On_Error to ' + mFile);
        addOrUpdateProperty(mFile, 'Fail_On_Error', 'YES', 'Indicator if script needs to fail when an error occurs (Options: YES | NO)');
        failOnError = 'YES';
    }
    const doFailOnError = !(failOnError.toLowerCase() === 'no');

    // log(INFO, '- Looping over Configured Starter JOBS: ' + csJobs);
    let nvs = createTableValue('File', mFile);
    if (fileExtension.trim() !== '') {
        nvs = createTableValue('File Extension', fileExtension, nvs);
    }
    const csJobsA = csJobs.split(',');
    let jobN = 0;
    for (let k = 0; k < csJobsA.length; k++) {
        const currentJob = csJobsA[k].trim();
        let environments = getMProp(currentJob + '_Environments');

        if (environmentOverride !== '') {
            environments = environmentOverride;
        }
        const environmentsA = environments.split(',');
        for (var l = 0; l < environmentsA.length; l++) {
            jobN++;
            nvs = createTableValue(currentJob, environmentsA[l].trim(), nvs, 'JOB', 'ENVIRONMENT');
        }
    }
    log(INFO, col.blue('JOB SUMMARY]') + ' FILE: ' + mFile);
    console.table(nvs);

    for (let i = 0; i < csJobsA.length; i++) {
        const currentJob = trim(csJobsA[i]);
        const logS = col.blue('[STARTER JOB: ' + currentJob + ']');
        // log(INFO, logS);
        // Per Starter Go Over the Configured Environments
        const currLoc = getMProp(currentJob + '_Location');
        log(INFO, logS + ' Location: ' + currLoc);
        let environments = getMProp(currentJob + '_Environments');
        if (environmentOverride !== '') {
            environments = environmentOverride;
        }
        log(INFO, logS + ' Environments: ' + environments);
        const environmentsA = environments.split(',');
        // TODO: Allow for a pre environment command (like git pulls or tenants)
        for (var j = 0; j < environmentsA.length; j++) {
            const currentEnvironment = trim(environmentsA[j]);
            const logSE = logS + col.green(' [JOB: ' + currentEnvironment + '] ');
            const propFile = getMProp(currentEnvironment + '_PropertyFile');
            log(INFO, logSE + ' Property File: ' + propFile);
            // Per Environment Run the Configured Tasks
            let jobTasksP = getMProp(currentJob + '_Tasks');
            let jobTasksA = [];
            if (jobTasksP != null) {
                jobTasksA = jobTasksP.split(',');
            }
            const tasks = getMProp(currentEnvironment + '_Tasks');
            if (tasks != null) {
                log(WARNING, 'Job tasks on an environment are discouraged; consider moving: ' + currentEnvironment + '_Tasks TO: ' + currentJob + '_Tasks');
                jobTasksA = jobTasksA.concat(tasks.split(','));
            }
            log(DEBUG, logSE + ' Tasks: ' + jobTasksA);
            let jvs = [];
            if (jobTasksA.length > 0) {
                for (let jTask of jobTasksA) {
                    let taskType = '';
                    let task = '';

                    let tObj:any = {};
                    try {
                        console.log('Parsing: ' , jTask);
                        tObj = JSON.parse(jTask);
                    } catch (e) {
                        log(ERROR, 'Parsing error on: |' + jTask + '| (' + e.message + ')');
                        process.exit(1);
                    }
                    if (tObj.T != null) {
                        taskType = 'TCLI TASK';
                        task = replaceAtSign(tObj.T, currLoc + propFile);
                    }
                    if (tObj.O != null) {
                        taskType = 'OS TASK';
                        task = replaceAtSign(tObj.O, currLoc + propFile);
                    }
                    if (tObj.S != null) {
                        taskType = 'SCRIPT TASK';
                        task = replaceAtSign(tObj.S, currLoc + propFile);
                    }
                    if (task.length > 77) {
                        task = task.substr(0, 77) + '...';
                    }
                    jvs = createTableValue(taskType, task, jvs, 'TYPE', 'TASK');
                }
            }
            log(INFO, col.blue('TASK SUMMARY]') + ' ENVIRONMENT: ' + currentEnvironment);
            console.table(jvs);
            for (let k = 0; k < jobTasksA.length; k++) {
                // console.log('Parsing: ' , jobTasksA[k] , '|');
                const currentTask = jobTasksA[k].trim();
                // console.log('Parsing: ' , currentTask , '|');
                let tObj = JSON.parse(currentTask);
                // console.log(tObj);
                let logT = logSE;
                let command = 'cd ' + currLoc + ' && ';
                if (tObj.T != null) {
                    /* TODO: mutliple does not accept comma's (for additional json entries...
                    let ansCom = '';
                    if(tObj.ANSWERS != null){
                        ansCom = ' -a ' + tObj.ANSWERS;
                    } */
                    logT += col.brightCyan('[' + (k + 1) + '] [TCLI TASK]\n');
                    //TODO: USE Absolute path ? We can't for the moment, since -p option only takes relative path.
                    //const absPropFile = process.env.PWD + '/' + propFile;
                    //console.log('absPropFile: ' + absPropFile)
                    //command += 'tcli -p "' + absPropFile + '" ' + tObj.T;
                    command += 'tcli -p "' + propFile + '" ' + tObj.T;
                    //command += 'tcli -p "' + propFile + '" ' + tObj.T + ansCom;
                }
                if (tObj.O != null) {
                    logT += col.brightCyan('[' + (k + 1) + '] [OS TASK]\n');
                    command += tObj.O;
                }
                if (tObj.S != null) {
                    logT += col.brightCyan('[' + (k + 1) + '] [SCRIPT TASK]\n' + tObj.S);
                    command += 'node ' + tObj.S;
                }
                log(DEBUG, logT + 'Command (before replacing): ' + command);
                command = replaceAtSign(command, currLoc + propFile);
                log(INFO, logT + ' Command: ' + command + ' (Fail on Error: ' + doFailOnError + ')');
                run(command, doFailOnError);
            }
        }
    }
}

const TCLI_INTERACTVIE = 'tcli-interactive';

export async function multipleInteraction() {
    const PropertiesReader = require('properties-reader');
    let mOpts:any = getMultipleOptions();
    mFile = mOpts.name;
    let failOnError = getMProp('Fail_On_Error');
    if (failOnError == null) {
        failOnError = 'YES';
    }
    const doFailOnError = !(failOnError.toLowerCase() === 'no');
    log(INFO, 'Multiple Cloud Interactions');
    log(INFO, '- Managing Multiple, Using file: ' + mFile + ' (Fail on error:', doFailOnError, ')');
    let taskOverRide = false;
    let miTask = getMProp('Multiple_Interaction_CLITask');

    //Start a loop till the user end's it (interactive), do reload prop files every time
    while (true) {
        let miPropFolder = getMProp('Multiple_Interaction_Property_File_Folder');
        let miPropFiles = getMProp('Multiple_Interaction_Property_Files');
        if (!taskOverRide) {
            miTask = getMProp('Multiple_Interaction_CLITask');
        }
        let displayTask = miTask;
        if (miTask === '') {
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
            // # A comma separated list of environment property files to connect to for interactions (Use ALL for All property files, and EXCEPT:<filename>, to exclude file).
            // # Multiple_Interaction_Property_Files=ALL,EXCEPT:tibco-cloud.properties
            if (!(miPropFilesA[miP].indexOf('.properties') > 0)) {
                miPropFilesA[miP] += '.properties';
            }
            eRow['NAME'] = miPropFilesA[miP].replace('.properties', '').replace('tibco-cloud-', '').replace('tibco-cloud', '');
            // 2. Open the property files one by one and get the ClientID / OAUTH details
            const curProps = PropertiesReader(miPropFolder + miPropFilesA[miP]).path();
            eRow['AUTHENTICATION TYPE'] = '';
            if (curProps && curProps.CloudLogin) {
                if (curProps.CloudLogin.clientID) {
                    if (curProps.CloudLogin.clientID.trim() !== '') {
                        eRow['AUTHENTICATION TYPE'] = 'CLIENT ID';
                    }
                }
                // Pick up OAUTH
                if (curProps.CloudLogin.OAUTH_Token) {
                    if (curProps.CloudLogin.OAUTH_Token.trim() !== '') {
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
        console.log(col.blue('|------------------------------------------------|'));
        console.log(col.blue('|     M U L T I P L E    I N T E R A C T I O N   |'));
        console.log(col.blue('|------------------------------------------------|'));
        console.log(col.blue(`|- TASK: ${displayTask} `));
        //console.log(col.blue('|------------------------------------------------|'));
        //console.log(col.blue('ENVIRONMENTS:'));
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
        let chosenEnv = await askMultipleChoiceQuestionSearch('On which environment would you like to run ' + col.blue(displayTask) + ' ?', userOptions);
        if (chosenEnv === 'QUIT' || chosenEnv === 'EXIT') {
            console.log('\x1b[36m%s\x1b[0m', 'Thank you for using the TIBCO Cloud CLI... Goodbye :-) ');
            process.exit(0);
        }
        //
        if (chosenEnv === 'CHANGE TO INTERACTIVE CLI TASK') {
            log(INFO, 'Setting task to: ' + TCLI_INTERACTVIE);
            miTask = '';
            taskOverRide = true;
            displayTask = TCLI_INTERACTVIE;
        } else {
            if (chosenEnv === 'CHANGE TASK') {
                const cTsks = require('./config/config-cli-task.json').cliTasks as TCLITask[];
                const taskDescription = [TCLI_INTERACTVIE];
                const taskTarget = [''];
                for (let cliTask in cTsks) {
                    if (cTsks[cliTask].enabled && !cTsks[cliTask].internal && cTsks[cliTask].multipleInteraction) {
                        // console.log('\x1b[36m%s\x1b[0m',':', ' ' + cTsks[cliTask].description);
                        taskDescription.push(cliTask + ') ' + cTsks[cliTask].description);
                        taskTarget.push(cliTask);
                    }
                }
                let chosenTask = await askMultipleChoiceQuestionSearch('Which cli task would you like to switch to ?', taskDescription);
                for (let taskN in taskDescription) {
                    if (taskDescription[taskN] === chosenTask) {
                        taskOverRide = true;
                        miTask = taskTarget[taskN];
                    }
                }
            } else {
                // 5. Execute the task, when it was none go back directly when it was a task have pause message before displaying the table again
                let propFileToUse = '';
                for (let envNumber in environmentOptions) {
                    propFileToUse = miPropFilesA[envNumber];
                    let command = 'tcli -p "' + miPropFolder + propFileToUse + '" ' + miTask;
                    if (chosenEnv === 'ALL ENVIRONMENTS') {
                        console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'));
                        run(command, doFailOnError);
                        // await askQuestion('Press [enter] to continue...');
                    } else {
                        if (environmentOptions[envNumber] === chosenEnv) {
                            console.log(col.blue('ENVIRONMENT: ' + environmentOptions[envNumber] + '   (TASK: ' + displayTask + ')'));
                            // console.log('Propfile to use: ', miPropFilesA[envNumber]);
                            run(command, doFailOnError);

                        }
                    }
                }
                if (miTask !== '') {
                    await askQuestion('Press [enter] to continue...');
                }
            }
        }
    }
}

let propsM;
let fileExtension = '';

function getMProp(property, propFileName?) {
    let propFileToUse = mFile;
    if (propFileName && propFileName.trim() != null) {
        propFileToUse = propFileName;
    }
    log(DEBUG, 'Getting Property: |' + property + '|');
    if (propsM == null) {
        const PropertiesReader = require('properties-reader');
        propsM = PropertiesReader(propFileToUse).path();
        if (propsM.PROPERTY_EXTENSION_FILE != null && propsM.PROPERTY_EXTENSION_FILE.trim() !== '') {
            log(INFO, 'Adding extension to propfile(' + propFileToUse + ') : ' + propsM.PROPERTY_EXTENSION_FILE)
            let propsTwo = PropertiesReader(propsM.PROPERTY_EXTENSION_FILE).path();
            fileExtension = propsM.PROPERTY_EXTENSION_FILE;
            const objectTemp = {...propsTwo, ...propsM};
            propsM = objectTemp;
        }
        //console.log(propsM);
    }
    let re;
    if (propsM != null) {
        re = _.get(propsM, property);
        if (re != null) {
            re = replaceDollar(re);
        }
    } else {
        log(ERROR, 'Property file not set yet...')
    }
    log(DEBUG, 'Returning Property(' + property + '): ', re);
    return re;
}

function replaceDollar(content) {
    if (content.includes('${') && content.includes('}')) {
        const subProp = content.substring(content.indexOf('${') + 2, content.indexOf('${') + 2 + content.substring(content.indexOf('${') + 2).indexOf('}'));
        log(DEBUG, 'Looking for subprop: ' + subProp);
        content = content.replace(/\${.*?\}/, getMProp(subProp));
        log(DEBUG, 'Replaced: ' + content);
        content = replaceDollar(content);
    }
    return content;
}

function replaceAtSign(content, propFile) {
    if (content.includes('@{') && content.includes('}')) {
        const subProp = content.substring(content.indexOf('@{') + 2, content.indexOf('@{') + 2 + content.substring(content.indexOf('@{') + 2).indexOf('}'));
        log(DEBUG, 'Looking for subprop: |' + subProp + '| on: |' + content + '| propFile: ' + propFile);
        content = content.replace(/@{.*?\}/, getPropFromFile(subProp, propFile));
        log(DEBUG, 'Replaced: ' + content);
        content = replaceAtSign(content, propFile);
    }
    return content;
}

function getPropFromFile(property, file) {
    log(DEBUG, 'Getting Property: |' + property + '| from file: ' + file);
    const PropertiesReader = require('properties-reader');
    const propsToGet = PropertiesReader(file).path();
    const re = _.get(propsToGet, property);
    log(DEBUG, 'Returning Property(' + property + '): ', re);
    return re;
}
