const CLI_EXECUTOR = './../../bin/cloud-cli.js';

describe("tcli testsuite", function() {

    beforeEach(function () {
        run('pwd');
        run('rm -rf ./*');
    });
    afterEach(function () {

    });
    beforeAll(function () {

    });
    afterAll(function () {

    });

    // Show cloud with Basic Authentication
    it("tcli basic interactions", function () {
        //expect(run(CLI_EXECUTOR + ' -a q')).toBe(true);
        //expect(run(CLI_EXECUTOR + ' -a exit')).toBe(true);
        //expect(run(CLI_EXECUTOR + ' -a quit')).toBe(true);
        expect(run(CLI_EXECUTOR + ' --version')).toBe(true);
        expect(run(CLI_EXECUTOR + ' --help')).toBe(true);
    });

    // Show cloud with Basic Authentication
    it("show-cloud", function () {
        expect(run(CLI_EXECUTOR + ' --createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + ' show-cloud')).toBe(true);
        //TODO: Hier verder add these use cases:

        // replace-string-in-file
        // change-region
        // obfuscate
        // view-global-config
    });
    // "q"
    // "exit"
    // "quit"
    // "help":
    // "repeat-last-task": {



    // Generate an OAUTH Token //  // "38. generate-oauth-token":   // "52. add-or-update-property"
    it("OAUTH", function () {
        expect(run(CLI_EXECUTOR + ' --createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + ' add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineTest_1')).toBe(true);
        expect(run(CLI_EXECUTOR + ' generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + ' show-cloud-starters')).toBe(true);
        expect(run(CLI_EXECUTOR + ' show-cloud-starter-links')).toBe(true);
        expect(run(CLI_EXECUTOR + ' show-live-apps-cases')).toBe(true);
        expect(run(CLI_EXECUTOR + ' validate-and-rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + ' rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + ' revoke-oauth-token -a JasmineTest_2')).toBe(true);
    });




/*

        },
        "6. start":
        "7. build":
        "8. deploy":
        "publish":
        "9. clean":
        "10. build-deploy":
        "11. get-cloud-libs-from-git":
        "12. inject-lib-sources":
        "13. undo-lib-sources":
         "26. delete-cloud-starter":
        "wsu-list-tci":
        "wsu-add-tci":
        "14. schematic-add":

        "16. update-global-config":
        "17. show-shared-state":
        "18. show-shared-state-details":
        "19. clear-shared-state-entry":
        "20. clear-shared-state-scope":
        "21. export-shared-state-scope":
        "22. import-shared-state-scope":
        "23. watch-shared-state-scope":
        "24. create-multiple-property-file":


        "27. ": {
            "description": "Show Live Apps Cases",
                "enabled": true,
                "internal": false,
                "multipleInteraction": true,
                "gulpTask": "show-live-apps-cases",
                "availableOnOs": ["all"]
        },
        "28. export-live-apps-case-type": {
            "description": "Export the details of a Live Apps Case Type",
                "enabled": true,
                "internal": false,
                "multipleInteraction": true,
                "gulpTask": "export-live-apps-case-type",
                "availableOnOs": ["all"]
        },
        "29. export-live-apps-cases": {
            "description": "Export Data from Live Apps",
                "enabled": true,
                "internal": false,
                "gulpTask": "export-live-apps-cases",
                "availableOnOs": ["all"]
        },
        "30. generate-live-apps-import-configuration": {
            "description": "Generate the Live Apps Import configuration file",
                "enabled": true,
                "internal": false,
                "gulpTask": "generate-live-apps-import-configuration",
                "availableOnOs": ["all"]
        },
        "31. import-live-apps-cases": {
            "description": "Import Cases to Live Apps",
                "enabled": true,
                "internal": false,
                "gulpTask": "import-live-apps-cases",
                "availableOnOs": ["all"]
        },
        "csv-to-json-live-apps-data": {
            "description": "Convert CSV to JSON for LiveApps data",
                "enabled": false,
                "internal": false,
                "gulpTask": "csv-to-json-liveapps-data",
                "availableOnOs": ["all"]
        },
        "json-to-csv-liveapps-data": {
            "description": "Convert JSON to CSV for LiveApps data",
                "enabled": false,
                "internal": false,
                "gulpTask": "json-to-csv-liveapps-data",
                "availableOnOs": ["all"]
        },
        "32. generate-cloud-descriptor": {
            "description": "Generates the configured Public Cloud Descriptor",
                "enabled": true,
                "internal": false,
                "gulpTask": "generate-cloud-descriptor",
                "availableOnOs": ["all"]
        },
        "33. update-cloud-packages": {
            "description": "Updates the NPM packges in the @tibco-tcstk scope in your project.",
                "enabled": true,
                "internal": false,
                "gulpTask": "update-cloud-packages",
                "availableOnOs": ["all"]
        },
        "34. show-tci-apps": {
            "description": "List all TIBCO Cloud Integration Applications(Flogo, Scribe, Node.JS & Business Works).",
                "enabled": true,
                "internal": false,
                "multipleInteraction": true,
                "gulpTask": "show-tci-apps",
                "availableOnOs": ["all"]
        },
        "35. monitor-tci-app": {
            "description": "Monitor the logs of a TIBCO Cloud Integration Flogo Application",
                "enabled": true,
                "internal": false,
                "multipleInteraction": true,
                "gulpTask": "monitor-tci-app",
                "availableOnOs": ["all"]
        },
        "36. describe-cloud": {
            "description": "A combination of show-cloud, show-tci-apps, show-spotfire-reports, show-live-apps-cases & show-cloud-starters.",
                "enabled": false,
                "internal": false,
                "multipleInteraction": false,
                "gulpTask": "describe-cloud",
                "availableOnOs": ["all"]
        },
        "37. show-oauth-tokens": {
            "description": "Displays OAUTH tokens to authenticate to the TIBCO Cloud.",
                "enabled": true,
                "internal": false,
                "multipleInteraction": true,
                "gulpTask": "show-oauth-tokens",
                "availableOnOs": ["all"]
        },


       // "42. generate-cloud-property-files"
       // "43. show-org-folders":
       // "44. export-org-folder":
       // "45. import-org-folder":
       // "46. watch-org-folder":
       // "47. show-live-apps-groups"
       // "48. create-live-apps-group":
       // "49. show-live-apps-users":
       // "50. add-user-to-group":
       // "51. validate"

       // "show-spotfire-reports":
       // "update-tcli"

*/





});
