# 微信小程序逐页功能复核与修复总表

> 日期：2026-08-21。证据：E1 静态代码、E2 Node 单测/SFC/HBuilderX 编译。微信开发者工具交互与 BLE 真机仍为 E3/E4 待验收。

## 页面结论

| 页面 | 核心功能 | 发现的问题 | 本批处理 | 当前状态 |
|---|---|---|---|---|
| P001 通用扫描 | 适配器、连续扫描、过滤、广播详情、连接入口 | 启停竞态、错误伪装为空、页面直接注册全局回调、广播字段缺失；首屏被营销说明和筛选占据 | ScanSession 控制器、结构化结果、Runtime adapter listener、AdvertisementSnapshot、连接前 await stop；改为数据列表优先，筛选折叠 | 🟡 E2；待两轮真机扫描 |
| P005 通用设备详情 | 连接、服务发现、读写、notify、OTA、日志 | 参数缺失无退出；离页关闭后 Store 仍显示连接；重连 timer 泄漏；UTF-8 写入按 UTF-16 截断 | 参数失败返回；离页同步连接状态；清 timer；统一 UTF-8 codec；连接发现失败清半开连接 | 🟡 E2；待 GATT 真机 |
| P002 Smart HID 首页 | 搜索、选择、连接入口、非敏感历史 | “免二维码”与实际扫码冲突；历史未持久化；用户不知道如何搜索和连接 | 改为“蓝牙配网与维护”；首页直接给出三步流程、搜索结果、匹配等级和继续连接；最多持久化 20 条非敏感元数据 | 🟡 E2；待真机搜索/连接 |
| P003 Smart HID 配网 | 扫描、Profile 验证、扫码、Wi-Fi、下发、状态恢复 | 复用扫描失败时无法区分空结果；“USB HID 就绪”超出 BLE 证据 | 使用 owner=`smart-hid` ScanSession 并检查 result.ok；文案改“设备控制链路就绪” | 🟡 协议单测通过；待真机 |
| P004 Smart HID 详情 | 历史资料、重配、诊断、高级调试 | 展示协议不存在的 hardware；无效 deviceId 仍显示其它当前设备；高级入口只有 toast | 删除 hardware；严格按 ID；无记录退出；高级入口 switchTab | 🟡 E2 |
| P006 Smart HID 诊断 | 读取 Info/Status 并解释 | 依赖旧内存 session；历史入口必然常失败；把 ready 当 USB HID 已验证 | 无 session 时允许尝试按 ID 重连，失败说明进入配网/恢复模式；“设备 Ready”不冒充 USB 真机验收 | 🟡 待设备可发现态真机 |
| P007 创建广播 | capability、参数、开始/停止、日志 | 页面退出关闭全局 adapter，影响其它页面；tab hide 后广播继续 | hide 时停止；unload 关闭 peripheral server 但不关闭全局 adapter | 🟡 待微信/原生真机 |
| P008 关于 | 版本、平台、分享、其它应用、图片 | 新资源未进入旧 dist；图片失败没有 fallback；开发版显示错误版本 | image error fallback；fallback 版本 1.0.4；HBuilderX clean compile 后 5 项资源存在 | ⚠️ E2 编译通过；待页面截图 |
| P009 版本记录 | 展示历史与分享 | 静态历史没有反映当前未发布修复；旧视觉体系 | 不伪造已发布版本，本批不追加 release 记录 | 🟡 E1；发布时更新 |

## 合并问题清单

| ID | 严重度 | 问题 | 处理状态 |
|---|---|---|---|
| BLE-001 | P0 | 停止发生在 adapter opening 时可形成孤儿扫描 | 已修，自动测试覆盖 |
| BLE-002 | P0 | 第二轮扫描与上一轮 stop 没有统一 session 语义 | 已修，独立 sessionId/串行化测试覆盖 |
| BLE-003 | P0 | 扫描 API 失败被表现为空结果 | 已修，`result.ok/error` 保留 |
| BLE-004 | P1 | 广播只显示 raw/service UUID，无法看 manufacturer/service data | 已修，跨形态 Snapshot 单测覆盖 |
| BLE-005 | P1 | 页面直接持有 adapter-state 全局回调 | 已修，转入 Runtime |
| BLE-006 | P1 | 连接服务发现失败留下半开连接 | 已修，失败立即 close，单测覆盖 |
| BLE-007 | P1 | 本地主动断开标记可能长期污染后续 session | 已修，2 秒有界 marker |
| PAGE-001 | P1 | 广播页 unload 关闭全局蓝牙 adapter | 已修 |
| PAGE-002 | P1 | connected 列表包含已断开的设备 | 已修，仅筛 `isConnected` |
| PAGE-003 | P1 | Smart HID 历史名义存在但进程重启丢失 | 已修，仅存非敏感元数据 |
| PAGE-004 | P1 | Smart HID 诊断无重连路径 | 已增加显式尝试连接与恢复提示 |
| PAGE-005 | P1 | 关于页资源源码/微信产物漂移 | 已重新编译，并新增源码资源门禁 |
| PAGE-006 | P2 | 文案声称免二维码/USB HID 已就绪 | 已按真实能力收敛 |
| TEST-001 | P1 | 无连续扫描与广播归一化测试 | 已新增 `scan-session`、`advertisement` 单测并接 CI |

## 仍未关闭

1. 微信开发者工具连续两轮扫描需要 E3 证据。
2. Android/iOS 微信真机需要分别验证扫描、广播字段、权限拒绝、前后台切换。
3. GATT read/write/notify、OTA、微信 peripheral 广播需要真机验证。
4. 全量页面 i18n 仍未完成；不影响核心闭环，但属于 P2。
5. 各原生/桌面端仍未真正实现统一 `IBLEAdapter`，跨平台正典目前是目标架构，不是现状声明。
