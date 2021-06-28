import {
  col,
  getCurrentRegion, getOrganization, getRegion, isIterable,
  isOauthUsed,
  obfuscatePW,
  setOrganization
} from './common-functions'
import {
  createTableValue, showTableFromTobject
} from '../common/tables'
import { Global } from '../models/base'
import { CallConfig, LoginCookie, MappingGroup } from '../models/tcli-models'
import { askMultipleChoiceQuestionSearch, askQuestion } from './user-interaction'
import { DEBUG, ERROR, INFO, log, logCancel, logO, WARNING } from './logging'
import { getProp, setProperty } from './property-file-management'
import path from 'path'

declare let global: Global

const cloudConfig = require('../config/config-cloud.json')

export const clURI = cloudConfig.endpoints
export const mappings = cloudConfig.mappings as MappingGroup

let loginC: LoginCookie = null
let doOAuthNotify = true
let isOAUTHValid: boolean | null
let toldClientID = false
let isOrgChecked = false

// An HTTP request based on Axios library
// TODO: Look at managing Axios error handling
// https://stackoverflow.com/questions/43842711/can-i-throw-error-in-axios-post-based-on-response-status
export async function doRequest (url: string, options?: any, data?: any) {
  const axios = require('axios').default
  axios.defaults.validateStatus = () => {
    return true
  }
  // console.log(options);
  if (data) {
    options.data = data
  }
  const responseAxios = await axios(url, options)
  const response = {} as any
  response.body = ''
  response.statusCode = responseAxios.status
  response.headers = responseAxios.headers
  try {
    response.body = JSON.parse(responseAxios.data)
  } catch (e) {
    response.body = responseAxios.data
  }
  return response
}

// We have replaced this manual request by Axios, to handle weird characters
export function doManualRequest (url: string, options: any, data: any) {
  const https = require('https')
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res: any) => {
      res.setEncoding('utf8')
      // console.log(res);
      let responseTXT = ''
      const response = {} as any
      response.body = ''
      response.statusCode = res.statusCode
      response.headers = res.headers
      res.on('data', (chunk: any) => {
        responseTXT += chunk
      })
      res.on('end', () => {
        try {
          response.body = JSON.parse(responseTXT)
        } catch (e) {
          response.body = responseTXT
        }
        resolve(response)
      })
    })
    req.on('error', (err: any) => {
      reject(err)
    })
    if (data) {
      req.write(data)
    }
    req.end()
  })
}

// When called this will force a new login (when switching orgs for example)
export function invalidateLogin () {
  loginC = null
  isOrgChecked = false
  isOAUTHValid = null
}

export async function cLogin (tenant?: string, customLoginURL?: string, forceClientID?: boolean, manualOAUTH?: string) {
  const fClientID = forceClientID || false
  if (isOauthUsed() && !fClientID) {
    log(DEBUG, 'Using OAUTH for Authentication...')
    // isOAUTHValid = true;
    // Getting the organization info
    // console.log('Get Org: ' , getOrganization());
    // TODO: think of a fix for OAUTH Tokens that just have LA Access (get orgname from a live apps api)
    // if (getOrganization() == null || getOrganization().trim() == '') {
    if (!isOrgChecked) {
      // Setting this to temp so it breaks the call stack
      // setOrganization('TEMP');
      // const response = await callURLA('https://' + getCurrentRegion() + clURI.account_info, null, null, null, false, null, null, null, true, false, true);
      const response = await callTCA(clURI.account_info, false, {
        forceOAUTH: true,
        forceCLIENTID: false,
        handleErrorOutside: true,
        manualOAUTH: manualOAUTH
      })
      log(DEBUG, 'Got Account info: ', response)
      if (response === 'Unauthorized') {
        log(WARNING, 'OAUTH Token Invalid... Falling back to Normal Authentication. Consider rotating your OAUTH Token or generate a new one... ')
        isOAUTHValid = false
        if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') === '') {
          const tempPass = await askQuestion('Temporary, provide your password to Continue: ', 'password')
          // console.log('SETTING PASS');
          setProperty('CloudLogin.pass', obfuscatePW(tempPass))
        }
      }
      if (response.selectedAccount) {
        if (doOAuthNotify) {
          log(INFO, 'Using OAUTH Authentication, ORGANIZATION: ' + col.blue(response.selectedAccount.displayName))
          doOAuthNotify = false
        }
        setOrganization(response.selectedAccount.displayName)
        isOAUTHValid = true
      } else {
        isOAUTHValid = false
      }
      isOrgChecked = true
    }
  }
  if (!isOauthUsed() || !isOAUTHValid || fClientID) {
    if (!toldClientID) {
      log(INFO, 'Using CLIENT-ID Authentication (consider using OAUTH)...')
      toldClientID = true
    }
    if (getProp('CloudLogin.pass') == null || getProp('CloudLogin.pass') === '') {
      const tempPass = await askQuestion('Provide your password to Continue: ', 'password')
      setProperty('CloudLogin.pass', obfuscatePW(tempPass))
    }
    let setLoginURL = 'https://' + getCurrentRegion() + clURI.login
    if (customLoginURL) {
      setLoginURL = customLoginURL
      // Delete the previous cookie on a custom login
      loginC = null
    }
    // For default use BPM
    let tenantID = 'bpm'
    if (tenant) {
      tenantID = tenant
    }
    // TODO: Set a timer, if login was too long ago login again...
    const clientID = getProp('CloudLogin.clientID')
    const email = getProp('CloudLogin.email')
    let pass = getProp('CloudLogin.pass')
    if (pass === '') {
      pass = require('yargs').argv.pass
      // console.log('Pass from args: ' + pass);
    }
    if (pass && pass.charAt(0) === '#') {
      pass = Buffer.from(pass, 'base64').toString()
    }
    if (pass && pass.startsWith('@#')) {
      const fus = require('./fuzzy-search.js')
      pass = fus.find(pass)
    }

    if (loginC == null) {
      loginC = await cloudLoginV3(tenantID, clientID, email, pass, setLoginURL)
    }
    if (loginC === 'ERROR') {
      // TODO: exit the task properly
      log(INFO, 'Error Exiting..')
      process.exit(1)
    }
    // console.log("RETURN: " , loginC);
  }
  return loginC
}

