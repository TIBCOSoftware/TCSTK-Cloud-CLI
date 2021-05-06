# TCLI TASK: share-spotfire-library-folder

---
### Description:
> Shares a Spotfire Library Folder with a Specific User.

This function is usefull if you want to share a library folder with someone in another organization. In this way you can copy library items between organizations.

NOTE: You can only share folders in the /Users folder

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Example Usage:
> tcli share-spotfire-library-folder

> tcli share-spotfire-library-folder -a "/Users/John Doe/TestShare:test@test.com" 

---
### Questions:

* Which folder would you like to share ?
* Provide the email address of the person you want to share <folder-name> with ?

---
### Alternatives:
> tcli share-sf

> tcli share-library-folder

---
### Example Result:

```console
? Which folder would you like to share ? /Users/John Doe/TestShare
? Provide the email address of the person you want to share TestShare with ? (use "NONE" or press enter to not share) test@test.com
TIBCO CLOUD CLI] (INFO)  Successfully shared:  /Users/John Doe/TestShare with test@test.com
```
