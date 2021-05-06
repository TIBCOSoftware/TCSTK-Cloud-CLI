# TCLI TASK: export-live-apps-cases

---
### Description:
> Export Data from Live Apps

This task will export Live Apps case data to JSON files, this can be useful for backups or to use them for imports into other organizations or into other Versions of the LiveApps app. Since the data is exported you can manipulate it for other versions.

The following properties in the cloud properties file are being used:

> Case_Folder

This determines which folder you want to export to. Note that you can use ~{ORGANIZATION}, to use the current organization name in your folder. 

For example: 

> Case_Folder=./Cases (~{ORGANIZATION})/

---
### Questions:

Which Case-Type would you like to export ?

What Folder like to export to ? (press enter or use default, date get's added...)

NOTE: If you enter a folder manually, always end it with a '/' character.

NOTE: Default uses the following name structure:  <Case_Folder>/Export-<APP_NAME>(<DATE>)/<APP_NAMW>-<CASE_NUMBER>.json

---
### Example Usage:
> tcli export-live-apps-cases

> tcli export-live-apps-cases --answers MyApp:DEFAULT

> tcli export-live-apps-cases -a MyApp,MyFolder/

---
### Example Result:

```console
? Which Case-Type would you like to export ? MyApp
? What Folder like to export to ? (press enter or use default, date get's added...) MyFolder/
TIBCO CLOUD CLI] (INFO)  Number of cases for export: 2
TIBCO CLOUD CLI] (INFO)  [STORED CONTEXT]: ./Cases/MyFolder/MyApp-1.json 
TIBCO CLOUD CLI] (INFO)  [STORED CONTENT]: ./Cases/MyFolder/CONTENT/MyApp-1.CONTENT.json 
TIBCO CLOUD CLI] (INFO)  [STORED CONTEXT]: ./Cases/MyFolder/MyApp-2.json 
TIBCO CLOUD CLI] (INFO)  [STORED CONTENT]: ./Cases/MyFolder/CONTENT/MyApp-2.CONTENT.json 
TIBCO CLOUD CLI] (INFO)  [STORED ALL CONTENT]: ./Cases/MyFolder/CONTENT/MyApp-ALL.CONTENT.json 
```
