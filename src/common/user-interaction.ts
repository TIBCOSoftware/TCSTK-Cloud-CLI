import { col } from './common-functions'
import _ from 'lodash'
import { DEBUG, ERROR, INFO, log, logO } from './logging'
import { getPropFileName, replaceAtSign, replaceGlobal } from './property-file-management'

let supressGlobalAnswerLogs = false

// function to ask a question
export async function askQuestion (question: string, type = 'input') {
  if (!useGlobalAnswers) {
    const inquirerF = require('inquirer')
    let re = 'result'
    // console.log('Type: ' , type);
    await inquirerF.prompt([{
      type: type,
      name: 'result',
      message: question,
      filter: (val:any) => {
        return val
      }
    }]).then((answers:any) => {
      logO(DEBUG, answers)
      re = answers.result
    })
    givenAnswers.push(re)
    return re
  } else {
    return getLastGlobalAnswer(question)
  }
}

// function to ask a question
export async function askMultipleChoiceQuestion (question: string, options: any[]) {
  let re = 'result'
  if (!useGlobalAnswers) {
    const inquirerF = require('inquirer')
    // console.log('Asking Question: ' , question);
    await inquirerF.prompt([{
      type: 'list',
      name: 'result',
      message: question,
      choices: options,
      filter: (val:any) => {
        return val
      }
    }]).then((answers:any) => {
      logO(DEBUG, answers)
      re = answers.result
      syncAnswer = re
      // return answers.result;
    }).catch((error: any) => {
      log(ERROR, error)
    })
    givenAnswers.push(re)
    return re
  } else {
    re = getLastGlobalAnswer(question)
  }
  syncAnswer = re
  return re
}

// This function can be called synchronously (only use when there is no other option)
let syncAnswer = ''
export function askMultipleChoiceQuestionSync(question: string, options: any[]) {
  syncAnswer = ''
  const deasync = require('deasync');
  // The warning of not handling the promise is on purpose here.
  askMultipleChoiceQuestion(question, options)
  deasync.loopWhile(function(){return syncAnswer === '';});
  // returns the set answer
  return syncAnswer
}

let gOptions: any[] = []

// Ask a question to a user, and allow the user to search through a possilbe set of options
export async function askMultipleChoiceQuestionSearch (question: string, options: string[], pageSize?: number) {
  let pageSizeToUse = 4
  if (pageSize && pageSize > -1) {
    pageSizeToUse = pageSize
  }
  let re = ''
  if (!useGlobalAnswers) {
    const inquirerF = require('inquirer')
    gOptions = options
    inquirerF.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
    await inquirerF.prompt([{
      type: 'autocomplete',
      name: 'command',
      suggestOnly: false,
      message: question,
      source: searchAnswerF,
      pageSize: pageSizeToUse
    }]).then((answers: { command: string; }) => {
      // console.log('answers: ' , answers);
      logO(DEBUG, answers)
      re = answers.command
    })
    givenAnswers.push(re)
    return re
  } else {
    return getLastGlobalAnswer(question)
  }
}

// User interaction
export function searchAnswerF (_answers: any, input: string) {
  const fuzzyF = require('fuzzy')
  input = input || ''
  return new Promise(function (resolve) {
    setTimeout(function () {
      const fuzzyResult = fuzzyF.filter(input, gOptions)
      resolve(
        fuzzyResult.map(function (el: { original: any; }) {
          return el.original
        })
      )
    }, _.random(30, 60))
  })
}

let useGlobalAnswers = false
let globalAnswers: string[] = []
const givenAnswers: string[] = []

export function getGivenAnswers () {
  return givenAnswers
}
export function isGlobalAnswersUsed () {
  return useGlobalAnswers
}

const COLON_ESCAPE = '[[:]]'
const COLON_ESCAPE_REGEX = '\\[\\[:\\]\\]'

export function escapeColon (text: string) {
  return text.replace(/:/g, COLON_ESCAPE)
}

export function setGlobalAnswers (answers: string) {
  if (answers) {
    let uniqueRepl
    if (answers.indexOf(COLON_ESCAPE) > 0) {
      uniqueRepl = '-DOUBLE-COLON-' + (new Date()).getTime() + '-'
      answers = answers.replace(new RegExp(COLON_ESCAPE_REGEX, 'g'), uniqueRepl)
    }
    // Try to split on ':' double colon for the global manage multiple file (comma is reserved there)
    if (answers.indexOf(':') > 0) {
      globalAnswers = answers.split(':')
    } else {
      globalAnswers = answers.split(',')
    }
    if (globalAnswers.length > 0) {
      if (uniqueRepl) {
        for (const gAns in globalAnswers) {
          if (globalAnswers[gAns]) {
            globalAnswers[gAns] = globalAnswers[gAns]!.replace(new RegExp(uniqueRepl, 'g'), ':')
          }
        }
      }
      useGlobalAnswers = true
      if(!supressGlobalAnswerLogs) {
        // TODO: Set this back to info
        log(DEBUG, 'Global Answers set: ', globalAnswers)
      }
    }
  }
}

export function getLastGlobalAnswer (question: string) {
  let re = ''
  if (globalAnswers && globalAnswers.length > 0) {
    re = replaceAtSign(globalAnswers.shift()!, getPropFileName())
    re = replaceGlobal(re)
    if(!supressGlobalAnswerLogs) {
      log(INFO, 'Injected answer: ', col.blue(re), ' For question: ', question)
    }
  } else {
    log(ERROR, 'No answer left for question: ' + question)
    process.exit(1)
  }
  return re
}

export async function askQuestionTask () {
  supressGlobalAnswerLogs = true
  const question = await askQuestion('Which question do you want to ask ?')
  const option1 = await askQuestion('Option1 (success): ')
  const option2 = await askQuestion('Option2 (failure): ')
  useGlobalAnswers = false
  const answer = await askMultipleChoiceQuestion(question, [option1, option2])
  if(answer === option1){
    process.exit(0)
  } else {
    process.exit(1)
  }
}
