let TEMP_TEST_FOLDER = '';
let OS_COMMAND_SEPARATOR = '';

setFolderAndOperator = function(folder, oper){
    TEMP_TEST_FOLDER = folder;
    OS_COMMAND_SEPARATOR = oper;
}

const execSync = require('child_process').execSync;
run = function (command) {
    let re = true;
    command = 'cd ' + TEMP_TEST_FOLDER + OS_COMMAND_SEPARATOR + command;
    console.log('Executing Command: ' + command);
    try {
        execSync(
            command,
            {stdio: 'inherit'}
        );
        // console.log('RESULT: ', result);

    } catch (err) {
        // console.log('Got Error ' , err);
        // logO(DEBUG, reason);
        console.log('Error Running command: ' + err.message);
        re = false;
    }
    return re;
}


// Delete a folder
deleteFolder = function (folder) {
    const del = require('del');
    del.sync([folder]);
    console.log('Deleted: ' + folder);
}

// Create a directory if it does not exists
mkdirIfNotExist = function (dir) {
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log('Created: ' + dir);
    }
}

console.log('Test Helper Functions Loaded...');
