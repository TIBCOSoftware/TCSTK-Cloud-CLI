# TCLI TASK: build-cloud-app

---
### Description:

> Build your local cloud application project

This task creates the zip file required for you Cloud Application to run in the Cloud. This task is very closely related to the TASK: build-deploy-cloud-app, which also deploys the Cloud Application.

The following properties in the cloud properties file are being used:

> BUILD_COMMAND

Build command to use: Options: HASHROUTING | NON-HASHROUTING | <a custom command (example: ng build --prod )>

HASHROUTING, includes the index.html in the build command and NON-HASHROUTING doesn't.

    HASHROUTING: ng build --prod --base-href URL/index.html --deploy-url URL
NON-HASHROUTING: ng build --prod --base-href URL --deploy-url URL

You also provide a complete custom build command.

> Add_Descriptor

On the build should a cloud descriptor file need to be added (this can also be done manually with the "tcli generate-cloud-descriptor" command). Allowed values: (YES | NO)

> Add_Descriptor_Timestamp

Add a timestamp to the version in the descriptor (for example 1.0.01591605316). Allowed values: (YES | NO)

> Descriptor_File

Location of the descriptor file; For example: (./src/assets/cloud_app_descriptor.json)

---
### Example Usage:

> tcli build-cloud-app

---
### Alternatives
> tcli build-cloud-starter

> tcli b

> tcli build

For more information see the **Get started with the TIBCO Cloud Composer** section in the online documentation:
[Get started with the TIBCO Cloud Composer](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/003_Get_Started_With_Cloud_Starters/)
