# TCLI: Providing Answers Inline

In this section we will give you answers to all your questions :-), no all jokes aside the TCLI is a very interactive tool in the way that it asks the user a question and then continues the work. This is not always desired, especially not in a build pipeline, since it will never finish. 

---
## Run TCLI interactively

Let's say we run for example (in a folder with a tibco-cloud property file):

```console
tcli validate
```

The first thing that will happen is that you will get a question:

```console
What would you like to validate ?
```

Let's say if we answer ***Property_exist***, we will get the question:

```console
Which property would you like to validate (Use plus character to validate multiple properties, for example: prop1+prop2) ?
```

If we answer ***CloudLogin.Region***, we will get the following result:

<p align="center">
    <img src="006_Validate.png" width="1400" />
</p>

> ***Note:*** There are a whole bunch of things you can validate:
* Property_exist
* Property_is_set
* Property_is_set_ask
* LiveApps_app_exist
* Live_Apps_group_exist
* TCI_App_exist
* Cloud_Starter_exist
* Org_Folder_exist
* Org_Folder_And_File_exist
* Case_Exist
* Case_Not_Exist
* Case_In_State


---
## Run TCLI with the -a command
Let's say we want to do this validation without any interaction we can run this command:

```console
tcli <TASK> --answers(a) <answers>
```

> ***Note:*** The answers flag is only allowed ***when a task is provided***, so the initial setup (creating the tibco-cloud property file) is always manual. But remember there are tasks to manage the global config and the creation of a multiple property file.

This means the tcli completely runs verbose, meaning it won't stop execution to ask the user for input. The answers are comma(,) separated or semicolon(:) separated. So for example:

```console
tcli validate -a Property_exist:CloudLogin.Region
```

Resulting in:

<p align="center">
    <img src="006_Provide_Answers.png" width="1200" />
</p>

Or another example:

```console
tcli validate -a Property_exist:CloudLogin.Region+AnotherProperty
```

Resulting in:

<p align="center">
    <img src="006_Answers_Validation_Failed.png" width="1200" />
</p>

---
## Updating properties with answers

***You can provide answers to Any task in tcli!*** Let's take another example where we update a property:

```console
tcli add-or-update-property
```

This task would normally ask these questions:

```console
In which file would you like to update a property ? (use enter or default for the current property file)
Which property would you like to update or add ?
What comment would you like to add ?
What value would you like to add ? (use SPECIAL to select from a list)
--> If SPECIAL is used:
What type of answer would you like to add to the property ?
```

We could for example answer:

```console
tcli add-or-update-property -a DEFAULT:SaveMe:'I want to be saved':'I am safe...'
```
> ***Note:*** Use quotes when there are spaces in the value.

This runs like this:

<p align="center">
    <img src="006_Save_Me.png" width="1200" />
</p>

And results in this being added to the tibco-cloud properties file:

<p align="center">
    <img src="006_Saved.png" width="400" />
</p>

---
## Too little answers is wrong but too many is ok

> ***Note:*** It is important to know that when you provide too many answers nothing will go wrong. But when you provide to too little an error is given (and the tcli does not revert to manual input).

For example:

```console
tcli add-or-update-property -a DEFAULT:SaveMe:none:'I am safe again...':'what am I doing here...'
```

Is perfectly ok, but:

```console
tcli add-or-update-property -a DEFAULT:SaveMe:none:SPECIAL
```

Will result in the following error:

<p align="center">
    <img src="006_Too_little_Answers.png" width="1200" />
</p>

> ***Note:*** These are the special values that can be added:
* SandboxID
* LiveApps_AppID
* LiveApps_ActionID 

And should be, for example:

```console
tcli add-or-update-property -a DEFAULT,SaveMe,none,SPECIAL,SandboxID
```

<p align="center">
    <img src="006_Right_Answer.png" width="1200" />
</p>

> ***Note:*** You can use comma(,) separated values or semi colon separated values. It does not really matter, only in the multiple cloud property files you ***need to use semi colon separated values*** (otherwise the task interpretation gets confused). 
