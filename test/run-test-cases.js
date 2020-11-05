const TEMP_TEST_FOLDER = './test/tmpTest';
const OS_COMMAND_SEPARATOR = ' && ';
const CLI_EXECUTOR = './../../bin/cloud-cli.js';



/*
const TESTCASES = {[{
            description: 'Case 1',
            shouldFail: false,
            cliCommand:  'd'}],
            ,{
    description: 'Case 1',
        shouldFail: false, cliCommand:
        ''
    }
]*/


tearUp = function () {
    console.log('Up');
}

tearDown = function () {
    console.log('Down');
}



main = function () {
    tearUp();
    run(CLI_EXECUTOR + ' --createCP');
    run(CLI_EXECUTOR + ' --createCP');
    tearDown();
    displayTestReport();
}

displayTestReport = function () {
    console.log('Rep');
}

const execSync = require('child_process').execSync;
run = function (command) {
    let re = true;
    command = 'cd ' + TEMP_TEST_FOLDER + OS_COMMAND_SEPARATOR + command;
    console.log('Executing Command: ' + command);
    try {
        let result = execSync(
            command,
            {stdio: 'inherit'}
        );
        console.log('RESULT: ', result);

    } catch (err) {
        // console.log('Got Error ' , err);
        // logO(DEBUG, reason);
        console.log('Error Running command: ' + err.message);
        re = false;
    }
    return re;
}

console.log('Running testcases...');
main();
