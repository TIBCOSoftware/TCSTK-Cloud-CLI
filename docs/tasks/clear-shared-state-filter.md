# TCLI TASK: clear-shared-state-filter

---
### Description
> Removes all shared state entries in the configured filter.

This is useful if you want to remove multiple shared state entries at once.


The following properties in the cloud properties file are being used:

> Shared_State_Filter

Filter for the shared state to manage (all shared states starting with this value will be managed)
Use ''(empty) or APPLICATION for the current application. Use * for all values, or use a specific value to apply a filter.
Possible values: ( <Filter> | APPLICATION | * )

> Shared_State_Type

The type of shared state to look at.
Possible values: (PUBLIC | SHARED | PRIVATE)

> Shared_State_Double_Check

Double check actions on shared state (YES | NO)

---
### Questions:

(if Shared_State_Double_Check is set to YES)
* ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (Filter: <FILTER>) ?

A special case is created if the filter is set to '*' (even if Shared_State_Double_Check is set to no)
* YOU ARE ABOUT TO REMOVE THE ENTIRE SHARED STATE ARE YOU REALLY REALLY SURE ?

---
### Example Usage
> tcli clear-shared-state-filter

---
### Alternatives
> tcli clear-shared-state-scope

---
### Example Result:

? ARE YOU SURE YOU WANT TO REMOVE ALL STATES ABOVE (Filter: Test) ? YES
TIBCO CLOUD CLI] (INFO)  REMOVING SHARED STATE - NAME: TestMe.PUBLIC ID: 12345
TIBCO CLOUD CLI] (INFO)  Successfully removed shared state with ID: 12345
TIBCO CLOUD CLI] (INFO)  REMOVING SHARED STATE - NAME: TestMe2.PUBLIC ID: 12346
TIBCO CLOUD CLI] (INFO)  Successfully removed shared state with ID: 12346 
