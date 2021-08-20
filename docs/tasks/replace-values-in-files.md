# TCLI TASK: replace-values-in-files

---
### Description:

> Replace string in file following based on answers provided

This is useful to replace a certain value in one or multiple files.

---
### Questions:

> Replace_FROM:

What value to look for

> Replace_TO:

What value to replace it with

> Replace_PATTERN:

The pattern to use when looking for the file to replace in. This could be:

* For example: file.properties - The file name directly. 
* For example: *.txt           - Multiple files in the same folder.
* For example: */**/*.json     - Multiple files in sub-folders.

---
### Example Usage:

> tcli replace-values-in-files

> tcli replace-values-in-files -a "LookFor:LooksREPLACED:*.properties" 

---
### Alternatives
> tcli replace-interactive

> tcli replace-string-in-file-interactive

---
### Example Result:

```console
?    Replace_FROM: LookFor
?      Replace_TO: LooksREPLACED
? Replace_PATTERN: *.properties
TIBCO CLOUD CLI] [TCLI] (INFO)      [FILE]  tibco-cloud.properties
TIBCO CLOUD CLI] [TCLI] (INFO)  [REPLACED] [FROM: |LookFor|] [TO: |LooksREPLACED|] (Number of Replacements: 2)
```
