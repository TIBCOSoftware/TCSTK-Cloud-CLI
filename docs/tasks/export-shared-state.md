# TCLI TASK: export-shared-state

---
### Description
> Downloads all shared state entries from the configured filter to the local file system.

This is useful to manage shared state on your local machine, the contents of the shared state will be stored in a separate JSON file.

The following properties in the cloud properties file are being used:

> Shared_State_Filter

Filter for the shared state to manage (all shared states starting with this value will be managed)
Use ''(empty) or APPLICATION for the current application. Use * for all values, or use a specific value to apply a filter.
Possible values: ( <Filter> | APPLICATION | * )

> Shared_State_Type

The type of shared state to look at.
Possible values: (PUBLIC | SHARED | PRIVATE)

> Shared_State_Folder

Folder used for Shared State imports and exports

> Shared_State_Double_Check

Double check actions on shared state (YES | NO)

---
### Questions:

If Shared_State_Double_Check is set to NO;
Are you sure you want to export all the states above ?

---
### Example Usage
> tcli export-shared-state

> tcli export-shared-state -a YES

---
### Alternatives
> tcli export-shared-state-scope

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Type of Shared State: PUBLIC
TIBCO CLOUD CLI] (INFO)  Using OAUTH Authentication, ORGANIZATION: TIBCO LABS DEV
Got Shared States: 207
TIBCO CLOUD CLI] (INFO)  Total Number of Shared State Entries: 207
TIBCO CLOUD CLI] (INFO)  Applying Shared State Filter: MyCloudStarter
TIBCO CLOUD CLI] (INFO)  Filtered Shared State Entries: 1 
TIBCO CLOUD CLI] (INFO)  [STORED CONTENT]: ./Shared_State/CONTENT/MyCloudStarter.PUBLIC.CONTENT.json 
TIBCO CLOUD CLI] (INFO)  [STORED CONTEXT]: ./Shared_State/MyCloudStarter.PUBLIC.json 
```
