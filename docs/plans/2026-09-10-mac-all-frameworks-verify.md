# Mac 端全框架功能验证与修复计划（2026-09-10）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 Mac 端全部可测框架线（N-MAC / F-MAC / Electron / Tauri）逐线完成「构建 + 自动化测试 + 真实启动冒烟」，修复发现的问题，产出功能列表×结果记分与证据落盘。

**Architecture:** 四线分两类验收口径——规范线（N-MAC、F-MAC）按 `docs/specs/` P001–P010 正典验收；工具线（Electron、Tauri）按 BLE Toolkit 功能面（扫描/连接/GATT/读写/Notify/日志/OTA 对话框）验收。Avalonia（.NET）因本机无 dotnet 属 Windows 原型线，登记不可测。

**Tech Stack:** Swift 5.9 + AppKit + CoreBluetooth（N-MAC）；Flutter 3.38.5 + flutter_blue_plus（F-MAC）；Electron 27 + @abandonware/noble；Tauri 1.5 + Rust btleplug。

## Global Constraints

- 本机 macOS darwin 25.5.0 arm64；工具链固定值见 `verification/build-baseline/20260910/BUILD_MATRIX.md` §2（Tauri 用全局 npm @tauri-apps/cli@1.6.3）。
- **平台铁律（Phase 2 实证）**：本机中心收不到本机外设广播（无软夹具自环）；真扫描只能看到环境设备（iphone/midea/SHID-00000001 等）。
- **macOS 平台限制（如实降级，不算缺陷）**：Electron/noble 不支持本机 Peripheral 广播；Tauri/btleplug 广播不支持（README 口径）。
- 验证构建一律全量日志落盘再判读（管道吞退出码坑）。
- 提交纪律：逐文件 add、禁 `git add -A`；**只本地提交不推送**（领先提交待用户放行）。
- 不可测项如实登记（BLOCKED/NOT_RUN + 原因），不得以编译通过冒充运行验收。

## 功能列表（Mac 端验收范围）

### A. 规范线 — N-MAC（Swift AppKit，apps/desktop/macos/SmartBLE-mac）

| # | 功能 | 正典来源 |
|---|------|---------|
| A1 | P001 扫描：5s 会话/节流/去重/RSSI 排序/筛选/广播数据查看/显示名 fallback/Profile 识别 | F001/F003/F004/F005/F018 |
| A2 | P002 配网：shid://pair 解析（扫码+粘贴兜底）/framed-v1 分帧/8 错误码恢复/60s 状态跟踪 | F019–F022 |
| A3 | P003 HID 详情、P005 五项诊断 | F024 |
| A4 | P006 GATT：连接 8 态/服务树/特征读/写队列/Notify/通信日志 | F006–F011 |
| A5 | P007 已连接：多设备会话/批量断开/重连 3×(1s/3s/5s) | F012/F013 |
| A6 | P008 广播：启动/停止/31B 预算阻止 | F015/F016 |
| A7 | P009 关于 + P010 版本：Release Metadata 投影/系统分享 | F027/F029 |
| A8 | 横切：日志脱敏/零持久化/全中文/token 正典（design-tokens） | F026/存储策略/F030 |

### B. 规范线 — F-MAC（Flutter，apps/flutter，macOS 目标）

| # | 功能 | 说明 |
|---|------|------|
| B1 | 9 页齐备：device_list/device_detail/connected_devices/provisioning/hid_detail/hid_diagnostics/broadcast/about/versions | 2026-09-06 决策必须补齐 |
| B2 | 单元+widget 测试套件（flutter test）与 analyze | Makefile verify-flutter |
| B3 | macOS 构建链：debug 构建 + **Release 构建与沙盒 entitlements**（Phase 3 遗留） | Release.entitlements |
| B4 | 真实启动冒烟：app 启动/P001 真扫描/tab 导航 | 本轮新增 |

### C. 工具线 — Electron（apps/desktop/electron，noble 后端 + public/ Web 前端）

| # | 功能 | 说明 |
|---|------|------|
| C1 | 扫描 tab：FilterPanel 筛选/DeviceCard 列表/停止再扫 | noble macOS 中心可用 |
| C2 | 已连接 tab：连接/ServicePanel 服务树/读/写（WriteDialog）/Notify/LogPanel 六色日志 | |
| C3 | OTA 对话框（OtaDialog） | UI 层 |
| C4 | 广播 tab：macOS 应隐藏/降级（noble 限制） | 平台差异如实呈现 |
| C5 | 关于 tab + 打包（build:mac dmg） | ad-hoc 签名 |

