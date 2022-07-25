import {ERROR, INFO, log, logCancel} from "../common/logging";
import {askMultipleChoiceQuestionSearch} from "../common/user-interaction";
import {getCurrentOrgId, getSubscriptionIdForOrgName} from "../common/organization-management";
import {getProp, prepProp} from "../common/property-file-management";
import {col, getOrganization} from "../common/common-functions";
import {postMessageToCloud} from "../common/cloud-communications";
import {SKIP_DISCOVER_REGION} from "./discover-new-ms";

const CCOM = require('../common/cloud-communications')

function prepDiscoverManagement() {
    prepProp('Discover_Copy_Dxp_Source_Org_Name', 'NOT_Set', 'Name of the organization to copy the source dxp from')
    prepProp('Discover_Copy_RO_PASS', 'NOT_Set', 'The Read Only Password to inject into the dxp')
}


export async function updateDxp() {
    log(INFO, 'Updating dxp...')
    prepDiscoverManagement()
    // Step 1: ask which dxp to update (None, Preview, Main, All)
    const updateDecision = (await askMultipleChoiceQuestionSearch('Which dxp would you like to update ?', ['NONE', 'ALL', 'Preview', 'Main'])).toLowerCase()
    if (updateDecision !== 'none') {
        // Step 2: Get the Org Id of the Source (config)
        const sourceOrgName = getProp('Discover_Copy_Dxp_Source_Org_Name');
        // Step 3: Get the Target RO Password (config)
        const targetRoPass = getProp('Discover_Copy_RO_PASS');
        if (sourceOrgName && sourceOrgName.toLowerCase() !== 'not_set' && targetRoPass && targetRoPass.toLowerCase() !== 'not_set') {
            const sourceOrgId = await getSubscriptionIdForOrgName(sourceOrgName)
            if (sourceOrgId) {
                // Step 4: Get the Org Id of the Target (this org ID)
                const currentOrgId = await getCurrentOrgId()
                if (currentOrgId !== sourceOrgId) {
                    // Step 5: Call Update Preview
                    if (updateDecision === 'preview' || updateDecision === 'all') {
                        await callUpdateDxp('preview', sourceOrgName, sourceOrgId, getOrganization(), currentOrgId, targetRoPass)
                    }
                    // Step 6: Call Update Main
                    if (updateDecision === 'main' || updateDecision === 'all') {
                        await callUpdateDxp('main', sourceOrgName, sourceOrgId, getOrganization(), currentOrgId, targetRoPass)
                    }
                } else {
                    log(ERROR, 'Source and target subscription id are the same; can\'t copy to itself...')
                }
            } else {
                log(ERROR, 'No subscription id found for org name: ', sourceOrgName)
            }
        } else {
            log(ERROR, 'Please set the values of Discover_Copy_Dxp_Source_Org_Name and/or Discover_Copy_RO_PASS')
        }
    } else {
        logCancel(true)
    }

    //   echo "----------------------------------------------------- "
    //   echo "--- Updating Spotfire ---"
    //   echo "----------------------------------------------------- "
    //   echo "--- Updating SF Main ---"
    //   echo "\nUpdating SF Main: $ORG_ID_TARGET" >>./update_spotfire_result.json
    //   curl -X POST -H "Content-Type: application/json" -H "Accept: application/json" -H "Authorization: Bearer ${TARGET_OAUTH}" \
    // -d "{ \"srcDxpPath\": \"/Teams/$ORG_ID_SOURCE/Discover/main/project_discover_latest\",\"orgId\": \"$ORG_ID_TARGET\",\"encryptedPassword\":\"$RO_PASS\"}" \
    // https://eu.api.discover.labs.cloud.tibco.com/internal/spotfire/update/main >>./update_spotfire_result.json
    //     echo "---- Update SF Main Response ----"
    //   tail ./update_spotfire_result.json
    //   echo "----------------------------------------------------- "
    //   echo "--- Updating SF Preview ---"
    //   echo "\nUpdating SF Preview: $ORG_ID_TARGET" >>./update_spotfire_result.json
    //   curl -X POST -H "Content-Type: application/json" -H "Accept: application/json" -H "Authorization: Bearer ${TARGET_OAUTH}" \
    // -d "{ \"srcDxpPath\": \"/Teams/$ORG_ID_SOURCE/Discover/preview/project_discover_preview_latest\",\"orgId\": \"$ORG_ID_TARGET\",\"encryptedPassword\":\"$RO_PASS\"}" \
    // https://eu.api.discover.labs.cloud.tibco.com/internal/spotfire/update/preview >>./update_spotfire_result.json
    //     echo "---- Update SF Preview Response ----"
    //   tail ./update_spotfire_result.json
    //   echo "-------------------------------"

}

async function callUpdateDxp(type: 'main' | 'preview', sourceOrgName: string, sourceOrgId: string, targetOrgName: string, targetOrgId: string, targetRoPass: string) {
    log(INFO, 'Updating ' + type + ' DXP from ' + col.blue(sourceOrgName + '(' + sourceOrgId + ')') + ' to ' + col.blue(targetOrgName + '(' + targetOrgId + ')'))
    let srcDxp = '/Teams/' + sourceOrgId + '/Discover/main/project_discover_latest'
    if (type === 'preview') {
        srcDxp = '/Teams/' + sourceOrgId + '/Discover/preview/project_discover_preview_latest'
    }
    const reqUpdateMain = {
        srcDxpPath: srcDxp,
        orgId: targetOrgId,
        encryptedPassword: targetRoPass
    }
    // dis_man_dxp_update
    const response = await postMessageToCloud(CCOM.clURI.dis_man_dxp_update + '/' + type, reqUpdateMain, {
        skipInjectingRegion: SKIP_DISCOVER_REGION
    })
    if (response.code === 0) {
        log(INFO, 'Successfully updated ' + type + ' dxp) Message: ', col.green(response.message))
    } else {
        log(ERROR, response)
    }

}
