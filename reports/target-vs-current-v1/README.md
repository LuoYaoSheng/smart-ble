# Target vs Current Reports — v1 (SUPERSEDED)

```yaml
status: SUPERSEDED
superseded_by: TP-G2-R1
official_path: reports/target-vs-current/
document_version: 1.0
superseded_at: 2026-09-01
```

This directory preserves the **TP-G2 v1** machine-readable gap report for audit history.

## Why superseded

v1 issues corrected in TP-G2-R1:

- Gap generator parsed `AssertionError` raw text instead of structured `current.cases[]`
- Current PASS results were not mapped back to Target IDs
- Default status was often `PARTIAL` without evidence
- Protocol IDs used Service UUIDs instead of `PROTO-001`..`PROTO-011`
- P0/P1 counts mixed unique root causes with affected record counts
- Observer missing was over-classified as P0
- Smart HID Node TS import bridge was treated as product `NOT_IMPLEMENTED`
- Remediation graph used `FIX-*` only and had inconsistent ordering
- Commit field wrote `ref: refs/heads/main` instead of `git rev-parse HEAD`

## Official path

Use **`reports/target-vs-current/`** (TP-G2-R1 / schema v2).

Do not treat files in this v1 directory as the current gap baseline.
