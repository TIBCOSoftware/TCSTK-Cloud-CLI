# TCLI TASK: delete-spotfire-library-item

---
### Description:
> Deletes a Spotfire Library Item (a DXP for example).

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Questions:

* What Spotfire Library item type would you like to delete ?

Use one of the following:
1. Spotfire Reports
2. Spotfire Mods
3. Information links
4. Data files
5. Data connections
6. Library Folders

* Which item would you like to delete ?
* ARE YOU SURE YOU WANT TO DELETE <Library-Item> ?

NOTE: Be care-full with deleting folders, the content and sub-folders will be deleted as well

---
### Example Usage:
> tcli delete-spotfire-library-item

> tcli delete-spotfire-library-item -a "Spotfire Reports:/Teams/Organization X/myReport:YES"

---
### Alternatives:
> tcli delete-sf

> tcli delete-library-item

---
### Example Result:

```console
? ARE YOU SURE YOU WANT TO DELETE myReport ? YES
TIBCO CLOUD CLI] (INFO)  Successfully deleted:  /Teams/Organization X/myReport... 
```