### D. 工具线 — Tauri（apps/desktop/tauri，btleplug 后端 + 同源 Web 前端）

| # | 功能 | 说明 |
|---|------|------|
| D1 | Rust 后端 cargo check/test + tauri build 产物 | Makefile verify-tauri |
| D2 | 扫描/连接/GATT/读写/Notify/日志（Web 前端同 Electron） | |
| D3 | 广播：macOS 不支持（README 口径），UI 降级验证 | |
| D4 | 真实启动冒烟 | 本轮新增 |

### E. 不可测登记

- Avalonia（.NET 8）：本机无 dotnet，Windows 原型线 → Mac 端 NOT_RUN。

---

## Task 1: N-MAC 回归门禁（构建+单测+页面冒烟+token 钉子）

- [ ] `cd apps/desktop/macos/SmartBLE-mac && swift build 2>&1 | tee /tmp/nmac-build.log`（预期 BUILD SUCCEEDED）
- [ ] `.build/debug/SmartBLE-mac --unit-core | tee /tmp/nmac-unit.log`（预期 CoreUnit 全过 failures=0）
- [ ] `.build/debug/SmartBLE-mac --smoke-pages | tee /tmp/nmac-smoke.log`（预期 19 PASS + 2 SKIP 口径；环境设备在场 UIS-18 真跑）
- [ ] 根目录 `npm run check:apple-tokens`（预期 8 输出逐字节一致）

## Task 2: F-MAC 静态门禁 + 测试套件

- [ ] `cd apps/flutter && flutter analyze | tee /tmp/fmac-analyze.log`（预期 No issues）
- [ ] `flutter test | tee /tmp/fmac-test.log`（预期全过；此前口径 59 tests）
- [ ] `flutter build macos --debug 2>&1 | tee /tmp/fmac-dbg.log`（预期成功）

## Task 3: F-MAC Release + 沙盒（Phase 3 遗留收口）

- [ ] 检查 `macos/Runner/{DebugProfile,Release}.entitlements` 内容（app-sandbox on/off、蓝牙权限声明）
- [ ] `flutter build macos --release 2>&1 | tee /tmp/fmac-rel.log`
- [ ] 启动冒烟：open Release app → 截图 → P001 真扫描（环境设备可见即 PASS）

## Task 4: Tauri 门禁（Rust + 构建）

- [ ] `cd apps/desktop/tauri/src-tauri && cargo check 2>&1 | tee /tmp/tauri-check.log`
- [ ] `cargo test 2>&1 | tee /tmp/tauri-test.log`（若零测试如实登记）
- [ ] `cd apps/desktop/tauri && tauri build 2>&1 | tee /tmp/tauri-build.log`（产物 .app/.dmg）

## Task 5: Electron 门禁（打包）

- [ ] `cd apps/desktop/electron && npm run build:mac 2>&1 | tee /tmp/electron-build.log`（预期 dmg+zip；竞态失败重跑一次再判）

## Task 6: 四线真实启动冒烟 + 证据截图

- [ ] N-MAC `swift run`（或 PageSmoke 已覆盖则引用 Task 1 证据，不重复）
- [ ] F-MAC Release app：启动/扫描/tab 导航/截图
- [ ] Electron：`npm start` 或 dist .app → 扫描 tab 真扫描/广播 tab 隐藏确认/截图
- [ ] Tauri：bundle .app → 扫描/日志/截图
- [ ] 截图存 `verification/mac-all-frameworks-v1/20260910/smoke/`；每线记录 stdout 关键行

## Task 7: 修复轮（按发现的 FAIL 逐项修，每修一项复跑对应门禁）

- [ ] 按记录修复；无法在本机修的（notarization 需账号等）如实登记

## Task 8: 报告 + 记分卡落盘 + 提交

- [ ] `verification/mac-all-frameworks-v1/20260910/REPORT.md`：功能列表×结果 + 证据索引 + 不可测登记
- [ ] 如涉及代码/文档修复，逐文件提交（不推送）
