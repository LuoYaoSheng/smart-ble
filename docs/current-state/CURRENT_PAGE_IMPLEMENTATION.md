# 当前页面实现盘点（TP-G2-R2）

```yaml
status: REVIEW
gate: TP-G2-R2
source: reports/target-vs-current/page-e4-v2.json
```

## 路由事实（权威：`contracts/target/pages-target.json`）

| ID | Route | UniApp / Docs |
|---|---|---|
| PAGE-001 | pages/index/index | `apps/uniapp/pages/index/index.vue` |
| PAGE-002 | pages/hid/add | `apps/uniapp/pages/hid/add.vue` |
| PAGE-003 | pages/hid/detail | `apps/uniapp/pages/hid/detail.vue` |
| PAGE-004 | pages/hid/history | `apps/uniapp/pages/hid/history.vue` |
| PAGE-005 | pages/hid/diagnostics | `apps/uniapp/pages/hid/diagnostics.vue` |
| PAGE-006 | pages/device/detail | `apps/uniapp/pages/device/detail.vue` |
| PAGE-007 | pages/connected/index | `apps/uniapp/pages/connected/index.vue` |
| PAGE-008 | pages/broadcast/index | `apps/uniapp/pages/broadcast/index.vue` |
| PAGE-009 | pages/about/index | `apps/uniapp/pages/about/index.vue` |
| PAGE-010 | pages/about/version | `apps/uniapp/pages/about/version.vue` |
| WEB-001 | / | `docs/index.md` |

## 每页产品结论（E4 harness 全 PASS；产品另判）

> Playwright Fake Runtime **230 PASS**。下表 **Product** 来自静态 + Current FAIL 证据（见 `PAGE_E4_GAP_REPORT.md`）。

| Page | Product | E4 harness | Primary task | First breakpoint（摘要） |
|---|---|---|---|---|
| PAGE-001 | FAIL | PASS | RUNTIME-FILTER-001 | device-filter 仅 prefix；缺关键词命中 |
| PAGE-002 | FAIL | PASS | RUNTIME-LOG-REDACTION-001 | log-redaction.js 缺失 |
| PAGE-003 | PASS | PASS | — | 无确定 FAIL 证据 |
| PAGE-004 | PASS | PASS | — | 历史管理面已实现 |
| PAGE-005 | PASS | PASS | — | 诊断页存在 |
| PAGE-006 | FAIL | PASS | RUNTIME-GATT-CODEC-001 | validateHexInput/parseHexInput 缺失 |
| PAGE-007 | FAIL | PASS | RUNTIME-SESSION-001 | Registry 无配网会话排除 |
| PAGE-008 | FAIL | PASS | PAGE-BROADCAST-001 | 未接入 useBroadcastSession |
| PAGE-009 | PASS | PASS | — | Metadata 投影 |
| PAGE-010 | PASS | PASS | — | getVersionPageModel；无 versionHistory |
| WEB-001 | PASS | PASS | — | PREVIEW/NOT_RELEASED；无假下载 |

## PAGE-008 / Observer

- 页面产品：CONFIRMED_PARTIAL → FAIL（PAGE-BROADCAST-001）
- Observer 硬件夹具缺失 → 相关 OP **BLOCKED_BY_FIXTURE**（ESP32-OBSERVER-001），**不**计为页面逻辑 FAIL

## PAGE-010

- `getVersionPageModel`；RC-PAGE-VERSION **CLOSED**

## STATE / OP

- 契约：STATE 67 / OP 92
- 机器报告：`reports/target-vs-current/page-e4-v2.json`
- 人读报告：`docs/gap-analysis/PAGE_E4_GAP_REPORT.md`

## WEB-001

- PREVIEW + NOT_RELEASED；无 `releases/latest` 假主下载
