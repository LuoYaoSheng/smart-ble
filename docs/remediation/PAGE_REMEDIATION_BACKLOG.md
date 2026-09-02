# 页面修复 Backlog（TP-G2-R2 由 E4 实跑重排）

```yaml
status: REVIEW
gate: TP-G2-R2
source: reports/target-vs-current/page-e4-v2.json
```

> 本轮 **只重排**，不执行 Fix。
> Fake Runtime harness PASS 不关闭产品差距。

## 优先级（由真实 E4 + Current FAIL 推导）

| Priority | Page | Task | Rationale |
|---|---|---|---|
| P0 | PAGE-006 | `OTA-CLIENT-001` | OTA CTRL/包校验断点阻断详情页升级路径；依赖 OTA-PACKAGE-001 |
| P1 | PAGE-006 | `RUNTIME-RECONNECT-001` | DONE |
| P1 | PAGE-006 | `RUNTIME-CONNECTION-DISCOVERY-001` | connectDevice 发现编排（TEST-I-003） |
| P3 | PAGE-001 | `—` | RUNTIME-FILTER/DISPLAY-NAME DONE；DEC-013 时长观察 |
| P3 | PAGE-007 | `—` | RUNTIME-SESSION-001 + RUNTIME-RECONNECT-001 DONE |
| P1 | PAGE-002 | `RUNTIME-LOG-REDACTION-001` | DONE |
| P1 | PAGE-002 | `TEST-BRIDGE-TS-001` | Smart HID TS protocol 桥 |
| P1 | PAGE-008 | `PAGE-BROADCAST-001` | 广播页改用 useBroadcastSession |
| P1 | PAGE-008 | `ESP32-OBSERVER-001` | Observer fixture；页面测记 BLOCKED_BY_FIXTURE |

## 依赖提示

- PAGE-006 产品 FAIL → Codec + Write Queue + Session + Reconnect **DONE**；剩余 OTA / CONNECTION-DISCOVERY
- PAGE-001 → RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 **DONE**
- PAGE-007 → RUNTIME-SESSION-001 + RUNTIME-RECONNECT-001 **DONE**
- PAGE-002 → RUNTIME-LOG-REDACTION-001；Smart HID 协议桥 → TEST-BRIDGE-TS-001
- PAGE-008 → PAGE-BROADCAST-001；Observer 验证 → ESP32-OBSERVER-001（BLOCKED 直至 fixture）
- PAGE-003/004/005/009/010/WEB-001：本轮产品 PASS 或无新 PAGE_FIX；保持观察

## 每页摘要

### PAGE-001

- 产品结论：**PASS**
- E4 case：PASS=30 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 DONE；E4 harness PASS；DEC-013 时长差异记观察
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-002

- 产品结论：**PASS**
- E4 case：PASS=29 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：RUNTIME-LOG-REDACTION-001 DONE；logger/log-redaction + createLogger 接入 ble-runtime/ota/smart-hid；日志安全 PASS
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-003

- 产品结论：**PASS**
- E4 case：PASS=12 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：hid/detail 页面存在；无独立 CURRENT_FAIL 挂载；E4 Fake PASS；控件级静态未全量确认但无确定 FAIL 证据
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-004

- 产品结论：**PASS**
- E4 case：PASS=14 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：hid/history 为历史唯一管理面；静态 CONFIRMED_IMPLEMENTED
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-005

- 产品结论：**PASS**
- E4 case：PASS=18 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：hid/diagnostics 存在；无独立 FAIL 证据
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-006

- 产品结论：**PASS**
- E4 case：PASS=30 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：RUNTIME-GATT-CODEC + WRITE-QUEUE + SESSION + RECONNECT + OTA + CONNECTION-DISCOVERY DONE
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-007

- 产品结论：**PASS**
- E4 case：PASS=14 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：RUNTIME-SESSION-001 + RUNTIME-RECONNECT-001 DONE；E4 harness PASS
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-008

- 产品结论：**FAIL**
- E4 case：PASS=0 FAIL=25 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`PAGE-BROADCAST-001`（root=RC-PAGE-BROADCAST）
- 说明：广播页 CONFIRMED_PARTIAL；Observer 缺失记 BLOCKED 而非页面产品 FAIL
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-009

- 产品结论：**PASS**
- E4 case：PASS=20 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：about/index 消费 getVersionPageModel；链接区存在
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### PAGE-010

- 产品结论：**PASS**
- E4 case：PASS=13 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：version.vue → getVersionPageModel；无 versionHistory；RC-PAGE-VERSION CLOSED
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）

### WEB-001

- 产品结论：**PASS**
- E4 case：PASS=25 FAIL=0 BLOCKED=0 NOT_IMPLEMENTED=0
- 主 Fix：`—`（root=—）
- 说明：Landing PREVIEW/NOT_RELEASED 诚实；无 releases/latest。旧 AUTOMATED_FAIL 来自共享 log-redaction 证据，不记为 Landing 产品 FAIL
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）


## 明确不创建的错误 Task

| 错误 | 正确 |
|---|---|
| PAGE-WRITE-001 | RUNTIME-GATT-CODEC-001 / RUNTIME-WRITE-QUEUE-001 |
| PAGE-SCAN-FILTER-001 | RUNTIME-FILTER-001 |
| PAGE-SESSION-001 | RUNTIME-SESSION-001 **DONE** |
| PAGE-OTA-001 | OTA-CLIENT-001 |
| PAGE-OBSERVER-001 | ESP32-OBSERVER-001 |
