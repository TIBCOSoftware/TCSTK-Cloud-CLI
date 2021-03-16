require('./src/build/common-functions');
// ---
// ### Alternatives

const ONLY_GENERATE_NEW_FILES = true;


let i = 0;
function main(OnlyGenerateNew) {
    const tasks = require('./src/config/config-cli-task.json').cliTasks;
    for (let tn in tasks) {
        if (tasks[tn].enabled == true && tasks[tn].internal == false) {
            if (tn != '') {
                console.log(tn);
                const fName = 'docs/tasks/' + tn + '.md';
                if (!OnlyGenerateNew || !doesFileExist(fName)) {
                    copyFile('docs/tasks/template.md', fName);
                    replaceInFile('@@TASK@@', tn, fName);
                    // @@DESCRIPTION@@
                    replaceInFile('@@DESCRIPTION@@', tasks[tn].description, fName);
                    if (tasks[tn].taskAlternativeNames != null && tasks[tn].taskAlternativeNames.length > 0) {
                        replaceInFile('@@ALT@@', '---\n### Alternatives', fName);
                        let alts = '';
                        for (let alt of tasks[tn].taskAlternativeNames) {
                            alts += '> tcli ' + alt + '\n\n';
                        }
                        replaceInFile('@@ALTS@@', alts, fName);
                    } else {
                        replaceInFile('@@ALT@@', '', fName);
                        replaceInFile('@@ALTS@@', '', fName);
                    }
                }
                i++;
            }
        }
    }
}

function generateIndex() {
    const tasks = require('./src/config/config-cli-task.json').cliTasks;

    let dataForFile = '# TCLI TASKS: \n\n---';

    const tsksCAT = {};

    for (let tn in tasks) {
        if (tasks[tn].enabled == true && tasks[tn].internal == false) {
            if (tn != '') {

                let cat = tasks[tn].category;
                console.log(cat + ' : ' + tn);
                if(!tsksCAT[cat]){
                    tsksCAT[cat] = {};
                }
                tsksCAT[cat][tn] = '['+tn+'](./'+tn+'.md) - ' + tasks[tn].description;
            }
        }
    }
    console.log(tsksCAT);

    for (const [key, value] of Object.entries(tsksCAT)) {
        dataForFile += '\n\n\n## ' + key + '\n\n---\n';
        for (const [tKey, tVal] of Object.entries(value)) {
            dataForFile += '\n\n' + tVal;
        }
    }

    const fs = require('fs');
    fs.writeFileSync('docs/tasks/0_task_index.md', dataForFile, 'utf8');

}

function adjustTasks() {
    const tasks = require('./src/config/config-cli-task.json').cliTasks;
    for (let tn in tasks) {
        console.log(tn);
        delete tasks[tn].taskName
    }
    const fs = require('fs');
    const dataForFile = JSON.stringify({
        cliTasks: tasks
    });
    fs.writeFileSync('./src/config/config-cli-task.json', dataForFile, 'utf8');
}

// console.log('Generating Help Files...');
// main(ONLY_GENERATE_NEW_FILES);
generateIndex();
// adjustTasks();
