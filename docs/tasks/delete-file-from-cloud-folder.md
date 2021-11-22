# TCLI TASK: delete-file-from-cloud-folder

---
### Description:

> Deletes file(s) from a LiveApps Organization Folder

The following properties in the cloud properties file are being used:

> Cloud_File_Do_Delete_All_Versions

Option to, when deleting a cloud file, to delete all versions of a cloud file at once. Options: (YES | NO)

---
### Questions:

> From which folder would you like to delete a file ?

The name of the LiveApps Organization folder from which you would like to delete a file(s).

> Which file(s) would you like to delete ?

The name of the file you want to delete.

Note: You can use ALL here, which will delete all files from a folder. You will have to answer YES to the next question:

> ARE YOU SURE YOU WANT TO DELETE ALL THE FILES FROM THE CLOUD FOLDER: <FOLDER>

---
### Example Usage:

> tcli delete-file-from-cloud-folder

---
### Alternatives
> tcli delete-file-from-org-folder

---
### Example Result:

```console
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting all versions of the file(s):  true
? Which file(s) would you like to delete ? car.svg
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting file: 
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)      Cloud Folder: TestDeletion File: car.svg
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  artifact [car.svg] deleted
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting next version:  3
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting file: 
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)      Cloud Folder: TestDeletion File: car.svg
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  artifact [car.svg] deleted
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting next version:  2
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting file: 
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)      Cloud Folder: TestDeletion File: car.svg
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  artifact [car.svg] deleted
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting next version:  1
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  Deleting file: 
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)      Cloud Folder: TestDeletion File: car.svg
TIBCO CLOUD CLI] [CLOUD-FILES] (INFO)  artifact [car.svg] deleted
```
