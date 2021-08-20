# TCLI TASK: show-discover-datasets

---
### Description:

> Show's the datasets of Project Discover

---
### Questions:

> For which dataset would you like to see the details ?

---
### Example Usage:

> tcli show-discover-datasets

---
### Alternatives
> tcli show-datasets

> tcli show-ds

> tcli sdd

---
### Example Result:

```console
TIBCO CLOUD CLI] [DISCOVER] (INFO)  Using OAUTH Authentication, ORGANIZATION: Now LIMITLESS
╔═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║ TABLE: discover-datasets                                                                                                    ║
╠════╤══════════════════╤════════════════════════╤════════════════════════╤═══════╤══════════════════════════════╤════════════╣
║ NR │ Name             │ Created                │ Last previewed         │ Type  │ File                         │ Status     ║
║ 1  │ Call Center      │ 23 days ago            │ 23 days ago            │ csv   │ CallcenterExample.csv        │ COMPLETED  ║
║ 2  │ Purchase Orders  │ 23 days ago            │ 23 days ago            │ csv   │ TN_PO_COM_eventlog.csv       │ COMPLETED  ║
║ 3  │ RSUD             │ 23 days ago            │ 23 days ago            │ csv   │ data_all.csv                 │ COMPLETED  ║
║ 4  │ Money Requests   │ 22 days ago            │ 22 days ago            │ csv   │ TN_ProcessMining_MR_eng.csv  │ COMPLETED  ║
╚════╧══════════════════╧════════════════════════╧════════════════════════╧═══════╧══════════════════════════════╧════════════╝
```
