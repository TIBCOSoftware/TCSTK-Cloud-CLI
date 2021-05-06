# TCLI TASK: create-live-apps-group

---
### Description:
> Creates a new LiveApps group.

This is useful to create a group to differentiate roles in your cloud starter. (for example Admins, ReadOnly, MyTeamMembers)

---
### Questions:

What is the name of the group you would like to create ?

What is the description of the group  ? (press enter to leave blank)

---
### Example Usage:
> tcli create-live-apps-group

> tcli create-live-apps-group --answers MyGroup,MyDescription

> tcli create-live-apps-group -a MyGroup:

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Successfully created group with ID:  1234
```
