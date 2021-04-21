//let CLI_EXECUTOR = 'node ./../../src/bin/cloud-cli.js --DebugTime ';
//let CLI_EXECUTOR_CS = 'node ./../../../src/bin/cloud-cli.js --DebugTime ';
let CLI_EXECUTOR = 'tcli --DebugTime ';
let CLI_EXECUTOR_CS = CLI_EXECUTOR;

let TEMP_TEST_FOLDER = './test/tmpTest';
let OS_COMMAND_SEPARATOR = ' && ';
if(/^win/.test(process.platform)){
    // C:\Program Files (x86)\Jenkins\workspace\CLOUD STARTERS\CS Update CLI and Validate\tmp\TCSTK-Cloud-CLI\test\tmpTest>cd .\test\tmpTest && node .\..\..\bin\cloud-cli.js --DebugTime --createCP
    // CLI_EXECUTOR = 'node .\\..\\..\\src\\bin\\cloud-cli.js --DebugTime ';
    // CLI_EXECUTOR_CS = 'node .\\..\\..\\..\\src\\bin\\cloud-cli.js --DebugTime ';
    CLI_EXECUTOR = 'node .\\..\\..\\dist\\tcli\\main.js --DebugTime ';
    CLI_EXECUTOR_CS = 'node .\\..\\..\\..\\dist\\tcli\\main.js --DebugTime ';
    TEMP_TEST_FOLDER = '.\\test\\tmpTest';
    OS_COMMAND_SEPARATOR = ' & ';
}

// const OS_COMMAND_SEPARATOR = ' && ';


