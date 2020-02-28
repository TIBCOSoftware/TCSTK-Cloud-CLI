// This file manages the applications
require('./build/common-functions');
const gulp = require('gulp');
//const inquirerA = require('inquirer');
const configApp = require('./config-template.json');
// var templatesToUse = ['Template1', 'Template2', 'TCSTK-case-manager-app'];
var templatesToUse = [];
const isWindows = process.platform == 'win32';


// Funcation called from the cli to pick up info and call the create starter
// function
async function newStarter() {
    log(INFO, 'Creating New Starter...');
    // console.log(configApp);

    for (var key in configApp.templates) {
        if (configApp.templates.hasOwnProperty(key)) {
            // console.log(key + " -> " + configApp.templates[key]);
            if (configApp.templates[key].enabled) {
                templatesToUse.push(configApp.templates[key].displayName);
            }
        }
    }
    // console.log(process.argv);
    var starterName = '';
    var starterTemplate = '';
    let doStart = true;
    for (arg in process.argv) {
        // console.log(process.argv[arg]);
        if (process.argv[arg] == 'new') {
            if (process.argv.length - 1 > arg) {
                var temp = parseInt(arg) + 1;
                // console.log('Name: ('+arg+')('+temp+') ' +
				// process.argv[temp]);
                starterName = process.argv[temp];
            }
        }
        if (process.argv[arg] == '--template' || process.argv[arg] == '-t') {
            if (process.argv.length - 1 > arg) {
                var temp = parseInt(arg) + 1;
                // console.log('Template: ('+arg+')('+temp+') ' +
				// process.argv[temp]);
                starterTemplate = process.argv[temp];

                for (var key in configApp.templates) {
                    // console.log('KEY: ' + key );
                    if (configApp.templates.hasOwnProperty(key)) {
                        // console.log(key + " -> " + configApp.templates[key]);
                        if (starterTemplate == key) {
                            starterTemplate = configApp.templates[key].displayName;
                        }
                    }
                }
            }
        }
        if (process.argv[arg] == '--surpressStart' || process.argv[arg] == '-s') {
            doStart = false;
        }
    }
    // console.log('doStart: ' + doStart);
    if (starterName == '') {
        starterName = await askQuestion('What is the name of your cloud starter ?');
    }
    if (starterTemplate == '') {
        starterTemplate = await askMultipleChoiceQuestion('Which Template would you like to use for your cloud starter ?', templatesToUse);
    }
    log(INFO, '    Cloud Starter Name: ' + starterName);
    var stTempJson = {};
    for (var key in configApp.templates) {
        if (configApp.templates.hasOwnProperty(key)) {
            if (starterTemplate == configApp.templates[key].displayName) {
                stTempJson = configApp.templates[key];
            }

        }
    }
    log(INFO, 'Cloud Starter Template: ', stTempJson.displayName);
    log(DEBUG, 'Cloud Starter Template: ', stTempJson);
    return createNewStarter(starterName, stTempJson, doStart);
}

// Function to create a new starter, based on a template
createNewStarter = function (name, template, doStart) {
    return new Promise(async function (resolve, reject) {
        var toDir = process.cwd() + '/' + name;
        if (template.useGit) {
            // use git for template
            getGit(template.git, toDir, template.gitTag);
            // remove git folder
            if (template.removeGitFolder) {
            	log(DEBUG, 'Is Windows: ' + isWindows);
            	if(isWindows){
            		run('cd ' + toDir + ' && rmdir /q /s .git');
            	} else {
            		run('cd ' + toDir + ' && rm -rf .git');
            	}                
            } 
             // console.log(gitPostCom);
            if(isWindows){
            	for (var gitPostCom of template.gitPostCommandsWin) {
            		run('cd ' + toDir + ' && ' + gitPostCom);
            	}
            }else{
            	for (var gitPostCom of template.gitPostCommands) {
            		run('cd ' + toDir + ' && ' + gitPostCom);
            	}
            }
        } else {
            var fromDir = __dirname + template.templateFolder;
            copyDir(fromDir, toDir);
        }
        try {
            //var results = {};
            //var doReplace = false;
            for (var rep of template.replacements) {
                // doReplace = true;
                log(DEBUG, 'Replacing from: ' + rep.from + " to: " + rep.to);
                var repTo = rep.to;
                if (rep.to == "@name") {
                    repTo = name;
                }
                replaceInFile(rep.from, repTo, toDir + '/**');
            }
            log(INFO, '\x1b[34mInstalling NPM packages for ' + name + '...\033[0m');
            run('cd ' + name + ' && npm install');
            run('cd ' + name + ' && tcli -c -t "' + template.displayName + '"');
            // create a new tibco-cloud.properties file
            if(isWindows){
                for (var postCom of template.PostCommandsWin) {
                    run('cd ' + toDir + ' && ' + postCom);
                }
            }else{
                for (var postCom of template.PostCommands) {
                    run('cd ' + toDir + ' && ' + postCom);
                }
            }
            if(doStart){
                log(INFO, '\x1b[34m Cloud Starter ' + name + ' Created Successfully !!!\033[0m');
                run('cd ' + toDir + ' && tcli');
            } else {
                console.log('\x1b[36m%s\x1b[0m', 'Cloud Starter ' + name + ' Created Successfully, now you can go into the cloud starter directory "cd ' + name + '" and run "tcli start" to start your cloud starter or run "tcli" in your cloud starter folder to manage your cloud starter. Have fun :-)');
            }
         } catch (error) {
            log(ERROR, 'Error occurred:', error);
        }
        resolve();
    });
}

const git = require('gulp-git');
// const simpleGit = require('simple-git')();
// function to get git repo
getGit = function (source, target, tag) {
    // TODO: use git package
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    // git clone --branch bp-baseV1
	// https://github.com/TIBCOSoftware/TCSDK-Angular
    if (tag == null || tag == 'LATEST' || tag == '') {
        // git.clone(source, target);
        run('git clone "' + source + '" "' + target + '" ');
        /*
		 * git.clone(source, {args: target}, function (err) { logO(ERROR, err);
		 * });
		 */
    } else {
        run('git clone "' + source + '" "' + target + '" -b ' + tag);
        /*
		 * git.clone(source, {args: '--branch ' + tag + ' ' + target}, function
		 * (err) { logO(ERROR, err); });
		 */
    }
}


const fseA = require('fs-extra');
// Function to copy a directory
copyDir = function (fromDir, toDir) {
    log(DEBUG, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fseA.copySync(fromDir, toDir, {overwrite: true});
}

// Function to create a new starter, based on a template
manageGlobalConfig = function (name, template) {
    return new Promise(async function (resolve, reject) {
        if(displayGlobalConnectionConfig()){
            updateGC = await askMultipleChoiceQuestion('Would you like to update the Global Connection Configuration ?', ['YES', 'NO']);
            if(updateGC == 'YES'){
                updateGlobalConnectionConfig();
            }
        } else {
            updateGlobalConnectionConfig();
        }
        resolve();
    });
}

// Wrapper to create a multiple prop file
createMultiplePropertyFileWrapper = function () {
    return new Promise(async function (resolve, reject) {
        await createMultiplePropertyFile();
        resolve();
    });
}


// Gulp task definition
gulp.task('new-starter', newStarter);
gulp.task('manage-global-config', manageGlobalConfig);
gulp.task('create-multiple-property-file', createMultiplePropertyFileWrapper);

// Set log debug level from local property
setLogDebug(configApp.useDebug);
