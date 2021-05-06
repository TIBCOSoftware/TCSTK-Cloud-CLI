# TCLI TASK: rename-spotfire-library-item

---
### Description:
> Renames a Spotfire Library Item (a DXP for example).

The following properties in the cloud properties file are being used:

> Spotfire_Library_Base

The location in the library to search from; this form the base from which you do your operations in your library (for example /Users, /Teams or /Samples etc.)

NOTE: You can use \~{ORGANIZATION}, to use the current organization name in library base. (For example: /Teams/\~{ORGANIZATION} ).

NOTE: Do not end this folder with a '/' character.

---
### Questions:

* What Spotfire Library item type would you like to rename ?

Use one of the following:
1. Spotfire Reports
2. Spotfire Mods
3. Information links
4. Data files
5. Data connections
6. Library Folders

* Which item would you like to rename ?
* What is the new name(Title) you want to rename <library-item> to ?


---
### Example Usage:
> tcli rename-spotfire-library-item

> tcli rename-spotfire-library-item -a "Spotfire Reports:/Teams/Organization X/MyReport:NewName"

---
### Alternatives:
> tcli rename-sf

> tcli rename-library-item

---
### Example Result:

```console
? What is the new name(Title) you want to rename MyReport to ? (use "NONE" or press enter to not rename) NewName
┌───────────────────┬─────────────────────────────────────────────┐
│      (index)      │                   Values                    │
├───────────────────┼─────────────────────────────────────────────┤
│        Id         │   'b27876ed-6b07-46df-980b-dfbf98816b28'    │
│       Title       │                  'NewName'                  │
│    Description    │                  '- v134'                   │
│    CreatedDate    │             '11/9/20, 2:31 PM'              │
│ CreatedTimestamp  │                1604932298269                │
│   CreatedByName   │                 'John Doe'                  │
│   ModifiedDate    │              '5/6/21, 7:03 PM'              │
│ ModifiedTimestamp │                1620327792474                │
│  ModifiedByName   │                'John Doe'                   │
│     IsFolder      │                    false                    │
│     ItemType      │               'spotfire.dxp'                │
│       Size        │                   6118907                   │
│       Path        │ '/Teams/01EZYEJJ3R9A3ZJC3509A9EQT4/NewName' │
│     ParentId      │   '80e1cd67-6f86-4efb-a64d-dc261f3445dd'    │
│    Permissions    │                    'RWX'                    │
│ ParentPermissions │                    'RWX'                    │
│    HasPreview     │                    true                     │
│    DisplayPath    │            '/Teams/.../NewName'             │
└───────────────────┴─────────────────────────────────────────────┘
TIBCO CLOUD CLI] (INFO)  Successfully renamed:  /Teams/Organization X/MyReport to NewName
```
