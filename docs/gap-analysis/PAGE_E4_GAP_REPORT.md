# PAGE E4 差距报告（TP-G2-R2）

```yaml
status: REVIEW
gate: TP-G2-R2
environment: READY_FOR_PAGE_E4
fake_runtime: true
live_app_url: false
generated_at: 2026-09-02T07:19:28.655Z
```

> **原则**：Playwright Fake Runtime harness PASS ≠ 产品实现满足目标。
> 本报告在 E4 可执行前提下，用静态实现 + Current FAIL 证据给出产品 PASS/FAIL/BLOCKED/NOT_IMPLEMENTED。
> 本轮 **Runtime filter + display-name + GATT codec + write-queue + log-redaction 已落地**；未修改 PAGE Vue / ESP32 / OTA Session 编排。

## 日志安全

| 项 | 状态 |
|---|---|
| log-redaction 模块 | **PASS** |
| createLogger 接入 | ble-runtime / ota-manager / smart-hid |
| 敏感字段 | token / password / secret / credential / authorization / cookie |
| 保护字段 | deviceId / UUID / sha256 / firmware_version |

## Summary

| Page | Product | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | Primary Fix |
|---|---|---|---|---|---|---|
| PAGE-001 | PASS | 30 | 0 | 0 | 0 | — |
| PAGE-002 | PASS | 29 | 0 | 0 | 0 | — |
| PAGE-003 | PASS | 12 | 0 | 0 | 0 | — |
| PAGE-004 | PASS | 14 | 0 | 0 | 0 | — |
| PAGE-005 | PASS | 18 | 0 | 0 | 0 | — |
| PAGE-006 | PASS | 30 | 0 | 0 | 0 | — |
| PAGE-007 | PASS | 14 | 0 | 0 | 0 | — |
| PAGE-008 | PASS | 25 | 0 | 0 | 0 | — |
| PAGE-009 | PASS | 20 | 0 | 0 | 0 | — |
| PAGE-010 | PASS | 13 | 0 | 0 | 0 | — |
| WEB-001 | PASS | 25 | 0 | 0 | 0 | — |

### Totals（case 级）

| Status | Count |
|---|---|
| PASS | 230 |
| FAIL | 0 |
| BLOCKED | 0 |
| NOT_IMPLEMENTED | 0 |
| Harness PASS | 230 |
| Harness FAIL | 0 |

## Top First Breakpoints



## Static Facts（本轮探测）

```json
{
  "hasLogRedaction": true,
  "hasWriteQueue": true,
  "hasReconnect": true,
  "hasDisplayName": true,
  "hasValidateHex": true,
  "broadcastUsesComposable": true,
  "versionUsesModel": true,
  "landingFake": false,
  "connectDiscovers": true,
  "scanAutoStop5": true,
  "hasObserver": true,
  "filterHasKeywordMatch": true,
  "registrySubCount": true
}
```

## Pages

### PAGE-001

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=10 ops=14
- **Actual (E4 harness)**: Fake Runtime PASS=30 FAIL=0
- **Actual (product)**: RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 DONE；E4 harness PASS；DEC-013 时长差异记观察
- **Case tallies**: PASS=30 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - note: scan auto-stop is 5s; target DEC-013 default 10s（观察项，非本轮 RUNTIME 断点） (apps/uniapp/composables/use-ble-scan.js)

### PAGE-002

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=12 ops=11
- **Actual (E4 harness)**: Fake Runtime PASS=29 FAIL=0
- **Actual (product)**: SMART-HID-WORKFLOW-001 DONE；createSmartHidWorkflow + use-smart-hid-provisioning；log-redaction DONE；E5 保持 OPEN
- **Case tallies**: PASS=29 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - TEST-BRIDGE-TS-001: Smart HID protocol TS import SyntaxError (TEST-U-015)

