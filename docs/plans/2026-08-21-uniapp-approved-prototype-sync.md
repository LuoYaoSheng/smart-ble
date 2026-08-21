# UniApp Approved Prototype Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将已确认的统一设备发现、三阶段 Smart HID 配网和推广优先关于页同步到 UniApp，并同步公开说明与 Smart HID 落地页。

**Architecture:** 首页继续使用通用 BLE Runtime 与 Profile 注册表。Smart HID 页面只编排连接、配置表单和状态三个阶段；一次性 token 由 ControlHub 二维码写入内存，服务器地址允许用户确认或修改。关于页从产品配置读取推广元数据，并保留微信小程序原生跳转分支。

**Tech Stack:** Vue 3 `<script setup>`、uni-app、Pinia、JavaScript、Node 单测、静态 HTML、ESP-IDF/Go 回归门禁。

---

### Task 1: 固化三阶段配网表单契约

**Files:**
- Create: `apps/uniapp/services/smart-hid/provision-form.js`
- Create: `tests/unit/smart-hid-provision-form.test.mjs`

**Steps:**
1. 为 `host[:port]`、默认端口、非法端口和空地址写单测。
2. 实现纯函数解析与展示，不读取或记录 Wi-Fi 密码/token。
3. 运行新增单测，预期全部通过。

### Task 2: 组件化 Smart HID 三阶段配网

**Files:**
- Create: `apps/uniapp/components/hid/provision-stepper.vue`
- Create: `apps/uniapp/components/hid/provision-progress.vue`
- Create: `apps/uniapp/composables/use-smart-hid-provisioning.js`
- Modify: `apps/uniapp/pages/hid/add.vue`

**Steps:**
1. 页面从首页 Profile 设备进入后自动连接并读取 Device Info。
2. 连接成功后显示单页 Wi-Fi、密码、ControlHub 地址与扫码入口。
3. 二维码只在内存提供 V1 token，并自动填入可编辑服务器地址。
4. 下发后在同一状态页展示 Wi-Fi、配对、MQTT、Ready 进度与恢复动作。
5. 不再提供第二套 Smart HID 扫描器，也不改变协议字段。

### Task 3: 同步推广优先关于页

**Files:**
- Create: `apps/uniapp/config/product.js`
- Create: `apps/uniapp/components/about/app-card.vue`
- Modify: `apps/uniapp/pages/about/index.vue`

**Steps:**
1. 移除关于页横幅，保留应用图标、名称和版本。
2. 将更多小程序提升到应用信息之后。
3. 功能与平台信息改为紧凑区域。
4. 微信端使用 `navigateToMiniProgram`；失败时显示明确提示，不把普通图标伪装为二维码。

### Task 4: 同步原型、项目说明和 Smart HID 落地页

**Files:**
- Modify: `docs/prototypes/unified-device-discovery.html`
- Modify: `docs/prototypes/README.md`
- Modify: `docs/plans/2026-08-21-smart-ble-interaction-sync-spec.md`
- Modify: `docs/plans/2026-08-21-smart-ble-page-wireframes.md`
- Modify: `README.md`
- Modify: `apps/uniapp/README.md`
- Modify: `AGENTS.md`
- Modify in sibling repository: `Smart-HID-Workspace/smart-hid-web/index.html`
- Modify in sibling repository: `Smart-HID-Workspace/smart-hid-web/docs/quick-start.html`
- Modify in sibling repository: `Smart-HID-Workspace/README.md`

**Steps:**
1. 原型收敛为连接、配置、状态三个阶段。
2. 删除所有“独立 HID Tab / W01-W06”现行描述。
3. 落地页说明改为首页发现 Smart HID 后直接进入配网。
4. 明确 BLE 配网客户端已实现但仍待微信工具与真机联调。

### Task 5: 验证、提交与远端同步

**Steps:**
1. 运行 Smart-ble 单测、协议锁、资源门禁与全量 Vue SFC 编译。
2. 运行 ControlHub、F2、固件 host、默认/DEV build、治理与协议门禁。
3. 两个仓库分别只暂存本批文件并各提交一次。
4. 核对 GitHub/Gitee 待推提交；不接触生产服务器。
5. 推送前确认不会夹带未授权分支或工作区文件。
