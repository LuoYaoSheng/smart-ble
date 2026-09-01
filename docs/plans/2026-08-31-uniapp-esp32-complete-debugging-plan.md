# UniApp × ESP32 完整调试与页面正确性总计划

> 日期：2026-08-31
> 状态：SUPERSEDED / 已被全面产品交付总任务替代
> 当前执行：[`2026-08-31-uniapp-esp32-full-product-delivery-plan.md`](./2026-08-31-uniapp-esp32-full-product-delivery-plan.md)
> 保留原因：本文仍可作为 UniApp 页面与 ESP32 调试的子计划参考，但未完整覆盖落地页、版本元数据、Release、另一台电脑 RELEASE_VERIFY 和发布后烟测。

---

## 0. 本计划纠正什么

此前计划把重点放到了跨仓治理、Smart HID 发布工程和长期路线，顺序不符合当前目标。

当前不应该先做：

- 两仓大规模治理。
- Smart HID 三操作系统、BIOS、发布链等后续工作。
- 多客户端同步改造。
- 官网和正式发布包装。
- 先写一堆契约检查，再默认页面设计本身正确。

当前首先要完成的是：

```text
逐页判断产品内容是否正确
→ 逐操作确认运行链路是否真实存在
→ 用 HTML 原型确认页面与交互
→ 把 ESP32 做成可观察、可复现的测试夹具
→ UniApp 按页面逐项接通 ESP32
→ Android 真机逐页验收
→ 微信真机逐页验收
→ 通用 BLE 全绿后再验证 Smart HID Profile
```

核心原则：

> **不是“页面能打开”就算完成，也不是“ESP32 能被扫到”就算完成。必须证明页面显示正确、按钮有意义、状态真实、跳转合理、设备确实执行、错误可以恢复。**

---

## 1. 当前唯一产品主线

### 1.1 第一阶段正式范围

```text
UniApp Android App
+
BLE Toolkit+ 微信小程序
+
LightBLE ESP32 标准测试夹具
```

优先完成通用 BLE 核心：

- 扫描。
- 广播数据查看。
- 连接。
- 服务和特征值发现。
- Read。
- TEXT / HEX Write。
- Notify / Indicate。
- 多设备会话。
- 主动、被动断开与恢复。
- 手机 Peripheral 广播。
- OTA 安全闭环。
- 日志和错误反馈。

### 1.2 当前不作为第一阻断项

- Flutter。
- 原生 Android / iOS。
- Tauri / Electron / macOS Native。
- H5 真实 BLE。
- Smart HID 完整产品验收。
- 官网、下载中心和正式 Release。

H5 只作为页面和交互降级验证，不宣称真实 BLE。

### 1.3 Smart HID 的位置

Smart HID 保留在现有 10 页中，但分成两个层次：

1. **页面和交互正确性**：第一阶段一起审核，确保内容、状态、跳转和文案正确。
2. **真实硬件 E5**：通用 BLE + LightBLE 全绿后，再使用 `Smart-HID-Workspace` 固件和 ControlHub 验证。

Smart HID 不再阻塞通用 BLE 第一闭环。

---

## 2. “页面正确”的统一标准

任何页面都必须同时回答以下问题，缺一项都不能进入开发完成态。

### 2.1 页面存在的理由

- 这个页面解决什么任务？
- 为什么不能合并到上一页？
- 用户从哪里进入？
- 完成后应该去哪里？
- 是否存在重复入口、死路或无意义页面？

### 2.2 首屏内容

- 首屏最重要的信息是什么？
- 主操作是否无需滚动就能看到？
- 是否有装饰内容挤压核心操作？
- 页面标题是否重复显示？
- 是否显示用户理解当前状态所需的信息？

### 2.3 页面操作

每个按钮、卡片、开关、输入框、列表项都要登记：

