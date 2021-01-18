require('./common-functions');

function callCloud(url, doLog, config) {
    // TODO: Implement
    /*
    if(config == null){

    }

    // (url, method, postRequest, contentType, doLog, tenant, customLoginURL, returnResponse, forceOAUTH, forceCLIENTID, handleErrorOutside)
    return callURL(url, config.method, )
    */
}

const cloudConfig = require('../config/config-cloud.json');
export const clURI = cloudConfig.endpoints;
export const mappings = cloudConfig.mappings;
