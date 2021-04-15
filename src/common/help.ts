import {col, doesFileExist, ERROR, INFO, log, WARNING} from "./common-functions";
import {Global} from "../models/base";
import {TCLITask} from "../models/tcli-models";
import {askMultipleChoiceQuestionSearch} from "./user-interaction";

declare var global: Global;

const CCOM = require('./cloud-communications');
const ECHOMD = require('../echomd/echomd').echomd;


const GIT_HUB_LINK_RAW = 'https://raw.githubusercontent.com/TIBCOSoftware/TCSTK-Cloud-CLI/master/docs';
// const GIT_HUB_LINK_DOC = 'https://github.com/TIBCOSoftware/TCSTK-Cloud-CLI/blob/master/docs';


// Show help on the console
export async function showInlineHelp() {
    // TODO: show a more.. (by pressing enter to go down...)
    console.log('TIBCO Cloud CLI Version: ' + require('../../package.json').version);
    console.log(col.blue('tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)] [--version(-v)] [--update(-u)] [--browse(-b)] [--propfile(-p)] [--multiple(-m) --multipleFile(-f) <multiple-file-name> --job(-j) <job-name> --environment(-e) <environment name>] [--multipleInteraction(-i)] [--surpressStart(-s)] [--answers(a) <answers>]'));
    console.log('Note: When you run "tcli" as a loose command it will bring you in an interactive menu based on context.');
    console.log('new: Create new Cloud starter. Usage] tcli new <name> [--template(-t)] <template-to-use>');
    console.log('        --debug: Display debug information.');
    console.log('     --createCP: Create a new tibco-cloud.properties file.');
    console.log('         --help: display this help ');
    console.log('      --version: display the version number');
    console.log('       --update: update the tcli');
    console.log('       --browse: browse tcli tasks (with an existing tibco-cloud.properties file)');
    console.log('     --propfile: when specified tcli will use a different property file then the default tibco-cloud.properties');
    console.log('     --multiple: run the task specified in the configured multiple property file. This allows you to execute tasks on many cloud starters and many different configured environments at the same time.');
    console.log(' --multipleFile: when specified tcli will use a different property file then the default manage-multiple-cloud-starters.properties');
    console.log(' --multipleInteraction: when specified, the multiple file will also be used, but in an interactive way. This is extremely handy if you want to run specific tcli jobs on multiple environments quickly.');
    console.log('      --answers: a comma(,) or column(:) separated list of answers to interactive questions. This is useful to run the tcli completely verbose; useful in a build-pipeline.');
    console.log('--surpressStart: When using this option after creating a new cloud starter the interactive tcli will not start.\n');
    console.log('These are the available TIBCO CLOUD CLI Tasks:');
    getAndListTasks();
    console.log(col.yellow('For more info visit: ') + 'https://tibcosoftware.github.io/TCSToolkit/');
    console.log('To get specific help on a task type: tcli -h <TASKNAME> or tcli --help <TASKNAME>');
}

// Help function that asks user what he wants help on
export async function showInteractiveHelp() {
    log(INFO, 'These are the available TIBCO CLOUD CLI Tasks:');
    const helpTasks = ['NONE', ...getAndListTasks()]
    // Ask for which task to show details and then display the MD
    let hDec = '';
    while (hDec !== 'NONE') {
        hDec = await askMultipleChoiceQuestionSearch('For which task would you like more details ? ', helpTasks);
        if (hDec !== 'NONE') {
            await showHelpOnTask(hDec);
        }
    }
}

// Help function that shows help on a specific task
export async function showHelpOnTask(task: string) {
    // Get Task help from github
    const url = GIT_HUB_LINK_RAW + '/tasks/' + task + '.md';
    // const docUrl = GIT_HUB_LINK_DOC + '/tasks/' + task + '.md';
    try {
        let onlineHelp = await CCOM.doRequest(encodeURI(url), {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })
        if (onlineHelp.statusCode === 200) {
            log(INFO, 'Online Help: ')
            console.log(ECHOMD(onlineHelp.body));
        } else {
            throw 'not online';
        }
    } catch (err) {
        const hFile = 'docs/tasks/' + task + '.md';
        if (doesFileExist(global.PROJECT_ROOT + hFile)) {
            log(WARNING, 'Offline Help: ')
            displayMDFile(hFile);
        } else {
            log(ERROR, 'No Help found for: ' + task);
            process.exit(1);
        }
    }
    console.log('For more info visit: ' + 'https://tibcosoftware.github.io/TCSToolkit/');
}

// Get a list of tasks and show them.
function getAndListTasks() {
    const cliTasks = require('../config/config-cli-task.json').cliTasks as TCLITask[];
    const hTasks: string[] = [];
    for (let cliTask in cliTasks) {
        if (cliTask) {
            const task = cliTasks[cliTask]!;
            let allowed = false;
            if (task.availableOnOs != null) {
                for (let allowedOS of task.availableOnOs) {
                    // console.log('OS:' + allowedOS);
                    if (allowedOS === process.platform || allowedOS === 'all') {
                        allowed = true;
                    }
                }
            }
            if (task.enabled && !task.internal && allowed) {
                hTasks.push(cliTask);
                let str = cliTask;
                const x = 45 - cliTask.length;
                for (let i = 0; i < x; i++) {
                    str = ' ' + str;
                }
                console.log(col.cyan(str + ':') + ' ' + task.description);
            }
        }
    }
    return hTasks;
}

// Function to display an MD File in the Console
function displayMDFile(mdFile: string) {
    const fs = require('fs');
    const mdFileContent = fs.readFileSync(global.PROJECT_ROOT + mdFile, 'utf8');
    console.log(ECHOMD(mdFileContent));
}
