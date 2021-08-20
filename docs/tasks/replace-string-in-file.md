# TCLI TASK: replace-string-in-file

---
### Description:
> Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties

This is useful to replace a certain value in one or multiple files. This task follows the entries Replace_FROM, Replace_TO and Replace_PATTERN in the specified property file (tibco-cloud.properties)

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
> tcli replace-string-in-file
