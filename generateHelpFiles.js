
require('./ts-out/common/common-functions')
const { replaceInFile } = require('./ts-out/common/common-functions')
const { copyFile } = require('./ts-out/common/common-functions')
const { doesFileExist } = require('./ts-out/common/common-functions')
// ---
// ### Alternatives

const fs = require('fs')

const ONLY_GENERATE_NEW_FILES = true

let i = 0
function main (OnlyGenerateNew) {
  const tasks = require('./src/config/config-cli-task.json').cliTasks
  for (const tn in tasks) {
    if (tasks[tn].enabled === true && tasks[tn].internal === false) {
      if (tn !== '') {
        console.log(tn)
        const fName = 'docs/tasks/' + tn + '.md'
        if (!OnlyGenerateNew || !doesFileExist(fName)) {
          copyFile('docs/tasks/template.md', fName)
          replaceInFile('@@TASK@@', tn, fName)
          // @@DESCRIPTION@@
          replaceInFile('@@DESCRIPTION@@', tasks[tn].description, fName)
          if (tasks[tn].taskAlternativeNames != null && tasks[tn].taskAlternativeNames.length > 0) {
            replaceInFile('@@ALT@@', '---\n### Alternatives', fName)
            let alts = ''
            for (const alt of tasks[tn].taskAlternativeNames) {
              alts += '> tcli ' + alt + '\n\n'
            }
            replaceInFile('@@ALTS@@', alts, fName)
          } else {
            replaceInFile('@@ALT@@', '', fName)
            replaceInFile('@@ALTS@@', '', fName)
          }
        }
        i++
      }
    }
  }
}

function generateIndex () {
  const tasks = require('./src/config/config-cli-task.json').cliTasks
  let dataForFile = '# TCLI TASKS: \n\n---'
  const tsksCAT = {}
  for (const tn in tasks) {
    if (tasks[tn].enabled === true && tasks[tn].internal === false) {
      if (tn !== '') {
        const cat = tasks[tn].category
        console.log(cat + ' : ' + tn)
        if (!tsksCAT[cat]) {
          tsksCAT[cat] = {}
        }
        tsksCAT[cat][tn] = '[' + tn + '](./' + tn + '.md) - ' + tasks[tn].description
      }
    }
  }
  console.log(tsksCAT)
  for (const [key, value] of Object.entries(tsksCAT)) {
    dataForFile += '\n\n\n## ' + key + '\n\n---\n'
    for (const [tKey, tVal] of Object.entries(value)) {
      dataForFile += '\n\n' + tVal
    }
  }
  fs.writeFileSync('docs/tasks/0_task_index.md', dataForFile, 'utf8')
}

function adjustTasks () {
  const tasks = require('./src/config/config-cli-task.json').cliTasks
  for (const tn in tasks) {
    console.log(tn)
    delete tasks[tn].taskName
  }
  const dataForFile = JSON.stringify({
    cliTasks: tasks
  })
  fs.writeFileSync('./src/config/config-cli-task.json', dataForFile, 'utf8')
}

function generateReadMeTable () {
  let dataForFile = ''
  const cliTasks = require('./src/config/config-cli-task.json').cliTasks
  const hTasks = []
  const taskCat = {}
  for (const cliTask in cliTasks) {
    if (cliTask) {
      const task = cliTasks[cliTask]
      if (task.enabled) {
        hTasks.push(cliTask)
        if (task.category) {
          task.taskFullName = cliTask
          if (!taskCat[task.category]) {
            taskCat[task.category] = [task]
          } else {
            taskCat[task.category].push(task)
          }
        }
      }
    }
  }
  for (const cat in taskCat) {
    dataForFile += '\n## ' + cat + '\n\n| TASK | Description |\n|------|:------------|\n'
    // dataForFile += ' '.padStart(47) + ('[*** ' + cat + ' ***]');
    for (const tas of taskCat[cat]) {
      if (tas.internal) {
        dataForFile += '|' + tas.taskFullName + '|' + tas.description + '|\n'
      } else {
        dataForFile += '|[' + tas.taskFullName + '](./docs/tasks/' + tas.taskFullName + '.md)|' + tas.description + '|\n'
      }
    }
  }
  // READMETable.md

  fs.writeFileSync('./READMETable.md', dataForFile, 'utf8')
}

// console.log('Generating Help Files...');
main(ONLY_GENERATE_NEW_FILES)
generateIndex()
// adjustTasks();
generateReadMeTable()
