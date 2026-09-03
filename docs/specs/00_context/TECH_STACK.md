# TECH_STACK —— 技术栈

> SOP v2.0 Phase 1 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §1.2（技术架构）、§8（外部依赖）。

## 1. 框架层

| 层 | 选型 | 关键事实 |
|---|---|---|
| 跨端框架 | uni-app（**HBuilderX 工程**，无 CLI 构建脚本入口） | `vite.config.js` 仅为 APP 平台 E5 测试构建的 rollup 修正 |
| 视图 | **Vue 3** `<script setup>` 组合式 API | manifest.json vueVersion "3" |
| 状态 | **Pinia** | main.js 装配；`store/ble.js`（通用会话）、`store/hid.js`（Smart HID） |
| UI | **全自建**，无第三方 UI 库实际使用 | `@dcloudio/uni-ui` 已装未用（死依赖）；`fui-*` easycom 指向不存在目录（死配置）；视觉 token 唯一来源 `styles/design-system.css`（`--ble-*` CSS 变量） |
| i18n | **未接线** | locale/zh-CN.json + en-US.json 各 32 key，main.js 未挂 vue-i18n、全仓无 $t()；UI 全中文硬编码 |
| 多端 | 条件编译 | `#ifdef MP-WEIXIN / APP-PLUS / APP-ANDROID / APP-IOS / H5`；mp-alipay/baidu/toutiao 仅 manifest 声明、无适配代码 |

## 2. 平台调用收敛策略（架构铁律，重构须保持）

平台 API（`uni.*` / `wx.*` / `plus.*`）只允许出现在：
- `services/ble-runtime/index.js`（经 `platform.js` 注入）
- `services/scan-permission.js`（**唯一**直调 wx.* 的服务）
- `services/wx-peripheral-*.js`（微信外围广播双控制器）
- `pages/broadcast/index.vue`（原生插件分支）

其余服务层刻意「纯 JS 化」（Node 可测，如 smart-hid/workflow-engine.js 文件头自述）。

## 3. 共享层 core/（仓库根，跨端）

- `core/protocols/`：协议正典**受锁镜像**——hid-provisioning-protocol.ts、smart-ble-protocol.ts、hid-command-schema.ts、`smart-hid-contract.lock.json`（canonical_repo、contract_sha256、tested_smart_hid_version 1.1.1、**miniapp_version 1.0.4 滞后于当前 1.0.5**）
- `core/ble-core/`：provisioning/{framing, framing-strategies, profile-contract}、utils/{logger, command-queue, data-converter}、types/、interfaces/adapter.ts
- 小程序侧经**相对路径 import 14 个文件**，无 npm 包装；core/components/*.js 为 Electron 端 Web Components（同名双实现，非复用）

## 4. 原生插件（App 端广播）

`nativeplugins/LysBlePeripheral/`（本地插件，非云插件）：
- Android AAR：com.lys.bleperipheral.LysBlePeripheralModule，依赖 fastjson 1.1.46 + appcompat 1.6.1，minSdk 21
- iOS framework：CoreBluetooth，deploymentTarget 10.0
- JS API 四个：`isSupported / startAdvertising / isAdvertising / stopAdvertising`

## 5. 测试体系

| 类别 | 内容 |
|---|---|
| 单元测试 | 仓库根 tests/unit：29 个 node:test（业务层纯 JS 可测） |
| E2E | apps/uniapp 内 2 个 uni-automator：index.test.js（首页+四 tab）、page-flow.test.js（十页导航流与 pages.json 正典断言） |
| E2E 前提 | 微信开发者工具 CLI（env.js executablePath `/Applications/wechatwebdevtools.app/.../cli`，automator port 9420） |
| 文档原型验证 | prototype/v0-old 经本地 http.server + Playwright 断言（见 09_test/HTML_V0_ACCEPTANCE.md） |

## 6. npm 依赖（apps/uniapp/package.json）

| 包 | 版本 | 状态 |
|---|---|---|
| @dcloudio/uni-ui | ^1.5.7 | **死依赖**（已装、easycom 规则在、源码零使用） |
| pinia | ^3.0.4 | 在用 |

vue / vue-i18n 由 HBuilderX 编译器内置提供；历史上曾装 vue-i18n@9.14.4 修编译错，当前 package.json 未列。

## 7. 构建与生成

- HBuilderX 编译（easycom 解析 uni-ui——当前未用）
- `config/release-metadata.generated.js` 由 `scripts/generate-release-metadata.mjs` 生成（DO NOT EDIT；脚本细节【未知】，REVERSE_ANALYSIS §8.5）
