# TCLI TASK: show-discover-dataset-files

---
### Description:

> Show's a list of dataset files for Project Discover

---
### Example Usage:

> tcli show-discover-dataset-files

---
### Alternatives
> tcli show-dataset-files

> tcli show-discover-files

> tcli sddf


---
### Example Result:

```console
TIBCO CLOUD CLI] [DISCOVER] (INFO)  Using OAUTH Authentication, ORGANIZATION: Now LIMITLESS
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║ TABLE: discover-dataset-files                                                                                                                                                        ║
╠════╤══════════════════════════════╤═══════════╤═════════╤══════════════════════╤════════════════════════════════════════════════════════════════════════════╤════════════════════════╣
║ NR │ Name                         │ Encoding  │ In use  │ Size                 │ Location                                                                   │ Last updated           ║
║ 1  │ data_all.csv                 │ UTF-8     │ true    │ 22.9 MB              │ s3a://discover-cic/05ekw9q275qvrrkvyd3j4vydvn/data_all.csv                 │ 23 days ago            ║
║ 2  │ CallcenterExample.csv        │ UTF-8     │ true    │ 889.41 KB            │ s3a://discover-cic/05ekw9q275qvrrkvyd3j4vydvn/callcenterexample.csv        │ 27 days ago            ║
║ 3  │ TN_ProcessMining_MR_eng.csv  │ UTF-8     │ true    │ 7.06 MB              │ s3a://discover-cic/05ekw9q275qvrrkvyd3j4vydvn/tn_processmining_mr_eng.csv  │ 22 days ago            ║
║ 4  │ TN_PO_COM_eventlog.csv       │ UTF-8     │ true    │ 1.67 MB              │ s3a://discover-cic/05ekw9q275qvrrkvyd3j4vydvn/tn_po_com_eventlog.csv       │ 23 days ago            ║
╚════╧══════════════════════════════╧═══════════╧═════════╧══════════════════════╧════════════════════════════════════════════════════════════════════════════╧════════════════════════╝
[
```
