import {col} from "./common-functions";
import _ from "lodash";
import {DEBUG, ERROR, INFO, log, logO} from "./logging";

// function to ask a question
export async function askQuestion(question: string, type = 'input') {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Type: ' , type);
        await inquirerF.prompt([{
            type: type,
            name: 'result',
            message: question,
            filter: (val:any) => {
                return val;
            }
        }]).then((answers:any) => {
            logO(DEBUG, answers);
            re = answers.result;
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }
}

// function to ask a question
export async function askMultipleChoiceQuestion(question: string, options: any[]) {
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        let re = 'result';
        // console.log('Asking Question: ' , question);
        await inquirerF.prompt([{
            type: 'list',
            name: 'result',
            message: question,
            choices: options,
            filter: (val:any) => {
                return val;
            }
        }]).then((answers:any) => {
            logO(DEBUG, answers);
            re = answers.result;
            //return answers.result;
        }).catch((error: any) => {
            log(ERROR, error);
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }

}

let gOptions: any[] = [];

// Ask a question to a user, and allow the user to search through a possilbe set of options
export async function askMultipleChoiceQuestionSearch(question: string, options: string[], pageSize?: number) {
    let pageSizeToUse = 4;
    if(pageSize && pageSize > -1){
        pageSizeToUse = pageSize;
    }
    let re = '';
    if (!useGlobalAnswers) {
        let inquirerF = require('inquirer');
        gOptions = options;
        inquirerF.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        await inquirerF.prompt([{
            type: 'autocomplete',
            name: 'command',
            suggestOnly: false,
            message: question,
            source: searchAnswerF,
            pageSize: pageSizeToUse
        }]).then((answers: { command: string; }) => {
            // console.log('answers: ' , answers);
            logO(DEBUG, answers);
            re = answers.command;
        });
        givenAnswers.push(re);
        return re;
    } else {
        return getLastGlobalAnswer(question);
    }
}

//User interaction
export function searchAnswerF(_answers: any, input: string) {
    const fuzzyF = require('fuzzy');
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            const fuzzyResult = fuzzyF.filter(input, gOptions);
            resolve(
                fuzzyResult.map(function (el: { original: any; }) {
                    return el.original;
                })
            );
        }, _.random(30, 60));
    });
}

let useGlobalAnswers = false;
let globalAnswers: string[] = [];
let givenAnswers: string[] = [];

export function getGivenAnswers(){
    return givenAnswers;
}
export function isGlobalAnswersUsed(){
    return useGlobalAnswers;
}

export function setGlobalAnswers(answers: string) {
    // console.log('Answers: ' , answers);
    if (answers) {
        // Try to split on ':' double colon for the global manage multiple file (comma is reserved there)
        if (answers.indexOf(':') > 0) {
            globalAnswers = answers.split(':');
        } else {
            globalAnswers = answers.split(',');
        }
        if (globalAnswers.length > 0) {
            useGlobalAnswers = true;
            log(INFO, 'Global Answers set: ', globalAnswers)
        }
    }
}

export function getLastGlobalAnswer(question: string) {
    let re = '';
    if (globalAnswers && globalAnswers.length > 0) {
        re = globalAnswers.shift()!;
        log(INFO, 'Injected answer: ', col.blue(re), ' For question: ', question);
    } else {
        log(ERROR, 'No answer left for question: ' + question);
        process.exit(1);
    }
    return re;
}
