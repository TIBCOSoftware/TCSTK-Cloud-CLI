# TCLI TASK: show-live-apps-design-time-apps

---
### Description:
> Show Live Apps Applications in Development (can be copied)

This displays a list of design time apps for LiveApps. This is useful for the copy-live-apps-between-organizations task.

---
### Example Usage:
> tcli show-live-apps-design-time-apps

---
### Alternatives:
> tcli show-design-time-apps

---
### Example Result:

```console
TIBCO CLOUD CLI] (INFO)  Selected task] show-live-apps-design-time-apps
TIBCO CLOUD CLI] (INFO)  Using OAUTH Authentication, ORGANIZATION: Discover MVP Customer X
TIBCO CLOUD CLI] (INFO)  TABLE] live-apps-design-apps
┌─────────┬────────────────────────┬────────┬───────────────────┬────────────────────────────┬─────────────────────────────┬────────────┬───────────────┬───────────────────┐
│ (index) │          Name          │   Id   │ Latest Version ID │           Owner            │      Last Published On      │ Validation │ Runtime State │ Design-time State │
├─────────┼────────────────────────┼────────┼───────────────────┼────────────────────────────┼─────────────────────────────┼────────────┼───────────────┼───────────────────┤
│    1    │    'Application 1'     │ '3981' │      '8484'       │        'Jane Deane'        │ 'Wednesday, April 21, 2021' │    'Ok'    │  'PUBLISHED'  │    'PUBLISHED'    │
│    2    │    'Application 2'     │ '3992' │      '8512'       │         'John Doe'         │  'Monday, April 26, 2021'   │    'Ok'    │  'WITHDRAWN'  │    'WITHDRAWN'    │
│    3    │    'Application 3'     │ '3993' │      '8513'       │         'John Doe'         │  'Monday, April 26, 2021'   │    'Ok'    │  'WITHDRAWN'  │    'WITHDRAWN'    │
└─────────┴────────────────────────┴────────┴───────────────────┴────────────────────────────┴─────────────────────────────┴────────────┴───────────────┴───────────────────┘
```
