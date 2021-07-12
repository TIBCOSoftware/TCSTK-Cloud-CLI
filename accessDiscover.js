
const fs = require('fs')

function accessDiscover (useDiscover) {
  const tasks = require('./src/config/config-cli-task.json').cliTasks
  for (const tn in tasks) {
    if (tasks[tn].category === 'discover') {
      console.log(tn)
      tasks[tn].enabled = useDiscover
    }
  }
  const dataForFile = JSON.stringify({
    cliTasks: tasks
  }, null, 2)
  fs.writeFileSync('./src/config/config-cli-task.json', dataForFile, 'utf8')
}

accessDiscover(true)
