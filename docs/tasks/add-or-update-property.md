# TCLI TASK: add-or-update-property

---
### Description
> Adds or Updates a property in a file.

This can be useful to update property in your tibco-cloud.properties file or any other file. Also certain pre-defined values can be set.

---
### Questions:

* In which file would you like to update a property ? (use enter or default for the current property file)
* Which property would you like to update or add ?
* What comment would you like to add ?
* What value would you like to add ? (use SPECIAL to select from a list)
--> If SPECIAL is used:
* What type of answer would you like to add to the property ?


---
### Example Usages:
> tcli add-or-update-property

> tcli add-or-update-property -a DEFAULT:SaveMe:'I want to be saved':'I am safe...'

> tcli add-or-update-property -a my-file.properties,SaveMe,none,SPECIAL,SandboxID

---
### Example Result:
