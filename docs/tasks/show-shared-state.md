# TCLI TASK: show-shared-state

---
### Description:
> Show the shared state contents

This is useful to see which shared states are available in your shared state filter.

The following properties in the cloud properties file are being used:

> Shared_State_Filter

Filter for the shared state to manage (all shared states starting with this value will be managed)
Use ''(empty) or APPLICATION for the current application. Use * for all values, or use a specific value to apply a filter.
Possible values: ( <Filter> | APPLICATION | * )

> Shared_State_Type

The type of shared state to look at.
Possible values: (PUBLIC | SHARED | PRIVATE)

---
### Example Usage:
> tcli show-shared-state

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Using Shared State Folder: ./Shared_State (TIBCO LABS DEV)/
TIBCO CLOUD CLI] (INFO)  Type of Shared State: PUBLIC
TIBCO CLOUD CLI] (INFO)  Using OAUTH Authentication, ORGANIZATION: TIBCO LABS DEV
Got Shared States: 207
TIBCO CLOUD CLI] (INFO)  Total Number of Shared State Entries: 207
TIBCO CLOUD CLI] (INFO)  Applying Shared State Filter: MyCloudApplication
TIBCO CLOUD CLI] (INFO)  Filtered Shared State Entries: 18
TIBCO CLOUD CLI] (INFO)  TABLE] shared-states 
```

|(index)|ID|NAME|MODIFIED BY|MODIFIED ON|
--- | --- | --- | --- | ---
| 1 | '1234' | 'state1.PUBLIC' | 'John Doe' | 'Tuesday, January 12, 2021'  |
| 2 | '5678' | 'state2.PUBLIC' | 'John Doe' | 'Tuesday, January 12, 2021'  |
| 3 | '9012' | 'state3.PUBLIC' | 'John Doe' | 'Tuesday, January 12, 2021'  |
