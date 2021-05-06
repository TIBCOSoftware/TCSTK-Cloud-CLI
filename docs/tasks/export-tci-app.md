# TCLI TASK: export-tci-app

---
### Description:
> Exports a TCI-Flogo Application, into the Flogo JSON and it's Manifest file.

This is usefull to make backup of flogo apps and commit them into a source repository.

---
### Questions:

* Which FLOGO-TCI App would you like to export ?
* Which filename would you like to use for the MANIFEST export ? (press enter or use DEFAULT to use manifest.json, or use NONE to not export the manifest)
* Which filename would you like to use for the Flogo JSON export ? (press enter or use DEFAULT to use flogo.json, or use NONE to not export the Flogo JSON)

---
### Example Usage:
> tcli export-tci-app

> tcli export-tci-app --answers my_flogo_app,DEFAULT,DEFAULT

> tcli export-tci-app -a my_flogo_app:NONE:my_flogo.json

> tcli export-tci-app -a my_flogo_app:/my_folder/my_manifest.json:/my_folder/my_flogo.json

