# TCLI TASK: show-shared-state-details

---
### Description:
> Shows the details of one Shared State entry.

This is useful if you want to see the details a shared state entry.

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
> tcli show-shared-state-details
