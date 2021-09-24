# TCLI TASK: export-live-apps-case-type

---
### Description:
> Export the details of a Live Apps Case Type

This task lists the LiveApp cases and allows to export the description file of one of the cases in JSON. This is useful for development in your cloud application and create Typescript models from them for example.

The following properties in the cloud properties file are being used:

> Case_Folder

This determines which folder you want to export to.

---
### Questions:

Which Case-Type would you like to export ?

What file name would you like to export to ? (press enter or use DEFAULT for default)

NOTE: Default uses the following name structure:  <Case_Folder>/<APP_NAME>.<APP_VERSION>.type.json

---
### Example Usage:
> tcli export-live-apps-case-type

> tcli export-live-apps-case-type --answers MyApp:DEFAULT

> tcli export-live-apps-case-type -a MyApp,MyAppExport.json

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Injected answer:  MyApp  For question:  Which Case-Type would you like to export ?
TIBCO CLOUD CLI] (INFO)  Injected answer:  MyAppExport.json  For question:  What file name would you like to export to ? (press enter or use DEFAULT for default):
TIBCO CLOUD CLI] (INFO)  Case Type File Stored: ./Cases/MyAppExport.json 
```
