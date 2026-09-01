# 10 Smart HID 端到端测试矩阵（TEST-H-001..008 / E5）

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

## 1. 范围 / 非范围

负责：Smart HID 第一方 Profile 的真机端到端（App+设备+ControlHub）。模板：tests/target/hardware/smart-hid-run-template.md。
不负责：通用 BLE（08/09 号）；MQTT 协议细节（hid-command-schema 正典）。

## 2. 固定版本铁律

设备固件固定 commit+firmware SHA；ControlHub 固定 version；配对 token 用明显测试值（12 号）。

## 3. 矩阵

| 行 | 覆盖 | 关键断言 |
|---|---|---|
| H-001 匹配/身份 | REQ-047 | 服务 UUID+名称前缀强匹配；仅 UUID 弱匹配→二次身份确认页 |
| H-002 配网主路径 | REQ-048/050/051 | 连接→表单→（可选 QR）→分帧（17B/块@MTU23）→waiter→四步进度→READY |
| H-003 八类错误 | REQ-049 | ERR-HID-01..08 逐类注入；每类唯一恢复动作；token/密码不落日志与截图 |
| H-004 历史/详情/移除 | REQ-052/065 | 快照≠在线声明（S-19/S-21）；移除仅本机；90 天 TTL 实测（改设备时间或注入旧记录） |
| H-005 诊断/所有权 | REQ-053 | 五项实时（Pending≠OK）；owned 离页断开、borrowed 离页不动 |
| H-006 重配移交 | REQ-053 | borrowed→owned 移交；移交后原入口不可再操作 |
| H-007 边界矩阵 | — | 超长 SSID/密码边界；弱网重试；Hub 不可达恢复 |
| H-008 微信侧 | FLOW-010 | 与 Android 同语义真机复跑 |

## 4. ControlHub/MQTT/USB HID

配网成功后经 ControlHub 下发一次 HID 动作验证 READY 真实性（不是仅 App 状态）。

## 5. 退出条件

8 行全结论；错误类恢复动作与 13 号契约一致；敏感值零泄漏（证据包扫描）。
