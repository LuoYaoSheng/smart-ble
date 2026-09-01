# PAGE E4 差距报告（TP-G2-R2）

```yaml
status: REVIEW
gate: TP-G2-R2
environment: READY_FOR_PAGE_E4
fake_runtime: true
live_app_url: false
generated_at: 2026-09-01T11:29:15.909Z
```

> **原则**：Playwright Fake Runtime harness PASS ≠ 产品实现满足目标。
> 本报告在 E4 可执行前提下，用静态实现 + Current FAIL 证据给出产品 PASS/FAIL/BLOCKED/NOT_IMPLEMENTED。
> 本轮 **Runtime filter（RUNTIME-FILTER-001）已落地**；未修改 PAGE Vue / ESP32 / OTA / Session / Log-redaction。

## Summary

| Page | Product | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | Primary Fix |
|---|---|---|---|---|---|---|
| PAGE-001 | FAIL | 0 | 0 | 0 | 30 | RUNTIME-DISPLAY-NAME-001 |
| PAGE-002 | FAIL | 0 | 0 | 0 | 29 | RUNTIME-LOG-REDACTION-001 |
| PAGE-003 | PASS | 12 | 0 | 0 | 0 | — |
| PAGE-004 | PASS | 14 | 0 | 0 | 0 | — |
| PAGE-005 | PASS | 18 | 0 | 0 | 0 | — |
| PAGE-006 | FAIL | 0 | 30 | 0 | 0 | RUNTIME-GATT-CODEC-001 |
| PAGE-007 | FAIL | 0 | 14 | 0 | 0 | RUNTIME-SESSION-001 |
| PAGE-008 | FAIL | 0 | 23 | 2 | 0 | PAGE-BROADCAST-001 |
| PAGE-009 | PASS | 20 | 0 | 0 | 0 | — |
| PAGE-010 | PASS | 13 | 0 | 0 | 0 | — |
| WEB-001 | PASS | 25 | 0 | 0 | 0 | — |

### Totals（case 级）

| Status | Count |
|---|---|
| PASS | 102 |
| FAIL | 67 |
| BLOCKED | 2 |
| NOT_IMPLEMENTED | 59 |
| Harness PASS | 230 |
| Harness FAIL | 0 |

## Top First Breakpoints

1. **PAGE-001** → `apps/uniapp/services/ble-runtime/display-name.js` `(missing)` — display-name module missing (RUNTIME-FILTER-001 CLOSED) *(RUNTIME-DISPLAY-NAME-001 / TEST-U-006 / FEAT-013)*
2. **PAGE-002** → `apps/uniapp/services/ble-runtime/log-redaction.js` `(missing)` — log-redaction module missing; HID provision path shares REQ-036/050 *(RUNTIME-LOG-REDACTION-001 / TEST-U-013 / FEAT-040)*
3. **PAGE-006** → `apps/uniapp/pages/device/detail.vue` `validateHexInput/parseHexInput` — HEX write codec helpers missing *(RUNTIME-GATT-CODEC-001 / TEST-U-010 / FEAT-028)*
4. **PAGE-007** → `apps/uniapp/services/ble-runtime/index.js` `Registry` — no provisioning-session classify/exclude API for PAGE-007 list *(RUNTIME-SESSION-001 / TEST-I-009 / REQ-053)*
5. **PAGE-008** → `apps/uniapp/pages/broadcast/index.vue` `(inline advertising)` — page does not use useBroadcastSession composable/owner *(PAGE-BROADCAST-001 / TEST-P-008 / FEAT-041)*

## Static Facts（本轮探测）

```json
{
  "hasLogRedaction": false,
  "hasWriteQueue": false,
  "hasReconnect": false,
  "hasDisplayName": false,
  "hasValidateHex": false,
  "broadcastUsesComposable": false,
  "versionUsesModel": true,
  "landingFake": false,
  "connectDiscovers": true,
  "scanAutoStop5": true,
  "hasObserver": false,
  "filterHasKeywordMatch": true,
  "registrySubCount": false
}
```

## Pages

### PAGE-001

