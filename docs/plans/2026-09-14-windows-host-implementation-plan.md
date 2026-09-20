# Windows Host Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Windows 主机上完成 BLE Toolkit+ 的 Windows 专项实现、真实 BLE 验证、安装包产出与可追踪交付。

**Architecture:** Windows 主机只负责 Electron Windows、Tauri Windows、Avalonia Windows 及 Windows BLE/驱动/安装包专项。产品模型、协议、发布元数据和 CI 由 Mac 计划维护；Windows 消费同一正典并回传实现与证据，不建立第二套产品规则。

**Tech Stack:** Windows 10/11、Node.js、Electron 27、noble/WinRT、Rust/Tauri 1、btleplug、.NET 8、Avalonia 11、WebView2、PowerShell、ESP32-S3/PlatformIO。

---

## 0. 文档控制

| 字段 | 值 |
|---|---|
| 文档状态 | `CURRENT` |
| 文档版本 | `1.0` |
| 当前基线 | `refactor/uniapp-v1@718b3c0` |
| 执行主机 | Windows |
| 主负责人 | Windows 实现线 |
| 对应 Mac 计划 | [2026-09-14-mac-host-implementation-plan.md](./2026-09-14-mac-host-implementation-plan.md) |
| 历史来源 | [2026-09-11-dual-machine-scope-and-plan.md](./2026-09-11-dual-machine-scope-and-plan.md) |
| 最后更新 | 2026-09-14 |

本文件是 Windows 端后续进度确认的唯一计划入口。旧的双机计划保留为历史，不再向其中追加新进度。

## 1. 范围边界

Windows 主机负责：

- `apps/desktop/electron/` 的 Windows 运行时、WinRT/noble 行为和 Windows 打包。
- `apps/desktop/tauri/` 的 Windows WebView2、Rust/btleplug 行为和 MSI 打包。
- `apps/desktop/avalonia/` 的完整 Windows 原生实现。
- `tests/desktop/` 中桌面共享行为测试；涉及发布元数据口径时等待 Mac 的 `MAC-001/MAC-002` 先定稿。
- Windows 真机 BLE、Smart HID、OTA、重连、多设备和安装包验证。
- Windows 专项证据写入 `verification/windows-plan-v1/`。

Windows 主机不负责：

- UniApp、Flutter、Kotlin Android、iOS、原生 macOS、官网、ESP32 源码的主实现。
- `docs/specs/`、`release/`、`docs/public/release/`、`.github/workflows/` 的最终口径；这些由 Mac 计划维护。
- 为了让 Windows 测试通过而自行恢复或删除微信产品范围。
- 代替 Mac 判定跨平台最终 PASS；Windows 只提交 Windows 证据。

共享冲突域规则：

- `apps/desktop/electron/**`、`apps/desktop/tauri/**`、`tests/desktop/**` 默认由 Windows 持有写锁。
- Mac 若需修改 Electron/Tauri 的 macOS 专用文件，必须先确认 Windows 没有进行中的同目录任务，并以独立提交完成。
- 每个任务开始前执行 `git pull --ff-only`，结束后先跑本任务门禁，再推 GitHub 与 Gitee。

## 2. 状态与进度更新规则

状态只允许使用：

| 状态 | 含义 |
|---|---|
| `TODO` | 尚未开始 |
| `IN_PROGRESS` | 已开始但验收未完成 |
| `PASS` | 所有验收和证据均完成 |
| `PASS_WITH_OBS` | 主路径通过，但有已登记且不阻断的观察项 |
| `FAILED` | 已执行且存在产品或测试失败 |
| `BLOCKED` | 缺硬件、凭据、上游决策或工具链，无法继续 |

每次更新任务状态时必须同时填写：

1. 实际执行 commit。
2. 执行命令和退出码。
3. 产物或真实设备结果。
4. 证据目录。
5. 未解决观察项。

证据目录格式：`verification/windows-plan-v1/YYYYMMDD-WIN-xxx/`。

## 3. 总进度看板

