# Smart HID 端到端执行模板（TEST-H-001..008 / E5）

> 状态：模板；Owner：Smart BLE QA；环境：Smart HID 设备（固定 commit + firmware SHA）、ControlHub（固定版本）、真机 App/小程序

## 用例组（对齐 10 号矩阵）

| 组 | 覆盖 | 关键断言 |
|---|---|---|
| 匹配/身份 | TEST-H-001 | 强/弱匹配；二次身份确认 |
| 配网主路径 | TEST-H-002 | 连接→表单→QR→分帧→四步→READY |
| 八类错误 | TEST-H-003 | 每类唯一恢复动作；token 不泄露 |
| 历史/详情/移除 | TEST-H-004 | 90 天 TTL；快照≠在线声明 |
| 诊断/所有权 | TEST-H-005 | 五项实时；owned/borrowed 离页行为 |
| 重配移交 | TEST-H-006 | borrowed→owned 移交语义 |
| 边界矩阵 | TEST-H-007 | 超长输入/弱网/重试耗尽 |
| 微信侧 | TEST-H-008 | 与 Android 同语义 |

## 固定版本

- 设备固件 commit+SHA、ControlHub version 记录入证据包

## 清理

- READY 后确认连接释放；历史按用例要求保留/清理
