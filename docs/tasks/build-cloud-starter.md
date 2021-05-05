# TCLI TASK: build-cloud-starter

---
### Description

> Build your local cloud starter project

This task creates the zip file required for you Cloud Starter to run in the Cloud. This task is verly closely related to the TASK: build-deploy-cloud-starter, which also deploys the Cloud Starter.

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

Location of the descriptor file; For example: (./src/assets/cloudstarter.json)

---
### Example Usage
> tcli build-cloud-starter

---
### Alternatives
> tcli b

> tcli build

For more information see the **Get started with Cloud Starters** section in the online documentation:
[Get started with Cloud Starters](https://tibcosoftware.github.io/TCSToolkit/cli/tutorials/003_Get_Started_With_Cloud_Starters/)
