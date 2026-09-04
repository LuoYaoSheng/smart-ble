# Smart HID 端到端执行模板（TEST-H-001..008 / E5）

> 状态：模板（Windows Mobile V1 轮已按 §7.1 修订）；Owner：Smart BLE QA；环境：Smart HID 设备（固定 commit + firmware SHA）、ControlHub（固定版本）、真机 App/小程序
> 前置判定：**没有真实 Smart HID 固件或 ControlHub 时，E1–E4（页面/协议/状态/自动化）可执行，E5 一律标 `BLOCKED_HARDWARE`**；普通 LightBLE ESP32 夹具不得冒充 Smart HID 完成 E5

## 用例组（对齐 10 号矩阵）

| 组 | 覆盖 | 关键断言 |
|---|---|---|
| 匹配/身份 | TEST-H-001 | 强/弱匹配；二次身份确认 |
| 配网主路径 | TEST-H-002 | 连接→表单→QR→分帧→四步→READY |
| 八类错误 | TEST-H-003 | 每类唯一恢复动作；token 不泄露 |
| 详情/移除 | TEST-H-004 | 快照≠在线声明；移除释放（P004 历史/F023 已删除：**不测试历史/TTL/清历史**） |
| 诊断/所有权 | TEST-H-005 | 五项实时；owned/borrowed 离页行为 |
| 重配移交 | TEST-H-006 | borrowed→owned 移交语义 |
| 边界矩阵 | TEST-H-007 | 超长输入/弱网/重试耗尽 |
| 微信侧 | TEST-H-008 | 与 Android 同语义（三实现线 U-WX/U-AND/F-AND 同语义） |

## 固定版本

- 设备固件 commit+SHA、ControlHub version 记录入证据包

## 清理

- READY 后确认连接释放；MQTT/USB HID 结果按客观证据记录（缺硬件标 BLOCKED_HARDWARE）