| ID | 工作包 | 当前状态 | 历史基础 | 依赖 | 当前结论 |
|---|---|---|---|---|---|
| WIN-001 | 当前基线与 Windows 工具链 | `PASS_WITH_OBS` | 旧基线工具链曾可用 | 无 | `760dc16` 双远端一致建档;JDK 无 17/21(Windows 线不消费) |
| WIN-002 | 桌面共享测试恢复全绿 | `PASS` | 94/95 | `MAC-001`、`MAC-002` | 95/95;M1 断言改消费正典产物,对微信裁决中立 |
| WIN-003 | Electron Windows 构建与启动 | `PASS_WITH_OBS` | 旧提交打包、扫描、GATT 通过 | WIN-001、WIN-002 | 20260918 三框架重测：build:win --dir exit0 + CDP 真机全链；见 20260918-WIN-ALL |
| WIN-004 | Tauri Windows 构建与启动 | `PASS_WITH_OBS` | 旧提交扫描、GATT 通过 | WIN-001、WIN-002 | 20260918：fmt 修复 + check/test/build 过 + T1-T16 真机链；T-WIN-DEF-001 在册 |
| WIN-005 | Avalonia 功能补齐 | `IN_PROGRESS` | 单测 19/19 补齐 | WIN-001、MAC-008 | 20260920：SmartBLE.Desktop.Tests 新建，先红后绿抓出 UUID 小写映射真 bug；BLE 功能缺陷已清（见 20260918-WIN-DEF-FIX）；20260920-WIN-UIFULL 走查补 T-WIN-DEF-004+离开清会话双壳修复；同日 VWIN-UIFULL 续轮清 DEF-004/005/006（DataContext/卡片命令/寻祖绑定），V-WIN 全流程走查 16/16 |
| WIN-006 | Windows 真实 GATT 与重连回归 | `IN_PROGRESS` | T-WIN-DEF-001 已修 | WIN-003、WIN-004 | 20260918 WIN-DEF-FIX：重连死句柄修复，retry 探针 + T1-T16 全绿；fixture_peripheral_s3 复验待硬件窗口 |
| WIN-007 | Smart HID Windows E2E | `BLOCKED` | UI/传输代码已存在 | WIN-006、ControlHub 配对码、SHID 固件 | 未有完整 W4 证据 |
| WIN-008 | Windows OTA E2E 回归 | `TODO` | 两线曾 `PASS_WITH_OBS` | WIN-006、OTA 固件 | 需复验重启后版本回读 |
| WIN-009 | Windows 安装包与安装验证 | `TODO` | Electron/Avalonia 有历史构建 | WIN-003～WIN-008、MAC-011 | 需产出可安装 Artifact 和 SHA256 |
| WIN-010 | Windows 最终交付与矩阵回填 | `TODO` | 历史证据分散 | WIN-001～WIN-009 | 等所有必需任务结论化 |
| WIN-011 | 桌面壳导航一致性修复（Electron/Tauri） | `IN_PROGRESS` | N3 已修（20260920），N4 待裁决 | WIN-003、WIN-004 | N3 双壳对齐正典五态+CDP 回归；N4 两案仍待用户裁决 |

完成率统计只按本表：`PASS` 1 / `PASS_WITH_OBS` 3 / `IN_PROGRESS` 2 / `FAILED` 0 / `BLOCKED` 1 / `TODO` 3。

## 4. 实施任务

### WIN-001：冻结 Windows 基线与工具链

**Files:**

- Update: `docs/plans/2026-09-14-windows-host-implementation-plan.md`
- Create evidence: `verification/windows-plan-v1/<date>-WIN-001/`

**Steps:**

1. 执行 `git fetch --all --prune`、`git pull --ff-only`、`git status --short --branch`。
2. 确认 GitHub/Gitee 的 `refactor/uniapp-v1` 指向同一 commit。
3. 记录 `node --version`、`npm --version`、`rustc --version`、`cargo --version`、`dotnet --info`、`java -version`、`pio --version`。
4. Node 必须为 `>=22.18` 或 `>=23.6`；JDK 必须为 17/21，不使用 JDK 25；Rust 使用 MSVC toolchain；.NET SDK 至少 8。
5. 记录 Windows 版本、WebView2 版本、蓝牙适配器、ESP32 COM 口和可用测试手机。
6. 提交工具链快照，不提交密钥、配对 token 或机器私有路径。

**Acceptance:** HEAD 为双远端共同最新提交，工作区干净，全部必需工具有版本记录。

### WIN-002：恢复桌面共享测试全绿

**Files:**

