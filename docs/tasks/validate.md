# TCLI TASK: validate

---
### Description:
> Validates the setting of a property & the value of a property or validates the existence of a Cloud Starter, LiveApps app or TCI App.

This is useful when you want to validate certain things on the TIBCO Cloud before or after you run your scripts.

---
### Questions:

What would you like to validate ?

These are the things you can validate
* Property_exist: Validates if a property exists in your tibco cloud property file.
* Property_is_set: Validates if a property exists and has a value.
* Property_is_set_ask: Does the same as Property_is_set, but if not set it will ask for a value(interactively).
* LiveApps_app_exist: Validates if a LiveApps Application exists.
* Live_Apps_group_exist: Validates if a LiveApps Group exists.
* TCI_App_exist: Validates if a TCI Application exists.
* Cloud_Starter_exist: Validates if a Cloud Starter exists.
* Org_Folder_exist: Validates if an Organization Folder exists.
* Org_Folder_And_File_exist: Validates if an Organization Folder exists, and if it has a specific file.
* Case_exist: Validates if a specific LiveApps Case exists.
* Case_not_exist: Validates if a specific LiveApps Case Does Not exist (in other words; is removed).
* Case_in_state: Validates if a specific LiveApps Case is in a specific state.
* Spotfire_Library_Item_exists: Validates if a specific Spotfire Library Item exists.

Note: You can validate multiple things at once by providing a '+' character in between them

---
### Example Usage:
> tcli validate

> tcli validate -a "Property_exist:App_Name+App_Type"

> tcli validate -a "Spotfire_Library_Item_exists:Spotfire Reports:/Teams/~{ORGANIZATION}/@{My_Spotfire_Report}" 

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Selected task] validate
? What would you like to validate ? Property_exist
TIBCO CLOUD CLI] (INFO)  Validating:  property_exist
? Which property would you like to validate (Use plus character to validate multiple properties, for example: prop1+prop2) ? App_Name+App_Type
TIBCO CLOUD CLI] (INFO)   [VALIDATION --OK--] Property App_Name exists...
TIBCO CLOUD CLI] (INFO)   [VALIDATION --OK--] Property App_Type exists...
```