/*
export function getCookie () {
  return loginC
} */

// Function that logs into the cloud and returns a cookie
async function cloudLoginV3 (tenantID: string, clientID: string, email: string, pass: string, TCbaseURL: string) {
  const postForm = 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email + '&Password=' + encodeURIComponent(pass)
  log(DEBUG, 'cloudLoginV3]   URL: ' + TCbaseURL)
  log(DEBUG, 'cloudLoginV3]  POST: ' + 'TenantId=' + tenantID + '&ClientID=' + clientID + '&Email=' + email)
  // log(INFO, 'With Form: ' + postForm);
  const header: any = {}
  header['Content-Type'] = 'application/x-www-form-urlencoded'
  header['Content-Length'] = postForm.length
  const response = await doRequest(encodeURI(TCbaseURL), {
    headers: header,
    method: 'POST'
  }, postForm) as any
  let re = '' as any
  // console.log(response.body);
  if (response.body.errorMsg != null) {
    log(ERROR, response.body.errorMsg)
    re = 'ERROR'
  } else {
    if (response.body.orgName) {
      setOrganization(response.body.orgName)
    }
    const loginCookie = response.headers['set-cookie']
    logO(DEBUG, loginCookie)
    const rxd = /domain=(.*?);/g
    const rxt = /tsc=(.*?);/g
    re = { domain: rxd.exec(loginCookie)![1]!, tsc: rxt.exec(loginCookie)![1]! }
    logO(DEBUG, re.domain)
    logO(DEBUG, re.tsc)
    logO(DEBUG, re)
    log(INFO, 'Login Successful of ' + email + '(' + tenantID + ')...')
  }
  return re
}

