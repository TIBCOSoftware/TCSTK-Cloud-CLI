import { Mapping, PEXConfig } from '../models/tcli-models'
import { DEBUG, INFO, log } from './logging'
import { addOrUpdateProperty, getProp, getPropFileName } from './property-file-management'
import { col, doesFileExist, getOrganization, getRelativeTime, mkdirIfNotExist } from './common-functions'
// import DateTimeFormatOptions = Intl.DateTimeFormatOptions;

const _ = require('lodash')

// It's undefined on Jenkins, so use width 150
// Cloning into 'C:\Program Files (x86)\Jenkins\workspace\CLOUD STARTERS\CS Run CLI Testcases and Publish\tmp\TCSTK-Cloud-CLI\test\tmpTest/CS-FORM-TEST-CM-

// Look at:
// https://www.npmjs.com/package/cli-table

export function createTable (arrayObject: any[], config: Mapping, doShowTable: boolean): any {
  const tableObject: any = {}
  for (const element in arrayObject) {
    const tableRow: any = {}
    const rowNumber = parseInt(element) + 1
    // TODO: Change to debug
    // log(INFO, rowNumber + ') APP NAME: ' + response.body[element].name  + ' Published Version: ' +  response.body[element].publishedVersion + ' (Latest:' + response.body[element].publishedVersion + ')') ;
    for (const conf of config.entries) {
      if (conf.format && conf.format.toLowerCase() === 'date') {
        /*
        const options: DateTimeFormatOptions = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        } */
        // tableRow[conf.header] = new Date(_.get(arrayObject[element], conf.field)).toLocaleDateString('en-US', options)
        tableRow[conf.header] = getRelativeTime(new Date(_.get(arrayObject[element], conf.field)).getTime())
      } else {
        tableRow[conf.header] = _.get(arrayObject[element], conf.field)
      }
    }
    tableObject[rowNumber] = tableRow
  }
  // logO(INFO,tableObject);
  // if (doShowTable) console.table(tableObject)
  if (doShowTable) showTableFromTobject(tableObject)
  return tableObject
}

export function iterateTable (tObject: any): any[] {
  const re = []
  for (const property in tObject) {
    re.push(tObject[property])
  }
  return re
}

// Creates a flat table with names and values
export function createTableValue (name: string, value: any, table?: any, headerName?: string, headerValue?: string) {
  const hName = headerName || 'NAME'
  const hValue = headerValue || 'VALUE'
  table = table || []
  const entry: any = {}
  entry[hName] = name
  entry[hValue] = value
  table[table.length] = entry
  return table
}

// Print and possibly export Table to CSV
export function pexTable (tObject: any, tName: string, config: PEXConfig, doPrint: boolean) {
  let printT
  if (doPrint == null) {
    printT = true
  } else {
    printT = doPrint
  }
  // console.log(config);
  if (config.export) {
    let doExport = false
    if (config.tables && config.tables.trim() !== '') {
      if (config.tables.toLowerCase() === 'all') {
        doExport = true
      } else {
        const tableArr = config.tables.split(',')
        for (const tab of tableArr) {
          if (tab === tName) {
            doExport = true
          }
        }
      }
    }
    if (doExport) {
      const fs = require('fs')
      const fileName = config.folder + config.filePreFix + tName + '.csv'
      let additionalMessage = ''
      mkdirIfNotExist(config.folder)
      // If file does not exist create headerLine
      const newFile = !doesFileExist(fileName)
      let dataForFile = ''
      let headerForFile = ''
      const now = new Date()
      for (const line of iterateTable(tObject)) {
        // console.log(line);
        // Add organization and Now
        headerForFile = 'ORGANIZATION, EXPORT TIME'
        let lineForFile = getOrganization() + ',' + now
        for (let [key, value] of Object.entries(line)) {
          let myValue: any = value
          // console.log(`${key}: ${value}`);
          if (myValue) {
            if ((key && key.indexOf && key.indexOf(',') > 0) || (myValue && myValue.indexOf && myValue.indexOf(',') > 0)) {
              log(DEBUG, `Data for CSV file(${fileName}) contains comma(${key}: ${myValue}); we are removing it...`)
              additionalMessage = col.yellow(' (We have removed some comma\'s from the data...)')
              if (key.replaceAll) {
                key = key.replaceAll(',', '')
              }
              if (myValue.replaceAll) {
                myValue = myValue.replaceAll(',', '')
              }
            }
          }
          if (newFile) {
            headerForFile += ',' + key
          }
          lineForFile += ',' + value
        }
        // Add data to file
        dataForFile += lineForFile + '\n'
      }
      if (newFile) {
        dataForFile = headerForFile + '\n' + dataForFile
        fs.writeFileSync(fileName, dataForFile, 'utf8')
        log(INFO, '--> (New File) Exported table to ' + col.blue(fileName) + additionalMessage)
      } else {
        fs.appendFileSync(fileName, dataForFile, 'utf8')
        log(INFO, '--> (Appended) Exported table data to ' + col.blue(fileName) + additionalMessage)
      }
    }
  }
  if (printT) {
    // log(INFO, col.blue('TABLE] ' + tName))
    // console.table(tObject)
    showTableFromTobject(tObject, tName)
    // console.log('Terminal size: ' + process.stdout.columns + 'x' + process.stdout.rows)
  }
}

