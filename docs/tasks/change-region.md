# TCLI TASK: change-region

---
### Description
> Change the Region in the cloud-properties file

---
### Questions:

Which Region would you like to use ?

Possible Answers:
US - Oregon
EU - Ireland
AU - Sydney

NOTE: If USE-GLOBAL is used in your LOCAL cloud property file the GLOBAL cloud property file will be adjusted. In this case the global reqion is changed. You will see this message:

Found USE-GLOBAL for property: CloudLogin.Region, so updating the GLOBAL Property file...

If you don't want this to happen you can always run:

> tcli add-or-update-property -a default:CloudLogin.Region:none:NOT-GLOBAL:LOCAL

Before you run the command to change the region.

---
### Example Usage

> tcli change-region

> tcli change-region -a 'US - Oregon'

> tcli change-region --answer 'EU - Ireland'

> tcli cr -a 'AU - Sydney'

---
### Alternatives
> tcli cr


