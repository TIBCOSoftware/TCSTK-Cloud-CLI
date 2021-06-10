import { isOauthUsed } from '../common/common-functions'
import {
  createTable,
  getPEXConfig,
  pexTable
} from '../common/tables'
import { ERROR, INFO, log } from '../common/logging'

const CCOM = require('../common/cloud-communications')

async function connectMes (url: string) {
  if (isOauthUsed() && await CCOM.isOAUTHLoginValid()) {
    return await CCOM.callTCA(url, false)
  } else {
    log(ERROR, 'OAUTH Needs to be enabled for communication with MESSAGING, Please generate an OAUTH Token. Make sure it is enabled for TSC as well as TCM.')
    process.exit(1)
  }
}

export async function showSummary () {
  log(INFO, 'Show Messaging Summary... ')
  const mesSum = await connectMes(CCOM.clURI.mes_sum)
  const tObject = createTable([mesSum], CCOM.mappings.mes_sum, false)
  pexTable(tObject, 'messaging-summary', getPEXConfig(), true)
}

export async function showClients () {
  log(INFO, 'Show Messaging Clients... ')
  const mesCl = await connectMes(CCOM.clURI.mes_clients)
  for (const clN in mesCl.clients) {
    let sub = 0
    if (mesCl.clients[clN].subscriptions) {
      sub = mesCl.clients[clN].subscriptions.length
    }
    mesCl.clients[clN].NOFSubscriptions = sub
  }
  const tObject = createTable(mesCl.clients, CCOM.mappings.mes_clients, false)
  pexTable(tObject, 'messaging-clients', getPEXConfig(), true)

  // console.log( await CCOM.callTCA(CCOM.clURI.mes_system, true));
  // console.log( await CCOM.callTCA(CCOM.clURI.mes_durables, true));
  // const string = JSON.stringify( await CCOM.callTCA(CCOM.clURI.mes_clients, true), null, 4);
  // console.log(string);
  // console.log( await CCOM.callTCA(CCOM.clURI.mes_keys, true));
}

/*
Messaging URL's

https://eu.messaging.cloud.tibco.com/tcm/v1/system
https://eu.messaging.cloud.tibco.com/tcm/v1/system/summary
https://eu.messaging.cloud.tibco.com/tcm/v1/system/durables
https://eu.messaging.cloud.tibco.com/tcm/v1/system/eftl/clients
https://eu.messaging.cloud.tibco.com/tcm/ui/uiapi/v1/keysInfo
https://eu.messaging.cloud.tibco.com/tcm/ui/uiapi/v1/keys/165a2ea122ea4f238b34821526f76f8f

messaging-show-summary
messaging-show-durables
messaging-show-clients
messaging-show-keys

tcli add-or-update-property -a default,Messaging.discodev.Connection_URL,none,SPECIAL,MessagingURL
tcli add-or-update-property -a default,Messaging.discodev.Authentication_Key,none,SPECIAL,MessagingKEY,LongKey

 */
