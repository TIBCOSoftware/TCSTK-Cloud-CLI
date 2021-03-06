// #!/usr/bin/env ts-node --project /Users/hpeters@tibco.com/WebstormProjects/TCSTK-Cloud-CLI/tsconfig.json
import { Global } from '../models/base'
import { checkForGlobalPropertyFileUpgrades } from '../common/upgrades'
import path from 'path'
declare let global: Global
global.TIME = new Date()
global.SHOW_START_TIME = false
global.PROJECT_ROOT = path.join(__dirname, '/../../')
global.IS_WINDOWS = process.platform === 'win32'
global.DIR_DELIMITER = global.IS_WINDOWS ? '\\' : '/'
if (process.argv && process.argv.length > 0) {
  global.SHOW_START_TIME = process.argv.includes('--DebugTime')
  process.argv = process.argv.filter(e => e !== '--DebugTime')
}
if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'First ')
// console.log('\x1b[35m%s\x1b[0m', 'TIBCO CLOUD CLI]', '\033[0m', 'V' + require('./../package.json').version);
// eslint-disable-next-line no-global-assign
require = require('esm')(module, { cache: false })
checkForGlobalPropertyFileUpgrades()
require('../cli').cli(process.argv)
