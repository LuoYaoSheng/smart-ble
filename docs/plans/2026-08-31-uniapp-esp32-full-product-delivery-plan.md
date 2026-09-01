# Smart BLE UniApp × ESP32 全面产品交付总任务

> 日期：2026-08-31
> 状态：SUPERSEDED FOR EXECUTION / 作为历史全面交付范围参考保留
> 替代计划：[`2026-09-01-target-product-spec-test-gap-remediation-plan.md`](./2026-09-01-target-product-spec-test-gap-remediation-plan.md)
> 替代理由：本文仍以“先审计当前实现，再冻结契约并修复”为主线；新方法要求目标产品规范与当前实现彻底分层，先写目标文档和目标测试，再自动生成差距。
> 适用仓库：`smart-ble`
> 历史产品目标：UniApp Android App + BLE Toolkit+ 微信小程序 + LightBLE ESP32 测试夹具 + VitePress 公开落地页。

---

## 0. 任务结论

本任务不是单纯“补代码”，也不是单纯“做测试”或“做官网”。它必须一次性覆盖产品从定义到公开交付的完整闭环：

```text
产品和页面正确性
→ 运行链路正确性
→ HTML 交互母版
→ ESP32 标准测试夹具
→ UniApp 按页面实现
→ Android 真机
→ 微信真机
→ Smart HID Profile
→ 落地页与文档
→ 版本、构建、发布和另一台电脑复现
```

任何一个环节不能被后一个环节替代：

- 页面能打开，不等于页面内容正确。
- 代码存在，不等于操作链路可达。
- 模拟器通过，不等于 BLE 真机通过。
- ESP32 能被发现，不等于 GATT、Notify、广播和 OTA 正确。
- App 真机通过，不等于落地页可以宣称完整支持。
- 落地页能构建，不等于下载、二维码和版本真实可用。

最终交付物必须同时具备：

1. 正确的 10 个 UniApp 页面。
2. 正确的公开落地页。
3. 可重复构建的 LightBLE Peripheral / Observer 固件。
4. 页面—操作—Runtime—ESP32 全链路矩阵。
5. Android 和微信真实设备证据。
6. Smart HID Profile 的独立闭环。
7. 真实版本、产物、SHA、证据和已知限制。
8. 另一台电脑可复现的构建与硬件测试流程。

---

# 1. 产品边界

## 1.1 第一正式版本

```text
Smart BLE
├── UniApp Android App
├── BLE Toolkit+ 微信小程序
├── H5 页面与降级说明
├── LightBLE ESP32 Peripheral 测试夹具
├── LightBLE ESP32 Observer 测试夹具
├── Smart HID 第一方 Profile
├── HTML 交互原型
├── VitePress 落地页与开发者文档
└── 测试证据与发布产物
```

## 1.2 当前不作为首版阻断项

- Flutter 客户端。
- 原生 Android 客户端。
- 原生 iOS/macOS 客户端。
- Tauri、Electron、Avalonia 等桌面实现。
- H5 真实 BLE。
- 新增第三个第一方 Profile。
- 云端、账号、会员、支付、License、订单。

这些实现可保留源码，但不得在首版落地页中与 UniApp 主线并列宣称完整可用。

## 1.3 Smart HID 的位置

Smart HID 分两层推进：

1. PAGE-002～005 的页面内容、跳转、状态和数据边界在产品审核阶段一起处理。
2. 真实配网与 USB HID E5 在通用 BLE Runtime、扫描、连接、GATT、会话和广播全绿后执行。

Smart HID 专属问题不得反向污染通用 BLE Runtime。

---

# 2. 产品界面清单

本任务审核和交付 11 个产品界面：

| ID | 界面 | 角色 |
|---|---|---|
| PAGE-001 | 扫描 | 通用 BLE 主入口 |
| PAGE-002 | Smart HID 配网 | 第一方 Profile 配网流程 |
| PAGE-003 | Smart HID 详情 | 非敏感历史快照与后续动作 |
| PAGE-004 | Smart HID 历史 | 本机历史管理 |
| PAGE-005 | Smart HID 诊断 | 实时诊断与恢复 |
| PAGE-006 | 通用设备详情 | 连接、服务、GATT、日志、OTA |
| PAGE-007 | 已连接 | 活动会话管理与多设备 |
| PAGE-008 | 广播 | 手机 Peripheral 模式 |
| PAGE-009 | 关于 | 产品、平台、帮助与开源入口 |
| PAGE-010 | 版本记录 | 真实发布版本历史 |
| WEB-001 | 公开落地页 | 体验、下载、ESP32、证据和贡献统一入口 |