- 显示条件。
- 禁用条件。
- 点击后调用什么。
- 是否需要二次确认。
- 成功反馈。
- 失败反馈。
- 是否会跳转。
- 返回后状态是否保留。

### 2.4 页面状态

根据页面需要，至少覆盖：

```text
idle
loading
empty
success / complete
error
permission denied
unsupported
disconnected
reconnecting
timeout
cancelled
```

禁止：

- 空白页面。
- 假成功。
- 按钮点击无反应。
- 只显示 Toast、不保留错误状态。
- 把历史数据显示成实时数据。
- 把扫描失败显示成“无设备”。

### 2.5 数据来源

每个字段都必须注明来源：

- 静态产品配置。
- UniApp Runtime。
- Pinia Store。
- BLE 广播。
- GATT Read。
- Notify。
- ESP32 Device Info。
- 本地历史。
- 平台能力检测。

没有数据来源的指标不得出现，例如无健康模型时不能写“连接稳定”。

### 2.6 ESP32 对应关系

涉及 BLE 的页面必须说明：

- 需要 ESP32 广播什么。
- 需要哪些 Service / Characteristic。
- 客户端发送什么。
- ESP32 如何响应。
- LED、串口、Notify 或重启提供什么客观结果。
- 错误如何注入和复现。

### 2.7 证据等级

```text
E0：文档、路由、静态配置
E1：纯函数和单元测试
E2：Fake Runtime / 集成测试
E3：Android、微信、H5 构建
E4：页面自动化、原型和模拟器
E5：手机真机 + ESP32 / 观察端
```

涉及蓝牙射频、权限、GATT、Peripheral 和 OTA 的 Must 功能必须达到 E5。

---

## 3. 10 页重新审核，不默认现有契约正确

现有 `docs/product-contract/` 是重要基线，但本轮必须重新用“产品目的 + 当前代码 + ESP32 可验证性”复核，不能为了维护文档而默认文档正确。

