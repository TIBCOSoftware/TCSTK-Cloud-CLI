import {
  col, doesExist
} from '../common/common-functions'
import { askMultipleChoiceQuestionSearch, askQuestion } from '../common/user-interaction'
import { ERROR, INFO, log, logCancel, WARNING } from '../common/logging'
import { LAGroup } from '../models/live-apps'
import {
  createTable,
  getPEXConfig,
  iterateTable,
  pexTable, showTableFromTobject
} from '../common/tables'
const CCOM = require('../common/cloud-communications')
const LA = require('./live-apps')

export async function getGroups (): Promise<LAGroup[]> {
  return await CCOM.callTCA(CCOM.clURI.la_groups) as LAGroup[]
}

export async function getGroupsTable (showTable?: boolean): Promise<any> {
  let doShowTable = true
  if (showTable != null) {
    doShowTable = showTable
  }
  const oResponse = await getGroups()
  const groupTable = createTable(oResponse, CCOM.mappings.la_groups, false)
  pexTable(groupTable, 'live-apps-groups', getPEXConfig(), doShowTable)
  return groupTable
}

// Function that shows live apps group and who is in it.
export async function showLiveAppsGroups (): Promise<void> {
  const groupT = await getGroupsTable()
  const selectGroup = ['NONE', 'ALL']
  for (const gr of iterateTable(groupT)) {
    selectGroup.push(gr.Name)
  }
  const decision = await askMultipleChoiceQuestionSearch('For which group would you like to see the users ?', selectGroup)
  if (decision !== 'NONE') {
    for (const gr of iterateTable(groupT)) {
      if (decision === gr.Name || decision === 'ALL') {
        const oResponse = await CCOM.callTCA(CCOM.clURI.la_groups + '/' + gr.Id + '/users?$sandbox=' + await LA.getProductionSandbox())
        const userGroupTable = createTable(oResponse, CCOM.mappings.la_groups_users, false)
        for (const uGr in userGroupTable) {
          // userGroupTable[uGr].assign({Group: gr.Name}, userGroupTable[uGr]);
          userGroupTable[uGr] = Object.assign({ Group: gr.Name }, userGroupTable[uGr])
        }
        log(INFO, 'Users for group: ' + gr.Name)
        pexTable(userGroupTable, 'live-apps-groups-users', getPEXConfig(), true)
      }
    }
  } else {
    logCancel(true)
  }
}

// Function to create LiveApps Group
export async function createLiveAppsGroup (): Promise<void> {
  log(INFO, 'Creating LiveApps Group...')
  const gName = await askQuestion('What is the name of the group you would like to create ? (use "NONE" or press enter to not create a group)')
  if (gName !== '' || gName.toLowerCase() !== 'none') {
    const groups = await getGroups()
    if (!doesExist(groups.map(g => g.name), gName, `The group ${gName} already exists, we will not try to create it again...`)) {
      const gDescription = await askQuestion('What is the description of the group  ? (press enter to leave blank)')
      const postGroup = {
        name: gName,
        description: gDescription,
        type: 'SubscriptionDefined'
      }
      const oResponse = await CCOM.callTCA(CCOM.clURI.la_groups, false, { method: 'POST', postRequest: postGroup })
      if (oResponse != null) {
        log(INFO, 'Successfully created group with ID: ', col.green(oResponse))
      }
    }
  } else {
    logCancel(true)
  }
}

// Function that shows the LiveApps Users
export async function showLiveAppsUsers (showTable: boolean, hideTestUsers: boolean) {
  const oResponse = await CCOM.callTCA(CCOM.clURI.la_users)
  const usersTable = createTable(oResponse, CCOM.mappings.la_users, false)
  if (hideTestUsers) {
    for (const usr in usersTable) {
      if (usersTable[usr] && usersTable[usr].Type === 'Test') {
        delete usersTable[usr]
      }
    }
  }
  pexTable(usersTable, 'live-apps-users', getPEXConfig(), showTable)
  return usersTable
}