落地页不是项目最后随便补的一页，而是对外产品界面。它同样必须进行内容审核、操作审核、状态审核、数据来源审核和自动化验收。

---

# 3. 完成状态与证据等级

## 3.1 状态

- `UNREVIEWED`：尚未完成产品审核。
- `NEEDS_CHANGE`：内容或交互不正确。
- `APPROVED`：产品方案已确认。
- `UNPROVEN`：实现存在，但未达到要求证据。
- `PASS`：达到要求证据且结果正确。
- `FAIL`：证据与预期冲突。
- `BLOCKED`：缺工具、硬件、凭据或安全前置。
- `N/A`：平台明确不支持且正确降级。
- `RELEASE_READY`：所有发布门禁通过。

## 3.2 证据等级

```text
E0 文档、路由、静态配置、协议字段
E1 纯逻辑单元测试
E2 Fake Runtime / 集成测试
E3 Android、微信、H5、ESP32 构建
E4 HTML 原型、页面自动化、模拟器和视觉检查
E5 手机真机 + ESP32 / 观察端 / 真实平台结果
E6 干净电脑复现 + 发布产物和公开入口验证
```

涉及 BLE 权限、扫描、连接、GATT、Notify、Peripheral、OTA 和 Smart HID 的正式能力必须达到 E5。正式公开下载和落地页发布必须达到 E6。

---

# 4. 全面执行路线

```text
G0 基线冻结与任务地图
→ G1 10 页 + WEB-001 产品正确性审核
→ G2 运行链路与页面—操作—硬件矩阵
→ G3 产品契约、版本与状态模型冻结
→ G4 HTML App 原型 + 落地页信息架构原型
→ G5 LightBLE Peripheral / Observer 夹具
→ G6 UniApp 通用 BLE 按页面实现
→ G7 开发机 Android / 微信 E5
→ G8 Smart HID PAGE-002～005 与真实链路
→ G9 另一台电脑 BUILD_ONLY / HARDWARE_E5
→ G10 最终落地页、文档、截图、下载与证据
→ G11 Release 工程、RC 与发布
→ G12 发布后烟测
```

每个 Gate 必须：

```text
读取事实源
→ 输出执行前分析
→ 先写失败测试或审核基线
→ 最小实现
→ 专项验证
→ 全量验证
→ 更新矩阵与证据
→ 聚焦提交
→ 停下汇报
```

需要用户确认的 Gate 不得自动越过。

---

# 5. G0：基线冻结与任务地图

## 5.1 目标

建立唯一、可复现的起点，避免在页面审核、固件和落地页上同时使用不同事实。

## 5.2 必须记录

- Git branch、HEAD、工作区状态、远端关系。
- UniApp manifest 版本、package 版本、关于页版本、版本记录首项。
- 10 个页面和四个 Tab。
- 当前 HTML 原型。
- 当前 LightBLE 固件、PlatformIO 环境、固定串口问题。
- 当前 VitePress 首页、导航、SEO、下载链接和 Pages workflow。
- 当前 release workflow。
- HBuilderX、微信开发者工具、Node、Java、PlatformIO 环境。

## 5.3 当前已知高风险

- 落地页仍宣称多平台同时维护、Flutter 主线、Tauri/原生端和“下载全部平台”。
- 多个下载卡片可能指向同一个并不对应当前产品的 Release。
- SEO/OG 文案仍宣称“跨平台大一统开发库”。
- release workflow 仍构建 Flutter APK 和 Tauri Windows，而首版目标已经变为 UniApp。
- UniApp manifest、package、Smart HID lock 中版本存在漂移。
- LightBLE `platformio.ini` 仍可能写死 COM3。

## 5.4 输出

- `docs/verification/full-delivery-baseline.md`
- `docs/verification/full-delivery-gate-board.md`
- 当前版本、页面、固件、落地页和 workflow 清单。

