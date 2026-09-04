# 微信真机执行模板（TEST-W-001..010 / E5）

> 状态：模板（TP-G1 交付；执行发生在 TP-G4+ 真机 Gate；Windows Mobile V1 轮已按 §7.1 修订）
> Owner：Smart BLE QA；最低环境：正式 AppID 体验版/正式版、稳定基础库版本、Android 微信真机（iOS 真机缺位时相应用例标 NOT_RUN_DEVICE_MISSING，不得从 Android 推导 iOS PASS）
> 夹具规则：只有一块 ESP32 时 Peripheral/Observer 分轮烧录，不同时承担两种角色

## 执行前检查

- [ ] 使用正式 AppID（非测试号）；基础库版本记录
- [ ] 开发者工具仅用于预检（最多 E4，不得记 E5）
- [ ] 权限基线：未授权定位/蓝牙

## 用例组（对齐 09 号矩阵）

| 组 | 覆盖 | 关键断言 |
|---|---|---|
| 权限（含定位） | TEST-W-001/004 | 能力驱动最小申请（DEC-003）；拒绝恢复 |
| 导航/生命周期 | TEST-W-002/003 | 四 Tab；hide 停扫；P004 不可达（已删除） |
| 蓝牙开关/降级 | TEST-W-005/006 | S-04；不支持环境降级文案 |
| 扫描/GATT | TEST-W-007 | **5 秒扫描会话**；名称链；读写订阅 |
| 会话/日志导出 | TEST-W-008 | 统一断开；**日志导出为剪贴板复制，不是文件流**（微信侧无文件导出口径） |
| 多设备/广播 | TEST-W-009 | C3 supported_foreground 口径；Peripheral API 能力差异；**缺第二 BLE 外设时双设备项标 PARTIAL/BLOCKED_FIXTURE**；无真实 Smart HID 固件时 Smart HID E5 标 BLOCKED_HARDWARE |
| Smart HID/分享 | TEST-W-010 | 配网闭环（需真实固件+ControlHub，否则 BLOCKED_HARDWARE）；分享卡片跳转 |

## 证据与清理

- 录屏 + 真机截图 + vConsole/snip 日志；Observer JSON 为广播正式证据
- 结束后断开、退订（P004 历史/F023 已删除：**不测试历史/TTL/清历史**）

## 退出条件

同 Android 模板；平台差异项回填 08 号矩阵。
