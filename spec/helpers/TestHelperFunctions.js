const TEMP_TEST_FOLDER = './test/tmpTest';
const OS_COMMAND_SEPARATOR = ' && ';


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
console.log('Test Helper Functions Loaded...');
