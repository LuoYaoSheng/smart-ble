# 平台适配矩阵

## 支持等级

- `Full`：第一阶段正式发布并要求真机证据。
- `Adapted`：功能目标相同，但按平台权限/API 调整。
- `Degraded`：页面可用并解释限制，不宣称功能可用。
- `Later`：后续阶段补齐，不阻塞 Android 首发。

## 平台退役记录：微信小程序

**微信小程序运行目标已于 2026-09-11 经用户裁决整体退役（2026-09-14 MAC-001 落正）。**

- 构建目标（`dev:mp-weixin` / `build:mp-weixin`）、微信 Peripheral 模块（`wx-peripheral-*`）、微信真机门禁与二维码传播入口（反馈码改 GitHub Issues）均已删除，不得回流。
- 仓库中的微信相关历史文档（`docs/specs/`、`docs/product-audit/`、`audit/`、`docs/prompts/`、`docs/smart-hid/MINIAPP_*.md`）与冻结原型（`prototype/platform/wechat/`、`docs/public/prototype/wechat/`）仅作历史证据保留，不构成活跃产品入口。
- 生态能力矩阵（`11_ecosystem/PLATFORM_CAPABILITY_MATRIX_v1.0.md`）中的微信条目描述 Smart HID 生态家族全集，与本项目运行目标无关。

## 平台定位

> 本节与能力矩阵描述**第一完整版本**的验收目标平台；产品完整的实现家族见下一节。

| 平台 | 第一阶段等级 | 定位 |
|---|---|---|
| UniApp Android App | Full | 第一个完整 Core BLE、ESP32、广播和 OTA 运行时 |
| UniApp iOS App | Later | 使用同一页面契约，按 CoreBluetooth/插件能力补证据 |
| H5 | Degraded | 产品预览、文档和页面体验；不支持真实 BLE |

## 实现家族（多平台多框架）

产品是多平台多框架家族：所有实现线共用同一套产品规范（[`specs/`](../specs/README.md)）与 BLE 协议内核，按平台差异各自落地。除上表第一完整版本目标外，以下实现线均在研、可从源码构建，正式产物发布状态以状态页为准：

| 实现线 | 位置 | 框架 / 技术 | 角色 |
|---|---|---|---|
| Android / iOS / H5 | `apps/uniapp` | UniApp（Vue） | 第一完整版本运行时（一线多端） |
| iOS / macOS 原生 | `apps/ios` | SwiftUI + CoreBluetooth，共享 SmartHidCore | Apple 原生线 |
| Android 原生 | `apps/android` | Kotlin | Android 原生线 |
| Flutter | `apps/flutter` | Flutter | 跨框架对照线 |
| 桌面 | `apps/desktop` | Tauri / Electron / macOS Native | 桌面多路线实现区（Windows / macOS / Linux） |
| Web | `docs/.vitepress` + HTML 交互原型 | VitePress / HTML | 官网与可交互原型 |
| ESP32 固件 | `hardware/` | ESP-IDF | 参考固件（Peripheral / Observer，见 06） |

非第一版本目标的实现线，其能力差异按 [specs/10_platform 平台差异设计](../specs/10_platform/PLATFORM_EXTENSION.md) 圈定范围实现，不进入第一完整版本的验收统计，也不在对外页面宣称已发布。

## 能力矩阵

| 能力 | Android App | iOS App（后续） | H5 |
|---|---|---|---|
| 页面与四 Tab | Full | Later | Full |
| BLE 扫描 | Full | Later | Unsupported，明确提示 |
| 设备名称解析 | Full | Later | 仅模拟数据 |
| 广播快照 | Full | Later | 模拟/文档 |
| 多设备连接 | Full | Later | Unsupported |
| GATT Read/Write/Notify | Full | Later | Unsupported |
| 后台保持连接 | Adapted：系统策略 | Later：后台模式 | Unsupported |
| 文件选择 OTA | Full | Later | Unsupported |
| Peripheral 广播 | Full：原生插件 | Later：原生插件 | Unsupported |
| 广播名称 | 系统可能接管 | Later | 仅展示 |
| QR 扫码 | App 扫码能力 | Later | 可模拟/上传，不进入正式验收 |
| 分享 | 系统分享 | Later | Web Share/复制链接 |
| 外部链接 | 系统浏览器 | Later | 新标签页 |

## 平台差异规则

### Android App

- Android 12+ 请求 `BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT`、`BLUETOOTH_ADVERTISE`；旧版本按定位策略处理。
- 权限拒绝区分“首次拒绝”“永久拒绝”“系统蓝牙关闭”。
- 文件 OTA、后台连接和 Peripheral 广播需要单独真机验收。
- 原生插件不存在或版本不匹配时，PAGE-008 必须进入 Unsupported/Error，而不是无响应。

### iOS App（后续）

- 遵循 iOS 蓝牙权限和后台模式；不复制 Android 设置入口。
- Peripheral 本地名称、广播字节和系统缓存行为按 CoreBluetooth 记录差异。
- iOS deviceId 是稳定 UUID 语义，不假设可获得 MAC 地址。

### H5

- 扫描页状态显示“当前平台不支持 BLE”，点击操作给出 App 下载/官网入口。
- 广播页显示 Web/不支持；不得发起不存在的 BLE API。
- H5 可以展示交互原型和公开文档，但不能进入真机通过统计。

## HTML 原型中的平台切换

原型顶部提供 `微信 / Android / iOS / H5` 切换（原型为冻结历史快照）。切换后：

- 页面编号、任务和数据不变。
- 导航外观、权限文案、可见字段和能力状态按本矩阵变化。
- Unsupported 控件不可伪装成可点击成功；必须显示原因。
- iOS 视图可完成页面与交互设计，但标记为“后续真机验收”。
- 微信视图自 2026-09-11 起为退役平台的冻结展示，不再随产品演进。
