import { INFO, log } from './logging'
import chokidar from 'chokidar'
/*
export interface FileContent {
  fileName: string;
  fileContent: string;
}*/

// This class watches a folder for changes, and will run a callback when a file has changed. It also runs a callback if the user presses the refresh(r) key.
export default class Watcher {
  private ignoreChanges = false;
  // This value indicats how long changes must be ignored after files that are being watched are reloaded.
  readonly IGNORE_CHANGES_MS = 1000

  // eslint-disable-next-line no-useless-constructor
  constructor (public folder: string,
               public refreshFiles: (folder:string) => Promise<void>,
               public onFileChange: (changedFileName: string) => Promise<void>) {
    console.log('Watcher created...')
  }

  // Function to call the callback on reloading the files
  public async pullFiles () {
    this.ignoreChanges = true
    await this.refreshFiles(this.folder)
    // Ignore incoming changes for a while once a reload has happened
    setTimeout(() => { this.ignoreChanges = false }, this.IGNORE_CHANGES_MS)
  }

  public async watch () {
    return new Promise<void>(mainResolve => {
      // const chokidar = require('chokidar')
      log(INFO, 'Waiting for FILE Changes in: ' + this.folder)
      const watcher = chokidar.watch(this.folder).on('all', async (event: string, path: string) => {
        // console.log('Change: ', event)
        if (event === 'change') {
          if (!this.ignoreChanges) {
            log(INFO, 'Update file: ', path)
            await this.onFileChange(path)
          }
        }
      })
      const readline = require('readline')
      readline.emitKeypressEvents(process.stdin)
      process.stdin.setRawMode(true)
      // console.log('process.stdin ', process.stdin)
      // TODO: HIER VERDER, THE KEY PRESS SEEMS TO HANG !!!!
      process.stdin.on('keypress', async (_str, key) => {
        console.log('Key ', key)

        return new Promise<void>(async (keyResolve) => {
          if (key.ctrl && key.name === 'c') {
            process.exit()
          }
          if (key.name === 'r') {
            // Call the Reload callback
            log(INFO, 'Reloading...')
            await this.pullFiles()
          }
          if (key.name === 'escape' || key.name === 'q') {
            watcher.close().then(() => {
              log(INFO, 'Stopped Listening for File changes...')
              process.stdin.destroy()
              keyResolve()
              mainResolve()
            })
          }
        })
      })
      // process.stdin.on('end', () => console.log('this does trigger'))
      console.log('Press Escape key or the \'q\'-key to stop listening for file changes, or the \'r\'-key to reload from cloud...')
    })
  }
}
