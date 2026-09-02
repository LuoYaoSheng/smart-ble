# PAGE E4 差距报告（TP-G2-R2）

```yaml
status: REVIEW
gate: TP-G2-R2
environment: READY_FOR_PAGE_E4
fake_runtime: true
live_app_url: false
generated_at: 2026-09-02T01:07:15.065Z
```

> **原则**：Playwright Fake Runtime harness PASS ≠ 产品实现满足目标。
> 本报告在 E4 可执行前提下，用静态实现 + Current FAIL 证据给出产品 PASS/FAIL/BLOCKED/NOT_IMPLEMENTED。
> 本轮 **Runtime filter + display-name + GATT codec + write-queue 已落地**；未修改 PAGE Vue / ESP32 / OTA / Session / Log-redaction。

## Summary

| Page | Product | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | Primary Fix |
|---|---|---|---|---|---|---|
| PAGE-001 | PASS | 30 | 0 | 0 | 0 | — |
| PAGE-002 | FAIL | 0 | 0 | 0 | 29 | RUNTIME-LOG-REDACTION-001 |
| PAGE-003 | PASS | 12 | 0 | 0 | 0 | — |
| PAGE-004 | PASS | 14 | 0 | 0 | 0 | — |
| PAGE-005 | PASS | 18 | 0 | 0 | 0 | — |
| PAGE-006 | FAIL | 0 | 30 | 0 | 0 | OTA-CLIENT-001 |
| PAGE-007 | PASS | 14 | 0 | 0 | 0 | — |
| PAGE-008 | FAIL | 0 | 23 | 2 | 0 | PAGE-BROADCAST-001 |
| PAGE-009 | PASS | 20 | 0 | 0 | 0 | — |
| PAGE-010 | PASS | 13 | 0 | 0 | 0 | — |
| WEB-001 | PASS | 25 | 0 | 0 | 0 | — |

### Totals（case 级）

| Status | Count |
|---|---|
| PASS | 146 |
| FAIL | 53 |
| BLOCKED | 2 |
| NOT_IMPLEMENTED | 29 |
| Harness PASS | 230 |
| Harness FAIL | 0 |

## Top First Breakpoints

1. **PAGE-002** → `apps/uniapp/services/ble-runtime/log-redaction.js` `(missing)` — log-redaction module missing; HID provision path shares REQ-036/050 *(RUNTIME-LOG-REDACTION-001 / TEST-U-013 / FEAT-040)*
2. **PAGE-006** → `apps/uniapp/utils/ota_manager.js` `validateOtaPackage` — CTRL start before DATA / validateOtaPackage (TEST-I-008) *(OTA-CLIENT-001 / TEST-I-008 / FEAT-081)*
3. **PAGE-008** → `apps/uniapp/pages/broadcast/index.vue` `(inline advertising)` — page does not use useBroadcastSession composable/owner *(PAGE-BROADCAST-001 / TEST-P-008 / FEAT-041)*

## Static Facts（本轮探测）

```json
{
  "hasLogRedaction": false,
  "hasWriteQueue": true,
  "hasReconnect": true,
  "hasDisplayName": true,
  "hasValidateHex": true,
  "broadcastUsesComposable": false,
  "versionUsesModel": true,
  "landingFake": false,
  "connectDiscovers": true,
  "scanAutoStop5": true,
  "hasObserver": false,
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

- **Product**: FAIL
- **Target**: `docs/target-product/pages|web` + behavior states=12 ops=11
- **Actual (E4 harness)**: Fake Runtime PASS=29 FAIL=0
- **Actual (product)**: hid/add + use-smart-hid-provisioning 存在；Workflow 被 Runtime/桥接断点阻断
- **Case tallies**: PASS=0 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=29
- **Root Cause**: RC-LOG-REDACTION
- **Fix IDs**: RUNTIME-LOG-REDACTION-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/services/ble-runtime/log-redaction.js` / `(missing)` — log-redaction module missing; HID provision path shares REQ-036/050
- Target: FEAT-040 · Test: TEST-U-013

**Fail / Blocked samples**
  - NOT_IMPLEMENTED STATE-P002-01 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-02 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-03 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-04 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-05 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-06 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-07 → RUNTIME-LOG-REDACTION-001
  - NOT_IMPLEMENTED STATE-P002-08 → RUNTIME-LOG-REDACTION-001

**Related**
  - TEST-BRIDGE-TS-001: Smart HID protocol TS import SyntaxError (TEST-U-015)

### PAGE-003