// Function that calls the TIBCO Cloud and takes a config object
export async function callTCA (url: string, doLog?: boolean, conf?: CallConfig) {
  if (conf == null) {
    conf = {}
  }
  // Check for another Cloud Location
  if (getProp('CloudLogin.Cloud_Location') != null && getProp('CloudLogin.Cloud_Location') !== 'cloud.tibco.com') {
    url = url.replace('cloud.tibco.com', getProp('CloudLogin.Cloud_Location'))
    log(WARNING, 'Using another BASE URL: ', getProp('CloudLogin.Cloud_Location'))
  }
  let urlToCall = 'https://' + getCurrentRegion() + url
  if (conf.skipInjectingRegion) {
    urlToCall = 'https://' + url
  }
  const doErrorOutside = conf.handleErrorOutside || false
  const fOAUTH = conf.forceOAUTH || false
  const fCLIENTID = conf.forceCLIENTID || false
  const reResponse = conf.returnResponse || false
  let lCookie: any = {}
  if (!fOAUTH) {
    lCookie = await cLogin(conf.tenant, conf.customLoginURL, false, conf.manualOAUTH)
  }
  if (fCLIENTID) {
    lCookie = await cLogin(conf.tenant, conf.customLoginURL, true, conf.manualOAUTH)
  }
  const cMethod = conf.method || 'GET'
  let cdoLog = false
  if (doLog != null) {
    cdoLog = doLog
  }
  const cType = conf.contentType || 'application/json'
  let body = ''
  if (cMethod.toLowerCase() !== 'get') {
    if (cType === 'application/json') {
      body = JSON.stringify(conf.postRequest)
    } else {
      body = conf.postRequest
    }
  }
  let header: any = {}
  if (conf.customHeaders) {
    header = conf.customHeaders
  }
  if (!header.accept) {
    header.accept = 'application/json'
  }
  header['Content-Type'] = cType
  // Check if we need to provide the OAUTH token
  if ((isOauthUsed() && isOAUTHValid) || fOAUTH) {
    if (conf.manualOAUTH) {
      header.Authorization = 'Bearer ' + conf.manualOAUTH
    } else {
      header.Authorization = 'Bearer ' + getProp('CloudLogin.OAUTH_Token')
    }
  } else {
    if (header.cookie) {
      header.cookie += 'tsc=' + lCookie.tsc + '; domain=' + lCookie.domain
    } else {
      header.cookie = 'tsc=' + lCookie.tsc + '; domain=' + lCookie.domain
    }
  }
  if (fCLIENTID) {
    header.cookie = 'tsc=' + lCookie.tsc + '; domain=' + lCookie.domain
    delete header.Authorization
  }

  if (cdoLog) {
    log(INFO, '--- CALLING SERVICE ---')
    log(INFO, '- URL(' + cMethod + '): ' + urlToCall)
    log(INFO, '-  METHOD: ' + cMethod)
    log(INFO, '- CONTENT: ' + cType)
    log(INFO, '-  HEADER: ', header)
  }
  if (!(cMethod.toLowerCase() === 'get' || cMethod.toLowerCase() === 'delete')) {
    if (cdoLog) {
      log(INFO, '-    BODY: ' + body)
    }
  }
  let response: any = {}
  if (cMethod.toLowerCase() === 'get') {
    response = await doRequest(encodeURI(urlToCall), {
      headers: header
    })
  } else {
    if (body != null) {
      header['Content-Length'] = body.length
    }
    response = await doRequest(encodeURI(urlToCall), {
      headers: header,
      method: cMethod.toUpperCase()
    }, body)
  }
  if (response.statusCode !== 200 && !doErrorOutside) {
    if (response.body != null) {
      log(ERROR, 'Error Calling URL: ' + urlToCall + ' Status: ' + response.statusCode + ' \n Message: ', response.body)
    } else {
      log(ERROR, 'Error Calling URL: ' + urlToCall + ' Status: ' + response.statusCode)
    }
    process.exit(1)
  }
  if (response.body != null) {
    if (response.body.errorMsg != null) {
      if (doErrorOutside) {
        return response.body
      } else {
        log(ERROR, response.body.errorMsg)
        // log(ERROR, response.body);
      }
      return null
    } else {
      if (reResponse) {
        return response
      }
      // log(INFO, '-  RESPONSE: ', response.body);
      return response.body
    }
  } else {
    if (reResponse) {
      return response
    } else {
      log(ERROR, 'No Body Returned, Status: ', response.statusCode)
    }
  }
  // url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside
  // return await callURLA(urlToCall, conf.method, conf.postRequest, conf.contentType, doLog, conf.tenant, conf.customLoginURL, conf.returnResponse, conf.forceOAUTH, conf.forceCLIENTID, conf.handleErrorOutside, conf.customHeaders);
}

// Function to post to the cloud from a file or pasted message
export async function postToCloud (endpoint: string, question?: string, fileFolder?: string, folderFilter?: string, customConfig? :CallConfig) {
  const useQuestion = question || 'What would you like to use for the post message ?'
  // If the folder is provided Get the files in the folder using the folder filter
  const optionList = ['NONE', 'MESSAGE', 'FILE']
  if (fileFolder) {
    const fs = require('fs')
    fs.readdirSync(fileFolder).forEach((file: string) => {
      let doAdd = true
      if (folderFilter) {
        if (!(file.indexOf(folderFilter) > -1)) {
          doAdd = false
        }
      }
      if (doAdd) {
        log(INFO, 'Found file option for upload: ' + col.blue(file))
        optionList.push(file)
      }
    })
  }
  // console.log(optionList)
  log(INFO, 'Use NONE to cancel, Use MESSAGE to paste a message and use FILE to use a custom file or choose a pre-provided file...')
  // Ask user if he wants to post a message, get the message from a file or
  //  list the files from that folder using the filters
  const typeForPost = await askMultipleChoiceQuestionSearch(useQuestion, optionList)
  if (typeForPost.toLowerCase() !== 'none') {
    // if MESSAGE, ask the user to paste the message
    if (typeForPost.toLowerCase() === 'message') {
      return await postMessageToCloud(endpoint, await askQuestion('Provide the message:'), customConfig)
    } else {
      if (typeForPost.toLowerCase() === 'file') {
        // if FILE, ask the user for the file location
        return await postFileToCloud(endpoint, await askQuestion('Provide the location of the file for the message:'), customConfig)
      } else {
        // user has provided the file
        return await postFileToCloud(endpoint, path.join(fileFolder!, typeForPost), customConfig)
      }
    }
  } else {
    // if NONE, end interaction
    logCancel(true)
  }
}

