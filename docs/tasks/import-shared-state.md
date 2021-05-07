# TCLI TASK: import-shared-state

---
### Description:
> Uploads one entry or the configured filter from the local file system to the shared state.

This is useful if you want to update multiple shared state entries at once.

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
> tcli import-shared-state

---
### Alternatives:
> tcli import-shared-state-scope