// Function to add a user to a group
export async function addUserToGroup () {
  // Show all the groups and ask to which group you would like to add a user.
  let groupIdToAdd = ''
  let userIdToAdd = ''
  const groupT = await getGroupsTable()
  // TODO: perhaps allow to add a user to all groups
  // let selectGroup = ['NONE', 'ALL'];
  const selectGroup = ['NONE']
  for (const gr of iterateTable(groupT)) {
    selectGroup.push(gr.Name)
  }
  const groupDecision = await askMultipleChoiceQuestionSearch('For which group would you like to ADD a user ?', selectGroup)
  if (groupDecision !== 'NONE') {
    let currentUsersInGroupT: any = []
    for (const gr of iterateTable(groupT)) {
      if (groupDecision === gr.Name) {
        groupIdToAdd = gr.Id
        const oResponse = await CCOM.callTCA(CCOM.clURI.la_groups + '/' + gr.Id + '/users?$sandbox=' + await LA.getProductionSandbox())
        log(INFO, 'CURRENT USERS IN GROUP: ' + groupDecision)
        currentUsersInGroupT = createTable(oResponse, CCOM.mappings.la_groups_users, true)
      }
    }
    const userT = await showLiveAppsUsers(false, true)
    // TODO: perhaps allow to add a user to all groups
    // let selectedUser = ['NONE', 'ALL'];
    const selectedUser = ['NONE']
    const allowedUsersTable = []
    for (const usr of iterateTable(userT)) {
      let add = true
      for (const cUsrGrp of iterateTable(currentUsersInGroupT)) {
        // console.log(cUsrGrp.Email + ' == ' + usr['Email'])
        if (cUsrGrp.Email === usr.Email) {
          add = false
        }
      }
      if (add) {
        allowedUsersTable.push(usr)
        // selectedUser.push(usr['First Name'] + ' ' + usr['Last Name']);
        selectedUser.push(usr['User Name'])
      }
    }
    // log(INFO, 'Users that can be added to ' + groupDecision)
    // console.table(allowedUsersTable)
    showTableFromTobject(allowedUsersTable, 'Users that can be added to ' + groupDecision)
    const userDecision = await askMultipleChoiceQuestionSearch('Which user would you like to add to the group (' + groupDecision + ')', selectedUser)
    if (userDecision !== 'NONE') {
      if (userDecision.startsWith('ID-')) {
        userIdToAdd = userDecision.substr(3)
      }
      if (groupDecision.startsWith('ID-')) {
        groupIdToAdd = userDecision.substr(3)
      }
      for (const usr of iterateTable(userT)) {
        // if (userDecision === usr['First Name'] + ' ' + usr['Last Name']) {
        if (userDecision === usr['User Name']) {
          userIdToAdd = usr.Id
        }
      }
      log(INFO, 'Adding user: ' + col.green(userDecision) + '[ID:' + userIdToAdd + '] to ' + col.green(groupDecision) + '[ID:' + groupIdToAdd + ']')
      const postGroupMapping = {
        sandboxId: await LA.getProductionSandbox(),
        groupId: groupIdToAdd,
        userId: userIdToAdd
      }
      const oResponse = await CCOM.callTCA(CCOM.clURI.la_user_group_mapping, false, {
        method: 'POST',
        postRequest: postGroupMapping,
        handleErrorOutside: true
      })
      if (oResponse) {
        if (oResponse.errorCode) {
          if (oResponse.errorCode === 'AE_USERGROUPMAPPING_CREATE_ERROR_ALREADY_EXISTS') {
            log(WARNING, 'The user is already part of the group, not doing anything...')
          } else {
            log(ERROR, oResponse)
          }
        } else {
          log(INFO, 'Successfully added user: ' + col.green(userDecision) + '[ID:' + userIdToAdd + '] to ' + col.green(groupDecision) + '[ID:' + groupIdToAdd + '] User Mapping ID: ' + oResponse)
        }
      } else {
        log(ERROR, 'No response...')
      }
    } else {
      logCancel(true)
    }
  } else {
    logCancel(true)
  }
  // Show all the users and add that users to a group.
}

// TODO: Add function to remove user from group

// TODO: Add function to remove a group
