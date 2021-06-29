import {
  col,
  getCurrentRegion, getOrganization,
  isOauthUsed,
  translateAWSRegion
} from './common-functions'
import {
  createTable,
  getPEXConfig,
  iterateTable,
  pexTable
} from './tables'
import { ORGInfo } from '../models/tcli-models'
import { askMultipleChoiceQuestionSearch } from './user-interaction'
import { Accounts, SelectedAccount } from '../models/organizations'
import { getOAUTHDetails } from './oauth'
import { addOrUpdateProperty, getProp, getPropFileName } from './property-file-management'
import { DEBUG, ERROR, INFO, log, logCancel } from './logging'

const CCOM = require('./cloud-communications')
const OAUTH = require('./oauth')

// Get a list of all the organizations
export async function getOrganizations () {
  return (await CCOM.callTCA(CCOM.clURI.account_info, false, {
    tenant: 'TSC',
    customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
  })).accountsInfo
}

// Get a list of all the organizations
export async function getCurrentOrganizationInfo (): Promise<SelectedAccount> {
  return (await CCOM.callTCA(CCOM.clURI.account_info, false, {
    tenant: 'TSC',
    customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login
  })).selectedAccount
}

// Function to get the Client ID
export async function getClientID (headers: any) {
  log(INFO, 'Getting Client ID...')
  const clientID = (await CCOM.callTCA(CCOM.clURI.get_clientID, true, {
    method: 'POST',
    forceCLIENTID: true,
    tenant: 'TSC',
    customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login,
    headers
  })).ClientID
  log(INFO, 'Client ID: ', clientID)
  return clientID
}

// A function to show all the organizations
export async function showOrganization () {
  log(INFO, 'Showing Organizations:')
  // List all the organizations
  const orgDetails = await displayOrganizations(true, true, 'For which organization would you like more details ?')
  if (orgDetails) {
    delete orgDetails.ownersInfo
    delete orgDetails.regions
    delete orgDetails.childAccountsInfo
    console.table(orgDetails)
    // TODO: Shows up weird
    // showTableFromTobject(orgDetails, 'Organization Details')
  }
}

// Function to change to another organization
export async function changeOrganization (accountId?: string) {
  const currentAccount = await getCurrentOrganizationInfo()
  let orgAccountId
  if (accountId) {
    orgAccountId = accountId
  } else {
    // List all the organizations
    // Ask to which organization you would like to switch
    const accountChoice = await displayOrganizations(true, true, 'Which organization would you like to change to (you are currently in: ' + col.blue(currentAccount.displayName) + ') ?')
    if (accountChoice) {
      orgAccountId = accountChoice.accountId
    } else {
      logCancel(true)
      return
    }
  }
  if (currentAccount.accountId === orgAccountId) {
    log(ERROR, 'You are already in the organization: ', currentAccount.displayName)
  } else {
    log(DEBUG, 'Changing Organization to: ', col.blue(orgAccountId))
    // Get the clientID for that organization
    const clientID = await getClientIdForOrg(orgAccountId)
    // console.log('Client ID: ' + clientID);
    let doOauth = false
    // If Oauth is being used: revoke the Key on the Old Organization
    if (isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
      doOauth = true
      const oDetails = getOAUTHDetails()
      log(INFO, 'Revoking your OAUTH Token on previous environment(' + col.blue(oDetails.Org) + '), Token Name: ' + col.blue(oDetails.Token_Name))
      await OAUTH.revokeOauthToken(oDetails.Token_Name)
      addOrUpdateProperty(getPropFileName(), 'CloudLogin.OAUTH_Token', '')
    }
    // Update the Cloud property file with that new Client ID
    // addOrUpdateProperty(getPropFileName(), 'CloudLogin.clientID', '[Organization: ' + orgDetails.accountDisplayName + ']' + clientID );
    addOrUpdateProperty(getPropFileName(), 'CloudLogin.clientID', clientID)
    // Invalidate login to login to new environment
    CCOM.invalidateLogin()
    // Property file needs to be reloaded; forcing a refresh
    getProp('CloudLogin.clientID', true, true)
    // If Oauth is being used: Generate a Key on the new Org
    if (doOauth) {
      // Generate a new OAUTH Token
      await OAUTH.generateOauthToken(null, true, false)
    }
    if (isOauthUsed()) {
      log(INFO, col.bold.green('Successfully changed to organization: ' + getOrganization(true)))
    } else {
      log(INFO, col.bold.green('Successfully changed to organization: ' + (await getCurrentOrganizationInfo()).displayName))
    }
  }
}

