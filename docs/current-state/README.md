# Current State 入口（TP-G2-R1）

```yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 5c58aa6d543f8943886694a38cf03bf4accee2799a5b5636257017e4b676e591
commit: ae13e90ea5ad38a4e416b5783a4956a81f827547
```

本目录只记录**当前实现事实**（path / symbol / line_hint）。建议与修复见 `docs/gap-analysis/` 与 `docs/remediation/`。不得在此写「建议改为」。

| 文档 | 内容 |
|---|---|
| [CURRENT_PAGE_IMPLEMENTATION.md](./CURRENT_PAGE_IMPLEMENTATION.md) | PAGE-001..010 + WEB-001 |
| [CURRENT_RUNTIME_IMPLEMENTATION.md](./CURRENT_RUNTIME_IMPLEMENTATION.md) | ble-runtime / OTA / 广播 |
| [CURRENT_ESP32_IMPLEMENTATION.md](./CURRENT_ESP32_IMPLEMENTATION.md) | LightBLE vs ble-fixture-target |
| [CURRENT_SMART_HID_IMPLEMENTATION.md](./CURRENT_SMART_HID_IMPLEMENTATION.md) | Smart HID + TS bridge |
| [CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md](./CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md) | 落地页与 Release |
| [CURRENT_TEST_COVERAGE.md](./CURRENT_TEST_COVERAGE.md) | CURRENT_PASS/FAIL 结构化结果 |
| [CURRENT_BUILD_AND_TOOLCHAIN.md](./CURRENT_BUILD_AND_TOOLCHAIN.md) | 构建与工具链 |

无法静态确认的项标 **UNASSESSED**。