export async function postFileToCloud (endpoint: string, fileLocation: string, customConfig? :CallConfig) {
  log(DEBUG, 'Posting file to the cloud: ', fileLocation, ' (endpoint: ' + endpoint + ')')
  // Load the file and post it to the cloud (if it's a JSON file, parse the json)
  const fs = require('fs')
  let fileData = fs.readFileSync(fileLocation)
  if (fileLocation.indexOf('json') > -1) {
    try {
      fileData = JSON.parse(fileData)
    } catch (error) {
      log(ERROR, 'JSON Parsing error: ', error.message)
      process.exit(1)
    }
  } else {
    fileData = fileData.toString()
  }
  log(INFO, 'Posting file to the cloud: ', col.blue(fileLocation), ' (endpoint: ' + col.blue(endpoint) + ')')
  return await postMessageToCloud(endpoint, fileData, customConfig)
}

export async function postMessageToCloud (endpoint: string, message: any, customConfig? :CallConfig) {
  log(DEBUG, 'Posting message to the cloud: ', message, ' (endpoint: ' + endpoint + ')')
  // Take possible config
  let config: CallConfig = {
    method: 'POST',
    postRequest: message
  }
  if (customConfig) {
    config = { ...config, ...customConfig }
  }
  return await callTCA(endpoint, false, config)
}

// Function to upload something to the TIBCO Cloud (for example app deployment or upload files)
export async function uploadToCloud (formDataType: string, localFileLocation: string, uploadFileURI: string, customHost: string = clURI.la_host) {
  return new Promise<void>(async (resolve, reject) => {
    const FD = require('form-data')
    const formData = new FD()
    const fs = require('fs')
    const { size: fileSize } = fs.statSync(localFileLocation)
    log(INFO, 'UPLOADING FILE: ' + col.blue(localFileLocation) + ' (to:' + uploadFileURI + ')' + ' Filesize: ' + readableSize(fileSize))
    formData.append(formDataType, fs.createReadStream(localFileLocation))
    const header: any = {}
    header['Content-Type'] = 'multipart/form-data; charset=UTF-8'
    // Possibly add OAUTH Header...
    if (isOauthUsed() && await isOAUTHLoginValid()) {
      header.Authorization = 'Bearer ' + getProp('CloudLogin.OAUTH_Token')
    } else {
      const lCookie = await cLogin()
      // console.log(lCookie);
      if (lCookie && lCookie !== 'ERROR') {
        header.cookie = 'tsc=' + lCookie.tsc + '; domain=' + lCookie.domain
      } else {
        log(ERROR, 'Could not get login cookie...')
      }
    }
    const query = require('https').request({
      hostname: getCurrentRegion() + customHost, // cloudHost,*/
      path: uploadFileURI,
      method: 'POST',
      headers: header
    }, (res: any) => {
      let data = ''
      res.on('data', (chunk: any) => {
        data += chunk.toString('utf8')
      })
      res.on('end', () => {
        // console.log(data);
        if (data) {
          const dataObj = JSON.parse(data)
          if (dataObj && dataObj.message) {
            log(INFO, ' UPLOAD RESULT:', col.green(dataObj.message))
          } else {
            log(WARNING, ' UPLOAD RESULT:', data)
            reject()
          }
        } else {
          log(WARNING, ' UPLOAD RESULT: NO-DATA')
          reject()
        }
        resolve()
      })
    })
    query.on('error', (e: any) => {
      console.error(e)
      resolve()
    })
    formData.pipe(query)
  })
}

