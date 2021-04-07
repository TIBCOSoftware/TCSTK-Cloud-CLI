#!/usr/bin/env ts-node
(global as any).TIME = new Date();
(global as any).SHOW_START_TIME = false;
(global as any).PROJECT_ROOT = __dirname + '/../../';
if(process.argv && process.argv.length > 0){
    (global as any).SHOW_START_TIME = process.argv.includes('--DebugTime');
    process.argv =  process.argv.filter(e => e !== '--DebugTime')
}
if((global as any).SHOW_START_TIME) console.log((new Date()).getTime() - (global as any).TIME.getTime(), 'First ');
// console.log('\x1b[35m%s\x1b[0m', 'TIBCO CLOUD CLI]', '\033[0m', 'V' + require('./../package.json').version);
require = require('esm')(module, {cache:false});
require('../cli').cli(process.argv);
