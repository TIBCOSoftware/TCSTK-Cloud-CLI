// This file manages the applications

const gulp = require('gulp');
const inquirerA = require('inquirer');
const configApp = require('./template-config.json');
//var templatesToUse = ['Template1', 'Template2', 'TCSTK-case-manager-app'];
var templatesToUse = [];

// Funcation called from the cli to pick up info and call the create starter function
async function newStarter(){
    log(INFO, 'Creating New Starter...');
    //console.log(configApp);

    for (var key in configApp.templates) {
        if (configApp.templates.hasOwnProperty(key)) {
            // console.log(key + " -> " + configApp.templates[key]);
            if(configApp.templates[key].enabled) {
                templatesToUse.push(configApp.templates[key].displayName);
            }
        }
    }
    // console.log(process.argv);
    var starterName = '';
    var starterTemplate = '';
    for(arg in process.argv){
        // console.log(process.argv[arg]);
        if(process.argv[arg] == 'new'){
            if(process.argv.length - 1 > arg){
                var temp = parseInt(arg) + 1;
                // console.log('Name: ('+arg+')('+temp+') ' + process.argv[temp]);
                starterName = process.argv[temp];
            }
        }
        if(process.argv[arg] == '--template' || process.argv[arg] == '-t' ){
            if(process.argv.length - 1 > arg){
                var temp = parseInt(arg) + 1;
                // console.log('Template: ('+arg+')('+temp+') ' + process.argv[temp]);
                starterTemplate = process.argv[temp];

                for (var key in configApp.templates) {
                    // console.log('KEY: ' + key );
                    if (configApp.templates.hasOwnProperty(key)) {
                        // console.log(key + " -> " + configApp.templates[key]);
                        //if(configApp.templates[key].enabled) {
                            if(starterTemplate == key){
                                starterTemplate = configApp.templates[key].displayName;
                            }
                        //}
                    }
                }
            }
        }
    }
    if(starterName == ''){
        starterName = await askQuestionAPP('What is the name of your cloud starter ?');
    }
    if(starterTemplate == ''){
        starterTemplate = await askMultipleChoiceQuestionAPP ('Which template would you like to use for your cloud starter ?', templatesToUse);
    }
    log(INFO, '    Cloud Starter Name: ' + starterName);
    var stTempJson = {};
    for (var key in configApp.templates) {
        if (configApp.templates.hasOwnProperty(key)) {
            if(starterTemplate == configApp.templates[key].displayName){
                stTempJson = configApp.templates[key];
            }

        }
    }
    log(INFO, 'Cloud Starter Template: ', stTempJson);
    return createNewStarter(starterName, stTempJson);
}



// function to ask a multiple choice question
async function askMultipleChoiceQuestionAPP(question, options) {
    var re = 'result';
    await inquirerA.prompt([{
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

// function to ask a question
askQuestionAPP = async function (question, type = 'input') {
    var re = 'result';
    await inquirerA.prompt([{
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

// Function to create a new starter, based on a template
createNewStarter = function (name, template) {
    return new Promise( function (resolve, reject) {
        var toDir = process.cwd() + '/' + name;
        if(template.useGit){
            //TODO: implament use git for template
        } else {
            var fromDir = __dirname + template.templateFolder;
            // console.log('Copying template ' + template + ' From: ' + fromDir + ' To: ' + toDir);
            copyDir(fromDir, toDir);
        }
        const replace = require('replace-in-file');
        try {
            var results = {};
            for(rep of template.replacements){
                log(DEBUG, 'Replacing from: ' + rep.from + " to: " + rep.to);
                var repTo = rep.to;
                if(rep.to == "@name"){
                    repTo = name;
                }
                const regex = new RegExp(rep.from, 'g');
                const options = {
                    files: toDir + '/**',
                    from: regex,
                    to: repTo,
                    countMatches: true
                };
                results = replace.sync(options);
                //console.log('Replacement results:', results);
            }

            //console.log('Replacement results:', results);
            // TODO: provide all replacement values at once
            for(result of results){
                console.log('\x1b[35m%s\x1b[0m', '[REPLACED]', '(' + result.numReplacements + ')',  result.file);
            }
            run('cd ' + name + ' && npm install');
            console.log('\x1b[34m%s\x1b[0m', 'Cloud Starter ' + name + ' Created Successfully...');
            //TODO: provide command to create the tibco-cloud.properties file
        }
        catch (error) {
            log(ERROR, 'Error occurred:', error);
        }
        resolve();
    });
}

const fseA = require('fs-extra');
// Function to copy a directory
copyDir = function (fromDir, toDir) {
    log(DEBUG, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fseA.copySync(fromDir, toDir, {overwrite: true});
}

// Gulp task definition
gulp.task('new-starter', newStarter);

const execSync = require('child_process').execSync;
// Run an OS Command
run = function (command) {
    return new Promise(function (resolve, reject) {
        log(DEBUG, 'Executing Command: ' + command);
        //console.log('Executing Command: ' + command);
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

// Log function
const INFO = 'INFO';
const DEBUG = 'DEBUG';
const ERROR = 'ERROR';
const useDebug = (configApp.Use_Debug == 'true');
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
