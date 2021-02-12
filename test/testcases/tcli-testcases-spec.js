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
    // jasmine --config=test/support/jasmine.json --filter='tcli basic interactions'
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

    // jasmine --config=test/support/jasmine.json --filter='Basic Operations'
    // Show cloud with Basic Authentication
    it("Basic Operations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscated')).toBe(false);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-properties')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'view-global-config')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='Help'
    it("Help", function () {
        expect(run(CLI_EXECUTOR + '--help')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + '--help change-region')).toBe(true);
        expect(run(CLI_EXECUTOR + '-h show-crap')).toBe(false);
    });

    // jasmine --config=test/support/jasmine.json --filter='More Operations'
    // Show cloud with Basic Authentication
    it("More Operations", function () {
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
        expect(run(CLI_EXECUTOR + 'show-properties')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter=OAUTH
    // Generate an OAUTH Token
    it("OAUTH", function () {
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

    // jasmine --config=test/support/jasmine.json --filter='Build and Deploy Basic Cloud Starter'
    // Basic Cloud Starter Template - LATEST Angular 10
    it("Build and Deploy Basic Cloud Starter", function () {
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

    // jasmine --config=test/support/jasmine.json --filter='Case Manager and Schematics'
    // Basic Cloud Starter Template - LATEST Angular 10

    //TODO: Testcase fails on windows (on ./backup folder)
    it("Case Manager and Schematics", function () {
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

    // jasmine --config=test/support/jasmine.json --filter='Form Template and Schematics'
    // Form Template - LATEST Angular 10
    // TODO: Testcase fails on: Cannot read property 'length' of undefined
    xit("Form Template and Schematics", function () {
        const CSName = 'CS-FORM-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Form Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);

        // TODO: Add default ID for form ref
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-creator CustomFormCreator --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-action CustomFormAction --defaults=true --interactive=false')).toBe(true);
        expect(run('cd ' + CSName + ' && ng generate @tibco-tcstk/component-template:custom-form-casedata CustomFormCaseData --defaults=true --interactive=false')).toBe(true);
    });

    // jasmine --config=test/support/jasmine.json --filter='Analytics Template and Schematics'
    // Analytics Application Template - LATEST Angular 10
    it("Analytics Template and Schematics", function () {
        const CSName = 'CS-FORM-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + CSName + ' -t "Analytics Application Template - LATEST Angular 10" -s')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'build-deploy')).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'validate -a cloud_starter_exist:' + CSName)).toBe(true);
        expect(run('cd ' + CSName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a ' + CSName + ':YES')).toBe(true);
    });


    // jasmine --config=test/support/jasmine.json --filter='Generate files'
    it("Generate files", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        let mFile = 'myMultiple';
        expect(run(CLI_EXECUTOR + 'create-multiple-property-file -a ' + mFile)).toBe(true);
        // TODO: allow for default as input for multiple
        expect(run(CLI_EXECUTOR + 'generate-cloud-property-files -a MyProject:ALL:YES:' + mFile + '.properties')).toBe(true);
        // TODO: allow for default as input for multiple
        // TODO: output should be json NOT properties
        expect(run(CLI_EXECUTOR + 'generate-live-apps-import-configuration -a import-live-apps-data-configuration.json')).toBe(true);
    });

    // Shared State Testcases
    // jasmine --config=test/support/jasmine.json --filter='Shared State Testcases'
    it("Shared State Testcases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Filter:none:*')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:SHARED')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:PRIVATE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-shared-state')).toBe(true);
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
        expect(run(CLI_EXECUTOR + 'clear-shared-state-entry -a Jasmine.TEST.PUBLIC:YES')).toBe(true);

        // ERROR
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Shared_State_Type:none:FAKE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'create-shared-state-entry -a Jasmine.TEST')).toBe(false);
    });


    // Live Apps Cases
    // jasmine --config=test/support/jasmine.json --filter='Live Apps Cases'
    it("Live Apps Cases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        // TODO: Allow for NONE
        // TODO: Allow for All
        // TODO: Allow for default on name input
        expect(run(CLI_EXECUTOR + 'export-live-apps-case-type -a Discoveranalysis:Discoveranalysis.json')).toBe(true);
        // TODO: Allow for NONE
        // TODO: Allow for All
        // TODO: Allow for default on folder input
        expect(run(CLI_EXECUTOR + 'export-live-apps-cases -a Discoveranalysis:DiscoFOLDER')).toBe(true);
    });

    // Validation Testcases
    // jasmine --config=test/support/jasmine.json --filter='Validation Testcases'
    it("Validation Testcases", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_exist,CloudLogin.Region+CloudLogin.clientID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_exist,crap')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Property_is_set,CloudLogin.Region+CloudLogin.clientID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Property_is_set,crap')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a case_not_exist:123')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a case_exist:123')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a case_in_state:123:crap')).toBe(false);

        // TODO: this test is a bit specific to the environment, when available upload a file first.
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:datasources:CallcenterExample.csv')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_exist:datasources')).toBe(true);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_exist:datasourcesNotExists')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:datasources')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:datasources:CallcenterExampleNotExist.csv')).toBe(false);
        expect(run(CLI_EXECUTOR + 'validate -a Org_Folder_And_File_exist:datasourcesNotExists:CallcenterExample.csv')).toBe(false);
        // validate -a Org_Folder_And_File_exist:datasources:CallcenterExample.csv
        // TODO: Look at other validations
        // tcli validate -a LiveApps_app_exist,Discovercompliance+Discoverimprovement+Discoveranalysis
        // tcli validate -a tci_app_exist,test+graniteStateCRM
        // tcli validate -a cloud_starter_exist,labs-processmining-ui
    });


    // Groups and Users
    // jasmine --config=test/support/jasmine.json --filter='Groups and Users'
    it("Groups and Users", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-groups -a NONE')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-live-apps-groups -a ALL')).toBe(true);
        // TODO: Create and remove group
        // tcli validate -a "Live_Apps_group_exist,Discover Administrators+Discover Case Resolvers+Discover Users+crap"
        // tcli validate -a "Live_Apps_group_exist,Discover Administrators+Discover Case Resolvers+Discover Users"
        expect(run(CLI_EXECUTOR + 'show-live-apps-users')).toBe(true);
    });

    // Org Folders
    // jasmine --config=test/support/jasmine.json --filter='Org Folders'
    it("Org Folders", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        // TODO: Get more than 200 folders
        expect(run(CLI_EXECUTOR + 'show-org-folders -a NONE')).toBe(true);
        // TODO: Get content of a known folder (perhaps when you can upload)
        // expect(run(CLI_EXECUTOR + 'show-org-folders -a CloudStarterSample')).toBe(true);
        // CloudStarterSample
    });


    // TCI Apps
    // jasmine --config=test/support/jasmine.json --filter='TCI Apps'
    it("TCI Apps", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-tci-apps')).toBe(true);
    });

    // Shared State Testcases
    // jasmine --config=test/support/jasmine.json --filter='Add Properties'
    it("Add Properties", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Sandbox:none:SPECIAL:SandboxID')).toBe(true);
        expect(run(CLI_EXECUTOR + 'add-or-update-property -a default:Sandbox:none:SPECIAL:LiveApps_AppID:NONE')).toBe(true);
        // TODO: Think about a testcase for the action ID
    });

    // Spotfire Testcases
    // jasmine --config=test/support/jasmine.json --filter='Spotfire'
    it("Spotfire", function () {
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
    });

    // FS Testcases
    // jasmine --config=test/support/jasmine.json --filter='Fuzzy Search'
    it("Fuzzy Search", function () {
        const fus = require('./../../src/build/fuzzy-search.js');
        for (let i = 0 ; i < 1000 ; i++) {
            let randomString = generateRandomString(Math.floor(Math.random() * 100));
            expect(fus.find(fus.search(randomString)) == randomString).toBe(true);
        }
    });

    // Spotfire Testcases
    // jasmine --config=test/support/jasmine.json --filter='Messaging'
    it("Messaging", async function () {
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
        require('./../../src/build/tables');
    });

    // Fail on purpose (to block build pipeline)
    // jasmine --config=test/support/jasmine.json --filter='FAIL'
    xit("FAIL", function () {
        expect(false).toBe(true);
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
