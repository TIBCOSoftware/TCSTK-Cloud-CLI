# TIBCO Cloud™ Starters Toolkit - Command Line Interface 
<img src="https://community.tibco.com/sites/default/files/tibco_labs_final_with_tm2-01.png" alt="drawing" width="100"/>Powered by [TIBCO Labs™](https://community.tibco.com/wiki/tibco-labs)

Command Line Interface for creating TIBCO Cloud™ Starter Projects [(For more information see the Full Documentation)](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/001_TCLI_Overview/) 

### TIBCO Cloud™ CLI) Installation:
```
npm install -g @tibco-tcstk/cloud-cli
``` 

### TIBCO Cloud™ CLI) Usage: 
```
tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)] [--version(-v)] [--update(-u)] [--browse(-b)] [--propfile(-p)] [--multiple(-m) --multipleFile(-f) <multiple-file-name> --job(-j) <job-name> --environment(-e) <environment name>] [--multipleInteraction(-i)] [--surpressStart(-s)] [--answers(a) <answers>]
```

Note: When you just run "tcli" it will bring you in an interactive menu based on the context.

### Create new Tibco Cloud™ starter:
```
tcli new
```
And answer the questions, or provide the answers inline:
```
tcli new <name> [--template(-t)] <template-to-use>
```
* debug: Display debug information.
   
* createCP: Create a new tibco-cloud.properties file.

* help: display help 

* version: display the version number

* update: update the tcli

* browse: browse tcli tasks (Note; a tibco-cloud.properties file need to exist otherwise one can be created automatically)

* propfile: when specified tcli will use a different property file then the default tibco-cloud.properties

* multiple: run the task specified in the configured multiple property file. This allows you to execute tasks on many cloud starters and many different configured environments at the same time.

* multipleFile: when specified tcli will use a different property file then the default manage-multiple-cloud-starters.properties you can optionally specify a job to run and an environment to run this in; this is handy in integrating with CI/CD Buildpipelines.

* multipleInteraction: when specified, the multiple file will also be used, but in an interactive way. This is extremely handy if you want to run specific tcli jobs on multiple environments quickly.

* surpressStart: When using this option after creating a new cloud starter the interactive tcli will not start.

* answers: a comma(,) or column(:) separated list of answers to interactive questions. This is useful to run the tcli completely verbose; useful in a build-pipeline. 


These are the available TIBCO Cloud™ CLI Tutorials:

## Available Tutorials

| TUTORIAL | Description |
|------|:------------|
|1. [TCLI Overview](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/001_TCLI_Overview/)|Provides an overview of the TCLI and a getting started guide|
|2. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/002_Global_Configuration/)|Provides |
|3. [Get Started With Cloud Starters](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/003_Get_Started_With_Cloud_Starters/)|Provides |
|3. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/004_Multiple_Organizations /)|Provides |
|3. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/002_Global_Configuration/)|Provides |
|3. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/002_Global_Configuration/)|Provides |
|3. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/002_Global_Configuration/)|Provides |
|3. [Global Configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/002_Global_Configuration/)|Provides |



[Managing multiple TIBCO Cloud Organizations](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/004_Multiple_Organizations/)


                


 
005_Setting_Up_A_Buildpipeline
006_Passing_In_Answers    
007_Github_Actions             
008_TCLI_Recorder        

     

       





These are the available TIBCO Cloud™ CLI Tasks:

## tcli