对每个页面产生独立审核记录：

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
```

每份审核必须包含：

```text
A. 页面目标
B. 进入来源和退出路径
C. 当前页面实际内容
D. 应保留内容
E. 应删除内容
F. 缺失内容
G. 所有操作表
H. 所有状态表
I. 运行链路
J. ESP32 / 平台依赖
K. 当前第一断点
L. 修改建议
M. 验收用例
N. 产品结论：APPROVED / NEEDS_CHANGE / REMOVE / MERGE
```

### 3.1 PAGE-001 扫描

必须确认的内容：

- 产品和蓝牙状态是否需要出现在首屏。
- “开始扫描 / 停止扫描 / 重试”是否清楚。
- 扫描结果数量与筛选后数量是否分清。
- 历史 Smart HID 是否应在首屏显示，放在哪里才不干扰通用扫描。
- 设备卡片主体点击是看广播详情，还是连接；必须一眼可懂。
- “连接”和 Profile 专属动作不能混淆。
- 名称、deviceId、RSSI、Profile、已连接状态如何展示。
- 无设备、筛选无结果、权限拒绝、蓝牙关闭、扫描失败必须区分。

ESP32 验证：

- 两轮独立扫描。
- 广播名和 Service UUID。
- RSSI 更新不重复。
- ESP32 重启和断电后的列表变化。
- 广播数据弹窗与串口/固件常量一致。

### 3.2 PAGE-002 Smart HID 配网

第一阶段只审核页面和交互，E5 后置。

必须确认：

- 是否真的只需要“连接 → 填写配置 → 查看状态”三个阶段。
- Wi-Fi、Hub、扫码信息是否重复。
- token 是否永不显示和持久化。
- 连接失败、身份错误、扫码取消、二维码非法、下发中、超时、八类错误的内容是否正确。
- 取消等待、离页确认和恢复动作是否明确。

### 3.3 PAGE-003 Smart HID 详情

必须确认：

- 页面展示的是历史快照，不是实时在线状态。
- 是否需要展示 Wi-Fi、Hub、固件、协议、上次成功时间。
- “重新配置 / 实时诊断 / 高级 BLE”是否都是必要动作。
- 高级 BLE 是否打开当前设备上下文。

### 3.4 PAGE-004 Smart HID 历史

必须确认：

- 是否有独立页面的必要性。
- 与扫描页历史区是否重复。
- 查看、移除、重配、诊断的入口如何安排。
- 移除只是移除本机记录，不改变设备配置。
- 过期、去重和数量上限如何表达。

### 3.5 PAGE-005 Smart HID 诊断

必须确认：

- BLE、Wi-Fi、ControlHub、MQTT/控制连接、Ready 五项是否足够。
- 尚未检测、检测中、实时结果、离线、失败是否区分。
- 是否需要复制诊断报告和检测时间。
- 页面借用连接还是自己建立连接，返回后是否关闭。

### 3.6 PAGE-006 通用设备详情

这是第一阶段核心页面。

必须确认首屏与区块：

```text
设备身份和连接状态
→ 连接 / 断开 / 重试
→ 服务与特征值树
→ Read / Write / Notify
→ 通信日志
→ OTA 入口
```

必须确认：

- 连接中、发现服务中、空服务、失败、断线、重连是否常驻可见。
- Characteristic 属性是否准确。
- TEXT 和 HEX 写入是否应该放一个弹窗。
- Notify 开关如何表示真实订阅状态。
- 日志是否按设备隔离。
- OTA 是否应在没有批准固件时显示。
- 返回后连接是否保留到 PAGE-007。

ESP32 验证：

- 主服务。
- 权限组合服务。
- Device Info。
- LED 命令。
- Read。
- Write。
- Notify。
- 非法操作由 BLE 栈拒绝。
- 断电触发被动断开。
- 故障注入。
- OTA 完整状态。

### 3.7 PAGE-007 已连接

必须确认：

- 只显示真实活动会话，不混扫描结果和历史。
- 卡片显示当前连接，不写“稳定”。
- 打开详情是否复用同一会话。
- 单独断开和全部断开如何显示部分失败。
- 空态是否能返回扫描。
- 两台设备 Notify 是否串线。

ESP32 验证：

- 至少两台夹具，或一个夹具加另一台 BLE 设备。
- 同 UUID 特征通知不串设备。
- 断开 A 不影响 B。

### 3.8 PAGE-008 广播

这是第一阶段核心页面。

必须确认：

- 当前平台是否支持 Peripheral。
- 名称、Service UUID、Manufacturer ID/Data 哪些字段真实可控。
- 31 字节预算计算是否与平台一致。
- 默认值必须可以直接开始广播。
- 活动 Central 连接存在时怎么处理。
- “检查支持 / 开始 / 停止”是否重复或混乱。
- 广播中、停止中、失败和不支持是否明确。

ESP32 验证：

- 需要 LightBLE Observer 模式扫描手机。
- 串口输出名称、Service UUID、Manufacturer Data、RSSI 和原始字节。
- 31 字节成功。
- 32 字节客户端拦截，ESP32 不应观察到新广播。
- 停止后观察端不再发现。

### 3.9 PAGE-009 关于

必须确认：

- 产品名称与版本。
- 当前平台能力与限制。
- 官网、仓库、文档、ESP32 教程、反馈、分享。
- 其他小程序推广不能压过产品本身。
- 是否需要隐私、安全和开源协议入口。
- 未验证能力不得写“完整支持”。

无需 ESP32，但要做链接、分享和平台降级测试。

### 3.10 PAGE-010 版本记录

必须确认：

- 首项版本等于运行时版本。
- 日期和新增/修复/优化内容真实。
- 不显示并不存在的发布能力。
- 进入时回到顶部，返回路径正确。

无需 ESP32。

---

## 4. 页面—操作—运行链路—ESP32 矩阵

在任何业务修改前，先建立：

```text
docs/verification/uniapp-esp32-page-operation-matrix.md
```

每个可操作项一行，字段固定为：

| 字段 | 含义 |
|---|---|
| Page ID | PAGE-001～010 |
| 页面区域 | 卡片、列表、弹窗、状态区等 |
| 控件/操作 | 用户实际操作 |
| 显示条件 | 何时出现 |
| 当前实现 | 当前代码路径 |
| 预期行为 | 产品正确结果 |
| Runtime 链路 | page → component → composable/store → service/runtime → API |
| ESP32 行为 | 广播/GATT/LED/Notify/重启/串口 |
| 成功 UI | 页面应显示什么 |
| 失败 UI | 页面应显示什么 |
| 清理 | listener/session/adapter 如何清理 |
| 自动化 | E1/E2/E4 用例 |
| 真机 | E5 步骤 |
| 当前状态 | PASS / FAIL / BLOCKED / UNPROVEN |
| 第一断点 | 最早不符合的位置 |

规则：

- 不能只列“页面支持连接”，必须拆成点击、Runtime 调用、ESP32 连接、服务发现、页面结果。
- 一个功能经过多个页面时，每个页面的责任分别列出。
- 当前无硬件证据的项目全部从 `UNPROVEN` 开始。

---

## 5. Gate U0：逐页产品正确性审核

### 5.1 输入

- `docs/product-contract/`
- `docs/product-audit/`
- `docs/prototypes/`
- `apps/uniapp/pages.json`
- `apps/uniapp/pages/**/*.vue`
- 页面使用的组件、composable、store 和 service

### 5.2 执行

对 PAGE-001～010：

1. 读取页面完整源码。
2. 读取所有直接组件。
3. 读取所有事件处理函数。
4. 追到 store/service/runtime。
5. 对照产品契约。
6. 对照现有原型。
7. 形成页面审核记录。
8. 明确契约错、代码错、两者都错或只是缺证据。
9. 更新页面契约草案。
10. 停下给用户审阅页面内容，不直接开发。

### 5.3 Gate U0 PASS

- 10 页均有独立审核记录。
- 每页内容、操作、状态、跳转和数据来源完整。
- 不再存在“页面能打开但不知道做什么”的条目。
- 每页有明确产品结论。
- 用户确认核心页面设计后，才进入原型和代码。

---

## 6. Gate U1：完整运行链路审计

### 6.1 目标

不是看函数是否存在，而是把每个操作追到最终平台 API 和设备反馈。

示例：

```text
PAGE-001 点击开始扫描
→ useBleScan.start
→ scan-permission
→ store/ble.startScan
→ scan-session
→ ble-runtime.openAdapter
→ uni.startBluetoothDevicesDiscovery
→ onBluetoothDeviceFound
→ device collection 去重
→ 页面列表更新
→ 5 秒停止 / 手动停止 / hide 停止
```

### 6.2 必审链路

- 启动与权限。
- 扫描开始、停止、第二轮。
- 广播解析和复制。
- 连接和服务发现。
- Read。
- TEXT Write。
- HEX Write。
- Notify 开、值、关。
- 主动断开。
- 被动断开和有限重连。
- 跨 Tab 会话。
- 多设备。
- 手机 Peripheral。
- OTA。
- Smart HID 连接、扫码、candidate、status、历史、诊断。
- 关于页外链、分享和小程序跳转。

### 6.3 输出

- 更新页面操作矩阵。
- `docs/verification/uniapp-runtime-chain-audit.md`
- 每条 FAIL 的第一断点。
- 不在审计时顺手重构。

### 6.4 Gate U1 PASS

- 所有用户操作都能追到最终 API 或明确 Blocker。
- 全局 `uni.onBLE*` 只有 Runtime 持有。
- listener、session、adapter 的所有权清楚。
- 不存在假按钮、假状态和假成功。

---

## 7. Gate U2：新版 HTML 交互母版

### 7.1 目标

只实现审核后确认的内容，不照抄现有页面，也不凭设计感新增功能。

目录：

```text
docs/prototypes/uniapp-reference/
├── index.html
├── prototype.css
├── prototype.js
├── prototype-data.js
└── README.md
```

### 7.2 工具栏

- 平台：微信 / Android / iOS / H5。
- 页面：PAGE-001～010。
- 场景：正常、空、加载、失败、权限、断线、不支持。
- 数据：无设备、LightBLE、两台设备、Smart HID。
- 重置。

### 7.3 验证

- 每页正常态。
- 每页关键空态。
- 每页关键失败态。
- 主操作和返回路径可点击。
- FLOW-001～010 无死路。
- H5 不模拟 BLE 成功。
- 移动视口首屏主操作可见。
- Playwright console error = 0。

### 7.4 Gate U2 PASS

用户确认页面和流程后，才允许同步到 UniApp 业务代码。

---

## 8. Gate E0：LightBLE ESP32 测试夹具设计

### 8.1 测试夹具不是演示代码

它必须为 UniApp 每项核心功能提供确定、可观察的设备结果。

建议支持两个构建环境：

```text
fixture_peripheral
= 被 UniApp 扫描和连接
= GATT / Notify / OTA / 故障注入

