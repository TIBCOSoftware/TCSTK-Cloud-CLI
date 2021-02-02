
require('./src/build/common-functions');
// ---
// ### Alternatives

let i = 0;

function main(){
    const tasks = require('./src/config/config-cli-task.json').cliTasks;
    for(let tn in tasks){
        if(tasks[tn].enabled == true && tasks[tn].internal == false){
            if(tasks[tn].taskName != ''){
                console.log(tasks[tn].taskName);
                const fName = 'docs/tasks/' + tasks[tn].taskName + '.md';

                copyFile('docs/tasks/template.md', fName);
                replaceInFile('@@TASK@@', tasks[tn].taskName, fName);
                // @@DESCRIPTION@@
                replaceInFile('@@DESCRIPTION@@', tasks[tn].description, fName);
                if(tasks[tn].taskAlternativeNames != null && tasks[tn].taskAlternativeNames.length > 0){
                    replaceInFile('@@ALT@@', '---\n### Alternatives', fName);
                    let alts = '';
                    for (let alt of tasks[tn].taskAlternativeNames){
                        alts += '> tcli ' + alt + '\n\n';
                    }
                    replaceInFile('@@ALTS@@', alts, fName);
                } else {
                    replaceInFile('@@ALT@@', '', fName);
                    replaceInFile('@@ALTS@@', '', fName);
                }

                i++;
            }



        }


    }



}


console.log('Generating Help Files...');
main();
