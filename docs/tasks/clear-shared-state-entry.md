# TCLI TASK: clear-shared-state-entry

---
### Description
> Removes one Shared State entry.

This is useful to get rid of a shared state entry based on your shared state filter.

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

* Which Shared State would you like to remove ?

* Are you sure ?

---
### Example Usage
> tcli clear-shared-state-entry

> tcli clear-shared-state-entry -a TestEntry:YES

---
### Example Result:

TIBCO CLOUD CLI] (INFO)  Removing Shared State: TestEntry.PUBLIC (12345)
? Are you sure ? YES
TIBCO CLOUD CLI] (INFO)  Successfully removed shared state with ID: 12345
