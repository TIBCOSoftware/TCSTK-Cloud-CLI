// This file does not depend on any other files
// All inputs are provided as input to the functions

// TODO: Use this file
// Display opening
displayOpeningMessage = function() {
	//var pjson = require('./package.json');
	//console.log(process.env.npm_package_version);
		const version = require('../package.json').version;
		console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|');
		console.log('\x1b[35m%s\x1b[0m', '# |  *** T I B C O    C L O U D   C L I ***   |');
		console.log('\x1b[35m%s\x1b[0m', '# |            V' + version + '                         |');
		console.log('\x1b[35m%s\x1b[0m', '# |-------------------------------------------|');
		console.log('\x1b[35m%s\x1b[0m', '# |For more info see: https://cloud.tibco.com');
}

// function to deternmine enabled tasks for workspace
determineEnabledTasks = function(cliTaskConfig){
	var cTsks = cliTaskConfig.cliTasks;
	var re = [];
	for(cliTask in cTsks){
	    console.log(cliTask + ' (' + cTsks[cliTask].description + ')');
		var allowed = false;
		if(cTsks[cliTask].availableOnOs != null){
			for(allowedOS of cTsks[cliTask].availableOnOs){
				console.log('OS:' + allowedOS);
				if(allowedOS == process.platform || allowedOS == 'all'){
					allowed = true;
				}
			}
		}
	    if(cTsks[cliTask].enabled && allowed) {
	        re.push(cliTask + ' (' + cTsks[cliTask].description + ')');
	    }
	}
	return re;
}