- **Product**: FAIL
- **Target**: `docs/target-product/pages|web` + behavior states=10 ops=14
- **Actual (E4 harness)**: Fake Runtime PASS=30 FAIL=0
- **Actual (product)**: RUNTIME-FILTER-001 DONE（keyword 跨字段命中）；PAGE-001 仍受 display-name / 扫描时长等断点影响
- **Case tallies**: PASS=0 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=30
- **Root Cause**: RC-DISPLAY-NAME
- **Fix IDs**: RUNTIME-DISPLAY-NAME-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/services/ble-runtime/display-name.js` / `(missing)` — display-name module missing (RUNTIME-FILTER-001 CLOSED)
- Target: FEAT-013 · Test: TEST-U-006

**Fail / Blocked samples**
  - NOT_IMPLEMENTED STATE-P001-01 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-02 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-03 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-04 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-05 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-06 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-07 → RUNTIME-DISPLAY-NAME-001
  - NOT_IMPLEMENTED STATE-P001-08 → RUNTIME-DISPLAY-NAME-001

**Related**
  - note: scan auto-stop is 5s; target DEC-013 default 10s (apps/uniapp/composables/use-ble-scan.js)

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
- **Actual (product)**: device/detail 存在；GATT/OTA/重连断点导致产品 FAIL
- **Case tallies**: PASS=0 FAIL=30 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: RC-GATT-HEX
- **Fix IDs**: RUNTIME-GATT-CODEC-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/pages/device/detail.vue` / `validateHexInput/parseHexInput` — HEX write codec helpers missing
- Target: FEAT-028 · Test: TEST-U-010

**Fail / Blocked samples**
  - FAIL STATE-P006-01 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-02 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-03 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-04 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-05 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-06 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-07 → RUNTIME-GATT-CODEC-001
  - FAIL STATE-P006-08 → RUNTIME-GATT-CODEC-001

**Related**
  - RUNTIME-WRITE-QUEUE-001: module missing (apps/uniapp/services/ble-runtime/write-queue.js)
  - RUNTIME-RECONNECT-001: module missing (apps/uniapp/services/ble-runtime/reconnect-policy.js)
  - OTA-CLIENT-001: CTRL start before DATA / validateOtaPackage (TEST-I-008) (apps/uniapp/utils/ota_manager.js)
  - RUNTIME-CONNECTION-DISCOVERY-001: TEST-I-003 asserts discover orchestration gap (semi-open risk) (apps/uniapp/services/ble-runtime/index.js)

### PAGE-007

- **Product**: FAIL
- **Target**: `docs/target-product/pages|web` + behavior states=3 ops=5
- **Actual (E4 harness)**: Fake Runtime PASS=14 FAIL=0
- **Actual (product)**: connected/index 存在；Session 口径未对齐
- **Case tallies**: PASS=0 FAIL=14 BLOCKED=0 NOT_IMPLEMENTED=0
- **Root Cause**: RC-SESSION-REGISTRY
- **Fix IDs**: RUNTIME-SESSION-001（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）

- **First Breakpoint**: `apps/uniapp/services/ble-runtime/index.js` / `Registry` — no provisioning-session classify/exclude API for PAGE-007 list
- Target: REQ-053 · Test: TEST-I-009

**Fail / Blocked samples**
  - FAIL STATE-P007-01 → RUNTIME-SESSION-001
  - FAIL STATE-P007-02 → RUNTIME-SESSION-001
  - FAIL STATE-P007-03 → RUNTIME-SESSION-001
  - FAIL OP-P007-01 → RUNTIME-SESSION-001
  - FAIL OP-P007-02 → RUNTIME-SESSION-001
  - FAIL OP-P007-03 → RUNTIME-SESSION-001
  - FAIL OP-P007-04 → RUNTIME-SESSION-001
  - FAIL OP-P007-05 → RUNTIME-SESSION-001

**Related**
  - RUNTIME-SESSION-001: subscription_count missing (TEST-U-005 / DEC-017)

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
| Runtime | PAGE-001 (display-name；filter DONE), PAGE-002 (log-redaction/bridge), PAGE-006 (GATT/write-queue/reconnect/OTA/discovery), PAGE-007 (session) |
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
