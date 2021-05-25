# TCLI TASK: upload-spotfire-dxp

---
### Description:

> Uploads a Spotfire DXP into a specific library folder.

This adds a local DXP Analysis to the Spotfire Cloud.

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Questions:

* To which folder would you like to upload a DXP ?

* What is the location of the DXP you would like to upload ?

* What is the name in the library that you want to give the dxp (use default or press enter to give it the same nasm as on disk) ?

---
### Example Usage:

> tcli upload-spotfire-dxp

> tcli upload-spotfire-dxp -a "/Teams/~{ORGANIZATION}:./Spotfire_DXPs/Sales and Marketing.dxp:default"

> tcli upload-spotfire-dxp -a "/Teams/~{ORGANIZATION}:./Spotfire_DXPs/Sales and Marketing.dxp:NewReportName"

---
### Alternatives
> tcli upload-dxp

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Library Item Name: Sales and Marketing
TIBCO CLOUD CLI] (INFO)  UPLOADING DXP: ./Spotfire_DXPs/Sales and Marketing.dxp (to:/spotfire/attachment) Filesize: 1.46 MB
TIBCO CLOUD CLI] (INFO)  DXP Uploaded successfully.... (Attachment ID: 7d75bb2d-0c86-1234-a2b3-3a156a701abc)
TIBCO CLOUD CLI] (INFO)  Item Saved Successfully 

```