fixture_observer
= 扫描手机 Peripheral 广播
= 串口输出解析结果
```

同一块板可以分别刷两个模式；多设备测试需要两块板或一块板加另一台 BLE 设备。

### 8.2 Peripheral 模式能力

#### 广播

- 固定设备名。
- 固定主 Service UUID。
- 固件版本。
- 测试模式标记。

#### 主服务

- Control：Read / Write / Notify。
- Status：周期 Notify。
- Device Info：JSON Read。

#### 权限服务

- READ_ONLY。
- WRITE_ONLY。
- NOTIFY_ONLY。
- READ_WRITE。
- READ_NOTIFY。
- WRITE_NOTIFY。
- ALL。

#### LED 命令

- 关闭。
- 常亮。
- 快闪。
- 慢闪。
- 非法命令明确错误。

#### OTA

- start。
- ready。
- data。
- progress。
- commit。
- success。
- abort。
- error。
- 重启后版本回读。

#### 故障注入

- delayed_response。
- disconnect_on_write。
- reject_write。
- notify_burst。
- empty_services / service_disabled（通过构建模式或配置模拟）。
- ota_wrong_size。
- ota_fail_commit。
- ota_no_success。

### 8.3 Observer 模式能力

串口输出：

- 发现时间。
- 名称。
- RSSI。
- Service UUID。
- Manufacturer ID/Data。
- 原始广告字节。
- 停止后最后发现时间。

用于验证 PAGE-008。

### 8.4 串口日志规范

每个设备事件输出机器可读一行 JSON，例如：

```json
{"event":"write","service":"...","characteristic":"...","hex":"FF01","result":"led_on"}
```

客户端证据可以与串口事件按时间关联。

### 8.5 Gate E0 PASS

- 协议和页面操作矩阵一一对应。
- 不再使用固定 COM3。
- 每个 Must 功能有设备可观察结果。
- 故障模式默认关闭且不会误作正式模式。

---

## 9. Gate E1：ESP32 实现与自动测试

### 9.1 结构拆分

`main.cpp` 只负责装配，建议拆分：

```text
ble_fixture.cpp
advertising.cpp
gatt_services.cpp
command_protocol.cpp
led_controller.cpp
device_info.cpp
notify_engine.cpp
ota_state.cpp
fault_injection.cpp
observer.cpp
```

### 9.2 自动测试

至少覆盖：

- UUID 和设备名锁。
- LED 命令。
- 非法命令。
- Device Info JSON。
- 权限组合。
- Notify 频率和停止。
- OTA 状态机。
- 所有故障注入。
- 31/32 字节测试数据 fixture。

### 9.3 构建

- `pio run -e fixture_peripheral`
- `pio run -e fixture_observer`
- `pio test`
- 产物记录 commit、版本、SHA-256。

### 9.4 Gate E1 PASS

- 新电脑可无修改构建。
- 两种模式构建通过。
- 单测通过。
- 固件和 TypeScript 协议自动比较。

---

## 10. Gate U3：按页面顺序接通 UniApp

不能一次性全改。每页使用同一闭环：

```text
页面审核 APPROVED
→ 原型 APPROVED
→ 写失败测试
→ 修改页面/公共层
→ E1/E2
→ Android/微信构建 E3
→ 页面自动化 E4
→ ESP32 真机 E5
→ 保存证据
→ 单独提交
```

### 10.1 实施顺序

```text
U3-1 PAGE-001 扫描
→ U3-2 PAGE-006 通用设备详情
→ U3-3 PAGE-007 已连接
→ U3-4 PAGE-008 广播
→ U3-5 PAGE-009 关于
→ U3-6 PAGE-010 版本
→ 通用 BLE Gate 通过
→ U3-7 PAGE-002～005 Smart HID 页面与 Profile
```

原因：

- 扫描是所有链路入口。
- 通用详情承接 GATT 核心。
- 已连接依赖稳定 Session。
- 广播需要独立模式所有权。
- 关于和版本最后收口真实能力声明。
- Smart HID 复用已验证 Runtime，不能反过来拖着通用层一起调。

### 10.2 每页提交要求

- 一个页面或一个共享正确性问题一个提交。
- 不在页面修复中顺手同步其他客户端。
- 每个提交写明测试用例 ID 和证据等级。

---

## 11. Gate A1：Android + ESP32 逐页真机验收

### 11.1 环境

至少：

- Android 12+ 一台。
- 不同厂商或不同 Android 版本一台。
- LightBLE Peripheral 一块。
- LightBLE Observer 一块，或第二观察设备。
- 多设备测试所需第二 BLE 设备。

### 11.2 顺序

#### PAGE-001

- 蓝牙关闭。
- 权限首次拒绝、允许、永久拒绝。
- 两轮扫描。
- 手动、超时、hide 停止。
- 名称解析。
- RSSI 更新和去重。
- 筛选。
- 广播详情和复制。

#### PAGE-006

- 连接和服务发现。
- 空服务/失败/重试。
- Read。
- TEXT/HEX Write。
- Notify。
- 权限错误。
- 日志。
- 断电和重连。
- OTA 正常和失败。

#### PAGE-007

- 会话跨页保留。
- 两设备。
- 不串 Notify。
- 单独和全部断开。
- 部分失败。

#### PAGE-008

- 支持检测。
- 默认 payload。
- 31/32 字节。
- Observer 实际结果。
- 停止和离页。
- 与 Central 会话冲突。

#### PAGE-009 / 010

- 版本、文案、链接、反馈、分享。
- 不夸大能力。

### 11.3 Gate A1 PASS

- 核心 Must 全部 E5。
- 无 P0/P1。
- 每个页面有独立结果记录。

---

## 12. Gate W1：微信 + ESP32 逐页真机验收

使用正式 AppID、稳定基础库和真实微信版本。

按同样页面顺序执行：

- PAGE-001 扫描和权限。
- PAGE-006 GATT。
- PAGE-007 会话和多设备。
- PAGE-008 微信 Peripheral + Observer。
- PAGE-009/010 分享、外链和小程序跳转。

明确微信差异：

- 定位权限策略必须基于当前文档和真机结果。
- central/peripheral 模式所有权。
- 文件选择 OTA 能力。
- 外部 URL 降级。
- 开发者工具只算 E4，真机才算 E5。

### Gate W1 PASS

- TEST-W 通用 BLE 条目 E5。
- 页面内容和 Android 语义一致，但符合微信平台规则。

---

## 13. Gate H1：Smart HID Profile 后置验证

只有 A1、W1 通用 BLE Gate 通过后进入。

验证 PAGE-002～005：

- Profile 广播强/弱匹配。
- Device Info 身份确认。
- Wi-Fi / Hub / QR。
- candidate 分帧。
- 快速 status 不丢失。
- 八类错误恢复。
- 历史不冒充在线。
- 诊断连接所有权。
- 高级 BLE 进入当前设备。
- READY 后 ControlHub 实际控制 USB HID。

Smart HID 问题不得再污染或重写通用 BLE Runtime。

---

## 14. Gate R1：发布前收口

只在通用 BLE 和计划发布的 Profile 都有证据后执行：

- 更新产品契约最终状态。
- 更新关于页和版本页。
- 更新落地页。
- 更新 ESP32 教程和固件下载。
- 标明平台限制。
- 新电脑重复构建和测试。
- 发布包绑定 App commit、固件 commit、固件 SHA 和证据 run ID。

---

## 15. 证据目录

每轮：

```text
docs/verification/runs/<run-id>/
├── environment.md
├── page-results.md
├── operation-matrix.md
├── app-logs/
├── esp32-serial/
├── screenshots/
├── videos/
├── artifacts.md
└── summary.md
```

`run-id`：

```text
YYYYMMDD-HHMM-<smart-ble-sha>-<firmware-sha>-<platform>
```

每个 FAIL 必须记录：

- 页面 ID。
- 操作 ID。
- 前置条件。
- 预期。
- 实际。
- 第一断点。
- App 日志。
- ESP32 串口事件。
- 截图或视频。
- 修复提交。
- 回归结果。

---

## 16. 当前正确执行顺序

```text
U0：10 页内容和产品目的重新审核
→ 用户确认核心页面
→ U1：所有操作运行链路审计
→ 建立页面—操作—ESP32 矩阵
→ U2：新版 HTML 交互母版
→ 用户确认原型
→ E0/E1：LightBLE Peripheral + Observer 测试夹具
→ U3：按 PAGE-001、006、007、008、009、010 顺序接通
→ A1：Android + ESP32 E5
→ W1：微信 + ESP32 E5
→ H1：Smart HID PAGE-002～005 E5
→ R1：落地页与发布
```

---

## 17. 第一执行包

当前下一步只执行：

```text
U0：10 页产品正确性审核
+
U1：运行链路审计
+
建立页面—操作—ESP32 矩阵
```

本包暂不修改业务代码，不重构 ESP32，不做发布治理。

完成后需要用户确认：

- 页面是否应该存在。
- 页面首屏内容。
- 每个操作是否有必要。
- 页面跳转是否合理。
- Smart HID 历史/诊断入口是否重复。
- OTA 是否首版保留。
- 关于页应展示什么。

确认之后再画新版 HTML 原型和开发代码。

---

## 18. 最终完成定义

只有以下全部成立，才算 UniApp × ESP32 调试完整：

1. 10 页均经过产品正确性审核。
2. 所有页面内容、操作、状态和跳转有明确结论。
3. 所有用户操作有完整运行链路。
4. LightBLE Peripheral 可验证扫描、连接、GATT、Notify、OTA 和故障。
5. LightBLE Observer 可验证手机广播。
6. Android 核心页面达到 E5。
7. 微信核心页面达到 E5。
8. 多设备不串线。
9. 主动、被动断开和清理正确。
10. OTA 不假成功，重启后版本回读正确；不能安全验证时明确禁用。
11. 页面无假按钮、空白态、死路和历史冒充实时。
12. 关于页和落地页只声明已验证能力。
13. Smart HID 在通用 Runtime 全绿后独立完成 E5，不反向污染通用层。
14. 另一台电脑能用相同 commit 和固件 SHA 复现构建与真机流程。
