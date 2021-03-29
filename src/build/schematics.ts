import {askMultipleChoiceQuestion, askQuestion, getProp, INFO, log, run} from "./common-functions";

const colors = require('colors');
const posSchematics = require('../config/config-schematics.json').schematicConfig;

// Function to add a schematic (for cloud starters)
export async function schematicAdd() {
    log(INFO, 'Adding Schematic...');
    const LIST_ALL = 'List All Possible Schematics';
    // Check if schematic is allowed
    let listing = true;
    let initialList = true;
    let sType = '';
    while (listing) {
        const appType = getProp('App_Type');
        let possibleSchematics = posSchematics.descriptions;
        let question = 'What type of schematic would you like to add ?';
        if (appType != null && initialList) {
            possibleSchematics = [LIST_ALL];
            for (let sNr in posSchematics.AvailableInTemplate) {
                for (let availableSchematic of posSchematics.AvailableInTemplate[sNr]) {
                    // console.log('App Type: ', appType, ' availableSchematic: ', availableSchematic);
                    if (appType === availableSchematic) {
                        possibleSchematics.unshift(posSchematics.descriptions[sNr]);
                    }
                }
            }
            question = 'Based on your application type ' + colors.blue(appType) + ' you can choose one of the following schematics (or choose list all):'
            initialList = false;
        }
        sType = await askMultipleChoiceQuestion(question, possibleSchematics);
        if (sType !== LIST_ALL) {
            listing = false;
        }
    }
    const sName = await askQuestion('What is the name of your schematic ?');
    run('ng generate @tibco-tcstk/component-template:' + posSchematics.names[posSchematics.descriptions.indexOf(sType)] + ' ' + sName);
    // Run npm install only after certain schematics.
    log(INFO, 'DO RUN NPM: ' + posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]);
    if (posSchematics.doRunNPM[posSchematics.descriptions.indexOf(sType)]) {
        run('npm install');
    }
}
