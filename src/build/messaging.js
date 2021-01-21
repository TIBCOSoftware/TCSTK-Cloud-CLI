const CCOM = require('./cloud-communications');
const colors = require('colors');

export async function showSummary() {
    log(INFO, 'Show Messaging Summary... ');
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
