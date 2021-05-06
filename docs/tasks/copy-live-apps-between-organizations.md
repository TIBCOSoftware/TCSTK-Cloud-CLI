# TCLI TASK: copy-live-apps-between-organizations

---
### Description:
> Copies a LiveApps application between organizations.

This is useful when you want to move a Live Apps application between two organizations in your subscription. 

NOTE: This only works for organizations within a region (contact TIBCO Support if you want to move LiveApp applications between regions)

The following properties in the cloud properties file are being used:

> Master_Account_Token

If this token is set a pull will be done from the organization of the provided token (in this way you can copy a LiveApps application from an organization that you are not part of but just get a temporary token from a user in that organization.)

If the token is not set a push will be done and you select the application that you want to move to another organization (in this case you must be part of both organizations). 

---
### Questions:

* Which LiveApps Application would you like to copy between organizations ?

* To which organization would you like to copy <The LiveApps Application> ?

-> If the application already exists: 

An app with the name <The LiveApps Application> already exists in the target organization, are you sure you want to copy (the new app will get different name) ?

Note: The application will not be overridden but gets a new name; for example MyApp(2)

---
### Example Usage:
> tcli copy-live-apps-between-organizations

> tcli copy-live-apps-between-organizations -a "MyApp:MyOrganization:NO"

---
### Alternatives:
> tcli copy-live-apps

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Updated: CloudLogin.OAUTH_Token to: [NEW OAUTH TOKEN] (in:tibco-cloud.properties)
TIBCO CLOUD CLI] (INFO)  Successfully changed to organization: Organization X
TIBCO CLOUD CLI] (INFO)  Successfully copied:  MyApp to MyOrganization (new id: 1234)
```
