// This file manages the applications
require('./build/common-functions');
const gulp = require('gulp');
let mFile = '';

// Function to process the multiple property file
processMultipleFile = function(propfileName){
    return new Promise(async function (resolve, reject) {
        // setLogDebug('true');
        mFile = getMultipleFileName();
        log(INFO, '- Managing Multiple, Using file: ' + mFile);
        // Go Over All Starters
        const cloudStarters = getMProp('Cloud_Starters');
        log(INFO, '- Looping over Configured Starters: ' + cloudStarters);
        const cloudStartersA = cloudStarters.split(',');
        for(var i = 0; i < cloudStartersA.length; i++) {
            const currentStarter = trim(cloudStartersA[i]);
            const logS = '[STARTER: ' + currentStarter +']';
            // log(INFO, logS);
            // Per Starter Go Over the Configured Environments
            const currLoc = getMProp( currentStarter + '_Location');
            log(INFO, logS + ' Location: ' + currLoc);
            const environments = getMProp(currentStarter + '_Environments');
            log(INFO, logS + ' Environments: ' + environments);
            const environmentsA = environments.split(',');
            for(var j = 0; j < environmentsA.length; j++) {
                const currentEnvironment = trim(environmentsA[j]);
                const logSE = logS + '[ENVIRONMENT: ' + currentEnvironment + ']';
                const propFile = getMProp(currentEnvironment + '_PropertyFile');
                log(INFO, logSE + ' Property File: ' + propFile);
                // Per Environment Run the Configured Tasks
                const tasks = getMProp(currentEnvironment + '_Tasks');
                log(INFO, logSE + ' Tasks: ' + tasks);
                const tasksA = tasks.split(',');
                for(var k = 0; k < tasksA.length; k++) {
                    const currentTask = trim(tasksA[k]);
                    let tObj = JSON.parse(currentTask);
                    // console.log(tObj);
                    let logT = logSE;
                    let command = 'cd ' + currLoc + ' && ';
                    if(tObj.T != null){
                        logT += '['+ (k+1) + ']   [TCLI TASK]';
                        command += 'tcli -p ' + propFile + ' ' + tObj.T;
                    }
                    if(tObj.O != null){
                        logT += '['+ (k+1) + ']     [OS TASK]';
                        command += tObj.O;
                    }
                    if(tObj.S != null){
                        logT += '['+ (k+1) + '] [SCRIPT TASK]' + tObj.S;
                        command += 'node ' + tObj.S;
                    }
                    log(INFO, logT + ' Command: ' + command);
                    run(command);
                }
            }
        }
        resolve();
    });
}

// Gulp task definition
gulp.task('run-multiple', processMultipleFile);

// TODO: Move this to global (merge with other property function)
let propsM;

getMProp = function(property){
    log(DEBUG, 'Getting Property: |' + property + '|');
    if(propsM == null) {
        const PropertiesReader = require('properties-reader');
        propsM = PropertiesReader(mFile).path();
        //console.log(propsM);
    }
    let re;
    if(propsM != null){
        re = indexObj(propsM, property);
        if(re != null) {
            re = replaceDollar(re);
        }
    } else {
        log(ERROR, 'Property file not set yet...')
    }
    log(DEBUG, 'Returning Property('+property+'): ' , re);
    return re;
}


replaceDollar = function (content){
    if(content.includes('${') && content.includes('}')){
        const subProp = content.substring(content.indexOf('${') + 2, content.indexOf('${') + 2 + content.substring(content.indexOf('${') + 2).indexOf('}'));
        log(DEBUG, 'Looking for subprop: ' + subProp);
        content = content.replace(/\${.*?\}/ , getMProp(subProp));
        log(DEBUG, 'Replaced: ' + content);
        content = replaceDollar(content);
    }
    return content;
}
