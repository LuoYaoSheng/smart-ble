# 05 Integration / Fake Runtime 测试规范（TEST-I-001..010 / E2）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：调用顺序、并发去重、超时、取消、资源释放——在可脚本化假平台上。
不负责：真实权限/BLE 栈/硬件（→E5）。Fake 证据不得冒充 E5。

## 2. Fake Platform（tests/target/lib/fake-runtime.mjs）

经 ble-runtime 自带平台缝 `setBlePlatformForTesting` 注入：调用日志（顺序断言）、事件注入（found/conn/value/adapter）、故障脚本（failNext）、连接表、notify 状态表。同一 data URL 模块实例在依赖图间共享（scan-permission→runtime 同实例验证装配可行）。

## 3. 文件 → 断言域

| 文件 | 覆盖 |
|---|---|
| scan-runtime | start/stop/两轮重置/迟到不混/顺序 open→start→stop→start |
| permission-flow | wx 注入授权链（getSetting/authorize/openSetting） |
| connection-runtime | 并发同 device 单 attempt、主动断开不重连、失败无半开 |
| service-discovery | 发现失败关闭半开（当前实现缺口已记录） |
| read-write-runtime | 写到达平台、写/读失败显式 reject、超时清理 |
| notify-routing | tuple 隔离（同 UUID 双设备不串）、退订双动作、DEC-017 toggle |
| multi-device | 断 A 不影响 B、快照可观测 |
| lifecycle-cleanup | 计时器泄漏参照、监听摘除、start/stop 成对 |
| peripheral-owner | S-41 活动连接守卫、平台注入控制器 |
| ota-transaction | 十步正典、CTRL start 到平台、错包不进事务 |
| smart-hid-provision | waiter 先注册、connectProfileSession→分帧写入到达平台 |
| smart-hid-session-ownership | READY 释放、PAGE-007 配网排除口径（缺口已记录） |

## 4. 初跑结论（27 用例：25 PASS / 2 FAIL）

FAIL=诚实差距：connectDevice 不编排服务发现（ERR-CONN-03 半开泄漏面）；Registry 无配网会话分类接口（PAGE-007 口径无法排除）。

## 5. 退出条件

同 04；真实模块在 FakePlatform 上的行为差异以第一断点记录，不修实现。