- **Product**: PASS
- **Target**: `docs/target-product/pages|web` + behavior states=2 ops=4
- **Actual (E4 harness)**: Fake Runtime PASS=12 FAIL=0
- **Actual (product)**: hid/detail 页面存在；无独立 CURRENT_FAIL 挂载；E4 Fake PASS；控件级静态未全量确认但无确定 FAIL 证据
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
- **Actual (product)**: hid/history 为历史唯一管理面；静态 CONFIRMED_IMPLEMENTED
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
- **Actual (product)**: hid/diagnostics 存在；无独立 FAIL 证据
- **Case tallies**: PASS=18 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: —
- **Fix IDs**: —（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- First Breakpoint: —

**Fail / Blocked samples**
  - （无）

**Related**
  - （无）

### PAGE-006

- **Product**: FAIL
- **Target**: `docs/target-product/pages|web` + behavior states=10 ops=14
- **Actual (E4 harness)**: Fake Runtime PASS=30 FAIL=0
- **Actual (product)**: RUNTIME-GATT-CODEC + WRITE-QUEUE + SESSION + RECONNECT + OTA-PACKAGE DONE；PAGE-006 剩余 OTA Client
- **Case tallies**: PASS=0 FAIL=30 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: RC-OTA-CLIENT
- **Fix IDs**: OTA-CLIENT-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/utils/ota_manager.js` / `validateOtaPackage` — CTRL start before DATA / validateOtaPackage (TEST-I-008)
- Target: FEAT-081 · Test: TEST-I-008

**Fail / Blocked samples**
  - FAIL STATE-P006-01 → OTA-CLIENT-001
  - FAIL STATE-P006-02 → OTA-CLIENT-001
  - FAIL STATE-P006-03 → OTA-CLIENT-001
  - FAIL STATE-P006-04 → OTA-CLIENT-001
  - FAIL STATE-P006-05 → OTA-CLIENT-001
  - FAIL STATE-P006-06 → OTA-CLIENT-001
  - FAIL STATE-P006-07 → OTA-CLIENT-001
  - FAIL STATE-P006-08 → OTA-CLIENT-001

**Related**
  - OTA-PACKAGE-001: DONE
  - RUNTIME-CONNECTION-DISCOVERY-001: TEST-I-003 asserts discover orchestration gap (semi-open risk) (apps/uniapp/services/ble-runtime/index.js)

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

- **Product**: FAIL
- **Target**: `docs/target-product/pages|web` + behavior states=12 ops=7
- **Actual (E4 harness)**: Fake Runtime PASS=25 FAIL=0
- **Actual (product)**: 广播页 CONFIRMED_PARTIAL；Observer 缺失记 BLOCKED 而非页面产品 FAIL
- **Case tallies**: PASS=0 FAIL=23 BLOCKED=2 NOT_IMPLEMENTED=0
- **Root Cause**: RC-PAGE-BROADCAST
- **Fix IDs**: PAGE-BROADCAST-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/pages/broadcast/index.vue` / `(inline advertising)` — page does not use useBroadcastSession composable/owner
- Target: FEAT-041 · Test: TEST-P-008

**Fail / Blocked samples**
  - FAIL STATE-P008-01 → PAGE-BROADCAST-001
  - FAIL STATE-P008-02 → PAGE-BROADCAST-001
  - FAIL STATE-P008-03 → PAGE-BROADCAST-001
  - FAIL STATE-P008-04 → PAGE-BROADCAST-001
  - FAIL STATE-P008-05 → PAGE-BROADCAST-001
  - FAIL STATE-P008-06 → PAGE-BROADCAST-001
  - FAIL STATE-P008-07 → PAGE-BROADCAST-001
  - FAIL STATE-P008-08 → PAGE-BROADCAST-001

**Related**
  - ESP32-OBSERVER-001: no BLEToolkit-Observer fixture → BLOCKED_BY_FIXTURE for observer-dependent ops

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
| Runtime | PAGE-002 (log-redaction/bridge), PAGE-006 (OTA；codec+write-queue+session+reconnect DONE), PAGE-007 SESSION+RECONNECT DONE；PAGE-001 filter+display-name DONE |
| Page | PAGE-008 (broadcast composable owner) |
| Testability | TEST-BRIDGE-TS-001（Smart HID TS） |
| Metadata | PAGE-010 CLOSED |
| Landing | WEB-001 honesty PASS（无假下载） |
| Fixture/Hardware | PAGE-008 Observer → ESP32-OBSERVER-001 (BLOCKED) |

## Machine report

- `reports/target-vs-current/page-e4-v2.json`
- `.tmp/tp-g2-r2/page-results/`（gitignore）

## NOT EXECUTED

- Hardware E5 / adb / 真机 BLE
- Live UniApp URL（`TARGET_PAGE_BASE_URL` 未设置）