| TASK | Description |
|------|:------------|
|[show-cloud](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-cloud/)|Show Cloud Details|
|[show-properties](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-properties/)|Shows the properties in your properties file (and possibly the global values)|
|[add-or-update-property](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/add-or-update-property/)|Adds or Updates a property in a file.|
|[change-cloud-region](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/change-cloud-region/)|Change the Region in the cloud-properties file|
|[show-cloud-organizations](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-cloud-organizations/)|Shows the Cloud Organization and potentially more details|
|[change-cloud-organization](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/change-cloud-organization/)|Changes the Organization in the cloud-properties file|
|[obfuscate-password](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/obfuscate-password/)|Obfuscate a password and put it in the cloud-properties file|
|[view-global-config](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/view-global-config/)|View the global cloud connection configuration|
|[update-global-config](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/update-global-config/)|Update the global cloud connection configuration|
|[create-multiple-property-file](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/create-multiple-property-file/)|Creating an initial property file to manage multiple cloud starters and environments.|
|[generate-cloud-property-files](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/generate-cloud-property-files/)|Generates a list of cloud property files.|
|[replace-string-in-file](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/replace-string-in-file/)|Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties|
|[validate](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/validate/)|Validations on the setting and/or the value of a property, the existence of a Cloud Starter, LiveApp or TCI App.|
|quit|Quit the console|
|update-tcli|Update the Cloud CLI|
|help|Display's help message|
|browse-tasks|Browses the TCLI tasks by category|
|repeat-last-task|Repeats the last executed task|

## cloud-starters

| TASK | Description |
|------|:------------|
|[show-cloud-starters](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-cloud-starters/)|Show a Table of all the deployed Cloud Starters|
|[show-cloud-starter-links](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-cloud-starter-links/)|Show Links to your Cloud Starters|
|[start-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/start-cloud-starter/)|Start your local cloud starter project|
|[build-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/build-cloud-starter/)|Build your local cloud starter project|
|[test-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/test-cloud-starter/)|Run Test cases for your cloud starter|
|[test-cloud-starter-headless](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/test-cloud-starter-headless/)|Run Test cases for your cloud starter, headless (without opening the browser)|
|[deploy-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/deploy-cloud-starter/)|Deploy your local cloud starter project|
|[build-deploy-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/build-deploy-cloud-starter/)|Builds and Deploys your local project to the cloud|
|[delete-cloud-starter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/delete-cloud-starter/)|Delete a LiveApps WebApp|
|[generate-descriptor](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/generate-descriptor/)|Generates the configured Public Cloud Descriptor|
|[update-packages](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/update-packages/)|Updates the NPM packages in the @tibco-tcstk scope in your project.|
|[inject-lib-sources](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/inject-lib-sources/)|Enables your project for Cloud Library Debugging|
|[undo-lib-sources](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/undo-lib-sources/)|Undoes the enabling for Cloud Library Debugging|
|[schematic-add](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/schematic-add/)|Add a schematic into your project|

## live-apps

| TASK | Description |
|------|:------------|
|[show-live-apps-cases](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-cases/)|Show Live Apps Cases|
|[show-live-apps-design-time-apps](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-design-time-apps/)|Show Live Apps Applications in Development (can be copied)|
|[show-live-apps-users](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-users/)|Shows the users in LiveApps (which can be added to groups).|
|[show-live-apps-groups](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-groups/)|Displays the LiveApps groups and their users.|
|[show-live-apps-sandbox](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-sandbox/)|Displays the LiveApps Sandbox ID's for Production and Development|
|[show-live-apps-actions](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-live-apps-actions/)|Displays the LiveApps actions (Creators & Actions) for a CaseType|
|[create-live-apps-group](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/create-live-apps-group/)|Creates a new LiveApps group.|
|[add-user-to-group](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/add-user-to-group/)|Adds a user to a LiveApps group.|
|[export-live-apps-case-type](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/export-live-apps-case-type/)|Export the details of a Live Apps Case Type|
|[export-live-apps-cases](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/export-live-apps-cases/)|Export Data from Live Apps|
|[generate-live-apps-import-configuration](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/generate-live-apps-import-configuration/)|Generate the Live Apps Import configuration file|
|[import-live-apps-cases](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/import-live-apps-cases/)|Import Cases to Live Apps|
|[copy-live-apps-between-organizations](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/copy-live-apps-between-organizations/)|Copies a LiveApps application between organizations.|

## shared-state