- Modify: `tests/desktop/version-metadata.desktop.test.mjs`
- Modify as needed: `tests/desktop/*.test.mjs`
- Do not modify independently: `release/**`, `docs/public/release/**`

**Steps:**

1. 等 `MAC-001` 确认微信范围、`MAC-002` 生成最新元数据。
2. 先运行 `node --test tests/desktop/*.test.mjs`，保存当前 94/95 失败基线。
3. 更新旧的 `wechat` 四键序断言，使其消费生成元数据而不是手写平台列表。
4. 对 Electron/Tauri 镜像文件继续执行逐字节一致性断言。
5. 再运行桌面测试，预期全部通过。
6. 运行两线主要 JS 文件的 `node --check`。

**Acceptance:** `tests/desktop` 0 失败；不得通过放宽断言或跳过测试实现。

### WIN-003：Electron Windows 当前提交构建与启动

**Files:**

- Modify as needed: `apps/desktop/electron/src/main/index.js`
- Modify as needed: `apps/desktop/electron/src/preload/preload.js`
- Modify as needed: `apps/desktop/electron/public/**`
- Modify as needed: `apps/desktop/electron/package.json`

**Steps:**

1. 执行 `cd apps/desktop/electron && npm ci`。
2. 执行 `node --check` 和 WIN-002 桌面测试。
3. 执行 `npm run build:win -- --dir`，验证解包目录构建。
4. 启动 Electron CDP 调试实例，检查启动、四 Tab、P002/P003/P005/P006/P010 和退出确认。
5. 检查蓝牙授权拒绝、适配器关闭、无设备和扫描失败状态。
6. 暂不做签名；签名与安装器归 WIN-009。

**Acceptance:** 构建退出码 0，应用无未捕获 JS 异常，全部活动页面可达。

### WIN-004：Tauri Windows 当前提交构建与启动

**Files:**

- Modify as needed: `apps/desktop/tauri/src-tauri/src/lib.rs`
- Modify as needed: `apps/desktop/tauri/src-tauri/tauri.conf.json`
- Modify as needed: `apps/desktop/tauri/src/**`

**Steps:**

