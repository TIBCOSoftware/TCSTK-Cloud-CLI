# TCLI TASK: deploy-cloud-app

---
### Description:

> Deploy your local cloud application project

This task first shows the current organization connected to and then deploys the Cloud Application, finally it will show the link to the Cloud Application and (possibly) a link to the Cloud Descriptor location.

NOTE: In order to run this task your cloud application needs to be built first.

---
### Example Usage:

> tcli deploy-cloud-app

---
### Alternatives
> tcli deploy-cloud-starter

> tcli d

> tcli deploy

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  UPLOADING APP: MyCloudApp
TIBCO CLOUD CLI] (INFO)  UPLOAD RESULT: app created - artifact status [49] records created, [0] records not modified,
TIBCO CLOUD CLI] (INFO)  DONE DEPLOYING: MyCloudApp
TIBCO CLOUD CLI] (INFO)  LOCATION: https://eu.liveapps.cloud.tibco.com/webresource/apps/MyCloudApp/index.html
TIBCO CLOUD CLI] (INFO)  DESCRIPTOR LOCATION: https://eu.liveapps.cloud.tibco.com/webresource/apps/MyCloudApp/assets/cloud_app_descriptor.json 
```

For more information see the **Get started with the TIBCO Cloud Composer** section in the online documentation:
[Get started with the TIBCO Cloud Composer](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/003_Get_Started_With_Cloud_Starters/)