function mapOrg (org: ORGInfo) {
  org.name = org.accountDisplayName
  if (org.ownersInfo) {
    let i = 1
    for (const owner of org.ownersInfo) {
      org['Owner ' + i] = owner.firstName + ' ' + owner.lastName + ' (' + owner.email + ')'
      i++
    }
  }
  if (org.regions) {
    org.regions = org.regions.map((reg: any) => translateAWSRegion(reg))
    let i = 1
    for (const reg of org.regions) {
      org['Region ' + i] = reg
      i++
    }
  } else {
    org.regions = ['NONE']
  }
  return org
}

// Options; doShow, doChoose, question
export async function displayOrganizations (doShow: boolean, doChoose: boolean, question: string) {
  const organizations = await getOrganizations()
  const myOrgs = []
  for (let org of organizations) {
    org.type = 'Main'
    org = mapOrg(org)
    myOrgs.push(org)
    // console.log(org)
    const main = org.accountDisplayName
    if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
      for (let child of org.childAccountsInfo) {
        child.type = 'Child of ' + main
        child = mapOrg(child)
        myOrgs.push(child)
      }
    }
  }
  const tObject = createTable(myOrgs, CCOM.mappings.account_info, false)
  pexTable(tObject, 'organizations', getPEXConfig(), doShow)
  if (doChoose) {
    const orgA = await askMultipleChoiceQuestionSearch(question, ['NONE', ...iterateTable(tObject).map(v => v['Organization Name'])])
    const selectedOrg = iterateTable(tObject).filter(v => v['Organization Name'] === orgA)[0]
    let orgDetails
    if (selectedOrg) {
      orgDetails = getSpecificOrganization(organizations, selectedOrg['Organization Name'])
    }
    return orgDetails
  }
}

function getSpecificOrganization (organizations: ORGInfo[], name: any) {
  for (const org of organizations) {
    if (name === org.accountDisplayName) {
      return org
    }
    if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
      for (const child of org.childAccountsInfo) {
        if (name === child.accountDisplayName) {
          return child
        }
      }
    }
  }
}

// display current properties in a table
export async function getClientIdForOrg (accountId: string) {
  log(DEBUG, 'Getting client ID for organization, with account ID: ' + col.blue(accountId))
  const postRequest = 'account-id=' + accountId + '&opaque-for-tenant=TSC'
  const response = await CCOM.callTCA(CCOM.clURI.reauthorize, false, {
    method: 'POST',
    postRequest: postRequest,
    contentType: 'application/x-www-form-urlencoded',
    tenant: 'TSC',
    customLoginURL: 'https://' + getCurrentRegion() + CCOM.clURI.general_login,
    forceCLIENTID: true,
    returnResponse: true
  })
  const loginCookie = response.headers['set-cookie']
  const rxd = /domain=(.*?);/g
  const rxt = /tsc=(.*?);/g
  const cookies = { domain: rxd.exec(loginCookie)![1], tsc: rxt.exec(loginCookie)![1] }
  const axios = require('axios').default
  axios.defaults.validateStatus = () => {
    return true
  }
  const options = {
    method: 'POST',
    headers: {
      cookie: 'tsc=' + cookies.tsc + '; domain=' + cookies.domain
    }
  }
  // Get the ClientID
  const clientIDResponse = (await axios('https://' + getCurrentRegion() + CCOM.clURI.get_clientID, options)).data
  // Invalidate the login after using Re-Authorize
  CCOM.invalidateLogin()
  return clientIDResponse.ClientID
}

export async function getCurrentOrgId () {
  let re = ''
  const organizations = await getOrganizations() as Accounts
  const currentOrgName = await getOrganization()
  // console.log(currentOrgName)
  for (const org of organizations) {
    if (org.childAccountsInfo && org.childAccountsInfo.length > 0) {
      for (const childOrg of org.childAccountsInfo) {
        if (childOrg.accountDisplayName === currentOrgName) {
          re = childOrg.subscriptionId
        }
      }
    }
    if (org.accountDisplayName === currentOrgName) {
      re = org.subscriptionId
    }
  }
  // console.log('Current org ID: ', re)
  return re
}