describe("tcli testsuite", function () {
    beforeEach( function () {
        mkdirIfNotExist(TEMP_TEST_FOLDER);
        deleteFolder(TEMP_TEST_FOLDER);
        mkdirIfNotExist(TEMP_TEST_FOLDER);
        run('node -v');
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });
    afterEach(function () {

    });
    beforeAll(function () {
        setFolderAndOperator(TEMP_TEST_FOLDER, OS_COMMAND_SEPARATOR);
    });
    afterAll(function () {

    });

    // Show cloud with Basic Authentication
    // jasmine --config=test/support/jasmine.json --filter='TCLI: basic interactions'
    it("TCLI: basic interactions", function () {
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
    // BASIC CLI TASKS: jasmine --config=test/support/jasmine.json --filter='TCLI:'


    // jasmine --config=test/support/jasmine.json --filter='TCLI: Basic Operations'
    // Show cloud with Basic Authentication
    it("TCLI: Basic Operations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscated')).toBe(false);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST:NO')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.pass:none:USE-LOCAL:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-properties')).toBe(true);
        expect(run(CLI_EXECUTOR + 'view-global-config')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: Help'
    it("TCLI: Help", function () {
        expect(run(CLI_EXECUTOR + '--help')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + '--help change-region')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h show-crap')).toBe(false);
    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: More Operations'
    // Show cloud with Basic Authentication
    it("TCLI: More Operations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscated')).toBe(false);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST:NO')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-sandbox')).toBe(true);
        expect(run(CLI_EXECUTOR + 'view-global-config')).toBe(true);
        // TODO: add test user to US
        // expect(run(CLI_EXECUTOR + 'change-region -a "US - Oregon"')).toBe(true);

        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_FROM:none:CloudLogin')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_TO:none:CRAP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Replace_PATTERN:none:./tibco-cloud.properties')).toBe(true);
        expect(run(CLI_EXECUTOR + 'replace-string-in-file')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(false);
        expect(run(CLI_EXECUTOR + 'show-properties')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: Organizations'
    // Show cloud with Basic Authentication
    it("TCLI: Organizations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-properties')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-region -a "US - Oregon"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-region -a "AU - Sydney"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-region -a "EU - Ireland"')).toBe(true);

        // Test switching org Just Client ID
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Token:none:USE-LOCAL:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-organizations -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-organizations -a "TIBCO LABS DEV"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-cloud-organization -a "OOCTO"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);

        // Test switching org with OAUTH
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineOrgTest_1:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-organizations -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-organizations -a "OOCTO"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-cloud-organization -a "LABS DEV"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'revoke-oauth-token -a JasmineOrgTest_1')).toBe(true);

    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: OAUTH'
    // Generate an OAUTH Token
    it("TCLI: OAUTH", function () {
        //"37. show-oauth-tokens":
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineTest_1:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Token:none:USE-LOCAL:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud-starters')).toBe(true);
        // TODO: Takes very long
        expect(run(CLI_EXECUTOR + 'show-cloud-starter-links')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-cases')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate-and-rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'revoke-oauth-token -a JasmineTest_2')).toBe(true);
        // Added this to remove the fallback to password.
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.pass:none:Crap:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(false);
    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: LIVEAPPS'
    // Generate an OAUTH Token
    it("TCLI: LIVEAPPS", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cases')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-actions -a none')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-actions -a all')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-actions -a Discovercompliance')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-actions -a NOT_Exists')).toBe(false);

    });


    // jasmine --config=test/support/jasmine.json --filter='TEMPLATE: Build and Deploy Basic Cloud Starter'
    // Basic Cloud Starter Template - LATEST Angular 10
    it("TEMPLATE: Build and Deploy Basic Cloud Starter", function () {
        const CSName = 'CS-BASIC-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Basic Cloud Starter Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'deploy')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'validate -a cloud_starter_exist:' + CSName)).toBe(true);
        // "publish":
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starter-links')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a NONE')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a ' + CSName + ':YES')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TEMPLATE: Case Manager and Schematics'
    // Basic Cloud Starter Template - LATEST Angular 10

    //TODO: Testcase fails on windows (on ./backup folder)
    it("TEMPLATE: Case Manager and Schematics", function () {
        const CSName = 'CS-CASE-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Case Manager App - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        //TODO: Test Schematic add by making it more interactive...

        // expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'schematic-add -a ')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:case-cockpit CustomCaseCockpit')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:case-cockpit CustomHomeCockpit')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'generate-cloud-descriptor')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'update-cloud-packages')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
    });
    // TODO: "9. clean":
    // TODO: look at providing Anlytic schematic input on commandline
    // jasmine --config=test/support/jasmine.json --filter='Case Manager and Lib Sources'
    xit("Case Manager and Lib Sources", function () {
        const CSName = 'CS-CASE-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Case Manager App - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        // ng generate @tibco-tcstk/component-template:analytics-cockpit CustomAnalyticsCockpit
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'inject-lib-sources')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'undo-lib-sources')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        // expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'get-cloud-libs-from-git')).toBe(true);
        // expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TEMPLATE: Form and Schematics'
    // Form Template - LATEST Angular 10
    // TODO: Testcase fails on: Cannot read property 'length' of undefined
    xit("TEMPLATE: Form and Schematics", function () {
        const CSName = 'CS-FORM-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Form Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);

        // TODO: Add default ID for form ref
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-creator CustomFormCreator --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-action CustomFormAction --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-casedata CustomFormCaseData --defaults=true --interactive=false')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TEMPLATE: Analytics Template and Schematics'
    // Analytics Application Template - LATEST Angular 10
    it("TEMPLATE: Analytics Template and Schematics", function () {
        const CSName = 'CS-FORM-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Analytics Application Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build-cloud-starter')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'deploy-cloud-starter')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'validate -a cloud_starter_exist:' + CSName)).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a ' + CSName + ':YES')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='TCLI: Generate files'
    it("TCLI: Generate files", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        let mFile = 'myMultiple';
        expect(run(CLI_EXECUTOR + 'create-multiple-property-file -a ' + mFile)).toBe(true);
        // TODO: allow for default as input for multiple
        expect(run(CLI_EXECUTOR + 'generate-cloud-property-files -a MyProject:ALL_EU:NO:YES:' + mFile + '.properties')).toBe(true);
        // TODO: allow for default as input for multiple
        // TODO: output should be json NOT properties
        expect(run(CLI_EXECUTOR + 'generate-live-apps-import-configuration -a import-live-apps-data-configuration.json')).toBe(true);
    });

    // Shared State Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Shared State Testcases'
    it("TCLI: Shared State Testcases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Filter:none:*')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:SHARED')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:PRIVATE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-shared-state-scope -a YES')).toBe(true);
        // Export to Organization Folder
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:Shared_State_Folder:none:./Shared_State (~{ORGAniZAtION})/"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-shared-state-scope -a YES')).toBe(true);

        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:PUBLIC')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);

        // SET FILTER
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Filter:none:Jasmine')).toBe(true);

        // PRIVATE
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:PRIVATE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-shared-state-entry -a Jasmine.TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state-details -a Jasmine.TEST.PRIVATE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'clear-shared-state-entry -a Jasmine.TEST.PRIVATE:YES')).toBe(true);

        // SHARED
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:SHARED')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-shared-state-entry -a Jasmine.TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state-details -a Jasmine.TEST.SHARED')).toBe(true);
        expect(run(CLI_EXECUTOR + 'clear-shared-state-entry -a Jasmine.TEST.SHARED:YES')).toBe(true);

        // PUBLIC
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:PUBLIC')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-shared-state-entry -a Jasmine.TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state-details -a Jasmine.TEST.PUBLIC')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "DEFAULT:SS_ID:none:SPECIAL:Shared_StateID:Jasmine.TEST.PUBLIC"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'clear-shared-state-entry -a Jasmine.TEST.PUBLIC:YES')).toBe(true);

        // ERROR
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:FAKE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-shared-state-entry -a Jasmine.TEST')).toBe(false);

    });


    // Live Apps Cases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Live Apps Cases'
    it("TCLI: Live Apps Cases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        // TODO: Allow for NONE
        // TODO: Allow for All
        // TODO: Allow for default on name input
        expect(run(CLI_EXECUTOR + 'export-live-apps-case-type -a Discovercompliance:Discovercompliance.json')).toBe(true);
        // TODO: Allow for NONE
        // TODO: Allow for All

        expect(run(CLI_EXECUTOR + 'export-live-apps-cases -a Discovercompliance:DiscoFOLDER/')).toBe(true);
        // Allow for default on folder input
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:Case_Folder:none:./Cases (~{ORGAniZAtION})/"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-live-apps-cases -a Discovercompliance:DEFAULT')).toBe(true);
    });

    // Validation Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Validation Testcases'
    it("TCLI: Validation Testcases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_exist,CloudLogin.Region+CloudLogin.clientID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_exist,crap')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Property_is_set,CloudLogin.Region+CloudLogin.clientID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_is_set,crap')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a case_not_exist:123')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a case_exist:123')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a case_in_state:123:crap')).toBe(false);

        // TODO: this test is a bit specific to the environment, when available upload a file first.
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:discoverapp_assets:ic-documentation.svg')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_exist:discoverapp_assets')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_exist:discoverapp_assetsNotExists')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:discoverapp_assets')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:discoverapp_assets:ic-documentationNotExist.svg')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:discoverapp_assetsNotExists:ic-documentation.svg')).toBe(false);
        // validate -a Org_Folder_And_File_exist:datasources:CallcenterExample.csv
        // TODO: Look at other validations
        // tcli validate -a LiveApps_app_exist,Discovercompliance+Discoverimprovement+Discovercompliance
        // tcli validate -a tci_app_exist,test+graniteStateCRM
        // tcli validate -a cloud_starter_exist,labs-processmining-ui
    });


    // Groups and Users
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Groups and Users'
    it("TCLI: Groups and Users", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-groups -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-groups -a ALL')).toBe(true);
        // TODO: Create and remove group
        // tcli validate -a "Live_Apps_group_exist,Discover Administrators+Discover Case Resolvers+Discover Users+crap"
        // tcli validate -a "Live_Apps_group_exist,Discover Administrators+Discover Case Resolvers+Discover Users"
        expect(run(CLI_EXECUTOR + 'show-live-apps-users')).toBe(true);
    });

    // Org Folders
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Org Folders'
    it("TCLI: Org Folders", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        // TODO: Get more than 200 folders
        expect(run(CLI_EXECUTOR + 'show-org-folders -a NONE')).toBe(true);
        // Get content of a known folder
        expect(run(CLI_EXECUTOR + 'show-org-folders -a discoverapp_assets')).toBe(true);
        expect(run(CLI_EXECUTOR + 'download-file-from-org-folder -a discoverapp_assets:ALL')).toBe(true);
        // Create a folder
        // TODO: Create a function to delete an (empty folder), and delete a cloud file
        // expect(run(CLI_EXECUTOR + 'create-org-folder -a jasmine_test_folder')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-org-folder -a jasmine_test_folder')).toBe(true);

        expect(run(CLI_EXECUTOR + 'upload-file-to-org-folder -a jasmine_test_folder:tibco-cloud.properties:SAME')).toBe(true);
        expect(run(CLI_EXECUTOR + 'download-file-from-org-folder -a jasmine_test_folder:tibco-cloud.properties')).toBe(true);
    });

    // TCI Apps
    // jasmine --config=test/support/jasmine.json --filter='TCLI: TCI Apps'
    it("TCI Apps", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-tci-apps')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-tci-app -a ')).toBe(false);
        expect(run(CLI_EXECUTOR + 'export-tci-app -a NONE')).toBe(true);
        /* Comment for Local, this only works on Jenkins server
        expect(run(CLI_EXECUTOR + 'export-tci-app -a discover_backend_service:NONE:NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-tci-app -a discover_backend_service:DEFAULT:DEFAULT')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-tci-app -a discover_backend_service:NONE:my_flogo.json')).toBe(true);
        expect(run(CLI_EXECUTOR + 'export-tci-app -a discover_backend_service:my_manifest.json:my_other_flogo.json')).toBe(true);
*/

    });

    // Shared State Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Add Properties'
    it("TCLI: Add Properties", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Sandbox:none:SPECIAL:SandboxID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Org_Name:none:SPECIAL:Organization_Name')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Test:none:SPECIAL:LiveApps_AppID:NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:AppID:none:SPECIAL:LiveApps_AppID:Discovercompliance')).toBe(true);
        // expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:ActionID1:none:SPECIAL:LiveApps_ActionID:none')).toBe(true);
        // expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:ActionID1:none:SPECIAL:LiveApps_ActionID:Discovercompliance:none"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:ActionID1:none:SPECIAL:LiveApps_ActionID:Discovercompliance:Raise compliance issue"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:ActionID1:none:SPECIAL:LiveApps_ActionID:Discovercompliance:Escalate"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:ActionID1:none:SPECIAL:LiveApps_ActionID:NOT_EXITS:Abort"')).toBe(false);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a "default:ActionID1:none:SPECIAL:LiveApps_ActionID:Discovercompliance:NOT_EXISTS"')).toBe(false);
    });

    // Spotfire Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Spotfire'
    it("TCLI: Spotfire", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Token:none:NOT-GLOBAL:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'browse-spotfire-library -a NONE')).toBe(false);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineSpotfireTest_1:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_For_Tenants:none:TSC,BPM,SPOTFIRE:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'browse-spotfire-library -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'browse-spotfire-library -a "Parent) root:Child) DemoGallery:DXP) FinanceAnalytics::NONE"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'browse-spotfire-library -a "Parent) root:Child) TIBCO Community Mods:Child) Mods Library:MOD) Area Chart::NONE"')).toBe(true);

        // expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Sandbox:none:SPECIAL:LiveApps_AppID:NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a all')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a "Spotfire Reports"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a "Spotfire Mods"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a "Information links"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a "Data files"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a "Data connections"')).toBe(true);
        expect(run(CLI_EXECUTOR + 'list-spotfire-library -a spotfire.mod')).toBe(true);
        expect(run(CLI_EXECUTOR + 'revoke-oauth-token -a JasmineSpotfireTest_1')).toBe(true);

        // TODO: Create a delete item task
        // tcli copy-sf -a "Spotfire Reports:/Teams/Discover MVP DEV/Discover/main/archive/project_discover_latest_v130:/Teams/TIBCO LABS"

    });

    // FS Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Fuzzy Search'
    it("TCLI: Fuzzy Search", function () {
        const fus = require('../../src/common/fuzzy-search.js');
        for (let i = 0 ; i < 1000 ; i++) {
            let randomString = generateRandomString(Math.floor(Math.random() * 100));
            expect(fus.find(fus.search(randomString)) == randomString).toBe(true);
        }
    });

    // Spotfire Testcases
    // jasmine --config=test/support/jasmine.json --filter='TCLI: Messaging'
    it("TCLI: Messaging", async function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Token:none:NOT-GLOBAL:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'messaging-show-summary')).toBe(false);
        expect(run(CLI_EXECUTOR + 'messaging-show-clients')).toBe(false);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_Token_Name:none:JasmineTcmTest_1:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:CloudLogin.OAUTH_Generate_For_Tenants:none:TSC,BPM,TCM:LOCAL')).toBe(true);
        expect(run(CLI_EXECUTOR + 'generate-oauth-token -a YES:YES:YES')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-oauth-tokens')).toBe(true);
        expect(run(CLI_EXECUTOR + 'messaging-show-summary')).toBe(true);
        // await sleep(5000);
        // little hack to gain some time, sleep function doesn't seem to work here...
        expect(run(CLI_EXECUTOR + 'rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'rotate-oauth-token')).toBe(true);
        expect(run(CLI_EXECUTOR + 'messaging-show-clients')).toBe(true);
        expect(run(CLI_EXECUTOR + 'revoke-oauth-token -a JasmineTcmTest_4')).toBe(true);
        // expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Sandbox:none:SPECIAL:LiveApps_AppID:NONE')).toBe(true);
    });

    // Show cloud with Basic Authentication
    // jasmine --config=test/support/jasmine.json --filter='table testing'
    it("table testing", function () {
        require('./../../ts-out/common/tables');
    });

    // Fail on purpose (to block build pipeline)
    // jasmine --config=test/support/jasmine.json --filter='FAIL'
    xit("FAIL", function () {
        expect(false).toBe(true);
    });

    // a testcase to validate the names of the cli tasks (no clashing names)
    // jasmine --config=test/support/jasmine.json --filter='test task names'
    it("test task names", function () {
        const tasks = require('./../../ts-out/config/config-cli-task.json').cliTasks;
        const taskNames = [];
        for (let task in tasks) {
            if(taskNames.indexOf(task) > 0){
                fail('Duplicate Task Name: ' + task);
            }
            taskNames.push(task);
            if(tasks[task].taskAlternativeNames){
                for(tskA of tasks[task].taskAlternativeNames){
                    if(taskNames.indexOf(tskA) > 0){
                        fail('Duplicate Alternative Task Name: ' + tskA);
                    }
                    taskNames.push(tskA);
                }
            }
        }
    });

    // TODO: Test Multiple

    // TODO: Test Export Table (use does file exist test)

    /*
Difficult to TEST:
// "50. add-user-to-group":
// "48. create-live-apps-group": (need a remove group)
"6. start":
"16. update-global-config":

"20. clear-shared-state-scope":
"22. import-shared-state-scope":
"23. watch-shared-state-scope":
"31. import-live-apps-cases":
"35. monitor-tci-app":

Not Yet Implemented:
"show-spotfire-reports":
"wsu-list-tci":
"wsu-add-tci":
"36. describe-cloud":
"44. export-org-folder":
"45. import-org-folder":
"46. watch-org-folder":
    */


});