export function showTableFromTobject (tObject: any, title?: string) {
  // console.table(tObject)
  let serverMode = false
  let MAX_TERMINAL_LENGTH = 250
  if (process.stdout && process.stdout.columns) {
    MAX_TERMINAL_LENGTH = process.stdout.columns
  } else {
    // log(INFO, 'SERVER MODE')
    // TODO: When in Server mode make it look nice
    serverMode = true
  }
  const Table = require('cli-table')
  let topLeft = '╔'
  let topRight = '╗'
  if (title) {
    topLeft = '╠'
    topRight = '╣'
  }
  let headerArray: string[] = []
  let colAlignArray: string[] = []
  const maxColLengthObject:any = {}
  let ind = 0
  for (const row of Object.keys(tObject)) {
    ind++
    headerArray = ['NR']
    colAlignArray = ['middle']
    for (const col of Object.keys(tObject[row])) {
      headerArray.push(col)
      colAlignArray.push('left')
      const indexLength = (ind + '').length
      if (!maxColLengthObject.NR || maxColLengthObject.NR < indexLength) {
        maxColLengthObject.NR = indexLength
      }
      if (tObject[row][col]) {
        const headLength = (col + '').length
        const tempColLength = (tObject[row][col] + '').length
        let maxL = headLength
        if (tempColLength > headLength) {
          maxL = tempColLength
        }
        if (!maxColLengthObject[col] || maxColLengthObject[col] < maxL) {
          maxColLengthObject[col] = maxL
        }
      }
    }
  }
  let tableWidth = 3
  const colWidthsArray: number[] = []
  let highestIndex = 0
  let idX = 0
  for (const colLen of Object.keys(maxColLengthObject)) {
    colWidthsArray.push(maxColLengthObject[colLen] + 3)
    tableWidth += maxColLengthObject[colLen] + 3
    if (maxColLengthObject[colLen] > colWidthsArray[highestIndex]!) {
      highestIndex = idX
    }
    idX++
  }
  let screenOffset = 0
  // console.log('tableWidth:', tableWidth)
  // console.log('MAX_TERMINAL_LENGTH:', MAX_TERMINAL_LENGTH)
  if (tableWidth + 5 >= MAX_TERMINAL_LENGTH) {
    // Screen is smaller than the table
    screenOffset = (tableWidth - MAX_TERMINAL_LENGTH) + (colWidthsArray.length - 2)
    if (colWidthsArray[highestIndex]! - screenOffset > 8) {
      colWidthsArray[highestIndex] = colWidthsArray[highestIndex]! - screenOffset
    } else {
      colWidthsArray[highestIndex] = 8
    }
  }
  const tab = new Table({
    chars: {
      top: '═',
      'top-mid': '╤',
      'top-left': topLeft,
      'top-right': topRight,
      bottom: '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      left: '║',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '║',
      'right-mid': '',
      middle: '│'
    },
    colAligns: colAlignArray,
    colWidths: colWidthsArray,
    style: { compact: true, 'padding-left': 1, 'padding-right': 1, head: ['green'], border: ['white'] },
    head: headerArray
  })
  let index = 0
  for (const row of Object.keys(tObject)) {
    index++
    const rowArray = [index + '']
    for (const el of Object.keys(tObject[row])) {
      if (tObject[row][el]) {
        rowArray.push(tObject[row][el])
      } else {
        rowArray.push('')
      }
    }
    tab.push(rowArray)
  }
  const tabString = tab.toString()
  if (title) {
    const length = tabString.indexOf('\n')
    if (length > 0) {
      if (length > 12) {
        console.log(col.white('╔' + '═'.repeat(length - 12) + '╗'))
      }
      const nrSpaces = length - (title.length + 20)
      // console.log(nrSpaces)
      let after = ''
      if (nrSpaces > 0) {
        after = ' '.repeat(nrSpaces) + col.white('║')
      }
      console.log(col.white('║') + col.reset(' TABLE: ') + col.blue(title) + after)
    }
  }
  if (serverMode) {
    console.table(tObject)
  } else {
    console.log(tabString)
  }
}

// Provide configuration for exporting table
export function getPEXConfig (): PEXConfig {
  // table-export-to-csv= YES | NO
  let tableExportToCsv = 'NO'
  if (getProp('Table_Export_To_CSV') != null) {
    tableExportToCsv = getProp('Table_Export_To_CSV')
  } else {
    log(INFO, 'No Table_Export_To_CSV property found; We are adding it to: ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Table_Export_To_CSV', tableExportToCsv, 'Export tables to CSV files. Possible values YES | NO')
  }
  // table-export-folder= ./table-exports
  let tableExportFolder = './table-exports/'
  if (getProp('Table_Export_Folder') != null) {
    tableExportFolder = getProp('Table_Export_Folder')
  } else {
    log(INFO, 'No Table_Export_Folder property found; We are adding it to: ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Table_Export_Folder', tableExportFolder, 'Folder to export the CSV files to.')
  }

  // table-export-file-prefix=table-export-
  let tableExportFilePrefix = 'table-export-'
  if (getProp('Table_Export_File_Prefix') != null) {
    tableExportFilePrefix = getProp('Table_Export_File_Prefix')
  } else {
    log(INFO, 'No Table_Export_File_Prefix property found; We are adding it to: ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Table_Export_File_Prefix', tableExportFilePrefix, 'Prefix to use for the export to table CSV files.')
  }
  // table-export-tables=cloud-starters,cloud-starter-links,cloud-starter-details,live-apps,shared-states
  let tableExportTables = 'ALL'
  if (getProp('Table_Export_Tables') != null) {
    tableExportTables = getProp('Table_Export_Tables')
  } else {
    log(INFO, 'No Table_Export_Tables property found; We are adding it to: ' + getPropFileName())
    addOrUpdateProperty(getPropFileName(), 'Table_Export_Tables', tableExportTables, 'Which tables to export, Possible values: ALL (OR any of) cloud-starters,cloud-starter-links,cloud-starter-details,live-apps,shared-states')
  }
  return {
    export: tableExportToCsv.toLowerCase() === 'yes',
    folder: tableExportFolder,
    filePreFix: tableExportFilePrefix,
    tables: tableExportTables
  }
}
