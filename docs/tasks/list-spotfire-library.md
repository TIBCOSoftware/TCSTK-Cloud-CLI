# TCLI TASK: list-spotfire-library

---
### Description:
> Make a list of all specific components in your Spotfire Library (DXP's, Mods, Information links, Data files or Data connections)

This is useful when you want to know what items exist in your library of a certain type.

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Questions:

What Spotfire Library item type would you like to list ?

Use one of the following:
1. ALL
2. Spotfire Reports
3. Spotfire Mods
4. Information links
5. Data files
6. Data connections
7. Library Folders

---
### Example Usage:

> tcli list-spotfire-library

> tcli list-spotfire-library -a "Spotfire Reports"

---
### Example Result:
```console
Drilling Down into: /Samples                                                     
TIBCO CLOUD CLI] (INFO)  TABLE] list-spotfire
┌─────────┬────────────────┬──────────────────┬────────────────────────────────────────────────────────────┐
│ (index) │      Type      │    Created By    │                   Spotfire Library Item                    │
├─────────┼────────────────┼──────────────────┼────────────────────────────────────────────────────────────┤
│    1    │ 'spotfire.dxp' │       '-'        │           '/Samples/Analyzing Stock Performance'           │
│    2    │ 'spotfire.dxp' │       '-'        │       '/Samples/Configuring Advanced Visualizations'       │
│    3    │ 'spotfire.dxp' │       '-'        │           '/Samples/Expense Analyzer Dashboard'            │
│    4    │ 'spotfire.dxp' │       '-'        │            '/Samples/Introduction to Spotfire'             │
│    5    │ 'spotfire.dxp' │       '-'        │               '/Samples/Sales and Marketing'               │
│    7    │ 'spotfire.dxp' │       '-'        │            'SHARED_WITH_ME/ToShare/ForSharing'             │
└─────────┴────────────────┴──────────────────┴────────────────────────────────────────────────────────────┘
```
