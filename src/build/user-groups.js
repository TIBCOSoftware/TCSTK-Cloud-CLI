const CCOM = require('./cloud-communications');
const LA = require('./liveApps');
const colors = require('colors');

function getGroupsTable(showTable) {
    let doShowTable = true;
    if (showTable != null) {
        doShowTable = showTable;
    }
    const oResponse =CCOM.callTC(CCOM.clURI.la_groups);
    const groupTable = createTable(oResponse, CCOM.mappings.la_groups, false);
    pexTable(groupTable, 'live-apps-groups', getPEXConfig(), doShowTable);
    return groupTable;
}

// Function that shows live apps group and who is in it.
export async function showLiveAppsGroups() {
    const groupT = getGroupsTable();
    let selectGroup = ['NONE', 'ALL'];
    for (let gr of iterateTable(groupT)) {
        selectGroup.push(gr.Name);
    }
    const decision = await askMultipleChoiceQuestionSearch('For which group would you like to see the users ?', selectGroup);
    if (decision != 'NONE') {
        for (let gr of iterateTable(groupT)) {
            if (decision == gr.Name || decision == 'ALL') {
                const oResponse =CCOM.callTC(CCOM.clURI.la_groups + '/' + gr.Id + '/users?$sandbox=' + LA.getProductionSandbox());
                const userGroupTable = createTable(oResponse, CCOM.mappings.la_groups_users, false)
                for (let uGr in userGroupTable) {
                    //userGroupTable[uGr].assign({Group: gr.Name}, userGroupTable[uGr]);
                    userGroupTable[uGr] = Object.assign({Group: gr.Name}, userGroupTable[uGr])
                }
                log(INFO, 'Users for group: ' + gr.Name);
                pexTable(userGroupTable, 'live-apps-groups-users', getPEXConfig(), true);
            }
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function to create LiveApps Group
export async function createLiveAppsGroup() {
    log(INFO, 'Creating LiveApps Group...');
    const gName = await askQuestion('What file name of the group you would like to create ? (press enter to not create a group)');
    if (gName != '') {
        const gDescription = await askQuestion('What is the description of the group  ? (press enter to leave blank)');
        let postGroup = {
            "name": gName,
            "description": gDescription,
            "type": "SubscriptionDefined"
        }
        const oResponse =CCOM.callTC(CCOM.clURI.la_groups, false ,{method: 'POST',  postRequest: postGroup} );
        if (oResponse != null) {
            log(INFO, 'Successfully create group with ID: ', oResponse);
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
}

// Function that shows the LiveApps Users
export function showLiveAppsUsers(showTable, hideTestUsers) {
    const oResponse =CCOM.callTC(CCOM.clURI.la_users);
    const usersTable = createTable(oResponse, CCOM.mappings.la_users, false);
    if (hideTestUsers) {
        for (let usr in usersTable) {
            if (usersTable[usr] && usersTable[usr].Type == 'Test') {
                delete usersTable[usr];
            }
        }
    }
    pexTable(usersTable, 'live-apps-users', getPEXConfig(), showTable);
    return usersTable;
}

// Function to add a user to a group
export async function addUserToGroup() {
    // Show all the groups and ask to which group you would like to add a user.
    let groupIdToAdd = '';
    let userIdToAdd = '';
    const groupT = getGroupsTable();
    // TODO: perhaps allow to add a user to all groups
    // let selectGroup = ['NONE', 'ALL'];
    let selectGroup = ['NONE'];
    for (let gr of iterateTable(groupT)) {
        selectGroup.push(gr.Name);
    }
    const groupDecision = await askMultipleChoiceQuestionSearch('For which group would you like to ADD a user ?', selectGroup);
    if (groupDecision != 'NONE') {
        let currentUsersInGroupT = [];
        for (let gr of iterateTable(groupT)) {
            if (groupDecision == gr.Name) {
                groupIdToAdd = gr.Id;
                const oResponse = CCOM.callTC(CCOM.clURI.la_groups + '/' + gr.Id + '/users?$sandbox=' + getProductionSandbox());
                log(INFO, 'CURRENT USERS IN GROUP: ' + groupDecision);
                currentUsersInGroupT = createTable(oResponse, CCOM.mappings.la_groups_users, true)
            }
        }
        const userT = showLiveAppsUsers(false, true);
        // TODO: perhaps allow to add a user to all groups
        //let selectedUser = ['NONE', 'ALL'];
        let selectedUser = ['NONE'];
        let allowedUsersTable = [];
        for (let usr of iterateTable(userT)) {
            let add = true;
            for (let cUsrGrp of iterateTable(currentUsersInGroupT)) {
                // console.log(cUsrGrp.Email + ' == ' + usr['Email'])
                if (cUsrGrp.Email == usr['Email']) {
                    add = false;
                }
            }
            if (add) {
                allowedUsersTable.push(usr);
                selectedUser.push(usr['First Name'] + ' ' + usr['Last Name']);
            }
        }
        log(INFO, 'Users that can be added to ' + groupDecision);
        console.table(allowedUsersTable);
        const userDecision = await askMultipleChoiceQuestionSearch('Which user would you like to add to the group (' + groupDecision + ')', selectedUser);
        if (userDecision != 'NONE') {
            if (userDecision.startsWith('ID-')) {
                userIdToAdd = userDecision.substr(3);
            }
            if (groupDecision.startsWith('ID-')) {
                groupIdToAdd = userDecision.substr(3);
            }
            for (let usr of iterateTable(userT)) {
                if (userDecision == usr['First Name'] + ' ' + usr['Last Name']) {
                    userIdToAdd = usr.Id;
                }
            }
            log(INFO, 'Adding user: ' + colors.green(userDecision) + '[ID:' + userIdToAdd + '] to ' + colors.green(groupDecision) + '[ID:' + groupIdToAdd + ']');
            const postGroupMapping = {
                sandboxId: getProductionSandbox(),
                groupId: groupIdToAdd,
                userId: userIdToAdd
            }
            const oResponse = CCOM.callTC( CCOM.clURI.la_user_group_mapping, false, {method: 'POST',  postRequest: postGroupMapping});
            if (oResponse != null) {
                log(INFO, 'Successfully added user: ' + colors.green(userDecision) + '[ID:' + userIdToAdd + '] to ' + colors.green(groupDecision) + '[ID:' + groupIdToAdd + '] User Mapping ID: ' + oResponse);

            }
        } else {
            log(INFO, 'OK, I won\'t do anything :-)');
        }
    } else {
        log(INFO, 'OK, I won\'t do anything :-)');
    }
    // Show all the users and add that users to a group.
}

//TODO: Add function to remove user from group

//TODO: Add function to remove a group
