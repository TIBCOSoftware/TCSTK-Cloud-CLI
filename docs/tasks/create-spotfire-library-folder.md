# TCLI TASK: create-spotfire-library-folder

---
### Description:

> Creates a new Library Folder.

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Questions:

* For which folder would you like to create a subfolder ?
* What is the name of the folder you would like to create ?
* What is the description of the folder you would like to create ?

---
### Example Usage:
> tcli create-spotfire-library-folder

> tcli create-spotfire-library-folder -a "/Teams/Organization X:MyNewFolder:MyDescription" 

---
### Alternatives:
> tcli create-sf-folder

> tcli create-library-folder

---
### Example Result:

```console
? For which folder would you like to create a subfolder ? /Teams/Organization X
? What is the name of the folder you would like to create ? (use "NONE" or press enter to not create a folder) MyNewFolder
? What is the description of the folder you would like to create ? (use "NONE" or press enter to leave blank) MyDescription
TIBCO CLOUD CLI] (INFO)  Successfully crated folder with name:  MyNewFolder and description  MyDescription (new id: 999d099d-3f2c-4292-77ff-f4f81950d90e)
```
