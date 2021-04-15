// This file manages the applications
import {
    copyDir, createMultiplePropertyFile, DEBUG, displayGlobalConnectionConfig, ERROR, getGit, INFO,
    log,
    replaceInFile, run, setLogDebug, setProperty,
    updateGlobalConnectionConfig
} from "./common/common-functions";
import {Global} from "./models/base";
import {Template} from "./models/tcli-models";
import {askMultipleChoiceQuestion, askQuestion} from "./common/user-interaction";

declare var global: Global;

// require('./common/common-functions');
// const configApp = require('./config/config-template.json');
const templatesToUse = [];
const isWindows = process.platform === 'win32';

// Function called from the cli to pick up info and call the create starter
export async function newStarter() {
    log(INFO, 'Creating New Starter...');
    const templates = require('./config/config-template.json').templates as Template[];
    for (let template of templates) {
        if (template.enabled) {
            templatesToUse.push(template.displayName);
        }
    }
    let starterName = '';
    let starterTemplate = '';
    let doStart = true;
    for (let argN = 0; argN < process.argv.length; argN++) {
        if (process.argv[argN] === 'new') {
            if (process.argv.length - 1 > argN) {
                const temp = argN + 1;
                starterName = process.argv[temp];
            }
        }
        if (process.argv[argN] === '--template' || process.argv[argN] === '-t') {
            if (process.argv.length - 1 > argN) {
                const temp = argN + 1;
                starterTemplate = process.argv[temp];
                for (let template of templates) {
                    if (starterTemplate === template.name) {
                        starterTemplate = template.displayName;
                    }
                }
            }
        }
        if (process.argv[argN] === '--surpressStart' || process.argv[argN] === '-s') {
            doStart = false;
        }
    }
    // console.log('doStart: ' + doStart);
    if (starterName === '') {
        starterName = await askQuestion('What is the name of your cloud starter ?');
    }
    if (starterTemplate === '') {
        starterTemplate = await askMultipleChoiceQuestion('Which Template would you like to use for your cloud starter ?', templatesToUse);
    }
    log(INFO, '    Cloud Starter Name: ' + starterName);
    let stTempJson: any = {};
    for (let template of templates) {
        if (starterTemplate === template.displayName) {
            stTempJson = template;
        }
    }
    log(INFO, 'Cloud Starter Template: ', stTempJson.displayName);
    log(DEBUG, 'Cloud Starter Template: ', stTempJson);
    createNewStarter(starterName, stTempJson, doStart);
}

// Function to create a new starter, based on a template
function createNewStarter(name:string, template:Template, doStart:boolean) {
    const toDir = process.cwd() + '/' + name;
    if (template.useGit) {
        // use git for template
        getGit(template.git, toDir, template.gitTag);
        // remove git folder
        if (template.removeGitFolder) {
            log(DEBUG, 'Is Windows: ' + isWindows);
            if (isWindows) {
                run('cd ' + toDir + ' && rmdir /q /s .git');
            } else {
                run('cd ' + toDir + ' && rm -rf .git');
            }
        }
        // console.log(gitPostCom);
        if (isWindows) {
            for (let gitPostCom of template.gitPostCommandsWin) {
                run('cd ' + toDir + ' && ' + gitPostCom);
            }
        } else {
            for (let gitPostCom of template.gitPostCommands) {
                run('cd ' + toDir + ' && ' + gitPostCom);
            }
        }
    } else {
        const fromDir = global.PROJECT_ROOT + template.templateFolder;
        copyDir(fromDir, toDir);
    }
    try {
        //const results = {};
        //const doReplace = false;
        for (const rep of template.replacements) {
            // doReplace = true;
            log(DEBUG, 'Replacing from: ' + rep.from + " to: " + rep.to);
            let repTo = rep.to;
            if (rep.to === "@name") {
                repTo = name;
            }
            replaceInFile(rep.from, repTo, toDir + '/**');
        }
        log(INFO, '\x1b[34mInstalling NPM packages for ' + name + '...\x1b[0m');
        run('cd ' + name + ' && npm install --legacy-peer-deps');
        run('cd ' + name + ' && tcli -c -t "' + template.displayName + '"');
        // create a new tibco-cloud.properties file
        if (isWindows) {
            for (const postCom of template.PostCommandsWin) {
                run('cd ' + toDir + ' && ' + postCom);
            }
        } else {
            for (const postCom of template.PostCommands) {
                run('cd ' + toDir + ' && ' + postCom);
            }
        }
        if (doStart) {
            log(INFO, '\x1b[34m Cloud Starter ' + name + ' Created Successfully !!!\x1b[0m');
            run('cd ' + toDir + ' && tcli');
        } else {
            console.log('\x1b[36m%s\x1b[0m', 'Cloud Starter ' + name + ' Created Successfully, now you can go into the cloud starter directory "cd ' + name + '" and run "tcli start" to start your cloud starter or run "tcli" in your cloud starter folder to manage your cloud starter. Have fun :-)');
        }
    } catch (error) {
        log(ERROR, 'Error occurred:', error);
    }
}

// function to get git repo
/*
function getGit(source, target, tag) {
    log(INFO, 'Getting GIT) Source: ' + source + ' Target: ' + target + ' Tag: ' + tag);
    if (tag == null || tag === 'LATEST' || tag === '') {
        run('git clone "' + source + '" "' + target + '" ');
    } else {
        run('git clone "' + source + '" "' + target + '" -b ' + tag);
    }
}*/

// Function to copy a directory
/*
function copyDir(fromDir, toDir) {
    const fseA = require('fs-extra');
    log(DEBUG, 'Copying Directory from: ' + fromDir + ' to: ' + toDir);
    fseA.copySync(fromDir, toDir, {overwrite: true});
}*/

// Function to manage the global configuration
export async function manageGlobalConfig() {
    // Set the props to use global
    const itemsForGlobal = ['CloudLogin.clientID', 'CloudLogin.email', 'CloudLogin.pass', 'CloudLogin.OAUTH_Token', 'CloudLogin.Region', 'CloudLogin.OAUTH_Generate_Token_Name', 'CloudLogin.OAUTH_Generate_For_Tenants', 'CloudLogin.OAUTH_Generate_Valid_Hours', 'CloudLogin.OAUTH_Required_Hours_Valid'];
    for (const item of itemsForGlobal) {
        setProperty(item, 'USE-GLOBAL');
    }
    if (displayGlobalConnectionConfig()) {
        // There is a global config
        let updateGC = await askMultipleChoiceQuestion('Would you like to update the Global Connection Configuration ?', ['YES', 'NO']);
        if (updateGC === 'YES') {
            await updateGlobalConnectionConfig();
        }
    } else {
        await updateGlobalConnectionConfig();
    }
}

// Wrapper to create a multiple prop file
export async function createMultiplePropertyFileWrapper() {
    await createMultiplePropertyFile();
}

// Set log debug level from local property
setLogDebug(require('./config/config-template.json').useDebug);
