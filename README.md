# TIBCO Cloud™ Starters Toolkit - Command Line Interface 
Powered by [TIBCO Labs](https://community.tibco.com/wiki/tibco-labs)
![](https://community.tibco.com/sites/default/files/tibco_labs_final_with_tm2-01.png | width=100)

Command Line Interface for creating TIBCO Cloud Starter Projects

###Cloud CLI) Usage: 
```
tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)]
```
Note: When you run "tcli" as a loose command it will bring you in an interactive menu based on context.

### Create new Cloud starter:
```
tcli new
```
And anwer the questions, or provide the ansnwers inline:
```
tcli new <name> [--template(-t)] <template-to-use>
```
* debug: Display debug information.
   
* createCP: Create a new tibco-cloud.properties file.

* help: display help 
    
These are the available TIBCO CLOUD CLI Tasks:

| TASK | Description |
|------|:------------|
|                    show-cloud  | Show Cloud Details |
 |                    show-apps |  Show Applications of LiveApps WebApps |
 |        show-application-links |  Show Links to Applications of LiveApps WebApps |
 |                 change-region |  Change the Region in the cloud-properties file |
 |                     obfuscate |  Obfuscate a password and put it in the cloud-properties file |
 |                         start |  Start your local cloud starter project |
 |                         build |  Build your local cloud starter project |
 |                        deploy |  Deploy your local cloud starter project |
 |                  build-deploy |  Builds and Deploys your local project to the cloud |
 |            inject-lib-sources |  Enables your project for Cloud Library Debugging |
 |              undo-lib-sources |  Undo's the enabling for Cloud Library Debugging |
 |                 schematic-add |  Add a schematic into your project |
 |                          exit |  Quit the console |
 |                          help |  Display's help message|


---
For more information see the [TCSTK Documentation](https://tibcosoftware.github.io/TCSToolkit/Angular/docs/1.%20Getting%20Started/)
---
Copyright © 2019. TIBCO Software Inc.
This file is subject to the license terms contained
in the license file that is distributed with this library or can be found here:

https://github.com/TIBCOSoftware/TCSTK-Cloud-CLI/blob/master/LICENSE

