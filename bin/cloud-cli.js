#!/usr/bin/env node
global.TIME = new Date();
global.SHOW_START_TIME = false;
if(global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'First ');
// console.log('\x1b[35m%s\x1b[0m', 'TIBCO CLOUD CLI]', '\033[0m', 'V' + require('./../package.json').version);
require = require('esm')(module);
require('../cli').cli(process.argv);
