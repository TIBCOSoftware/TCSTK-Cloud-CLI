# TCLI TASK: deploy-cloud-starter

---
### Description
> Deploy your local cloud starter project

This task first shows the current organization connected to and then deploys the Cloud Starter, finally it will show the link to the Cloud Starter and (possibly) a link to the Cloud Descriptor location.

---
### Example Usage
> tcli deploy-cloud-starter

---
### Alternatives
> tcli d

> tcli deploy

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  UPLOADING APP: MyCloudStarter
TIBCO CLOUD CLI] (INFO)  UPLOAD RESULT: app created - artifact status [49] records created, [0] records not modified,
TIBCO CLOUD CLI] (INFO)  DONE DEPLOYING: MyCloudStarter
TIBCO CLOUD CLI] (INFO)  LOCATION: https://eu.liveapps.cloud.tibco.com/webresource/apps/MyCloudStarter/index.html
TIBCO CLOUD CLI] (INFO)  DESCRIPTOR LOCATION: https://eu.liveapps.cloud.tibco.com/webresource/apps/MyCloudStarter/assets/cloudstarter.json 
```

For more information see the **Get started with Cloud Starters** section in the online documentation:
[Get started with Cloud Starters](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/003_Get_Started_With_Cloud_Starters/)