## 5.5 G0 PASS

- 工作区基线明确。
- 没有覆盖用户未提交改动。
- 所有当前入口和高风险被登记。
- 本 Gate 不修改业务行为。

---

# 6. G1：10 页与落地页产品正确性审核

## 6.1 目标

不默认现有代码、产品契约、旧审计或落地页正确。先判断“应该做什么”，再判断“有没有做到”。

## 6.2 页面审核产物

```text
docs/product-review/uniapp-pages/
├── PAGE-001_SCAN.md
├── PAGE-002_HID_PROVISION.md
├── PAGE-003_HID_DETAIL.md
├── PAGE-004_HID_HISTORY.md
├── PAGE-005_HID_DIAGNOSTICS.md
├── PAGE-006_DEVICE_DETAIL.md
├── PAGE-007_CONNECTED.md
├── PAGE-008_BROADCAST.md
├── PAGE-009_ABOUT.md
└── PAGE-010_VERSION.md

docs/product-review/web/
└── WEB-001_LANDING_PAGE.md
```

## 6.3 每个界面的固定审核结构

1. 用户任务和界面存在必要性。
2. 进入来源、参数、正常出口、返回路径。
3. 当前真实内容，从上到下逐区块列出。
4. 保留、修改、删除、缺失内容。
5. 所有按钮、卡片、开关、输入、弹窗和链接。
6. idle、loading、empty、error、permission、unsupported、disconnected、timeout、complete 等状态。
7. 每个字段的数据来源和实时/历史性质。
8. 真实运行链路。
9. ESP32、平台、网络或发布依赖。
10. 第一断点和风险等级。
11. `APPROVED / NEEDS_CHANGE / MERGE / REMOVE` 结论。
12. 用户需要决策的问题。

## 6.4 App 页重点

### PAGE-001 扫描

- 首屏主操作和平台/蓝牙状态。
- 开始、停止、重试和两轮扫描。
- 扫描数量、筛选数量、RSSI、去重和名称来源。
- 卡片主体查看广播详情是否清楚。
- 连接和 Profile 动作是否混淆。
- 权限拒绝、蓝牙关闭、扫描失败、无设备、筛选无结果是否分开。

### PAGE-006 通用设备详情

- 设备身份、连接状态、服务树、GATT、日志、OTA 的信息层级。
- 连接、发现、空服务、失败、断线、重连是否常驻可见。
- Read、TEXT/HEX Write、Notify 是否符合属性。
- 返回后应用级 session 是否保留。
- OTA 没有安全设备时是否应该显示。

### PAGE-007 已连接

- 只展示真实活动 session。
- 复用同一连接。
- 单独/全部断开和部分失败。
- 两设备同 UUID Notify 不串线。

### PAGE-008 广播

- 平台是否真实支持 Peripheral。
- 名称、UUID、Manufacturer 字段是否真实可控。
- 默认 payload、31 字节和 32 字节边界。
- Central/Peripheral 所有权和活动连接保护。
- Observer 真实证据。

### PAGE-009 / PAGE-010

- 产品信息优先于其他小程序推广。
- 真实平台状态、帮助、隐私、开源协议、安全和反馈入口。
- 版本首项与运行时一致。
- 不提前展示未发布能力。

### PAGE-002～005

- 配网、详情、历史、诊断是否职责清楚且不重复。
- 历史快照不得冒充实时。
- token、密码不得展示、路由或持久化。
- Smart HID 真实 E5 后置，但产品内容必须先确定。

## 6.5 WEB-001 落地页重点

必须逐项审核当前首页：

- Hero 是否正确表达当前正式产品。
- 是否错误宣称多平台同时完整维护。
- “6+ 运行入口”“Flutter Mobile Mainline”“下载全部平台”等是否应删除。
- 所有下载按钮是否真实有对应产物。
- 是否明确 Android App + 微信小程序是首版目标。
- 是否有当前版本、当前状态、证据和已知限制。
- 是否有在线原型、ESP32 快速开始、固件、App、微信、文档和贡献入口。
- 是否能在两次点击内到达主要入口。
- SEO、OpenGraph、导航和侧边栏是否仍传播旧定位。
- 手机、桌面、暗色、键盘和读屏是否合理。

