# TIBCO Cloud™ Starters Toolkit -- Command Line Interface 

Command Line Interface for creating TIBCO Cloud Starter Projects

###Cloud CLI) Usage: 
```
tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)]
```
Note: When you run "tcli" as a loose command it will bring you in an interactive menu based on context.

new: Create new Cloud starter. 
Usage] 
```
tcli new <name> [--template(-t)] <template-to-use>
```
--debug: Display debug information.
   
--createCP: Create a new tibco-cloud.properties file.

--help: display help 
    
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
Copyright © 2019. TIBCO Software Inc.
This file is subject to the license terms contained
in the license file that is distributed with this file.

