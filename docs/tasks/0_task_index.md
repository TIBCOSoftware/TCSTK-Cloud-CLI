# TCLI TASKS: 

---


## tcli

---


[show-cloud](./show-cloud.md) - Show Cloud Details

[show-properties](./show-properties.md) - Shows the properties in your properties file (and possibly the global values)

[add-or-update-property](./add-or-update-property.md) - Adds or Updates a property in a file.

[change-cloud-region](./change-cloud-region.md) - Change the Region in the cloud-properties file

[show-cloud-organizations](./show-cloud-organizations.md) - Shows the Cloud Organization and potentially more details

[change-cloud-organization](./change-cloud-organization.md) - Changes the Organization in the cloud-properties file

[obfuscate-password](./obfuscate-password.md) - Obfuscate a password and put it in the cloud-properties file

[view-global-config](./view-global-config.md) - View the global cloud connection configuration

[update-global-config](./update-global-config.md) - Update the global cloud connection configuration

[create-multiple-property-file](./create-multiple-property-file.md) - Creating an initial property file to manage multiple cloud starters and environments.

[generate-cloud-property-files](./generate-cloud-property-files.md) - Generates a list of cloud property files.

[replace-string-in-file](./replace-string-in-file.md) - Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties

[validate](./validate.md) - Validations on the setting and/or the value of a property, the existence of a Cloud Starter, LiveApp or TCI App.


## cloud-starters

---


[show-cloud-starters](./show-cloud-starters.md) - Show a Table of all the deployed Cloud Starters

[show-cloud-starter-links](./show-cloud-starter-links.md) - Show Links to your Cloud Starters

[start-cloud-starter](./start-cloud-starter.md) - Start your local cloud starter project

[build-cloud-starter](./build-cloud-starter.md) - Build your local cloud starter project

[test-cloud-starter](./test-cloud-starter.md) - Run Test cases for your cloud starter

[test-cloud-starter-headless](./test-cloud-starter-headless.md) - Run Test cases for your cloud starter, headless (without opening the browser)

[deploy-cloud-starter](./deploy-cloud-starter.md) - Deploy your local cloud starter project

[build-deploy-cloud-starter](./build-deploy-cloud-starter.md) - Builds and Deploys your local project to the cloud

[delete-cloud-starter](./delete-cloud-starter.md) - Delete a LiveApps WebApp

[generate-descriptor](./generate-descriptor.md) - Generates the configured Public Cloud Descriptor

[update-packages](./update-packages.md) - Updates the NPM packages in the @tibco-tcstk scope in your project.

[inject-lib-sources](./inject-lib-sources.md) - Enables your project for Cloud Library Debugging

[undo-lib-sources](./undo-lib-sources.md) - Undoes the enabling for Cloud Library Debugging

[schematic-add](./schematic-add.md) - Add a schematic into your project


## live-apps

---


[show-live-apps-cases](./show-live-apps-cases.md) - Show Live Apps Cases

[show-live-apps-users](./show-live-apps-users.md) - Shows the users in LiveApps (which can be added to groups).

[show-live-apps-groups](./show-live-apps-groups.md) - Displays the LiveApps groups and their users.

[show-live-apps-sandbox](./show-live-apps-sandbox.md) - Displays the LiveApps Sandbox ID's for Production and Development

[show-live-apps-actions](./show-live-apps-actions.md) - Displays the LiveApps actions (Creators & Actions) for a CaseType

[create-live-apps-group](./create-live-apps-group.md) - Creates a new LiveApps group.

[add-user-to-group](./add-user-to-group.md) - Adds a user to a LiveApps group.

[export-live-apps-case-type](./export-live-apps-case-type.md) - Export the details of a Live Apps Case Type

[export-live-apps-cases](./export-live-apps-cases.md) - Export Data from Live Apps

[generate-live-apps-import-configuration](./generate-live-apps-import-configuration.md) - Generate the Live Apps Import configuration file

[import-live-apps-cases](./import-live-apps-cases.md) - Import Cases to Live Apps


## shared-state

---


[show-shared-state](./show-shared-state.md) - Show the shared state contents

[show-shared-state-details](./show-shared-state-details.md) - Shows the details of one Shared State entry.

[create-shared-state-entry](./create-shared-state-entry.md) - Create a new shared state entry

[clear-shared-state-entry](./clear-shared-state-entry.md) - Removes one Shared State entry.

[clear-shared-state-filter](./clear-shared-state-filter.md) - Removes all shared state entries in the configured filter.

[export-shared-state](./export-shared-state.md) - Downloads all shared state entries from the configured filter to the local file system.

[import-shared-state](./import-shared-state.md) - Uploads one entry or the configured filter from the local file system to the shared state.

[watch-shared-state](./watch-shared-state.md) - Monitors the local shared state and when changes are detected it is uploaded to the cloud.


## cloud-files

---


[show-org-folders](./show-org-folders.md) - Displays the content of the LiveApps Organization Folders.

[create-org-folder](./create-org-folder.md) - Creates a new Organizational Folder.

[upload-file-to-org-folder](./upload-file-to-org-folder.md) - Uploads a file to an org folder


## tci

---


[show-tci-apps](./show-tci-apps.md) - List all TIBCO Cloud Integration Applications(Flogo, Scribe, Node.JS & Business Works).

[monitor-tci-app](./monitor-tci-app.md) - Monitor the logs of a TIBCO Cloud Integration Flogo Application

[export-tci-app](./export-tci-app.md) - Exports a TCI-Flogo Application


## messaging

---


[messaging-show-summary](./messaging-show-summary.md) - Show summary of cloud messaging

[messaging-show-clients](./messaging-show-clients.md) - Show clients of cloud messaging


## spotfire

---


[browse-spotfire-library](./browse-spotfire-library.md) - List Spotfire Analytical Reports and browse through folders on the Spotfire Library.

[list-spotfire-library](./list-spotfire-library.md) - Lists all components(DXP's, Mods, Information links, Data files or Data connections) in your SF Library.


## oauth

---


[show-oauth-tokens](./show-oauth-tokens.md) - Displays OAUTH tokens to authenticate to the TIBCO Cloud.

[generate-oauth-token](./generate-oauth-token.md) - Generate a new OAUTH token to authenticate to the TIBCO Cloud.

[revoke-oauth-token](./revoke-oauth-token.md) - Revokes an existing OAUTH token.

[rotate-oauth-token](./rotate-oauth-token.md) - Revokes your existing OAUTH token and then generates a new one.

[validate-and-rotate-oauth-token](./validate-and-rotate-oauth-token.md) - Checks if OAUTH token is valid for more than a configured time (1 week for example) and if not, it will rotate it.