## 6.6 G1 PASS

- 10 个 App 页面和 WEB-001 都有完整审核。
- 每个界面有产品结论。
- 核心争议形成决策表。
- 未经用户确认，不进入原型和业务开发。

---

# 7. G2：运行链路与全量矩阵

## 7.1 目标

将每个操作从 UI 追到最终平台 API、ESP32 或外部链接，消除假按钮、假状态和假成功。

## 7.2 必审运行链路

- 启动、平台和权限。
- 扫描开始、停止、超时、hide、第二轮。
- 广播数据归一化、详情和复制。
- 连接、服务发现和错误恢复。
- Read、TEXT Write、HEX Write。
- Notify enable/value/disable。
- 主动断开、被动断开、有限重连。
- 跨 Tab session 和多设备。
- 手机 Peripheral 支持、创建、开始、停止、销毁。
- OTA 文件、Ready、分包、Commit、Success、重启回读。
- Smart HID matcher、Device Info、QR、candidate、status waiter、历史、诊断。
- 关于页外链、复制、分享和小程序跳转。
- 落地页导航、原型、下载、二维码、证据和 GitHub 链接。

## 7.3 输出

- `docs/verification/uniapp-runtime-chain-audit.md`
- `docs/verification/uniapp-esp32-page-operation-matrix.md`
- `docs/verification/landing-page-link-and-claim-matrix.md`

每个 OP 至少记录：

```text
Page/WEB ID
控件与显示条件
当前文件和函数
Runtime / Web 链路
平台 API
ESP32 / Observer / 外部资源行为
成功 UI
失败 UI
清理
自动化
真机
当前状态
第一断点
```

## 7.4 G2 PASS

- 所有可操作项有真实链路或明确 Blocker。
- 全局 BLE callback 所有权唯一。
- session、listener、adapter、Peripheral server 所有权清楚。
- 落地页每个声明有事实源，每个按钮有真实目标。

---

# 8. G3：产品契约、版本和公开状态冻结

## 8.1 目标

根据 G1/G2 审核结果修订正典，不能继续让代码、页面、固件、关于页、落地页和 Release 各自维护版本与状态。

## 8.2 产品契约

更新：

- 功能目录。
- 用户流程。
- 页面契约。
- 平台矩阵。
- ESP32 夹具契约。
- 测试矩阵。
- 发布门禁。
- HTML 原型规范。
- 落地页规范。

建立自动门禁：

- PAGE、FLOW、TEST 和功能编号。
- `pages.json` 路由和 Tab。
- 文档链接和跨 ID 引用。
- H5 不得标真实 BLE Full。
- Smart HID 不占独立 Tab。
- 落地页平台声明不得高于证据。

## 8.3 版本与 Release Metadata

建立唯一版本和发布元数据方案，建议：

```text
VERSION
release/release-manifest.json
scripts/generate-release-metadata.mjs
docs/public/release/latest.json
```

`release-manifest` 至少包含：

- Smart BLE 产品版本。
- Git commit 和 dirty 状态。
- Android 产物名称、SHA、状态。
- 微信小程序 versionName/versionCode、发布状态。
- ESP32 Peripheral / Observer 版本与 SHA。
- Smart HID compatibility 信息。
- 通过的平台和设备。
- evidence run ID。
- 已知限制。
- 可用下载链接；不可用产物必须明确 unavailable，不生成假按钮。

UniApp manifest、package、关于页、版本页和落地页通过生成或自动检查保持一致。

## 8.4 G3 PASS

- 产品正典反映用户确认结果。
- 契约自动门禁通过。
- 版本和公开状态只有一个事实源。
- 当前落地页可以先进入“诚实开发状态”，移除明显错误和假下载。

---

# 9. G4：App HTML 原型与落地页信息架构原型

## 9.1 App 原型

创建：

```text
docs/prototypes/uniapp-reference/
├── index.html
├── prototype.css
├── prototype.js
├── prototype-data.js
└── README.md
```

支持：

- 微信、Android、iOS、H5。
- PAGE-001～010。
- 正常、空、加载、失败、权限、断线、不支持。
- 无设备、LightBLE、一台/两台设备、Smart HID。
- FLOW-001～010。
- H5 不模拟 BLE 成功。

