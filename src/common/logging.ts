// Common log function
import { col, sleep } from './common-functions'
// import ora from "ora";
export const INFO = 'INFO'
export const WARNING = 'WARNING'
export const DEBUG = 'DEBUG'
export const ERROR = 'ERROR'
export const RECORDER = 'RECORDER'
let useDebug = false

export async function throb (message: string, frames: string[], repeats: number) {
  /*
    const spinner = {
        frames: frames,
        interval: 300, // Optional
    }
    const throbber = ora({
        text: message,
        spinner
    }) */
  // throbber.start();
  // throbber.stop();
  let i = 0
  if (frames.length > 0) {
    while (i < repeats) {
      i++
      for (const frame of frames) {
        logLine(frame + message)
        await sleep(200)
      }
    }
    logLine(frames[0] + message + '\n')
    // console.log('\n');
  }
}

// Function to set the logDug level
export function setLogDebug (debug: string | boolean) {
  useDebug = false
  if (typeof debug === 'boolean') {
    useDebug = debug
  }
  if (typeof debug === 'string') {
    useDebug = debug === 'true'
  }
}
let loggingEnabled = true

export function disableLogging () {
  loggingEnabled = false
}

// Function moved to TS
export function log (level: 'INFO' | 'WARNING' | 'DEBUG' | 'ERROR' | 'RECORDER', ...message: any) {
  // console.log('LOG: ' ,useDebug , level, message);
  if (!(level === DEBUG && !useDebug) && loggingEnabled) {
    // const timeStamp = new Date();
    // console.log('(' + timeStamp + ')[' + level + ']  ' + message);
    if (level === ERROR) {
      for (const mN in message) {
        // Removes password in console
        if (typeof message[mN] === 'string' && message[mN].indexOf('--pass') > 0) {
          message[mN] = message[mN].replace(/--pass \".*\"/, '')
        }
      }
      console.log('\x1b[31m%s\x1b[0m', 'TIBCO CLOUD CLI] (' + level + ')', col.red(...message))
      process.exitCode = 1
    } else {
      if (level === WARNING) {
        console.log(col.yellow('TIBCO CLOUD CLI] (' + level + ') ', ...message))
      } else {
        if (level === RECORDER) {
          console.log(col.bgWhite('[' + level + ']'), ...message)
        } else {
          console.log(col.magenta('TIBCO CLOUD CLI] (' + level + ') '), ...message)
        }
      }
    }
  }
}

// Function to log an object
export function logO (level: string, message: any) {
  if (!(level === DEBUG && !useDebug)) {
    console.log(message)
  }
}

// Function to log on one line...
export function logLine (message: any) {
  const readline = require('readline')
  readline.cursorTo(process.stdout, 0)
  process.stdout.write(message)
}
