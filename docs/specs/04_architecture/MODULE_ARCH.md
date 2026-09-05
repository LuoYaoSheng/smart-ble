# MODULE_ARCH —— 模块关系

> SOP v2.0 Phase 5 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §2（结构分析）。模块树 + 职责表 + 依赖方向。
> **口径声明（2026-09-03，08-G0；08-G0.1 修订）**：本文模块树与依赖方向为**旧工程（apps/uniapp，开发前冻结不改）实证**——模块职责表可作为来源证据与复用评估证据被引用（逐模块处置见 [08_development/LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md)），但文件数/文件名不构成改版强约束；改版目标分层与依赖禁令以 [08_development/RUNTIME_ARCHITECTURE](../08_development/RUNTIME_ARCHITECTURE.md) v1.3 为准（[IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2 §2）。

## 1. 模块树（apps/uniapp）

```text
APP（apps/uniapp）
├── UI
│   ├── pages（10 页：4 tab + 6 二级）
│   └── components（15 组件：common×4 / device-card / filter-panel / scan×2 /
│       service-panel / write-dialog / log-panel / ota-dialog / hid×2 / about）
├── 编排（composables ×4）
│   ├── use-ble-scan（首页扫描）
│   ├── use-device-session（280 行，GATT 调试）
│   ├── use-broadcast-session（广播）
│   └── use-smart-hid-provisioning（375 行，配网全流程，最大）
├── Store（Pinia ×2）
│   ├── ble.js（249 行：扫描会话 + 已连接表，内存 reactive Map）
│   └── hid.js（200 行：配网会话/进度/诊断；knownDevices 随 F023 移除）
├── Service（6 组，平台无关为主）
│   ├── ble-runtime（16）：平台注入/会话注册表/连接发现/写队列/重连/扫描会话/广告解析/过滤/显示名
│   ├── provisioning（5）：Profile 注册表/GATT transport/orchestrator/builtins/导航
│   ├── smart-hid（11）：门面/Profile/工作流引擎/表单/known-devices(移除)/诊断…
│   ├── broadcast（6）：会话/适配器/负载预算/观察证据
│   ├── ota（3）：事务状态机/包模型/校验器
│   └── 散装（13）：scan-permission/路由上下文/断开汇总/版本元数据/日志脱敏/wx 外围双控制器/hid-navigation(@deprecated)
├── Utils：advertising-payload / ble-utils（UUID 中文名）/ ota_manager（注入适配）
├── Config：product.js / release-metadata.generated.*
├── 资源：static / locale（未接线）/ styles/design-system.css（--ble-* token）
└── 原生插件：nativeplugins/LysBlePeripheral（App 广播）

（被直接 import 的仓库根层）
core/
├── protocols（4）：协议受锁镜像
└── ble-core：provisioning{framing,framing-strategies,profile-contract} /
    utils{logger,command-queue,data-converter} / types / interfaces/adapter.ts /
    components（Electron 同名双实现，非小程序复用）
```

## 2. 依赖方向（允许的 import）

```text
pages ──► composables ──► store ──► services ──► core ──► （无）
  │                         │          │
  └──────► components ◄─────┘          └──► 平台 API（仅 4 个收敛文件）
```

- services **不得** import pages/components；store 不 import pages。
- core/ 不反向依赖 apps/uniapp。
- 违例监控：hid-navigation.js 为 @deprecated 兼容层（历史包袱，重构删除）。

## 3. 服务模块职责表

（与 [../00_context/ASSET_INVENTORY.md](../00_context/ASSET_INVENTORY.md) §4 同源）

| 模块 | 文件数 | 职责要点 | 关键机制 |
|---|---|---|---|
| ble-runtime | 16 | uni BLE 全局回调唯一所有者 | 8 态会话；并发连接去重；主动断开 2s marker；写队列串行/5s/深16；重连 3×(1s/3s/5s) |
| provisioning | 5 | 设备无关配网框架 | Profile 契约注册；MTU 247；明文写帧间隔 30ms；写失败立即上抛 |
| smart-hid | 11 | Smart HID 专属层 | 门面 connect/provisionAndWait 60s/diagnose；纯 JS 工作流引擎；token 内存 5 分钟 |
| broadcast | 6 | 广播会话 | 单 owner 6 态；广播中禁改 payload；31B 预算不截断 |
| ota | 3 | OTA 事务 | 12 态；chunk 180B/20ms；commit 后版本回读验证 |
| 散装 | 13 | 杂项支撑 | scan-permission 唯一直调 wx.*；日志脱敏；断开汇总 |

## 4. 已知模块级问题（重构决策项）

| 问题 | 影响 |
|---|---|
| workflow-engine.js 与 workflow.js 四函数双份重复实现；engine 版有未 import 的 PROVISIONING_ERROR_HINTS（确证 bug，REVERSE_ANALYSIS §9.2） | 重构应合并为单一实现 |
| core/components/*.js 为 Electron 端 Web Components 同名双实现 | 非复用关系，勿误 import |
| @dcloudio/uni-ui 死依赖 / fui easycom 死配置 / hid-navigation @deprecated | 清理项 |
