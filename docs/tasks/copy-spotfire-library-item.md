# TCLI TASK: copy-spotfire-library-item

---
### Description:

> Copies a Spotfire Library Item (a DXP for example) from one place to another (possibly between organizations).

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

> Spotfire_Do_Copy_With_New_Name

This setting indicates when an item is copied in the library and the target location exists, it needs to be added with a new name. So for example: Analysis_DXP (2), if set to NO the copy action will be ignored and a warning is given. Possible Values (YES | NO)

---
### Questions:

* What Spotfire Library item type would you like to copy ?

Use one of the following:
1. Spotfire Reports
2. Spotfire Mods
3. Information links
4. Data files
5. Data connections
6. Library Folders

* Which item would you like to copy ?
* To which folder would you like to copy <Libray-Item> ?

---
### Example Usage:

> tcli copy-spotfire-library-item

> tcli copy-spotfire-library-item -a "Spotfire Reports:/Teams/Organization X/my_report:/Teams/Organization X"

> tcli copy-spotfire-library-item -a "Spotfire Reports:/Teams/Organization X/my_report:/Teams/Organization X/Another_Folder" 

---
### Alternatives:
> tcli copy-sf

> tcli copy-library-item

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Specify the target folder, you are currently in: Organization X 
? To which folder would you like to copy /Teams/Organization X/my_report ? /Teams/Organization X
TIBCO CLOUD CLI] (INFO)  Successfully copied:  /Teams/Organization X/my_report to /Teams/Organization X (new id: 04a9b3y0-b9e8-4dfa-9f54-c45rba431264)
TIBCO CLOUD CLI] (WARNING)  Item was renamed to: my_report (2)
```
