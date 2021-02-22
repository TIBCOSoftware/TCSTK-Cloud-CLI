# TCLI TASK: create-shared-state-entry

---
### Description
> Create a new shared state entry

This is useful to create shared state entries to store configuration for your cloud starter.

The following properties in the cloud properties file are being used:

> Shared_State_Type

The type of shared state to look at (PUBLIC | SHARED | PRIVATE)

---
### Questions:

* What is the name of the Shared State entry that you want to create ?

---
### Example Usage
> tcli create-shared-state-entry

> tcli create-shared-state-entry -a TestEntry

---
### Example Result:

TIBCO CLOUD CLI] (INFO)  Successfully created EMPTY shared state entry, with ID: 12345 and Name: TestEntry (PUBLIC)... 
