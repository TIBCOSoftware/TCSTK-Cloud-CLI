const ora = require('ora');
const colors = require('colors');
const _ = require('lodash');


const spinner = {
        frames: [colors.red('●'), ' '],
        interval: 500, // Optional
    }

// console.log('Doing work..');
let inquirerF = require('inquirer');
inquirerF.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));


searchAnswerF = function (answers, input) {
    const fuzzyF = require('fuzzy');
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            const fuzzyResult = fuzzyF.filter(input, ['one', 'two', 'tree']);
            resolve(
                fuzzyResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}


async function main() {
    const question = 'Question ?';
    const throbber = ora({
        text: question,
        spinner
    })




    // Simulating some asynchronous work for 10 seconds...

    setTimeout(() => {
        throbber.start();
    }, 2000);
    // TODO: Hier verder, how to type answers ?

    await inquirerF.prompt([{
        type: 'autocomplete',
        name: 'command',
        suggestOnly: false,
        message: question,
        source: searchAnswerF,
        pageSize: 4
    }]).then((answers) => {
        // console.log('answers: ' , answers);
        console.log(answers);
        // re = answers.command;
    });
    throbber.stop();
}

main();