// Function to upload something to the TIBCO Cloud (for example files in cloud folders)
export async function downloadFromCloud (localFileLocation: string, downloadFileURI: string, headers:any = {}) {
  return new Promise<void>(async (resolve, reject) => {
    const downloadURL = 'https://' + getCurrentRegion() + downloadFileURI
    log(INFO, '     DOWNLOADING: ' + col.blue(downloadURL))
    log(INFO, '              TO: ' + col.blue(localFileLocation))
    // let headers: any = {};
    if (isOauthUsed() && await isOAUTHLoginValid()) {
      headers.Authorization = 'Bearer ' + getProp('CloudLogin.OAUTH_Token')
    } else {
      const lCookie = await cLogin()
      // console.log(lCookie);
      if (lCookie && lCookie !== 'ERROR') {
        headers.cookie = 'tsc=' + lCookie.tsc + '; domain=' + lCookie.domain
      } else {
        log(ERROR, 'Could not get login cookie...')
      }
    }
    const axios = require('axios').default
    axios.get(downloadURL, {
      responseType: 'arraybuffer',
      headers
    })
      .then((response: { data: any; }) => {
        try {
          const fs = require('fs')
          fs.writeFileSync(localFileLocation, response.data, 'utf8')
          const { size: fileSize } = fs.statSync(localFileLocation)
          log(INFO, ' DOWNLOAD RESULT: ' + col.green('DONE') + ' Filesize: ' + readableSize(fileSize))
          resolve()
        } catch (err) {
          log(INFO, ' DOWNLOAD RESULT: ' + col.red('ERROR'))
          log(ERROR, 'Problem Storing the file: ' + err)
          reject(err)
        }
      })
      .catch((ex: string) => {
        log(ERROR, 'Problem downloading the file: ' + ex)
        reject(ex)
      })
  })
}

export function readableSize (sizeBytes: number) {
  if (sizeBytes < 1024) {
    return sizeBytes + ' Bytes'
  } else {
    const fsKb = Math.round(sizeBytes / 1024 * 100) / 100
    if (fsKb < 1024) {
      return col.blue(fsKb + ' KB')
    } else {
      const fsMb = Math.round(fsKb / 1024 * 100) / 100
      if (fsMb < 1024) {
        return col.yellow(fsMb + ' MB')
      } else {
        const fsGb = Math.round(fsMb / 1024 * 100) / 100
        return col.red(fsGb + ' GB')
      }
    }
  }
}

// Function to show claims for the configured user
export async function showCloudInfo (showTable: boolean, showSandbox: boolean, showRoles: boolean) {
  const doShowSandbox = showSandbox || false
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' BEFORE Show Cloud')
  let doShowTable = true
  if (showTable != null) {
    doShowTable = showTable
  }
  const response = await callTCA(clURI.claims)
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' After Show Cloud')
  let nvs = createTableValue('REGION', getRegion())
  nvs = createTableValue('ORGANIZATION', getOrganization(), nvs)
  nvs = createTableValue('FIRST NAME', response.firstName, nvs)
  nvs = createTableValue('LAST NAME', response.lastName, nvs)
  nvs = createTableValue('EMAIL', response.email, nvs)
  if (response.sandboxes && doShowSandbox) {
    for (let i = 0; i < response.sandboxes.length; i++) {
      nvs = createTableValue('SANDBOX ' + i, response.sandboxes[i].type, nvs)
      nvs = createTableValue('SANDBOX ' + i + ' ID', response.sandboxes[i].id, nvs)
    }
  }
  if (showRoles) {
    // account_user_roles
    const userRoles = await callTCA(clURI.account_user_roles, false, {
      tenant: 'TSC',
      customLoginURL: 'https://' + getCurrentRegion() + clURI.general_login
    })
    // console.log(userRoles)
    for (const role of userRoles.userRolesDetailsForTenants) {
      if (role) {
        let rDetails = 'ROLES: '
        if (role.teamAdmin) {
          rDetails += 'teamAdmin,'
        }
        // console.log(role.tenantRolesDetails)
        if (role.tenantRolesDetails) {
          if (isIterable(role.tenantRolesDetails)) {
            for (const rDetail of role.tenantRolesDetails) {
              rDetails += ' ' + rDetail.roleId + ','
            }
          }
        }
        if (rDetails.endsWith(',')) {
          rDetails = rDetails.substring(0, rDetails.length - 1)
        }
        nvs = createTableValue('TENANT: ' + role.tenantId, rDetails, nvs)
      }
    }
  }
  if (doShowTable) {
    // console.table(nvs)
    showTableFromTobject(nvs, 'Cloud Info')
  }
  if (global.SHOW_START_TIME) console.log((new Date()).getTime() - global.TIME.getTime(), ' Final Show Cloud')
}

export async function isOAUTHLoginValid () {
  if (isOAUTHValid == null) {
    await cLogin()
  }
  return isOAUTHValid
}
