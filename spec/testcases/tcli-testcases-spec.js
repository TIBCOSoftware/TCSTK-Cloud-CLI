const CLI_EXECUTOR = './../../bin/cloud-cli.js --DebugTime ';
const CLI_EXECUTOR_CS = './../' + CLI_EXECUTOR;

describe("tcli testsuite", function () {

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
    });

    // jasmine --filter='Basic Operations'
    // Show cloud with Basic Authentication
    it("Basic Operations", function () {
        expect(run(CLI_EXECUTOR + '--createCP')).toBe(true);
        expect(run(CLI_EXECUTOR + 'obfuscated')).toBe(false);
        expect(run(CLI_EXECUTOR + 'obfuscate -a TEST')).toBe(true);
        expect(run(CLI_EXECUTOR + 'show-cloud')).toBe(true);
        expect(run(CLI_EXECUTOR + 'view-global-config')).toBe(true);
        expect(run(CLI_EXECUTOR + 'change-region -a "US - Oregon"')).toBe(true);
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
    // Generate an OAUTH Token
    xit("Build and Deploy Cloud Starter", function () {
        const BasicName = 'CS-BASIC-TEST-CM-' + (new Date()).getTime();
        expect(run(CLI_EXECUTOR + ' new ' + BasicName + ' -t \'Basic Cloud Starter Template - LATEST Angular 10\' -s')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'build')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'deploy')).toBe(true);
        // "publish":
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starter-links')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a NONE')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'delete-cloud-starter -a ' + BasicName + ':YES')).toBe(true);
        expect(run('cd ' + BasicName + ' && ' + CLI_EXECUTOR_CS + 'show-cloud-starters')).toBe(true);
    });
    /*
            "6. start":

            "9. clean":
            "10. build-deploy":
            "11. get-cloud-libs-from-git":
            "12. inject-lib-sources":
            "13. undo-lib-sources":
             "26. ":
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
           // "update-tcli"

    */


});
