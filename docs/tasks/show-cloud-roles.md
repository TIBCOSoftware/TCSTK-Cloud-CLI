# TCLI TASK: show-cloud-roles

---
### Description:

> Displays which tenants you have access to, and what roles you have

This is use-full to know which tasks you can execute

---
### Example Usage:

> tcli show-cloud-roles

---
### Alternatives
> tcli sr

---
### Example Result:

```console
TIBCO CLOUD CLI] [TCLI] (INFO)  Using OAUTH Authentication, ORGANIZATION: Organization X
│ (index) │        NAME        │                               VALUE                               │
├─────────┼────────────────────┼───────────────────────────────────────────────────────────────────┤
│    0    │      'REGION'      │                               'EU'                                │
│    1    │   'ORGANIZATION'   │                        'Discover MVP DEV'                         │
│    2    │    'FIRST NAME'    │                              'John'                               │
│    3    │    'LAST NAME'     │                              'Doe'                                │
│    4    │      'EMAIL'       │                          'john@test.com'                          │
│    5    │   'TENANT: BPM'    │                   'ROLES: ApplicationDeveloper'                   │
│    6    │ 'TENANT: SPOTFIRE' │                 'ROLES: teamAdmin, CLOUD_ANALYST'                 │
│    7    │   'TENANT: TCI'    │                      'ROLES: teamAdmin, ADM'                      │
│    8    │   'TENANT: TCM'    │                        'ROLES: teamAdmin'                         │
```
