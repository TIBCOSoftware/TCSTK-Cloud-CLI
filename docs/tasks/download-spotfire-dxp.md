# TCLI TASK: download-spotfire-dxp

---
### Description:

> Downloads a Spotfire DXP from a library folder.

This is usefull to do manipulations on a DXP locally, you can also load it into your local Spotfire Analyst.

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

> Spotfire_DXP_Folder
 
Folder used for Spotfire DXP downloads.

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in your folder. For Example: Spotfire_DXP_Folder=./Spotfire_DXPs (\~{ORGANIZATION})/

---
### Questions:

* Which DXP would you like to download ?

---
### Example Usage:

> tcli download-spotfire-dxp

> tcli download-spotfire-dxp -a "/Samples/Introduction to Spotfire"

---
### Alternatives
> tcli download-dxp

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Injected answer:  /Samples/Introduction to Spotfire  For question:  Which DXP would you like to download ?
TIBCO CLOUD CLI] (INFO)       DOWNLOADING: https://eu.spotfire-next.cloud.tibco.com/spotfire/attachment?cmd=get&aid=bfa10103-a5ef-xyza-9c33-1234285ba774
TIBCO CLOUD CLI] (INFO)                TO: ./Spotfire_DXPs/Introduction to Spotfire.dxp
TIBCO CLOUD CLI] (INFO)   DOWNLOAD RESULT: DONE Filesize: 3.36 MB
```
