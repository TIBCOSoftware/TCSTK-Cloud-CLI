const CCOM = require('./cloud-communications');

// Function to show spotfire reports
export function showSpotfire() {
    // TODO: How to go to the Root folder
    const request = {
        "folderId": "3e5816de-de4b-402e-9628-9da1a8205553",
        "types": ["spotfire.folder", "spotfire.dxp", "spotfire.sbdf", "spotfire.mod"]
    }

    const folderEndpoint = 'https://' + getCurrentRegion() + CCOM.clURI.sf_reports;
    const response = callURL(folderEndpoint, 'POST', request, null, false, null, null, true);
    // console.log('Response: ', response.headers);

    const loginCookie = response.headers['set-cookie'];
    //  logO(DEBUG, loginCookie);
    const jSession = /JSESSIONID=(.*?);/g.exec(loginCookie)[1];
    const xSRF = /XSRF-TOKEN=(.*?);/g.exec(loginCookie)[1];

    //console.log('jSession: ' , jSession);
    //console.log('xSRF: ' , xSRF);

    const header = {};
    header["accept"] = 'application/json';
    header["Content-Type"] = 'application/json';
    header["Authorization"] = 'Bearer ' + getProp('CloudLogin.OAUTH_Token');
    header["cookie"] = "JSESSIONID=" + jSession;
    header["X-XSRF-TOKEN"] = xSRF;

    // console.log('Headers: ' , header);
    const syncClient = require('sync-rest-client');
    const secondResponse = syncClient.post(folderEndpoint, {
        headers: header,
        payload: request
    });
    // console.log(secondResponse);

    // console.log(secondResponse.body);
    const sfReports = secondResponse.body;
    log(INFO, 'Current folder: ', sfReports.CurrentFolder.DisplayName)
    let tObject = createTable(sfReports.Children, CCOM.mappings.sf_reports, false);
    pexTable(tObject, 'spotfire-reports', getPEXConfig(), true);

    /*
    The value of the XSRF-TOKEN cookie needs to be returned in a X-XSRF-TOKEN header in all subsequent requests (along with the JSESSIONID cookie).
    Both these cookies may later get new values (when sessions expire and such), in that case you need to update that values that you send.
     */

}
