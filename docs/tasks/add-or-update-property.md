# TCLI TASK: add-or-update-property

---
### Description:
> Adds or Updates a property in a file.

This can be useful to update property in your tibco-cloud.properties file or any other file. Also certain pre-defined values can be set.

---
### Questions:

* In which file would you like to update a property ? (use enter or default for the current property file)
* Which property would you like to update or add ?
* What comment would you like to add ?
* What value would you like to add ? (use SPECIAL to select from a list)

-> If SPECIAL is used:

* What type of answer would you like to add to the property ?

-> If the value exist and is set to USE-GLOBAL

* Do you want to update the GLOBAL or the LOCAL property file ?

For SPECIAL you can use:

* Organization_Name: The display name of your current cloud organization
* Organization_ID: The ID of your current organization.
* SandboxID: The LiveApps Sandbox ID.
* LiveApps_AppID: The appId of a specific LiveApp application.
* LiveApps_ActionID: The actionId (creator or action) of a specific LiveApps action.
* Shared_StateID: The Id of a specific shared state entry.
* Spotfire_FolderPath: The path (including Organization ID) of a spotfire folder. (this is needed if you want to display a spotfire report in your cloud application) 

NOTE: For specifics (LiveApp applications, SharedState or Spotfire Folders) additional questions are asked.

---
### Example Usages:

> tcli add-or-update-property

> tcli add-or-update-property -a DEFAULT:SaveMe:'I want to be saved':'I am safe...'

> tcli add-or-update-property -a my-file.properties,SaveMe,none,SPECIAL,SandboxID

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Global Answers set:  [ 'my-file.properties', 'SaveMe', 'none', 'SPECIAL', 'SandboxID' ]
TIBCO CLOUD CLI] (INFO)  Update a property file
TIBCO CLOUD CLI] (INFO)  Injected answer:  my-file.properties  For question:  In which file would you like to update a property ? (use enter or default for the current property file)
TIBCO CLOUD CLI] (INFO)  --> Property File:  my-file.properties
TIBCO CLOUD CLI] (INFO)  Injected answer:  SaveMe  For question:  Which property would you like to update or add ?
TIBCO CLOUD CLI] (INFO)  Injected answer:  none  For question:  What comment would you like to add ? (use enter on none to not provide a comment)
TIBCO CLOUD CLI] (INFO)  Injected answer:  SPECIAL  For question:  What value would you like to add ? (use SPECIAL to select from a list)
TIBCO CLOUD CLI] (INFO)  Injected answer:  SandboxID  For question:  What type of answer would you like to add to the property ?
TIBCO CLOUD CLI] (INFO)  Using OAUTH Authentication, ORGANIZATION: TIBCO DEV
TIBCO CLOUD CLI] (INFO)  SANDBOX ID: 1234
TIBCO CLOUD CLI] (INFO)  Property NOT found: SaveMe We are adding it and set it to: 3100 (in:my-file.properties) 
```
