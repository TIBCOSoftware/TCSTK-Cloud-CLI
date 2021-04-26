# TIBCO Cloud™ Starters Toolkit - Command Line Interface 
<img src="https://community.tibco.com/sites/default/files/tibco_labs_final_with_tm2-01.png" alt="drawing" width="100"/>Powered by [TIBCO Labs™](https://community.tibco.com/wiki/tibco-labs)

Command Line Interface for creating TIBCO Cloud™ Starter Projects [(For more information see the Full Documentation)](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/001_TCLI_Overview/) 

### TIBCO Cloud™ CLI) Installation:
```
npm install -g @tibco-tcstk/cloud-cli
``` 

###TIBCO Cloud™ CLI) Usage: 
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
    
These are the available TIBCO Cloud™ CLI Tasks:

##tcli
| TASK | Description |
|------|:------------|
|[show-cloud](./docs/tasks/show-cloud.md)|Show Cloud Details|
|[show-properties](./docs/tasks/show-properties.md)|Shows the properties in your properties file (and possibly the global values)|
|[add-or-update-property](./docs/tasks/add-or-update-property.md)|Adds or Updates a property in a file.|
|[change-cloud-region](./docs/tasks/change-cloud-region.md)|Change the Region in the cloud-properties file|
|[show-cloud-organizations](./docs/tasks/show-cloud-organizations.md)|Shows the Cloud Organization and potentially more details|
|[change-cloud-organization](./docs/tasks/change-cloud-organization.md)|Changes the Organization in the cloud-properties file|
|[obfuscate-password](./docs/tasks/obfuscate-password.md)|Obfuscate a password and put it in the cloud-properties file|
|[view-global-config](./docs/tasks/view-global-config.md)|View the global cloud connection configuration|
|[update-global-config](./docs/tasks/update-global-config.md)|Update the global cloud connection configuration|
|[create-multiple-property-file](./docs/tasks/create-multiple-property-file.md)|Creating an initial property file to manage multiple cloud starters and environments.|
|[generate-cloud-property-files](./docs/tasks/generate-cloud-property-files.md)|Generates a list of cloud property files.|
|[replace-string-in-file](./docs/tasks/replace-string-in-file.md)|Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties|
|[validate](./docs/tasks/validate.md)|Validations on the setting and/or the value of a property, the existence of a Cloud Starter, LiveApp or TCI App.|
|quit|Quit the console|
|update-tcli|Update the Cloud CLI|
|help|Display's help message|
|browse-tasks|Browses the TCLI tasks by category|
|repeat-last-task|Repeats the last executed task|
##cloud-starters
| TASK | Description |
|------|:------------|
|[show-cloud-starters](./docs/tasks/show-cloud-starters.md)|Show a Table of all the deployed Cloud Starters|
|[show-cloud-starter-links](./docs/tasks/show-cloud-starter-links.md)|Show Links to your Cloud Starters|
|[start-cloud-starter](./docs/tasks/start-cloud-starter.md)|Start your local cloud starter project|
|[build-cloud-starter](./docs/tasks/build-cloud-starter.md)|Build your local cloud starter project|
|[test-cloud-starter](./docs/tasks/test-cloud-starter.md)|Run Test cases for your cloud starter|
|[test-cloud-starter-headless](./docs/tasks/test-cloud-starter-headless.md)|Run Test cases for your cloud starter, headless (without opening the browser)|
|[deploy-cloud-starter](./docs/tasks/deploy-cloud-starter.md)|Deploy your local cloud starter project|
|[build-deploy-cloud-starter](./docs/tasks/build-deploy-cloud-starter.md)|Builds and Deploys your local project to the cloud|
|[delete-cloud-starter](./docs/tasks/delete-cloud-starter.md)|Delete a LiveApps WebApp|
|[generate-descriptor](./docs/tasks/generate-descriptor.md)|Generates the configured Public Cloud Descriptor|
|[update-packages](./docs/tasks/update-packages.md)|Updates the NPM packages in the @tibco-tcstk scope in your project.|
|[inject-lib-sources](./docs/tasks/inject-lib-sources.md)|Enables your project for Cloud Library Debugging|
|[undo-lib-sources](./docs/tasks/undo-lib-sources.md)|Undoes the enabling for Cloud Library Debugging|
|[schematic-add](./docs/tasks/schematic-add.md)|Add a schematic into your project|
##live-apps
| TASK | Description |
|------|:------------|
|[show-live-apps-cases](./docs/tasks/show-live-apps-cases.md)|Show Live Apps Cases|
|[show-live-apps-design-time-apps](./docs/tasks/show-live-apps-design-time-apps.md)|Show Live Apps Applications in Development (can be copied)|
|[show-live-apps-users](./docs/tasks/show-live-apps-users.md)|Shows the users in LiveApps (which can be added to groups).|
|[show-live-apps-groups](./docs/tasks/show-live-apps-groups.md)|Displays the LiveApps groups and their users.|
|[show-live-apps-sandbox](./docs/tasks/show-live-apps-sandbox.md)|Displays the LiveApps Sandbox ID's for Production and Development|
|[show-live-apps-actions](./docs/tasks/show-live-apps-actions.md)|Displays the LiveApps actions (Creators & Actions) for a CaseType|
|[create-live-apps-group](./docs/tasks/create-live-apps-group.md)|Creates a new LiveApps group.|
|[add-user-to-group](./docs/tasks/add-user-to-group.md)|Adds a user to a LiveApps group.|
|[export-live-apps-case-type](./docs/tasks/export-live-apps-case-type.md)|Export the details of a Live Apps Case Type|
|[export-live-apps-cases](./docs/tasks/export-live-apps-cases.md)|Export Data from Live Apps|
|[generate-live-apps-import-configuration](./docs/tasks/generate-live-apps-import-configuration.md)|Generate the Live Apps Import configuration file|
|[import-live-apps-cases](./docs/tasks/import-live-apps-cases.md)|Import Cases to Live Apps|
|[copy-live-apps-between-organizations](./docs/tasks/copy-live-apps-between-organizations.md)|Copies a LiveApps application between organizations.|
##shared-state
| TASK | Description |
|------|:------------|
|[show-shared-state](./docs/tasks/show-shared-state.md)|Show the shared state contents|
|[show-shared-state-details](./docs/tasks/show-shared-state-details.md)|Shows the details of one Shared State entry.|
|[create-shared-state-entry](./docs/tasks/create-shared-state-entry.md)|Create a new shared state entry|
|[clear-shared-state-entry](./docs/tasks/clear-shared-state-entry.md)|Removes one Shared State entry.|
|[clear-shared-state-filter](./docs/tasks/clear-shared-state-filter.md)|Removes all shared state entries in the configured filter.|
|[export-shared-state](./docs/tasks/export-shared-state.md)|Downloads all shared state entries from the configured filter to the local file system.|
|[import-shared-state](./docs/tasks/import-shared-state.md)|Uploads one entry or the configured filter from the local file system to the shared state.|
|[watch-shared-state](./docs/tasks/watch-shared-state.md)|Monitors the local shared state and when changes are detected it is uploaded to the cloud.|
##cloud-files
| TASK | Description |
|------|:------------|
|[show-cloud-folders](./docs/tasks/show-cloud-folders.md)|Displays the content of the LiveApps Organization Folders.|
|[create-cloud-folder](./docs/tasks/create-cloud-folder.md)|Creates a new LiveApps Organization Folder.|
|[upload-file-to-cloud-folder](./docs/tasks/upload-file-to-cloud-folder.md)|Uploads a file to a LiveApps Organization Folder|
|[download-file-from-cloud-folder](./docs/tasks/download-file-from-cloud-folder.md)|Downloads file(s) from a LiveApps Organization Folder to disk|
##tci
| TASK | Description |
|------|:------------|
|[show-tci-apps](./docs/tasks/show-tci-apps.md)|List all TIBCO Cloud Integration Applications(Flogo, Scribe, Node.JS & Business Works).|
|[monitor-tci-app](./docs/tasks/monitor-tci-app.md)|Monitor the logs of a TIBCO Cloud Integration Flogo Application|
|[export-tci-app](./docs/tasks/export-tci-app.md)|Exports a TCI-Flogo Application|
##messaging
| TASK | Description |
|------|:------------|
|[show-messaging-summary](./docs/tasks/show-messaging-summary.md)|Show summary of cloud messaging|
|[show-messaging-clients](./docs/tasks/show-messaging-clients.md)|Show clients of cloud messaging|
##spotfire
| TASK | Description |
|------|:------------|
|[browse-spotfire-library](./docs/tasks/browse-spotfire-library.md)|List Spotfire Analytical Reports and browse through folders on the Spotfire Library.|
|[list-spotfire-library](./docs/tasks/list-spotfire-library.md)|Lists all components(DXP's, Mods, Information links, Data files or Data connections) in your SF Library.|
|[copy-spotfire-library-item](./docs/tasks/copy-spotfire-library-item.md)|Copies a Spotfire Library Item (a DXP for example) from one place to another (possibly between organizations).|
|[rename-spotfire-library-item](./docs/tasks/rename-spotfire-library-item.md)|Renames a Spotfire Library Item (a DXP for example).|
|[share-spotfire-library-folder](./docs/tasks/share-spotfire-library-folder.md)|Shares a Spotfire Library Folder with a Specific User.|
|[delete-spotfire-library-item](./docs/tasks/delete-spotfire-library-item.md)|Deletes a Spotfire Library Item (a DXP for example).|
|[create-spotfire-library-folder](./docs/tasks/create-spotfire-library-folder.md)|Creates a new Library Folder.|
##oauth
| TASK | Description |
|------|:------------|
|[show-oauth-tokens](./docs/tasks/show-oauth-tokens.md)|Displays OAUTH tokens to authenticate to the TIBCO Cloud.|
|[generate-oauth-token](./docs/tasks/generate-oauth-token.md)|Generate a new OAUTH token to authenticate to the TIBCO Cloud.|
|[revoke-oauth-token](./docs/tasks/revoke-oauth-token.md)|Revokes an existing OAUTH token.|
|[rotate-oauth-token](./docs/tasks/rotate-oauth-token.md)|Revokes your existing OAUTH token and then generates a new one.|
|[validate-and-rotate-oauth-token](./docs/tasks/validate-and-rotate-oauth-token.md)|Checks if OAUTH token is valid for more than a configured time (1 week for example) and if not, it will rotate it.|


---
For more information see the [TCSTK Documentation](https://tibcosoftware.github.io/TCSToolkit/)
---

# License

Copyright © 2021. TIBCO Software Inc.
This file is subject to the license terms contained
in the license file that is distributed with this file.

Please see tpc.txt for details of license and dependent third party components referenced by this library, or it can be found here:

https://github.com/TIBCOSoftware/TCSTK-Cloud-CLI/blob/master/tpc.txt
