# TIBCO Cloud™ Starters Toolkit - Command Line Interface 
<img src="https://community.tibco.com/sites/default/files/tibco_labs_final_with_tm2-01.png" alt="drawing" width="100"/>Powered by [TIBCO Labs™](https://community.tibco.com/wiki/tibco-labs)

Command Line Interface for creating TIBCO Cloud™ Starter Projects

### TIBCO Cloud™ CLI) Installation:
```
npm install -g gulp-cli @tibco-tcstk/cloud-cli
``` 

###TIBCO Cloud™ CLI) Usage: 
```
tcli [new / <task>][--debug(-d)] [--createCP(-c)] [--help(-h)] [--version(-v)] [--update(-u)] [--propfile(-p)] [--multiple(-m)] [--multipleFile(-f)] [--surpressStart(-s)]
```

Note: When you just run "tcli" it will bring you in an interactive menu based on the context.

### Create new Tibco Cloud™ starter:
```
tcli new
```
And answer the questions, or provide the answers inline:
```
tcli new <name> [--template(-t)] <template-to-use>
```
* debug: Display debug information.
   
* createCP: Create a new tibco-cloud.properties file.

* help: display help 

* version: display the version number

* update: update the tcli

* propfile: when specified tcli will use a different property file then the default tibco-cloud.properties

* multiple: run the task specified in the configured multiple property file. This allows you to execute tasks on many cloud starters and many different configured environments at the same time.

* multipleFile: when specified tcli will use a different property file then the default manage-multiple-cloud-starters.properties

* surpressStart: When using this option after creating a new cloud starter the interactive tcli will not start.
    
These are the available TIBCO Cloud™ CLI Tasks:

| TASK | Description |
|------|:------------|
|                    show-cloud  | Show Cloud Details |
 |                     show-apps |  Show Applications of LiveApps WebApps |
 |        show-application-links |  Show Links to Applications of LiveApps WebApps |
 |                 change-region |  Change the Region in the tibco-cloud properties file |
 |                     obfuscate |  Obfuscate a password and put it in the tibco-cloud properties file |
 |                         start |  Start your local cloud starter project |
 |                         build |  Build your local cloud starter project |
 |                        deploy |  Deploy your local cloud starter project |
 |                  build-deploy |  Builds and Deploys your local project to the cloud |
 |            inject-lib-sources |  Enables your project for Cloud Library Debugging |
 |              undo-lib-sources |  Undo enabling your project for Cloud Library Debugging |
 |                 schematic-add |  Add a component template (schematic) into your project |
 |             view-global-config|  View the global cloud connection configuration |
 |           update-global-config|  Update the global cloud connection configuration |
 |              show-shared-state|  Show the shared state contents |
 |      show-shared-state-details|  Shows the details of one Shared State entry |
 |       clear-shared-state-entry|  Removes one Shared State entry |
 |       clear-shared-state-scope|  Removes all shared state entries in the configured scope |
 |      export-shared-state-scope|  Downloads all shared state entries from the configured scope to the local file system |
 |      import-shared-state-scope|  Uploads one entry or the configured scope from the local file system to the shared state |
 |       watch-shared-state-scope|  Monitors the local shared state and when changes are detected it is uploaded to the cloud |
 |  create-multiple-property-file|  Creating an initial property file to manage multiple cloud starters and environments |
 |         replace-string-in-file|  Replace string in file following the Replace_FROM, Replace_TO and Replace_PATTERN properties |
 |                    update-tcli|  Update the Cloud CLI |
 |                          exit |  Quit the console |
 |                          help |  Display's help message|


---
For more information see the [TCSTK Documentation](https://tibcosoftware.github.io/TCSToolkit/)
---

# License

Copyright © 2020. TIBCO Software Inc.
This file is subject to the license terms contained
in the license file that is distributed with this file.

Please see tpc.txt for details of license and dependent third party components referenced by this library, or it can be found here:
                                                                                                                                                                        
https://github.com/TIBCOSoftware/TCSTK-Cloud-CLI/blob/master/license.txt