| TASK | Description |
|------|:------------|
|[show-shared-state](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-shared-state/)|Show the shared state contents|
|[show-shared-state-details](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-shared-state-details/)|Shows the details of one Shared State entry.|
|[create-shared-state-entry](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/create-shared-state-entry/)|Create a new shared state entry|
|[clear-shared-state-entry](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/clear-shared-state-entry/)|Removes one Shared State entry.|
|[clear-shared-state-filter](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/clear-shared-state-filter/)|Removes all shared state entries in the configured filter.|
|[export-shared-state](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/export-shared-state/)|Downloads all shared state entries from the configured filter to the local file system.|
|[import-shared-state](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/import-shared-state/)|Uploads one entry or the configured filter from the local file system to the shared state.|
|[watch-shared-state](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/watch-shared-state/)|Monitors the local shared state and when changes are detected it is uploaded to the cloud.|

## cloud-files

| TASK | Description |
|------|:------------|
|[show-cloud-folders](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-cloud-folders/)|Displays the content of the LiveApps Organization Folders.|
|[create-cloud-folder](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/create-cloud-folder/)|Creates a new LiveApps Organization Folder.|
|[upload-file-to-cloud-folder](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/upload-file-to-cloud-folder/)|Uploads a file to a LiveApps Organization Folder|
|[download-file-from-cloud-folder](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/download-file-from-cloud-folder/)|Downloads file(s) from a LiveApps Organization Folder to disk|

## tci

| TASK | Description |
|------|:------------|
|[show-tci-apps](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-tci-apps/)|List all TIBCO Cloud Integration Applications(Flogo, Scribe, Node.JS & Business Works).|
|[monitor-tci-app](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/monitor-tci-app/)|Monitor the logs of a TIBCO Cloud Integration Flogo Application|
|[export-tci-app](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/export-tci-app/)|Exports a TCI-Flogo Application|

## messaging

| TASK | Description |
|------|:------------|
|[show-messaging-summary](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-messaging-summary/)|Show summary of cloud messaging|
|[show-messaging-clients](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-messaging-clients/)|Show clients of cloud messaging|

## spotfire

| TASK | Description |
|------|:------------|
|[browse-spotfire-library](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/browse-spotfire-library/)|List Spotfire Analytical Reports and browse through folders on the Spotfire Library.|
|[list-spotfire-library](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/list-spotfire-library/)|Lists all components(DXP's, Mods, Information links, Data files or Data connections) in your SF Library.|
|[copy-spotfire-library-item](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/copy-spotfire-library-item/)|Copies a Spotfire Library Item (a DXP for example) from one place to another (possibly between organizations).|
|[rename-spotfire-library-item](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/rename-spotfire-library-item/)|Renames a Spotfire Library Item (a DXP for example).|
|[share-spotfire-library-folder](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/share-spotfire-library-folder/)|Shares a Spotfire Library Folder with a Specific User.|
|[delete-spotfire-library-item](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/delete-spotfire-library-item/)|Deletes a Spotfire Library Item (a DXP for example).|
|[create-spotfire-library-folder](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/create-spotfire-library-folder/)|Creates a new Library Folder.|

## oauth

| TASK | Description |
|------|:------------|
|[show-oauth-tokens](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/show-oauth-tokens/)|Displays OAUTH tokens to authenticate to the TIBCO Cloud.|
|[generate-oauth-token](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/generate-oauth-token/)|Generate a new OAUTH token to authenticate to the TIBCO Cloud.|
|[revoke-oauth-token](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/revoke-oauth-token/)|Revokes an existing OAUTH token.|
|[rotate-oauth-token](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/rotate-oauth-token/)|Revokes your existing OAUTH token and then generates a new one.|
|[validate-and-rotate-oauth-token](https://tibcosoftware.github.io/TCSToolkit/cli/tasks/validate-and-rotate-oauth-token/)|Checks if OAUTH token is valid for more than a configured time (1 week for example) and if not, it will rotate it.|

---
For more information see the [TCSTK Documentation](https://tibcosoftware.github.io/TCSToolkit/)
---

# License

Copyright © 2021. TIBCO Software Inc.
This file is subject to the license terms contained
in the license file that is distributed with this file.

Please see tpc.txt for details of license and dependent third party components referenced by this library, or it can be found here:

https://github.com/TIBCOSoftware/TCSTK-Cloud-CLI/blob/master/tpc.txt
