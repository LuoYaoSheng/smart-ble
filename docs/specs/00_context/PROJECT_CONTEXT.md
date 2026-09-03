# PROJECT_CONTEXT —— BLE Toolkit+（smart-ble uniapp）

> SOP v2.0 Phase 1 产出 · 生成日期 2026-09-02
> 事实源：[../01_reverse/REVERSE_ANALYSIS.md](../01_reverse/REVERSE_ANALYSIS.md)（代码基线 smart-ble main `d305d3d`）。本文件是该报告「项目身份」的快速装载视图，供 AI 协作任务作上下文；事实冲突时以逆向报告为准。

## 1. 项目身份

| 项 | 值 | 来源 |
|---|---|---|
| 产品名 | **BLE Toolkit+**（当前对外名） | manifest.json:2 |
| 历史名 | LightBLE（历史线）/ HJWY_BLE（微信工程名）/ Smart BLE（总项目名） | package.json / project.config.json / README |
| 版本 | 1.0.5 · versionCode 101 · 渠道 preview · 总体状态 PREVIEW | manifest.json / release-metadata.generated.js |
| 主平台 | 微信小程序（appid `wxf6c58b1dcac4c82d`） | project.config.json:19 |
| 次平台 | uni-app App（Android 广播插件已验证 / iOS future）、H5（UNSUPPORTED） | release-metadata 平台矩阵 |
| 工程位置 | smart-ble monorepo 的 `apps/uniapp/`，HBuilderX 直接导入（无 CLI 构建入口） | REVERSE_ANALYSIS §1.2 |
| 后端依赖 | **无**——零 HTTP、零登录、零账号；全部能力本地 + BLE + 扫码 | REVERSE_ANALYSIS §1.2 |

## 2. 一句话产品

> 面向 UniApp、微信小程序与 ESP32 协同验证的 BLE 调试工具。
> 产品模型 = **通用 BLE Inspector（检查器）+ 可扩展设备 Profile（档案）系统**；首个第一方 Profile = Smart HID 配网（esp32-demo 为第二注册演示档案）。

## 3. 工程形态（目录速览）

```
apps/uniapp/
├── pages/（10 页：index/connected/broadcast/about 四 tab + hid×4 + device/detail + version）
├── components/（15 个自建组件，无第三方 UI 库实际使用）
├── composables/（4 个页面编排器）
├── store/（Pinia ×2：ble.js 通用会话 / hid.js Smart HID）
├── services/（ble-runtime 16 / provisioning 5 / smart-hid 11 / broadcast 6 / ota 3 / 散装 13）
├── utils/（advertising-payload / ble-utils / ota_manager）
├── config/（product.js + release-metadata.generated.*）
├── locale/（zh/en 各 32 key，未接线）
├── styles/design-system.css（--ble-* 设计 token 唯一来源）
└── nativeplugins/LysBlePeripheral/（App 原生广播插件）
（依赖仓库根 core/：协议受锁镜像 + framing + Profile 契约 + logger，相对 import 14 文件）
```

## 4. 平台与能力矩阵（release-metadata 口径）

| 能力/平台 | 状态 |
|---|---|
| 微信小程序 | mainline · PREVIEW · NOT_RELEASED（无正式小程序码） |
| Android App | 广播插件可用；无正式 APK |
| iOS | future（manifest 配置齐全） |
| H5 | UNSUPPORTED（降级定位） |
| OTA | **BLOCKED**（客户端完整，与固件端到端未对齐 E5） |
| Smart HID 配网 | PREVIEW（端到端 E5 未完成） |

## 5. 影响新开发的关键决策

| 日期 | 决策 | 出处 |
|---|---|---|
| 2026-09-02 | **移除「已配置 Smart HID」**：首页面板 + PAGE004 历史页 + F023 + 本地持久化 known_devices 一并移除 → 新形态**零本地存储**（配网会话均为内存态） | [../02_product/PRD.md](../02_product/PRD.md) 变更记录（用户决策） |
| 现状 | i18n 未接线（UI 全中文硬编码），重开发时作为决策项 | REVERSE_ANALYSIS §9.2 |

## 6. 文档导航

`01_reverse/REVERSE_ANALYSIS.md`（事实正典）→ `02_product/PRD.md` + `PRODUCT_MODEL.md` + `FEATURE_MAP.md`（产品）→ `03_flow/`（流程与交互）→ `04_architecture/` + `05_sequence/`（技术视图）→ `09_test/`（V0 验收）。