## 9.2 落地页原型

在真正修改 `docs/index.md` 前，先建立内容结构和低风险原型：

- Hero。
- 当前版本与“开发中/预览/已发布”状态。
- 核心闭环。
- 已验证能力与证据标识。
- 平台状态。
- App 真实截图区域。
- 在线交互原型入口。
- ESP32 Peripheral / Observer 介绍与快速开始。
- Android、微信和固件入口。
- 测试证据和已知限制。
- Smart HID Profile。
- 文档、Issue、贡献、安全与许可证。

## 9.3 原型自动化

- App 原型 10 页和 10 流程。
- 落地页手机/桌面信息架构。
- console error = 0。
- 键盘可达、焦点可见、图片 alt。
- 关键 CTA 不超过两次点击。

## 9.4 G4 PASS

- 用户确认 App 页面和落地页内容结构。
- 原型不包含假下载和未验证完整支持。
- 批准后才进入生产实现。

---

# 10. G5：LightBLE ESP32 标准测试夹具

## 10.1 两种固件环境

```text
fixture_peripheral
= 被 Android/微信扫描和连接
= 广播、GATT、Notify、OTA、故障注入

fixture_observer
= 扫描手机 Peripheral
= 串口输出真实广播解析
```

## 10.2 Peripheral 必须提供

- 稳定设备名与版本。
- 主 Service 与 Control/Status/Device Info。
- 权限组合 Service：Read、Write、Notify 及组合。
- LED 关闭、常亮、快闪、慢闪。
- 非法命令错误。
- 周期 Notify 和订阅计数。
- OTA start/ready/data/progress/commit/success/abort/error。
- 重启后版本回读。
- 结构化串口 JSON event。

## 10.3 Fault Injection

- delayed_response。
- disconnect_on_write。
- reject_write。
- notify_burst。
- service disabled/empty service 测试模式。
- ota_wrong_size。
- ota_fail_commit。
- ota_no_success。

故障模式默认关闭，广播和 Device Info 可识别，不能误当正式固件。

## 10.4 Observer 必须提供

- 发现时间。
- 名称。
- RSSI。
- Service UUID。
- Manufacturer ID/Data。
- Service Data。
- 原始广告字节。
- 最后发现时间。

## 10.5 工程要求

- 移除固定 COM3 和开发机路径。
- `main.cpp` 只装配，拆分协议、LED、Notify、OTA、Observer 和 Fault。
- 固件与 TypeScript 常量自动锁定。
- `pio test`。
- 两环境干净构建。
- 产物版本、commit、SHA 和构建元数据。
- 新电脑从零复现教程。

## 10.6 G5 PASS

- 每个通用 BLE Must 操作都有设备客观结果。
- Peripheral 和 Observer 构建、测试通过。
- 未经授权不自动烧写。

---

# 11. G6：UniApp 通用 BLE 按页面实现

严格顺序：

```text
G6-1 平台与权限基础
G6-2 PAGE-001 扫描
G6-3 PAGE-006 通用设备详情
G6-4 PAGE-007 已连接
G6-5 PAGE-008 广播
G6-6 OTA 安全闭环
G6-7 PAGE-009 关于
G6-8 PAGE-010 版本
G6-9 通用 BLE Gate
```

每个子 Gate：

```text
审核 APPROVED
→ 原型 APPROVED
→ 失败测试
→ 最小实现
→ E1/E2
→ Android/微信/H5 构建 E3
→ 页面自动化 E4
→ 更新矩阵
→ 聚焦提交
→ 停下
```

## 11.1 权限和扫描

- 当前官方规则和真机结果决定微信定位策略。
- 蓝牙关闭、首次拒绝、永久拒绝、平台不支持分开。
- 两轮扫描、手动/超时/hide 停止。
- deviceId 去重、RSSI 更新、名称来源和上限。
- 扫描失败不冒充无结果。

## 11.2 通用详情

- 同设备一个连接 attempt。
- 服务和特征发现。
- 加载、空、错误和重试常驻。
- Read、TEXT/HEX Write、Notify。
- tuple 路由和 listener 清理。
- 日志隔离、容量、清空、导出和脱敏。
- 主动/被动断开和有限重连。

