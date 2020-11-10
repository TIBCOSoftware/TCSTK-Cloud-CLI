#!/usr/bin/env node
global.TIME = new Date();
global.SHOW_START_TIME = false;
if(global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), 'First ');
require = require('esm')(module);
require('../cli').cli(process.argv);
