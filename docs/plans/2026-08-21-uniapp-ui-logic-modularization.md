# UniApp UI and Logic Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将微信小程序页面收敛为薄页面壳，把可复用 UI、页面生命周期和 BLE/Smart HID 业务逻辑拆到明确组件与 composable，同时保持现有视觉和协议语义。

**Architecture:** 采用适度组件化：页面负责路由和编排，UI 组件只通过 props/events 工作，composable 负责页面级生命周期，Store 保存可观察状态，Runtime 独占平台 BLE API。拒绝万能 JSON 页面和单个超大 `useEverything()`。

**Tech Stack:** Vue 3 `<script setup>`、uni-app、Pinia、JavaScript、Node 单测、HBuilderX 微信编译。

---

## 1. 方案选择（ADR）

### 选择：业务组件 + 小型 composable

```text
pages/*                 路由、页面编排
components/common/*     Navbar、Empty、Error、Status
components/scan/*       扫描概览、设备结果、广播详情
components/hid/*        配网步骤、进度、诊断、历史设备
composables/*           页面生命周期与用户动作
store/*                 可观察状态
services/ble-runtime/*  BLE session / 平台 API
services/smart-hid/*    Profile 业务语义
```

备选但不采用：

1. **万能动态页面 Schema**：复用率高但调试困难，会破坏 Smart HID 专属产品体验。
2. **只抽 CSS**：风险低但页面仍有 500～1,000 行，逻辑重复和生命周期问题不解决。

## 2. 边界规则

- UI 组件不得直接调用 `uni.onBLE*`、`wx.*` 或 Store mutation。
- composable 可以调用 Store/Service，并负责 `onHide/onUnload`。
- Store 不显示 toast/modal，不包含页面文案。
- Runtime 不依赖 Vue 页面、Pinia 或 Smart HID。
- Smart HID 组件不得进入 `components/common`。
- Wi-Fi 密码、token、MQTT 凭据不得进入 props 日志、本地存储或路由。

### Task 1: 通用页面状态组件

**Files:**
- Create: `apps/uniapp/components/common/app-navbar.vue`
- Create: `apps/uniapp/components/common/empty-state.vue`
- Create: `apps/uniapp/components/common/error-banner.vue`
- Modify: `apps/uniapp/pages/index/index.vue`
- Modify: `apps/uniapp/pages/hid/index.vue`
- Test: 全量 SFC compile

**Steps:**

1. 写组件 props/events，禁止 Store/平台依赖。
2. 替换首页和 HID 首页重复 navbar/empty/error 模板。
3. 运行 16+ SFC parse/compile，确认 slot 与事件无错误。
4. HBuilderX `launch mp-weixin --compile true`。

### Task 2: 扫描页面逻辑 composable

**Files:**
- Create: `apps/uniapp/composables/use-ble-scan.js`
- Create: `apps/uniapp/components/scan/scan-summary.vue`
- Create: `apps/uniapp/components/scan/advertisement-dialog.vue`
- Modify: `apps/uniapp/pages/index/index.vue`
- Test: `tests/unit/advertisement.test.mjs`
- Test: `tests/unit/scan-session.test.mjs`

**Steps:**

1. composable 暴露 `devices/filteredDevices/isScanning/scanError/start/stop/connect`。
2. composable 承担微信权限前置和页面 hide/unload cleanup。
3. `scan-summary` 只展示计数、状态和 start/stop event。
4. `advertisement-dialog` 只格式化/展示 Snapshot，并发出 close/copy。
5. 页面缩减为布局、筛选组件、设备卡片与路由。
6. 连续扫描、广播 Snapshot、SFC、HBuilderX 编译全过。

### Task 3: 通用设备会话 composable

**Files:**
- Create: `apps/uniapp/composables/use-device-session.js`
- Create: `apps/uniapp/utils/ble-display.js`
- Modify: `apps/uniapp/pages/device/detail.vue`
- Modify: `apps/uniapp/components/service-panel/service-panel.vue`
- Test: `tests/unit/device-session.test.mjs`

**Steps:**

1. 抽取连接、三次重试、timer cleanup、session disconnect、services 映射。
2. 抽取 HEX/UTF-8 显示和写入编码。
3. 页面只处理 route、dialog 与组件 events。
4. 测试主动断开不重连、自动断开有界重连、unmount 清 timer。

### Task 4: Smart HID 配网与诊断组件

**Files:**
- Create: `apps/uniapp/components/hid/provision-stepper.vue`
- Create: `apps/uniapp/components/hid/provision-progress.vue`
- Create: `apps/uniapp/components/hid/device-history-list.vue`
- Create: `apps/uniapp/components/hid/diagnostic-list.vue`
- Create: `apps/uniapp/composables/use-smart-hid-provisioning.js`
- Create: `apps/uniapp/composables/use-smart-hid-diagnostics.js`
- Modify: `apps/uniapp/pages/hid/index.vue`
- Modify: `apps/uniapp/pages/hid/add.vue`
- Modify: `apps/uniapp/pages/hid/diagnostics.vue`
- Test: `tests/unit/smart-hid-profile.test.mjs`

**Steps:**

1. UI 组件只接收脱敏后的数据和事件。
2. provisioning composable 编排扫描、连接、QR、candidate、结果 waiter 与恢复动作。
3. diagnostics composable 编排连接尝试与诊断，不把 session 放入组件。
4. 保持 V1 candidate/UUID/错误码完全不变。

### Task 5: 广播页面拆分

**Files:**
- Create: `apps/uniapp/composables/use-ble-advertising.js`
- Create: `apps/uniapp/components/broadcast/advertising-status.vue`
- Create: `apps/uniapp/components/broadcast/advertising-form.vue`
- Create: `apps/uniapp/utils/advertising-payload.js`
- Modify: `apps/uniapp/pages/broadcast/index.vue`
- Test: `tests/unit/advertising-payload.test.mjs`

**Steps:**

1. 纯工具负责 UUID、UTF-8 bytes、31-byte 预算和 manufacturer ID 校验。
2. composable 封装 APP-ANDROID/APP-IOS/MP-WEIXIN capability 与 lifecycle。
3. 状态和表单组件只通过 props/events 工作。
4. 页面只保留布局、日志组件和 share hook。

### Task 6: 关于页与资源数据化

**Files:**
- Create: `apps/uniapp/config/product.js`
- Create: `apps/uniapp/components/about/app-card.vue`
- Modify: `apps/uniapp/pages/about/index.vue`
- Modify: `apps/uniapp/pages/about/version.vue`
- Test: `scripts/check-uniapp-assets.mjs`

**Steps:**

1. 版本 fallback、链接、其它应用元数据移至 config；不包含 secret。
2. app-card 统一 image fallback 与跳转事件。
3. 页面保留微信分享 hook 与平台动作编排。

## 3. 每个任务门禁

```bash
node tests/unit/provisioning.test.mjs
node tests/unit/profile-contract.test.mjs
node tests/unit/ble-runtime.test.mjs
node tests/unit/provisioning-transport.test.mjs
node tests/unit/smart-hid-profile.test.mjs
node tests/unit/scan-session.test.mjs
node tests/unit/advertisement.test.mjs
node scripts/check-smart-hid-contract.mjs
node scripts/check-uniapp-assets.mjs
# apps/uniapp 全量 Vue SFC compile
/Applications/HBuilderX.app/Contents/MacOS/cli launch mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp \
  --compile true --continue-on-error false
```

最终仍需微信开发者工具与 iOS/Android 微信真机验收。每个任务独立提交，不 push。