### PAGE-003

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=2 ops=4
- **Actual (E4 harness)**: Fake Runtime PASS=12 FAIL=0
- **Actual (product)**: hid/detail；Session borrow 由 Workflow/Registry 支持；E5 OPEN
- **Case tallies**: PASS=12 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### PAGE-004

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=3 ops=5
- **Actual (E4 harness)**: Fake Runtime PASS=14 FAIL=0
- **Actual (product)**: hid/history；Device Profile 无敏感 token；E5 OPEN
- **Case tallies**: PASS=14 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### PAGE-005

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=6 ops=6
- **Actual (E4 harness)**: Fake Runtime PASS=18 FAIL=0
- **Actual (product)**: hid/diagnostics；runDiagnostic 已落地；E5 OPEN
- **Case tallies**: PASS=18 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### PAGE-006

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=10 ops=14
- **Actual (E4 harness)**: Fake Runtime PASS=30 FAIL=0
- **Actual (product)**: RUNTIME-GATT-CODEC + WRITE-QUEUE + SESSION + RECONNECT + OTA + CONNECTION-DISCOVERY DONE
- **Case tallies**: PASS=30 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - OTA-CLIENT-001: DONE
  - OTA-PACKAGE-001: DONE
  - RUNTIME-CONNECTION-DISCOVERY-001: DONE

### PAGE-007

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=3 ops=5
- **Actual (E4 harness)**: Fake Runtime PASS=14 FAIL=0
- **Actual (product)**: RUNTIME-SESSION-001 + RUNTIME-RECONNECT-001 DONE；E4 harness PASS
- **Case tallies**: PASS=14 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - RUNTIME-RECONNECT-001: DONE

### PAGE-008

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=12 ops=7
- **Actual (E4 harness)**: Fake Runtime PASS=25 FAIL=0
- **Actual (product)**: Broadcast Workflow DONE；Peripheral: IMPLEMENTED；Observer: IMPLEMENTED；E5 保持 OPEN
- **Case tallies**: PASS=25 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - PAGE-BROADCAST-001: DONE
  - ESP32-PERIPHERAL-001: IMPLEMENTED
  - ESP32-OBSERVER-001: IMPLEMENTED

### PAGE-009

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=3 ops=11
- **Actual (E4 harness)**: Fake Runtime PASS=20 FAIL=0
- **Actual (product)**: about/index 消费 getVersionPageModel；链接区存在
- **Case tallies**: PASS=20 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### PAGE-010

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=2 ops=4
- **Actual (E4 harness)**: Fake Runtime PASS=13 FAIL=0
- **Actual (product)**: version.vue → getVersionPageModel；无 versionHistory；RC-PAGE-VERSION CLOSED
- **Case tallies**: PASS=13 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### WEB-001

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=4 ops=11
- **Actual (E4 harness)**: Fake Runtime PASS=25 FAIL=0
- **Actual (product)**: Landing PREVIEW/NOT_RELEASED 诚实；无 releases/latest。旧 AUTOMATED_FAIL 来自共享 log-redaction 证据，不记为 Landing 产品 FAIL
- **Case tallies**: PASS=25 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）


## Root Cause Buckets

| Bucket | Pages |
|---|---|
| Runtime | PAGE-002 log-redaction **DONE**；PAGE-006 (OTA；codec+write-queue+session+reconnect DONE), PAGE-007 SESSION+RECONNECT DONE；PAGE-001 filter+display-name DONE |
| Page | PAGE-008 (broadcast composable owner) |
| Testability | TEST-BRIDGE-TS-001（Smart HID TS） |
| Metadata | PAGE-010 CLOSED |
| Landing | WEB-001 honesty PASS（无假下载） |
| Fixture/Hardware | PAGE-008 Observer → ESP32-OBSERVER-001 (IMPLEMENTED；E5 still OPEN) |

## Machine report

- `reports/target-vs-current/page-e4-v2.json`
- `.tmp/tp-g2-r2/page-results/`（gitignore）

## NOT EXECUTED

- Hardware E5 / adb / 真机 BLE
- Live UniApp URL（`TARGET_PAGE_BASE_URL` 未设置）