## 11.3 会话和多设备

- 应用级 session 跨页面保留。
- PAGE-007 只显示真实活动 session。
- 单独/全部断开和部分失败。
- 同 UUID Notify 不串设备。
- stale session 不覆盖新 session。

## 11.4 Peripheral

- 平台能力和降级。
- 共享 payload 计算。
- 默认合法。
- 31/32 字节。
- Central/Peripheral owner。
- 活动连接保护。
- 真实成功后才显示“广播中”。
- hide/unload 销毁 server 和释放 adapter。

## 11.5 OTA

- 没有批准的可恢复设备和固件时，正式入口禁用或标实验。
- 文件写完不等于成功。
- 必须收到设备 success。
- 重启后回读版本。
- cancel、断线、size mismatch、fail commit、no success 均不得成功。

## 11.6 关于和版本

- 产品信息优先。
- 平台状态来自 release metadata。
- 链接、分享、反馈、隐私、安全和许可证。
- 版本首项等于运行时。
- 不展示未发布能力。

## 11.7 G6 PASS

- 通用 BLE E1～E4 全绿。
- 无 P0/P1 静态问题。
- Smart HID 不阻塞通用 Gate。

---

# 12. G7：开发机 Android / 微信 E5

## 12.1 Android 页面顺序

- PAGE-001：权限、两轮扫描、名称、RSSI、去重、筛选、广播详情。
- PAGE-006：连接、服务、Read/Write/Notify、权限错误、日志、断电、重连、Fault、OTA。
- PAGE-007：两设备、复用、不串线、断开和部分失败。
- PAGE-008：默认 payload、31/32、Observer、停止、模式交接。
- PAGE-009/010：真实版本、链接、分享和限制。

至少一台 Android 12+ 和一台不同厂商/版本设备。

## 12.2 微信页面顺序

使用正式 AppID、稳定基础库和真实微信：

- 权限与定位实际策略。
- 两轮扫描。
- GATT。
- 跨 Tab session 和多设备。
- Central/Peripheral。
- Observer 真实广播。
- 外链复制、小程序跳转、好友和朋友圈分享。

开发者工具最多 E4，不能替代微信真机。

## 12.3 证据

每个 OP 必须同时有：

- 页面结果。
- App 日志。
- ESP32/Observer 串口或第二设备结果。
- 清理和后续状态。
- 截图/视频。
- commit 与 firmware SHA。

## 12.4 G7 PASS

- 通用 Must 功能 Android 和微信 E5。
- 无 P0/P1。
- OTA 若 Blocked，正式产品和落地页必须同步降级。

---

# 13. G8：Smart HID Profile 全链路

通用 BLE Gate 通过后执行 PAGE-002～005：

- 强/弱广播匹配。
- Device Info 身份确认。
- Wi-Fi、Hub、QR 和 token 内存边界。
- candidate 分帧。
- waiter 早于终态。
- state/step 分离。
- 八类错误唯一恢复动作。
- 历史不冒充在线。
- owned/borrowed 诊断 session。
- 高级 BLE 打开当前设备。
- READY 后 ControlHub → MQTT → ESP32 → USB HID 客观结果。

G8 不要求在 Smart BLE 落地页把 Smart HID 宣称为通用 BLE 首要能力；应作为经过验证的第一方 Profile 展示。

---

# 14. G9：另一台电脑独立复现

支持三种模式：

```text
BUILD_ONLY
= 源码、自动化、文档、原型、UniApp 和固件构建

HARDWARE_E5
= 固定 App commit + 固定固件 SHA + 指定板和手机逐页复现

RELEASE_VERIFY
= 下载、安装、二维码、链接、版本、SHA 和公开落地页复现
```

验证机规则：

- 只测试，不修源码。
- HEAD 和 firmware SHA 不匹配即停止。
- 不自动选择串口。
- 不用旧 build、缓存或开发机产物冒充。
- 证据写到仓库外或 ignored 目录。
- 最终 tracked worktree clean。

G9 PASS 后，能力才可进入公开 release metadata。

---

# 15. G10：最终落地页与文档交付

## 15.1 先纠正当前错误定位

