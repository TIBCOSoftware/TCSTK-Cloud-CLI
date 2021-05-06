# TCLI TASK: generate-cloud-descriptor

---
### Description:
> Generates the configured Public Cloud Descriptor

This generates a descriptor for your cloud starter. This descriptor contains the name, version and description from your package.json file. Optionally the build date can be added.

The following properties in the cloud properties file are being used:

Note: If you use setting Add_Descriptor=YES a descriptor will be added during build-cloud-starter task.

> Add_Descriptor_Timestamp

Add a timestamp to the version in the descriptor (for example 1.0.01591605316). Allowed values: (YES | NO)

> Descriptor_File

Location of the descriptor file

---
### Example Usage:
> tcli generate-descriptor

---
### Alternatives:
> tcli generate-cloud-descriptor

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Selected task] generate-descriptor 
TIBCO CLOUD CLI] (INFO)  Adding descriptor file: ./src/assets/cloudstarter.json Adding Timestamp: YES 
TIBCO CLOUD CLI] (INFO)  Adding Cloud Starter Descriptor:  {
  cloudstarter: {
    name: 'MyCloudStarter',
    version: '2.1.01615482836035',
    build_date: 2021-03-11T17:13:56.035Z,
    description: 'My Awesome Cloud Starter'
  }
} 
```
