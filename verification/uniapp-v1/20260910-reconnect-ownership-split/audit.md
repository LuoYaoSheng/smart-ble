# U-REC-001 双层竞争重连销案（uniapp F012 所有权收口）

日期：2026-09-10 · 线别：uniapp（U-WX/U-AND 共码基） · 触发源：iOS F012 退避对齐（05f7574）期间发现的同族缺陷

## 结论

uniapp 设备页（pages/device/detail.vue）被动断线时存在**双层竞争重连**：页面 composable 自建 2s/4s/6s 重连环，与 ble-runtime reconnect-manager（契约 1s/3s/5s）在同一断链事件上并发排程。已按契约收口：**被动断线重连归 runtime 独占，页面经 subscribeConnectionState 感知恢复/耗尽**。单测 6/6 + mp-weixin 构建绿。真无线电复测待 ESP32 夹具。

## 缺陷家族

| # | 缺陷 | 契约依据 |
|---|---|---|
| D1 | 被动断线双环：composable `session.onDisconnect → retryConnection`（2/4/6）与 `handlePassiveDisconnect → scheduleReconnect`（1/3/5）并发；尝试预算翻倍（最多 6 次 vs 契约 3 次）、页面「重连次数达上限」与 runtime 实际状态矛盾、日志承诺的退避与真实排程不符 | API_SPEC §13 所有权冻结 + C-8（重连 1s/3s/5s ×3 归 runtime） |
| D2 | 页面 2/4/6 常数错族：n×2s 是 **connect 命令重试**的契约常数，被误用于被动断线重连场景 | API_SPEC §7 connect「自动重试 3 次退避 n×2s」 vs C-8 |
| D3 | 初始化失败路径：composable 直接调 `openAdapter` 绕过 store 的 1s/2s/4s 契约重试，失败后用 2/4/6 去重试 **connect**（适配器未开，重试必败） | API_SPEC §6 initialize「指数退避重试 3 次（1s/2s/4s）」 |
| D4 | runtime 重连成功无页面回传：store registry 只同步断开，重连成功后页面仍显示断开（此前被 D1 的重复环掩盖） | API_SPEC §7 subscribeConnectionState（F006/F012，契约方法此前未实现） |
| D5 | （测试发现）`index.js` 模块级捕获 registry 单例 const，`resetBleRuntimeForTesting()` 后静默持有死实例 | 测试基建正确性 |

## 变更

| 文件 | 变更 |
|---|---|
| services/ble-runtime/session-registry.js | 通用层新增 `subscribe(listener)`（created/updated/removed 快照事件，订阅方异常不穿透）；reset 清订阅 |
| services/ble-runtime/index.js | 实现契约方法 `subscribeConnectionState`（重复注册去重、可退订）；导出 `getRuntimeSession`；D5：registry 改 let + reset 后重绑 |
| composables/use-device-session.js | 被动断线撤自环（计数归零、日志改「将自动重连（最多 3 次）」）；订阅 runtime 状态：READY→重绑会话+「自动重连成功」，EXHAUSTED→面板 error 态；connect 失败重试钉 `CONNECT_RETRY_DELAYS_MS=[2000,4000,6000]`（§7 n×2s）并仅用于连接失败；初始化失败改 `ADAPTER_INIT_RETRY_DELAYS_MS=[1000,2000,4000]`（§6）后报错，不再重试 doomed connect |
| services/ble-runtime/__tests__/reconnect-ownership.test.js | 新增（本线首个服务层单测）：C-8 常量/策略、manager 独占排期与耗尽、registry subscribe、subscribeConnectionState 去重/退订、getRuntimeSession |

不变：store 扫描路径 `_openAdapterWithRetry`（本就契约正确）；HID provisioning 断链 watch（只更新状态，无自环）；Flutter 线 FEAT-F-005（Windows 会话辖域，M3 待修）。

## 验证

- 单测：`node --test services/ble-runtime/__tests__/reconnect-ownership.test.js` → **6/6 PASS**（node v24.12.0，模块语法自动检测，无需 flag）→ node-unit.log
- 构建：`npm run build:mp-weixin` → **DONE Build complete**（node:crypto 外部化警告为 ota/package-validator 既有，无关）→ build-mp-weixin.log

## 诚实口径

本销案为**代码级 + 单测级**：契约常数与所有权已钉死并有断言防护；真实无线电断链场景（UIS-18 类）需 ESP32 夹具回填，未测不记 PASS。

## 复现

```bash
cd apps/uniapp
node --test services/ble-runtime/__tests__/reconnect-ownership.test.js
npm run build:mp-weixin
```
