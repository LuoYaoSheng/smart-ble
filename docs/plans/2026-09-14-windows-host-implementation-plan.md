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
| WIN-001 | 当前基线与 Windows 工具链 | `TODO` | 旧基线工具链曾可用 | 无 | 需在 `718b3c0` 或更新提交重新建档 |
| WIN-002 | 桌面共享测试恢复全绿 | `FAILED` | 94/95 | `MAC-001`、`MAC-002` | `wechat` 元数据旧断言失败 |
| WIN-003 | Electron Windows 构建与启动 | `TODO` | 旧提交打包、扫描、GATT 通过 | WIN-001、WIN-002 | 需当前提交复验 |
| WIN-004 | Tauri Windows 构建与启动 | `TODO` | 旧提交扫描、GATT 通过 | WIN-001、WIN-002 | 需当前提交复验 |
| WIN-005 | Avalonia 功能补齐 | `IN_PROGRESS` | Build Smoke 已通过 | WIN-001、MAC-008 | 读写/Notify/页面契约未完整接线 |
| WIN-006 | Windows 真实 GATT 与重连回归 | `TODO` | Electron/Tauri 曾 20/20 | WIN-003、WIN-004 | 需在当前固件和当前提交复验 |
| WIN-007 | Smart HID Windows E2E | `BLOCKED` | UI/传输代码已存在 | WIN-006、ControlHub 配对码、SHID 固件 | 未有完整 W4 证据 |
| WIN-008 | Windows OTA E2E 回归 | `TODO` | 两线曾 `PASS_WITH_OBS` | WIN-006、OTA 固件 | 需复验重启后版本回读 |
| WIN-009 | Windows 安装包与安装验证 | `TODO` | Electron/Avalonia 有历史构建 | WIN-003～WIN-008、MAC-011 | 需产出可安装 Artifact 和 SHA256 |
| WIN-010 | Windows 最终交付与矩阵回填 | `TODO` | 历史证据分散 | WIN-001～WIN-009 | 等所有必需任务结论化 |

完成率统计只按本表：`PASS` 0 / `PASS_WITH_OBS` 0 / `IN_PROGRESS` 1 / `FAILED` 1 / `BLOCKED` 1 / `TODO` 7。

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
