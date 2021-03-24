# TCLI TASK: change-cloud-organization

---
### Description
> Changes the Organization in the cloud-properties file

This task allows you to switch from one organization to another. This task will update the Client ID in the (CloudLogin.clientID) tibco-cloud.properties file and If OAUTH is used it will revoke the token on the old environment and generate one on the new environment and update the property: CloudLogin.OAUTH_Token

---
### Example Usage
> tcli change-cloud-organization

---
### Alternatives
> tcli change-organization

> tcli co
