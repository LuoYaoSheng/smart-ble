# 14 可观测性、日志与证据

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / QA
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：App 与固件的可观测目标（日志分类、事件、关联 ID、脱敏、容量）、证据包类别（EVID-001~008）与格式。

本文不负责：测试规范（`docs/target-tests/`）；错误码登记（`07`）。

---

## 2. App 日志体系

### 2.1 分类

| 类别 | 内容 | 落点 | 上报 |
|---|---|---|---|
| 通信日志（DATA-005） | 按设备读写/推送/错误 | 内存+页面 | 无（本地） |
| 运行日志 | Runtime 事件（generation/attempt/session 生命周期、stale 丢弃、清理结果） | 内存环形（全局 500 条） | 无 |
| 页面日志 | 广播页操作日志 | 页面 | 无 |

**本产品无云端日志上报**（无账号无云，SEC-008）；诊断靠导出与证据包。

### 2.2 关联 ID

- 每条通信日志携带 `opId`（触发操作的 OP ID）或 request 序号；
- Runtime 事件携带 `generation` / `attemptId` / `sessionId` / `tuple`；
- 证据包内所有条目带 `runId`（一次测试运行的统一 ID）。

### 2.3 容量与保留

通信日志 200 条/设备；运行日志 500 条全局；页面日志 100 条；导出即全文（含设备与版本头）。

### 2.4 脱敏（写入与导出双段）

规则表（命中即替换 `***`）：Wi-Fi 密码字段值；32 位 hex token 模式（Smart HID token/密钥类）；`mqtt_` 前缀字段；URL query 中的 token；用户输入的广播 payload 中与密码相同的串（少见，按字段值规则）。截图入证据前人工+脚本双检（TEST-R-004）。

## 3. 固件可观测（LightBLE）

- 串口 JSON 流（PROTO-009）：adv/conn/disc/led/notify/ota/err 七类事件；
- 每事件含时间戳与错误码（不只自然语言）；
- Observer 流：手机广播的完整观测记录（正式证据源）；
- 串口仅本地：无网络上报。

## 4. 证据包类别

| ID | 类别 | 内容 | 产生阶段 |
|---|---|---|---|
| EVID-001 | Android E5 | 环境、录屏、App 日志导出、截图 | TP-G4 |
| EVID-002 | 微信 E5 | 同上（微信版） | TP-G4 |
| EVID-003 | ESP32 Peripheral E5 | 固件版本/SHA、串口日志、App 双端对照 | TP-G4 |
| EVID-004 | ESP32 Observer E5 | Observer 串口流与 payload 对照表 | TP-G4 |
| EVID-005 | Smart HID E2E E5 | 配网/错误/诊断/重配录屏+设备状态 | TP-G4 |
| EVID-006 | OTA E5 | 双端进度、success、版本回读读数 | TP-G4 |
| EVID-007 | Release E6 | Metadata、产物 SHA、下载/安装/链接矩阵 | TP-G5 |
| EVID-008 | 复现/烟测 | 独立电脑复现记录、发布后烟测 | TP-G5/G6 |

## 5. 证据包格式（目标）

```text
evidence/<gate>/<runId>/
├── environment.md        # 设备/系统/版本/权限初始态/固件版本/测试人
├── manifest.json         # runId、目标 ID 清单、结果矩阵、证据文件索引
├── logs/                 # App 导出、串口日志（脱敏后）
├── media/                # 截图/录屏（脱敏后）
└── result-matrix.md      # 每 Target ID → PASS/FAIL/BLOCKED + 第一断点
```

规则：无 environment.md 与 manifest.json 的证据无效；结果矩阵必须引用目标 ID（不允许"都好"式结论）；敏感数据零容忍（TEST-R-004 抽查+人工复核）。

## 6. 第一断点记录

每个 FAIL 必须记录：Target ID、操作/用例、预期、实际、**第一断点**（模块/调用/状态最早偏离处）、平台、版本、复现步骤、关联日志/媒体。用于修复排序（TP-G2/G3）。

## 7. 验收条件与关联测试规划

- 三类日志有分类/容量/关联 ID/脱敏；
- 八类证据包有格式与产生阶段；
- 第一断点字段定义。

关联计划测试：`TEST-U-013`（脱敏纯函数）、`TEST-I-001`（日志生命周期）、`TEST-R-004`（证据脱敏与 manifest 完整性）。