生产落地页必须移除或改写：

- “6+ 运行入口同时维护”。
- “Flutter Mobile Mainline”。
- Tauri、Electron、原生 Android/iOS 与 UniApp 同级完整支持。
- “下载全部平台”。
- 多个卡片指向没有对应产物的同一个 Releases 链接。
- 旧的“大一统开发库”SEO/OG 文案。
- 旧 MASTER 文档作为首要入口。

## 15.2 最终信息架构

### Hero

- Smart BLE 产品名。
- 一句话定位：开源的 BLE 调试、学习和 ESP32 联动工具。
- 当前正式版本和状态。
- 主 CTA：体验微信 / 下载 Android（只有真实可用时显示）。
- 次 CTA：在线原型、ESP32 快速开始、源码。

### 核心闭环

```text
发现设备 → 检查广播 → 连接 → Read/Write/Notify
→ 多设备和日志 → 手机广播/OTA → ESP32 观察和验证
```

### 能力卡

每项显示：

- 能力名称。
- 平台。
- `VERIFIED / PREVIEW / BLOCKED / UNSUPPORTED`。
- 对应测试 ID 或证据入口。

### 平台状态

- UniApp Android。
- 微信小程序。
- UniApp iOS 后续。
- H5 降级。
- 其他客户端参考实现。

### 真实产品截图

使用 E4/E5 产出的 PAGE-001、006、007、008 等真实截图，不能用与实现不一致的概念图冒充产品。

### ESP32

- Peripheral / Observer 角色。
- 推荐板型和接线。
- 构建、烧写和串口命令。
- 固件版本、SHA 和下载。
- 功能/测试矩阵。

### 在线原型

- 4 平台、10 页面。
- 正常、空、失败、断线和不支持状态。

### 三条快速开始

1. 体验微信。
2. 安装 Android。
3. 刷 ESP32 并完成第一次联调。

### 测试与可信度

- release commit。
- App/小程序版本。
- 固件版本与 SHA。
- 通过设备。
- evidence run ID。
- 已知限制。

### Smart HID

作为第一方 Profile 展示其配网和诊断作用，并明确实时控制链路和验证状态。

### 开源与贡献

- MIT。
- GitHub、Issue。
- 产品契约。
- Profile 指南。
- 测试设备贡献。
- Security / Code of Conduct。

## 15.3 数据驱动

落地页版本、平台状态、下载和证据优先读取 `docs/public/release/latest.json`，避免人工复制。

不可用产物：

- 不显示下载按钮；或
- 显示“尚未发布”，且不可伪装成可下载。

## 15.4 落地页测试

- VitePress production build。
- Playwright mobile/desktop/dark/light。
- Hero、平台状态、ESP32、原型、证据、下载和贡献入口。
- 所有内部/外部链接。
- 下载文件存在且 SHA 对应。
- 二维码实际可识别和到达正确入口。
- 图片 alt、键盘导航、焦点和对比度。
- 无 console error。
- SEO、OG、canonical URL 正确。

## 15.5 G10 PASS

- 页面一分钟内回答产品、版本、能力、ESP32、下载和贡献。
- 两次点击内到达微信、Android、ESP32、原型和文档。
- 所有公开声明都有 evidence。
- 不展示内部审计过程或敏感数据。

---

# 16. G11：Release 工程与正式发布

## 16.1 CI 收口

- CI 主线以 UniApp、文档、原型和 LightBLE fixture 为主。
- 多平台参考实现可保留独立非阻断 Job 或暂停，不得阻断首版。
- CI 调用统一 verify 入口，不手工漏列测试。
- Playwright 报告作为 Artifact，不跟踪到 Git。

## 16.2 Release Workflow

当前 Flutter APK + Tauri MSI workflow 不能继续代表首版发布。

新 Release 必须围绕真实产物：

- UniApp Android 构建产物或受控手工构建产物。
- 微信小程序版本与发布记录；没有凭据时标 `BLOCKED_BY_CREDENTIAL`，不能假自动上传。
- Peripheral / Observer 固件。
- SHA256SUMS。
- release manifest。
- 测试摘要和已知限制。
- HTML 原型和文档站。

## 16.3 发布门

