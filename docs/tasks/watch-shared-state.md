# TCLI TASK: watch-shared-state

---
### Description:
> Monitors the local shared state and when changes are detected it is uploaded to the cloud.

This is useful if you want to update shared state direly from your disk.

The task will ask you to export the shared state firs and then it wil watch it. While watching the shared state any update to the local file will be updated in the shared state.

NOTE: When the shared state get's updated on the server this does not reflect on your file system. There fore there is the option to Reload(r) the shared state, which can be done with the r-key. 

You can use the q-key to end the watching of the shared state.

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
### Example Usage:
> tcli watch-shared-state

---
### Alternatives:
> tcli watch-shared-state-scope

> tcli watch-ss