1. 在 `apps/desktop/tauri/src-tauri` 执行 `cargo fmt --check`、`cargo check`、`cargo test`。
2. 执行 `cargo tauri build --debug`；不得使用不存在的根目录 `npm run tauri build`。
3. 通过 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9444` 启动。
4. 检查页面可达性、无重复全局声明、退出确认和 mock/真实 BLE 模式。
5. 检查 WinRT 断线后短扫描重建缓存逻辑仍有效。

**Acceptance:** Rust 构建通过，WebView2 控制台无异常，页面和扫描入口可用。

### WIN-005：补齐 Avalonia Windows 原生实现

**Files:**

- Modify: `apps/desktop/avalonia/SmartBLE.Desktop/ViewModels/BleService.cs`
- Modify: `apps/desktop/avalonia/SmartBLE.Desktop/ViewModels/MainWindowViewModel.cs`
- Modify: `apps/desktop/avalonia/SmartBLE.Desktop/MainWindow.axaml`
- Create: `apps/desktop/avalonia/SmartBLE.Desktop.Tests/SmartBLE.Desktop.Tests.csproj`
- Create: `apps/desktop/avalonia/SmartBLE.Desktop.Tests/BleServiceTests.cs`

**Steps:**

1. 先为 UUID 规范化、设备去重、读写编码、Notify 路由和断开清理写失败测试。
2. 运行 `dotnet test`，确认测试能真实失败而非未发现测试。
3. 将 Read/Write/Notify 命令接入真实 WinRT GATT API，并把回调结果送入 ViewModel/UI。
4. 补齐扫描、已连接、广播降级、关于、版本，以及 P002/P003/P005/P006 的 Windows 等价页面或明确降级。
5. 禁止重新引入不存在的 `WindowsBluetooth` 包；继续使用 Windows TFM 的 WinRT 投影。
6. 执行 `dotnet build`、`dotnet test`、`dotnet run`。

**Acceptance:** 0 编译错误，新增测试全过；Read/Write/Notify 不能只停留在按钮或占位 ViewModel。

### WIN-006：当前提交真实 GATT、重连与多设备回归

**Files:**

- Test: `tests/desktop/**`
- Evidence: `verification/windows-plan-v1/<date>-WIN-006/`

**Steps:**

1. 给 ESP32-S3 烧录与当前 commit 对应的 `fixture_peripheral_s3`，记录启动 JSON 和固件 SHA。
2. Electron、Tauri 分别执行扫描、连接、服务发现、Read、TEXT/HEX Write、Notify、退订、主动断开。
3. 注入被动断线，验证 1s/3s/5s 或当前正典规定的重连策略，确认用户主动断开不重连。
4. 若第二个外设可用，验证双连接和相同 UUID 的通知不串线。
5. Avalonia 在 WIN-005 完成后运行同一基础链；未完成不得假记 PASS。

**Acceptance:** Electron/Tauri 必须在当前提交全部通过；每一步都有 UI、主进程/Rust 日志和设备侧证据。

### WIN-007：Smart HID Windows 端到端

**Files:**

- Modify as needed: `apps/desktop/electron/public/hid-service.js`
- Modify as needed: `apps/desktop/tauri/src/hid-service.js`
- Test: `tests/desktop/smart-hid-*.test.mjs`
- Evidence: `verification/windows-plan-v1/<date>-WIN-007/`

**Steps:**

1. 准备未配网 Smart HID 固件、可用 ControlHub 和一次性配对码。
2. Electron/Tauri 依次验证强匹配、弱匹配、普通 GATT 双入口。
3. 完成 P002：连接与身份验证、扫码/粘贴配对码、candidate 分帧、STATUS 七步、Ready。
4. 完成 P003 会话快照和 P005 五项诊断。
5. 分别验证 `wifi_failed`、`pairing_expired`、`mqtt_invalid`、断线和取消恢复路径。
6. 证据和日志必须脱敏，不保存 Wi-Fi 密码和 token。

**Acceptance:** 两条 Windows 桌面线均有成功路径和至少三类失败恢复证据；缺 ControlHub 时保持 `BLOCKED`。

### WIN-008：Windows OTA 全链回归

**Files:**

- Modify as needed: `apps/desktop/electron/public/components/OtaDialog.js`
- Modify as needed: `apps/desktop/tauri/src/components/OtaDialog.js`
- Test: `tests/desktop/ota-contract.desktop.test.mjs`

**Steps:**

1. 准备基线固件、目标固件、六字段 manifest 和 SHA256。
2. 验证缺 manifest、目标错误、大小错误、Hash 错误均在传输前被拦截。
3. 两线执行 start → ready → DATA → commit → success → reboot。
4. 验证取消会发送 abort，重开会话后仍可成功升级。
5. 专门复验历史观察项：设备重启后重新扫描/连接并读取版本。

**Acceptance:** 两线版本迁移真实成功；若版本回读仍受 Windows BLE 缓存影响，必须给出独立设备侧证据并标记 `PASS_WITH_OBS`。

### WIN-009：Windows 安装包与干净安装

**Files:**

- Modify as needed: `apps/desktop/electron/package.json`
- Modify as needed: `apps/desktop/tauri/src-tauri/tauri.conf.json`
- Modify as needed: `apps/desktop/avalonia/SmartBLE.Desktop/SmartBLE.Desktop.csproj`
- Coordinate with Mac: `.github/workflows/release-build.yml`

**Steps:**

1. Electron 产出 NSIS 和 portable；Tauri 产出 MSI；Avalonia 产出 `win-x64` self-contained 包。
2. 在未安装开发依赖的 Windows 用户环境完成安装、启动、卸载和重装。
3. 验证蓝牙权限、首次扫描、版本号、图标、产品名和卸载残留。
4. 为每个 Artifact 生成 SHA256，并记录体积和目标架构。
5. 签名凭据不可入库；无签名时 Artifact 只能标 Preview。

**Acceptance:** 至少 Electron 和 Tauri 两个安装包完成干净安装冒烟；无 SHA256 不得进入发布元数据。

### WIN-010：Windows 最终交付

**Files:**

- Update: `docs/plans/2026-09-14-windows-host-implementation-plan.md`
- Create: `verification/windows-plan-v1/FINAL-REPORT.md`
- Mac consumes evidence in: `docs/specs/09_test/`

**Steps:**

1. 汇总 WIN-001～WIN-009 的 commit、命令、结果、Artifact 和证据路径。
2. 所有未完成项必须是 `BLOCKED` 或 `FAILED`，不允许保留含糊的 `TODO`。
3. 将 Windows 平台差异、缓存观察项、安装限制交给 Mac 更新正典。
4. 运行最后一轮桌面测试、三实现构建和真实 BLE 冒烟。
5. 提交最终报告，并等待 Mac 的跨平台总门禁，不自行宣布全产品发布。

**Acceptance:** Windows 看板全部结论化，最终报告可独立复现，Mac 能直接据此回填跨平台矩阵。

### WIN-011：桌面壳导航一致性修复（源自 2026-09-15 导航审计 N3/N4）

来源：`verification/ui-nav-audit-20260915/REPORT.md`（七端静态+运行时双轮审计）。两壳均属 Windows 写锁区，Mac 侧仅登记不改码。

**Files:**

- Modify: `apps/desktop/electron/public/app.js`（N3 stateMap ~927-939；N4 broadcastTab ~874-877）
- Modify: `apps/desktop/tauri/public/app.js`（N3 updateStatus ~506-520；N4 视裁决口径）
- Create evidence: `verification/windows-plan-v1/<date>-WIN-011/`

**N3（bt-chip 状态词对齐正典）：**

1. Electron stateMap：`unauthorized` 的「未授权」改「蓝牙未开启」（正典词，iOS/Android/uniapp 一致；`MainActivity.kt:147` 注释即「Unauthorized 同未开启（对齐桌面壳）」）；fallback「状态未知」改「初始化中…」；补「平台不支持」灰点态。
2. Tauri updateStatus：补「蓝牙未开启」红点态（现 poweredOff 归入「平台不支持」分支）。

**N4（广播 Tab 初始可见性，两案待用户裁决）：**

- 案 A（按能力显隐，Electron 现状）：`platform==='linux'` 才显示广播 Tab（bleno 仅 Linux 支持）；若采纳，Tauri/macOS 需反向对齐（macOS 侧归 Mac 改）。
- 案 B（恒显四 Tab +「未就绪」徽章，正典 A3 形态，Tauri/macOS 现状）：广播 Tab 恒显，不支持平台进页显示「未就绪」徽章（Android 已是此口径：`MainActivity.kt` badgeText「未就绪」）；若采纳，仅改 Electron。

**Acceptance:** 两壳 bt-chip 五态词与正典逐字一致；广播 Tab 可见性口径全产品一致；运行时截图（macOS/Windows 各一组）回填审计报告 N3/N4 状态。

### 跨线协调记录（Mac 侧对写锁区的最小侵入，2026-09-15 CI 首跑解锁）

- `apps/desktop/tauri/src-tauri/icons/{32x32,128x128,128x128@2x}.png`：RGB→RGBA 重编码（ImageMagick PNG32，AE=0 逐像素无损，备份与校验见 verification/mac-plan-v1/）。原因：tauri v1 Linux 打包路径的 `generate_context!` 强制 RGBA（`icon 32x32.png is not RGBA` proc-macro panic），macOS 构建走不到该检查故从未暴露。属纯格式转换、零视觉/逻辑改动；Windows 线后续打包不受影响（.ico/.icns 未动）。

### 2026-09-18 · WIN-003/WIN-004/WIN-005（部分）/WIN-006（部分）——三框架 × ESP32 真机全面重测

用户指令「重测 Windows 和 esp32 进行一次全面测试，Windows 应该有很多框架，一个个测试」。
盘点确认 Windows 侧实际框架为 Electron/Tauri/Avalonia 三个（apps/desktop/windows、linux 为
README 占位且指向 Avalonia 线；Flutter 无 Windows 目标），逐框架执行构建+启动+真机 BLE 全链。

- Status: WIN-003 `PASS_WITH_OBS` / WIN-004 `PASS_WITH_OBS` / WIN-005 `IN_PROGRESS`（含 1 修复）/ WIN-006 `IN_PROGRESS`
- Commit: 基于 `9c413e6`（开测前 pull --ff-only Already up to date；本轮提交见 git log）
- Host: Windows 10 22H2；Node v23.8.0（nvm 前置）/ rustc-cargo 1.98.1 MSVC / .NET SDK 9.0.200（net8.0-windows TFM）
- Commands: `npm ci`（postinstall 挂死→缓存 zip 接管）、`node --check`×19、`node --test tests/desktop/*.test.mjs`（95/95）、
  `npm run build:win -- --dir`（exit 0）、`cargo fmt --check`（FAIL→fmt 修复→clean）、`cargo check`/`cargo test`/`cargo build`（全过，Rust 单测 0 在册）、
  `dotnet build`（exit 0，0 错 6 警）；CDP 9222/9444 + Win32 WM_CLOSE + .NET harness 驱动真机链
- Result: E-WIN 全链过（F1-F15，断链重连身份逐字节一致）；T-WIN T1-T16 过但暴露重连死句柄（T-WIN-DEF-001）；
  V-WIN 启动崩溃已修（BoxShadow），harness 过扫描/连接/发现/双读/通知，写失败+重连归零两缺陷在册。
  三框架对同一设备读到相同身份帧 HID-00000001/fw1.2.0 与 wifi_failed 状态帧
- Hardware: Intel Wireless Bluetooth；ESP32-S3 真实 Smart HID 固件 v1.2.0（WIN-007 现场原样保留）；
  CH343/COM12 未接线（串口旁证缺，设备侧以 GATT 真实响应帧为证）；COM4=三星手机诊断口勿认错
- Evidence: verification/windows-plan-v1/20260918-WIN-ALL/（summary.md 为总报告，含三框架横向矩阵与缺陷清单）
- Observations: npm ci postinstall 本机网络挂死（SHASUMS 校验）需缓存接管；rcedit 文件锁重试自愈；
  固件对非法 candidate 静默丢弃不回 invalid_payload；两壳 write format 词汇 text|hex vs utf8|hex
- Next: T-WIN-DEF-001 与 V-WIN-DEF-001/002/003 修复排期（归 WIN-005/WIN-006 续作）；WIN-007 维持 BLOCKED

### 2026-09-18 · WIN-DEF-FIX——四缺陷修复轮（WIN-ALL 续作）

对 WIN-ALL 登记的四个缺陷逐一修复并真机复测，全程未动 ESP32（未重刷、NVS 原样）。

- Status: T-WIN-DEF-001 修复 ✅（retry 探针 readA/B/C 全绿 + 主链 T1-T16 回归全绿）；
  V-WIN-DEF-002 修复 ✅（重连 chars=3、身份 SAME）；V-WIN-DEF-003 修复 ✅（V12/V16 双断连
  事件上报，CS0067 消除）；**V-WIN-DEF-001 重新定性为设备侧缺陷 SHID-FW-LOCK-001**
  （见下），app 侧诊断与写选项自适应已修
- Code: lib.rs——connect 前强制 `disconnect()` 清 btleplug 死缓存（被动掉链不清
  `ble_services`、`discover_services` 对已有 uuid 跳过重枚举，源码级根因）+ 连接后自动
  重建 GATT 句柄 + 断连事件收尾通知流/抑制伪事件；BleService.cs——GattSession/
  GattDeviceService 显式释放 + 全链 `BluetoothCacheMode.Uncached` + ConnectionStatusChanged
  接线（含主动断开上报与去重）+ 错误诊断码化（异常类型/HRESULT/status/protocolError）
- **SHID-FW-LOCK-001（新登记，设备侧）**：16:04-16:08 E-WIN 真实写成功（status-probe
  writeV1 success:true）累计喂入 ~44B 无 schema 载荷后，16:18 起设备对 INPUT 写请求持久回
  ATT 0x0D（Invalid Attribute Value Length，非标准信号）。表征：1/3/14B 全拒（排除真长度）、
  时序无关（排除 SMP 窗口）、Windows 无配对记录且 console PairAsync 失败、无响应通道补
  `}`/`\n`/合法 JSON 解卡全败、跨重连持续 ≥75 分钟。17:20 起 T-WIN 同败 0x8065000D——三栈
  行为一致，非任一 Windows 框架缺陷。恢复手段未知（断电重启验证待硬件窗口）；固件仓在
  Smart-HID-Workspace（非本仓库）
- **方法论勘误**：WIN-ALL 驱动 step「ok」只表示 invoke 未抛异常，`success:false` 同计
  ok——「noble/btleplug 写成功」前提系误证，本轮已以显式 success 检查重测（twin-write-probe）
- Evidence: verification/windows-plan-v1/20260918-WIN-DEF-FIX/（summary.md 总报告 +
  retry/主链/写探针矩阵/清障实验全套日志）
- Next: SHID-FW-LOCK-001 移交固件侧排查（断电重启验证 + 输入解析器审查）；WIN-006 的
  fixture_peripheral_s3 复验仍待硬件窗口；WIN-007 维持 BLOCKED

### 2026-09-20 · WIN-011 N3 + WIN-005 单测补齐

- N3 正典五态：Electron stateMap 三处（unauthorized→蓝牙未开启、fallback 状态未知→初始化中…、
  补 unsupported→平台不支持灰点）；Tauri updateStatus 补 off 红点态 + 后端 Radio.GetRadiosAsync
  区分「蓝牙关闭 vs 平台不支持」（windows 0.61 target 门控依赖，与 btleplug 同投影去重）
- 验证：node --check×2、桌面套 95/95、cargo fmt/check/test、CDP 双壳芯片词回归 蓝牙就绪+绿点
  （蓝牙关闭分支不 toggle 系统无线电，声明为构建门覆盖）；N4 维持待用户裁决
- WIN-005 单测：新建 SmartBLE.Desktop.Tests（xunit 19 测试），先红后绿暴露并修复真 bug——
  Uuid.ToString() 小写 vs switch 大写分支，含字母短 UUID 名称映射全部落 Unknown；
  ResolveWriteOption 抽取顺带修双支持特征的无响应写错按带响应 bug
- Evidence: verification/windows-plan-v1/20260920-WIN-011/
- Next: N4 两案（按能力显隐 vs 恒显+未就绪徽章）待用户裁决后实施

### 2026-09-20 · WIN-UIFULL 整体 UI 级走查（用户质疑触发）

- 起因：用户质疑「Windows端啥都没有、整体测试了吗」。盘点澄清：E/T 双壳 9 视图全产品面，
  V-WIN 实验级薄壳，apps/desktop/windows|linux 为设计内 README 占位；历轮为 BLE 链 API 级 +
  零散 UI 点 + 静态导航核对，「全视图真实点击走查」此前确实空缺，本轮补齐。
- 走查：CDP 真实点击 16 步/壳（TabBar/筛选/扫描/P002 向导含令牌门与二维码/粘贴兜底/
  P006 读+监听/P007/P008/P009/P010/退出确认），**双壳 16/16 全绿**，真机 SHID-00000001。
- 抓出并修复 T-WIN-DEF-004（P1）：hid-service.js 读 result.services 而后端返回 data——
  **T-WIN 配网向导连接此前 100% 必败**（历轮从未驱动向导故从未暴露），双壳镜像改双键兼容。
- 抓出并修复 DESKTOP-LEAVE-001（P2，双壳）：向导返回不清 BLE 会话，E-WIN 报 already connected、
  T-WIN 因设备停广播报 Device not found；对齐 uniapp dispose 语义（离开即断开）双壳补 disconnect。
- V-WIN：UIA 结构取证（26 命名元素+按钮清单+截图）；输入注入四通道（鼠标/物理坐标/键盘/
  PostMessage）在本环境全灭+元素坐标系异常，定性自动化环境限制，人工点检清单移交用户。
- 门禁：node --check×4 ✓、tests/desktop 95/95 ✓、Tauri/Avalonia 产物重建 ✓
- Evidence: verification/windows-plan-v1/20260920-WIN-UIFULL/

### 2026-09-20 · VWIN-UIFULL 续轮：V-WIN 走查打通，三缺陷清剿 16/16 全绿

- 起因：用户追问「还没做完吧，缺很多吧，不同框架」——上轮 E/T 双壳 16/16 而 V-WIN 只留
  结构取证（且误判注入环境受限），是覆盖矩阵上唯一空格。
- **撤回上轮误判**：FlaUI element.Click()（真实鼠标）对 Avalonia 有效；「过滤面板点击
  成功」实为 IsVisible 绑定失败恒开假象，随后误入三条死通道得出环境限制结论。
- 三缺陷（行为级红证→修复→绿证，全在本轮）：
  - V-WIN-DEF-004（P0）App 未装配运行期 DataContext——UI 曾是静态壳（命令全死/绑定文本
    全空/过滤面板恒开）；
  - V-WIN-DEF-005（P1）设备卡片未接 ConnectToDeviceCommand——详情页（读/写/通知/日志）整体不可达；
  - V-WIN-DEF-006（P1）特征三按钮 `$parent[UserControl]` 寻祖在 Window 树中无命中——
    读/写/通知静默失效（编译期不报错）。
- 走查：FlaUI 真实点击 16 步（状态/扫描/过滤/卡片进详情/连接/服务/INFO 读出真实 JSON/
  STATUS 通知启用/写对话框开+取消（零写入，FW-LOCK 约束）/断开/重扫/重连（DEF-002 回归）/
  返回），**16/16 全绿 + 1 观察项**（空闲 20s 无 STATUS 推送，口径对齐 E/T 仅验启用）。
- harness 沉淀（FlaUI×Avalonia）：IsOffscreen 恒 true 不可用；Carousel 隐藏页陈旧矩形需
  可见性过滤+多信号仲裁；「关闭」类状态用亮度探针判定；UIA COM 瞬态 E_FAIL 重试；
  行内按钮点真实 Button 控件而非 Text 标签。
- 门禁：dotnet build 0 err、dotnet test 19/19 ✓、走查后无残留进程
- Evidence: verification/windows-plan-v1/20260920-WIN-UIFULL/avalonia/vwin-walk/

### 2026-09-14 · WIN-001

- Status: PASS_WITH_OBS
- Commit: `760dc16`(HEAD,双远端一致;本任务证据提交见下一条回填)
- Host: Windows 10 22H2 (10.0.19045.3803)
- Commands: `git fetch --all --prune` (0)、`git pull --ff-only` (0)、`git status --short --branch`、`node/npm/rustc/cargo/dotnet/java/pio --version`
- Result: 工具链快照落档;Node v23.8.0(nvm PATH 前置)、rustc/cargo 1.98.1 MSVC、.NET 9.0.200、PIO 6.1.18 全部合规
- Hardware: Intel Wireless Bluetooth;COM12=CH343(ESP32-S3);WebView2 152.0.4191.66;手机 FEC0220629005177 adb 在线
- Evidence: verification/windows-plan-v1/20260914-WIN-001/toolchain-snapshot.md
- Observations: JDK 无 17/21(默认 24.0.1,另有 corretto-18;Windows 任务线不消费 JDK);系统 PATH 默认 Node v20.19.3,任务执行统一前置 nvm v23.8.0;用户既有脏文件 33 个保持原样
- Next: WIN-002

### 2026-09-14 · WIN-002

- Status: PASS
- Commit: 见本日提交(基于 `0735b4f`)
- Host: Windows 10 22H2,Node v23.8.0(PATH 前置)
- Commands: `node --test tests/desktop/*.test.mjs`(改前 94/95 exit 1 → 改后 95/95 exit 0);两线 34 个 JS `node --check` 全过
- Result: M1 断言由手写 wechat 四键改为消费正典产物 `apps/uniapp/config/release-metadata.generated.json` 的 `public_surfaces`(键序模板保留为页面契约);投影层实现未动(本已元数据驱动);镜像逐字节断言保留
- Hardware: 无需
- Evidence: verification/windows-plan-v1/20260914-WIN-002/
- Observations: MAC-001 仍 BLOCKED(微信去留待用户裁决)——本改法对裁决中立,元数据恢复 wechat 则断言自动回四键;未改 `release/**`
- Next: WIN-003

## 5. 每次进度回填模板

```markdown
### YYYY-MM-DD · WIN-xxx

- Status: PASS | PASS_WITH_OBS | FAILED | BLOCKED
- Commit: <sha>
- Host: <Windows version / machine>
- Commands: <exact commands>
- Result: <pass/fail counts and artifact>
- Hardware: <adapter / device / firmware sha>
- Evidence: verification/windows-plan-v1/<run>/
- Observations: <remaining issue or none>
- Next: <next task id>
```

## 6. Windows 完成定义

Windows 端只有同时满足以下条件才算完成：

- Electron、Tauri 当前提交构建、启动和真实 GATT 通过。
- Avalonia 达到已明确的发布级或实验级边界，不能继续以 README 代替实现。
- Smart HID 和 OTA 有当前 commit 的端到端证据，或由用户确认维持 BLOCKED。
- Windows 安装包完成干净安装并有 SHA256。
- 桌面测试 0 失败。
- Windows 最终报告已被 Mac 计划吸收，平台矩阵无悬空 Windows 项。
