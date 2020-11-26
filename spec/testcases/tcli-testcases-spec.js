let CLI_EXECUTOR = './../../bin/cloud-cli.js --DebugTime ';
let CLI_EXECUTOR_CS = './../' + CLI_EXECUTOR;
let TEMP_TEST_FOLDER = './test/tmpTest';
let OS_COMMAND_SEPARATOR = ' && ';
if(/^win/.test(process.platform)){
    // C:\Program Files (x86)\Jenkins\workspace\CLOUD STARTERS\CS Update CLI and Validate\tmp\TCSTK-Cloud-CLI\test\tmpTest>cd .\test\tmpTest && node .\..\..\bin\cloud-cli.js --DebugTime --createCP
    CLI_EXECUTOR = 'node .\\..\\..\\bin\\cloud-cli.js --DebugTime ';
    CLI_EXECUTOR_CS = 'node .\\..\\..\\..\\bin\\cloud-cli.js --DebugTime ';
    TEMP_TEST_FOLDER = '.\\test\\tmpTest';
    OS_COMMAND_SEPARATOR = ' & ';
}

// const OS_COMMAND_SEPARATOR = ' && ';


describe("tcli testsuite", function () {
    beforeEach( function () {
        mkdirIfNotExist(TEMP_TEST_FOLDER);
        deleteFolder(TEMP_TEST_FOLDER);
        mkdirIfNotExist(TEMP_TEST_FOLDER);
    });
    afterEach(function () {

    });
    beforeAll(function () {
        setFolderAndOperator(TEMP_TEST_FOLDER, OS_COMMAND_SEPARATOR);
    });
    afterAll(function () {

    });

    // Show cloud with Basic Authentication
    // jasmine --filter='tcli basic interactions'
    it("tcli basic interactions", function () {
        //expect(run(CLI_EXECUTOR + ' -a q')).toBe(true);
        //expect(run(CLI_EXECUTOR + ' -a exit')).toBe(true);
        //expect(run(CLI_EXECUTOR + ' -a quit')).toBe(true);
        expect(run(CLI_EXECUTOR + '--version')).toBe(true);
        expect(run(CLI_EXECUTOR + '--help')).toBe(true);

        // "q"
        // "exit"
        // "quit"
        // "help":
        // "repeat-last-task": {
        // "update-tcli"
    });

    // jasmine --filter='Basic Operations'
    // Show cloud with Basic Authentication
    it("Basic Operations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscated')).toBe(false);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'view-global-config')).toBe(true);
        // TODO: add test user to US
        // expect(run(CLI_EXECUTOR + 'change-region -a "US - Oregon"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_FROM:none:CloudLogin')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_TO:none:CRAP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_PATTERN:none:./tibco-cloud.properties')).toBe(true);
        expect(run(CLI_EXECUTOR + 'replace-string-in-file')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(false);
    });

    // jasmine --filter=OAUTH
    // Generate an OAUTH Token
    it("OAUTH", function () {
        //"37. show-oauth-tokens":
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineTest_1')).toBe(true);
        expect(run(CLI_EXECUTOR + 'generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-starters')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-starter-links')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-cases')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate-and-rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'revoke-oauth-token -a JasmineTest_2')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(false);
    });

    // jasmine --filter='Build and Deploy Cloud Starter'
    // Basic Cloud Starter Template - LATEST Angular 10
    it("Build and Deploy Basic Cloud Starter", function () {
        const CSName = 'CS-BASIC-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Basic Cloud Starter Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'deploy')).toBe(true);
        // "publish":
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starter-links')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a NONE')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a ' + CSName + ':YES')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
    });

    // jasmine --filter='Case Manager and Schematics'
    // Basic Cloud Starter Template - LATEST Angular 10
    it("Case Manager and Schematics", function () {
        const CSName = 'CS-CASE-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Case Manager App - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        //TODO: Test Schematic add by making it more interactive...

        // expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'schematic-add -a ')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:case-cockpit CustomCaseCockpit')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:case-cockpit CustomHomeCockpit')).toBe(true);
        // TODO: look at providing Anlytic schematic input on commandline

        // ng generate @tibco-tcstk/component-template:analytics-cockpit CustomAnalyticsCockpit

        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'inject-lib-sources')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'undo-lib-sources')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'get-cloud-libs-from-git')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
    });

    // jasmine --filter='Form Template and Schematics'
    // Form Template - LATEST Angular 10
    xit("Form Template and Schematics", function () {
        const CSName = 'CS-FORM-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Form Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        // TODO: Cannot read property 'length' of undefined
        // TODO: Add default ID for form ref

        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-creator CustomFormCreator --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-action CustomFormAction --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-casedata CustomFormCaseData --defaults=true --interactive=false')).toBe(true);
    });

        /*

Analytics Application Template - LATEST Angular 10
         */


    /*
            "6. start":
            "9. clean":
            "10. build-deploy":

             "26. ":
            "wsu-list-tci":
            "wsu-add-tci":
            "14. ":

            "16. update-global-config":
            "17. show-shared-state":
            "18. show-shared-state-details":
            "19. clear-shared-state-entry":
            "20. clear-shared-state-scope":
            "21. export-shared-state-scope":
            "22. import-shared-state-scope":
            "23. watch-shared-state-scope":
            "24. create-multiple-property-file":

            "28. export-live-apps-case-type"
            "29. export-live-apps-cases"
            "30. generate-live-apps-import-configuration"
            "31. import-live-apps-cases":
            "csv-to-json-live-apps-data":
            "json-to-csv-liveapps-data":
            "32. generate-cloud-descriptor":
            "33. update-cloud-packages":
            "34. show-tci-apps":
            "35. monitor-tci-app":
            "36. describe-cloud":
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


    */


});