- Tag、VERSION、manifest、关于页、版本页和落地页一致。
- Clean checkout 构建。
- 所有 artifact SHA 自校验。
- Android 新安装烟测。
- 微信体验/正式版本烟测。
- ESP32 固件从下载到刷写复现。
- 落地页下载、二维码和证据链接有效。

## 16.4 G11 PASS

- Release Candidate 经另一台电脑 `RELEASE_VERIFY`。
- 无 P0/P1。
- Blocked 能力从公开完整能力中移除或明确降级。

---

# 17. G12：发布后烟测

发布后立即执行：

- GitHub/Gitee Release 下载。
- SHA 校验。
- Android 新安装、权限和第一次扫描。
- 微信最小扫描/GATT/分享。
- Peripheral/Observer 固件下载和刷写。
- VitePress 首页、原型、文档、二维码和外部链接。
- 关于页、版本页和落地页版本一致。

失败则暂停“完整可用”声明，修复后重新发布或更新状态。

---

# 18. 证据目录

```text
docs/verification/runs/<run-id>/
├── environment.md
├── baseline.md
├── page-results.md
├── operation-results.md
├── app-logs/
├── esp32-serial/
├── screenshots/
├── videos/
├── artifacts.md
├── link-results.md
├── release-results.md
└── summary.md
```

`run-id`：

```text
YYYYMMDD-HHMM-<app-sha>-<firmware-sha>-<platform>
```

每个 FAIL 必须有：

- PAGE/WEB/OP ID。
- 预期。
- 实际。
- 第一断点。
- App/Web 日志。
- ESP32/Observer 结果。
- 截图或视频。
- 修复 commit。
- 回归结果。

---

# 19. 提交纪律

建议提交顺序：

```text
docs(audit): review UniApp and landing page product surfaces
docs(contract): freeze approved product and release metadata
feat(prototype): implement approved app and landing prototypes
docs(esp32): freeze the BLE fixture contract
test(esp32): implement peripheral and observer fixtures
fix(uniapp): complete <page/flow>
test(hardware): record Android and WeChat evidence
fix(profile): complete Smart HID provisioning and diagnostics
feat(site): publish the evidence-backed Smart BLE landing page
chore(release): ship verified Smart BLE artifacts
```

禁止：

- 自动 push。
- 一个提交跨多个无关 Gate。
- 测试报告、node_modules、build、unpackage 进入提交。
- 没有真机结果却更新公开状态为 VERIFIED。

---

# 20. 当前下一步

现在执行：

```text
G0 基线冻结
+
G1 PAGE-001～010 与 WEB-001 产品正确性审核
+
G2 运行链路、页面—操作—ESP32 矩阵和落地页声明/链接矩阵
```

完成后必须先给用户审阅：

- 10 个 App 页面结论。
- 落地页内容与定位结论。
- OTA 首版决策。
- Smart HID 历史/诊断页面职责。
- 版本和下载策略。
- LightBLE Peripheral / Observer 能力。

用户确认后才进入 G3/G4。

---

# 21. 最终完成定义

只有以下全部成立，才可宣布本任务完成：

1. 10 个 App 页面和落地页均通过产品正确性审核。
2. 所有操作有真实 Runtime/Web 链路。
3. 产品契约、页面、固件、关于页、版本页和落地页一致。
4. Peripheral 和 Observer 固件可重复构建、测试和烧写。
5. Android 通用 BLE Must 达到 E5。
6. 微信通用 BLE Must 达到 E5。
7. 多设备不串线，连接和资源清理正确。
8. OTA 不假成功；无法安全验证时正式降级。
9. Smart HID PAGE-002～005 和真实链路完成或明确发布范围。
10. 另一台电脑 BUILD_ONLY、HARDWARE_E5 和 RELEASE_VERIFY 达到目标。
11. 落地页只展示已验证能力和真实可用入口。
12. 下载、二维码、文档、证据、版本和 SHA 无断链。
13. Release workflow 与 UniApp 首版目标一致，不再用 Flutter/Tauri 产物冒充主版本。
14. 新安装 Android、微信最小烟测和 ESP32 从零复现通过。
15. 所有未完成能力明确为 PREVIEW、BLOCKED、UNSUPPORTED 或 NOT RELEASED。
