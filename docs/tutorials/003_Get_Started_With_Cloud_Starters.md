# TCLI: Get started with Cloud Starters

![TCLI_Show_Links](imgs/003_CS_Main_Menu.png#zoom)

---
## Set up your own Cloud Starter
When you run the tcli in a folder without the tibco-cloud property file:

```console
tcli 
```

> or

```console
tcli new
```

You have an option to ***Create a New Cloud Starter***. You will get into an interactive menu where you answer the following questions:

```console
What is the name of your cloud starter ?
```

```console
Which Template would you like to use for your cloud starter ?
```

> For example: 


![TCLI_Show_Links](imgs/003_Use_Template.png#zoom)

> ***Note:*** You can also provide the command to create a new cloud starter inline (without interactions):

```console
tcli new <name> [--template(-t)] <template-to-use>
```

When you choose the template to use the tcli will fetch the Cloud Starter(from Git) based on that template. The tcli will create the following folder structure:

![TCLI_Show_Links](imgs/003_CS_Folder.png#zoom)


> If you have a global configuration the tibco-cloud property file crated will contain ***USE-GLOBAL*** for your authentication values. [Click here for more information on global configuration](../concepts/002_Global_Configuration.md)

> If all was successfully, you will directly get into the interactive tcli menu in your newly created cloud starter folder:

![TCLI_Show_Links](imgs/003_CS_Created.png#zoom)

> ***Note:*** If you ***exit*** the interactive menu now you will be ***back in the main folder*** from where you created the cloud starter, and ***not*** in the cloud starter folder. So if you type tcli again you would get the menu again that asks you to create a cloud starter. To go back to your cloud starter run:

```console
cd <Cloud Starter FOLDER>
```

> ***Note:*** You can prevent the interactive tcli menu to come up after creating a cloud starter with the --surpressStart flag (or short -s), for example: 

```console
tcli new <name> [--template(-t)] <template-to-use> --surpressStart(-s)
```

---
## Start the Cloud Starter locally
Now we have created our cloud starter we can select start-cloud-starter from the menu:

![TCLI_Show_Links](imgs/003_Start.png#zoom)

> Or use we cloud provide this command on the commandline:

```console
tcli start-cloud-starter
```
> or

```console
tcli start
```

> or simply:

```console
tcli s
```

The Cloud Starter by default will run on https://localhost:4200/ if the 4200 port is not available tcli will select port 4201, 4202 and so on. This is nice if you want to run a few cloud starters or a few versions of a cloud starter next to each other.

> ***Note:*** When you have an ***OAUTH token*** configured in your tibco cloud property file (or globally) the startup script will inject this token in your proxy that routes all your local calls to the TIBCO Cloud. In this way you don't have to login in your local development setup. Also; when you startup the tcli will check the validity of your OAUTH Token, and if it is about to expire it will rotate it for you automatically. You can run this action yourself as well:

```console
tcli validate-and-rotate-oauth-token
```

> or simply:

```console
tcli vo
```

> We can now open the Cloud Starter locally in the browser:

![TCLI_Show_Links](imgs/003_CS_Local.png#shadow)

---
## Make a change to the Cloud Starter
Now you can basically start your development cycle and based on your requirements and template that use use make changes to the Cloud Starter. The nice thing about the Cloud Starter apps is that you can make changes on the fly. For example we are running a Cloud Starter like this:  

![TCLI_Show_Links](imgs/003_CS_Change_Before.png#shadow)

> When we take the code of the Home component and we add some HTML code in:

![TCLI_Show_Links](imgs/003_CS_Change_Code.png#zoom)

> We can see the result directly on the Screen:

![TCLI_Show_Links](imgs/003_CS_Change_After.png#shadow)

---
## Apply a Schematic
Instead of doing all the changes manually we can also use a concept called <a href="https://angular.io/guide/schematics" target="_blank">Angular Schematics</a>. Besides the   basic angular schematics to create components and services for example, we also have created some schematics in the Cloud Starter Toolkit: 

> ***Note:*** Stop your Cloud Starter when applying schematics

![TCLI_Show_Links](imgs/003_Schematics.png#zoom)

> The tcli provides a command to add these schematics in:

![TCLI_Show_Links](imgs/003_Schematic_Add.png#zoom)

> Or you could run:

```console
tcli schematic-add
```

Based on the template that you are using you get the available schematics shown:

![TCLI_Show_Links](imgs/003_Choose_Schematic.png#zoom)

Every schematic asks a number of questions, and based on the answers it will generate all the required HTML,CSS and TS code:

![TCLI_Show_Links](imgs/003_Schematic_Questions.png#zoom)

In this case the schematic created a component called ***MyDashboard***, which we can use on our home component:

![TCLI_Show_Links](imgs/003_Code_Change.png#zoom)

Now when we start our Cloud Starter we can see that we have added a Spotfire Analytical dashboard in our Cloud Starter, without hardly writing any code:

![TCLI_Show_Links](imgs/003_Schematics_Dashboard.png#shadow)

---
## Build and Deploy the Cloud Starter to the Cloud
When you are happy with the development of the cloud starter it is time to deploy the Cloud Starter to the TIBCO Cloud. Before we do this we must build the cloud starter, we can do this with the command: 

> ***Note:*** The easiest way to deploy your Cloud Starter is running the [build-deploy command interactively](#build-and-deploy-interactively) in the tcli. Here are all the possible commands for completeness.

```console
tcli build-cloud-starter
```

> or

```console
tcli build
```

> or simply:

```console
tcli b
```

When the build command is run the following section in the tibco cloud property file is used:

![TCLI_Show_Links](imgs/003_Build_Properties.png#zoom)

Based on these settings your cloud starter gets build. You can leave the default settings, to deploy initially. The builder will include a cloud descriptor file, which can be used on to identify your cloud starter later by the show-cloud-starter-links command and the App Gallery for example.

The build results in a Zip file that is put into the Dist folder in your project.

Then we can deploy the cloud starter with the following command:

```console
tcli deploy-cloud-starter
```

> or

```console
tcli deploy
```

> or simply:

```console
tcli d
```

After the deployment you get a link to your Cloud Starter and your Cloud Descriptor:

![TCLI_Show_Links](imgs/003_Deploy.png#zoom)

You can also run the build and deploy step at once, as follows:

```console
tcli build-deploy-cloud-starter
```

> or

```console
tcli build-deploy
```

> or simply:

```console
tcli bd
```

## View Deployed Cloud Starters
To see which cloud starters are deployed you can run:

```console
tcli show-cloud-starters
```

> or simply:

```console
tcli scs
```

> For example:

![TCLI_Show_Links](imgs/003_Show_CloudStareters.png#zoom)

To see which cloud starters are deployed and what there links are you can run 

```console
tcli show-cloud-starter-links
```

> or simply:

```console
tcli sl
```

> For example:

![TCLI_Show_Links](imgs/003_Cloud_Starters_Links.png#zoom)

## Build and Deploy Interactively
In your cloud starter folder run:

```console
tcli
```

And choose build-deploy, which will deploy your cloud starters. 

![TCLI_Show_Links](imgs/003_Build_Deploy.png#zoom)

> ***Note:*** Remember you can always press up or run the repeat-last-task option to redeploy quickly.

Now we have our Cloud Starter running on the TIBCO Cloud:

![TCLI_Show_Links](imgs/003_Deployed_App.png#shadow)

## Delete a Cloud Starter
You can delete a cloud starter with the following command:

```console
tcli delete-cloud-starter
```

This command will first list all the Cloud Starters and then ask which one you want to delete and aks if you are sure and then delete the app:

![TCLI_Show_Links](imgs/003_Delete_App.png#zoom)

To manage multiple Cloud Starters simultaneously go to the section [Managing multiple TIBCO Cloud organizations](./004_Multiple_Organizations.md)
