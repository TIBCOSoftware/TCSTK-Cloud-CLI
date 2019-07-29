// This file does not depend on any other files
// All inputs are provided as input to the functions

// TODO: Use this file

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
