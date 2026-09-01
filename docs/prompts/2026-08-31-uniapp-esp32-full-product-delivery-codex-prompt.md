# Codex 提示词：Smart BLE UniApp × ESP32 全面产品交付总任务

> 这是当前唯一主执行提示词。
> 它覆盖 App 页面、运行链路、ESP32 测试夹具、Android/微信真机、Smart HID、公开落地页、Release 和另一台电脑复现。
> 严格按 Gate 推进；当前首次执行只完成 G0～G2，完成后停下给用户审阅，不自动进入产品修改和代码开发。

---

## 可直接复制给 Codex

```text
你现在要执行 Smart BLE UniApp × ESP32 全面产品交付任务。

工作区根目录通常为：

/Users/luoyaosheng/Desktop/project/Open

目标仓库：

<OPEN_ROOT>/smart-ble

当前唯一计划：

<OPEN_ROOT>/smart-ble/docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md

当前 Gate 看板：

<OPEN_ROOT>/smart-ble/docs/verification/full-delivery-gate-board.md

==================================================
一、最终任务目标
==================================================

交付一个完整、可信、可复现的 Smart BLE 第一正式版本：

1. UniApp Android App。
2. BLE Toolkit+ 微信小程序。
3. H5 正确降级页面。
4. LightBLE ESP32 Peripheral 测试夹具。
5. LightBLE ESP32 Observer 测试夹具。
6. Smart HID 第一方 Profile。
7. 10 页 HTML 交互原型。
8. VitePress 公开落地页和开发者文档。
9. Android、微信和 ESP32 真实证据。
10. 真实版本、下载、SHA、证据、限制和发布产物。
11. 另一台电脑 BUILD_ONLY、HARDWARE_E5、RELEASE_VERIFY 复现。

完整路线：

G0 基线冻结
→ G1 PAGE-001～010 + WEB-001 产品审核
→ G2 Runtime/Web 链路与全量矩阵
→ 用户确认
→ G3 产品契约、版本和公开状态冻结
→ G4 App/落地页原型
→ G5 ESP32 Peripheral/Observer
→ G6 UniApp 通用 BLE 实现
→ G7 Android/微信 E5
→ G8 Smart HID E5
→ G9 另一台电脑复现
→ G10 落地页与文档终稿
→ G11 Release
→ G12 发布后烟测

本提示词包含后续所有 Gate 的执行规则，但当前首次执行范围固定为：

G0 + G1 + G2

完成后必须停下，不自动进入 G3。

==================================================
二、总纪律
==================================================

1. 两个概念不能混淆：
   - 页面存在/能打开；
   - 页面内容、操作、状态和链路正确。
2. 代码存在不等于功能完成。
3. 单元测试和模拟器不能代替 E5。
4. ESP32 能被扫描到不能代替 GATT/Notify/OTA 正确。
5. 网站能构建不能代替下载、二维码和版本真实。
6. 当前首版主线是 UniApp Android + 微信 + LightBLE ESP32 + VitePress 落地页。
7. Flutter、原生客户端和桌面端不是首版阻断项，不在本任务中同步开发。
8. Smart HID 页面从一开始审核，但真实 E5 在通用 BLE Gate 后执行。
9. 不恢复 Cloud、账号、会员、支付、License、订单。
10. 不自动 push、tag、部署或发布。
11. 不 reset、stash、checkout、rebase 或覆盖用户已有改动。
12. 一次只执行明确 Gate，旁支问题登记，不顺手扩张。
13. 需要用户确认的 Gate 不得自动越过。
14. 没有真实执行的项目不得写 PASS。
15. 状态只能使用明确值：
    UNREVIEWED / NEEDS_CHANGE / APPROVED / UNPROVEN /
    PASS / FAIL / BLOCKED / N/A / RELEASE_READY。
16. 公开状态只使用：
    VERIFIED / PREVIEW / BLOCKED / UNSUPPORTED / NOT_RELEASED。
17. 敏感信息不得进入文档、日志、URL、截图、证据或提交。

==================================================
三、产品界面编号
==================================================

统一使用：

PAGE-001 pages/index/index 扫描
PAGE-002 pages/hid/add Smart HID 配网
PAGE-003 pages/hid/detail Smart HID 详情
PAGE-004 pages/hid/history Smart HID 历史
PAGE-005 pages/hid/diagnostics Smart HID 诊断
PAGE-006 pages/device/detail 通用设备详情
PAGE-007 pages/connected/index 已连接
PAGE-008 pages/broadcast/index 广播
PAGE-009 pages/about/index 关于
PAGE-010 pages/about/version 版本记录
WEB-001 docs/index.md 公开落地页

旧审计 P001～P010 如果排序不同，只记录历史映射，不继续混用。

==================================================
四、当前首次执行：G0～G2
==================================================

本轮允许：

- 读取整个 smart-ble 仓库。
- 新建产品审核、运行链路和矩阵文档。
- 更新 Gate 看板。
- 运行只读静态检查和已有自动化，以证明当前事实。
- 做一个聚焦文档提交，不 push。

本轮禁止：

- 修改 apps/uniapp 业务代码。
- 修改 hardware/esp32/LightBLE 固件。
- 修改 core BLE 业务实现。
- 修改 docs/index.md、VitePress 配置或 CSS。
- 新建生产 HTML 原型。
- 修改 Release workflow。
- 固件烧写和真机测试。
- 直接修正产品契约。
- 自动进入 G3。

==================================================
五、G0：基线冻结与任务地图
==================================================

在仓库执行并记录：

- git status --short --branch
- git rev-parse HEAD
- git log --oneline --decorate -n 12
- git remote -v
- git branch -vv

若工作区存在用户已有改动：

- 列出全部变更。
- 不覆盖。
- 若无法安全只写 docs/product-review 和 docs/verification，输出 DIRTY_WORKTREE_BLOCKED 并停止。

读取并建立基线：

A. 产品与页面

- README.md
- AGENTS.md
- apps/uniapp/pages.json
- apps/uniapp/manifest.json
- apps/uniapp/package.json
- apps/uniapp/README.md
- docs/product-contract/README.md
- docs/product-contract/01_PRODUCT_SCOPE.md
- docs/product-contract/02_FEATURE_CATALOG.md
- docs/product-contract/03_USER_FLOWS.md
- docs/product-contract/04_PAGE_CONTRACTS.md
- docs/product-contract/05_PLATFORM_MATRIX.md
- docs/product-contract/06_ESP32_REFERENCE.md
- docs/product-contract/07_TEST_MATRIX.md
- docs/product-contract/08_RELEASE_GATES.md
- docs/product-contract/09_HTML_PROTOTYPE_SPEC.md
- docs/product-contract/10_LANDING_PAGE_SPEC.md

B. 既有审计和验证

- docs/product-audit/**/*
- docs/verification/**/*
- docs/prototypes/**/*
- tests/unit/**/*
- apps/uniapp/pages/**/*.test.js

C. 实现

- apps/uniapp/pages/**/*.vue
- 页面直接引用的 components
- composables
- store
- services
- utils
- core/ble-core
- core/protocols

D. ESP32

- hardware/esp32/LightBLE/platformio.ini
- hardware/esp32/LightBLE/README.md
- hardware/esp32/LightBLE/src/main.cpp
- hardware/esp32/LightBLE/test 或现有测试目录
- core/protocols/smart-ble-protocol.ts

E. 落地页、文档和发布

- docs/index.md
- docs/.vitepress/config.mjs
- docs/.vitepress/theme/style.css
- docs/package.json
- .github/workflows/ci.yml
- .github/workflows/deploy-docs.yml
- .github/workflows/release-build.yml
- README 中体验/下载/文档入口

建立：

- docs/verification/full-delivery-baseline.md

至少记录：

- 当前 10 页、4 Tab。
- UniApp manifest/package/about/version 的版本来源。
- 当前 LightBLE 设备名、UUID、服务、OTA 和固定 COM3 状态。
- 当前落地页 Hero、平台卡、下载卡、导航、SEO 和链接。
- 当前 CI、Pages 和 Release workflow。
- 已有测试、构建和 E4/E5 证据边界。
- 当前第一批高风险。

已知落地页风险必须核实：

- “跨平台 BLE 控制台与统一协议内核”。
- Tagline 同时覆盖 UniApp/Flutter/Tauri/Android/iOS。
- “6+ 运行入口同时维护”。
- Flutter Mobile Mainline。
- 下载 Android/Windows/macOS 均指向同一 Release。
- SEO/OG “大一统开发库”。
- Release workflow 仍构建 Flutter APK 和 Tauri MSI。

G0 只记录事实，不修业务和落地页。

==================================================
六、G1：10 页 + WEB-001 产品正确性审核
==================================================

创建：

```text
docs/product-review/uniapp-pages/
PAGE-001_SCAN.md
PAGE-002_HID_PROVISION.md
PAGE-003_HID_DETAIL.md
PAGE-004_HID_HISTORY.md
PAGE-005_HID_DIAGNOSTICS.md
PAGE-006_DEVICE_DETAIL.md
PAGE-007_CONNECTED.md
PAGE-008_BROADCAST.md
PAGE-009_ABOUT.md
PAGE-010_VERSION.md

docs/product-review/web/WEB-001_LANDING_PAGE.md
```

每份审核必须有以下章节：

A. 用户任务和界面存在必要性
B. 进入、参数、正常出口和返回
C. 当前真实内容，按页面从上到下列出
D. 保留 / 修改 / 删除 / 缺失内容
E. 所有操作表
F. 所有状态表
G. 字段数据来源与实时/历史性质
H. 真实运行链路
I. ESP32、平台、网络、下载或发布依赖
J. 当前第一断点和风险
K. 自动化与真机验收用例
L. 产品结论：APPROVED / NEEDS_CHANGE / MERGE / REMOVE
M. 需要用户决策的问题

操作表至少包含：

- 操作 ID。
- 控件。
- 显示条件。
- 禁用条件。
- 点击行为。
- 成功反馈。
- 失败反馈。
- 跳转/返回。
- 清理。

状态表至少考虑：

- idle。
- loading。
- empty。
- success/complete。
- error。
- permission denied。
- unsupported。
- disconnected。
- reconnecting。
- timeout。
- cancelled。

不适用时写 N/A，不能省略。

字段来源至少区分：

- 静态产品配置。
- 平台能力。
- BLE 广播。
- GATT Read。
- Notify。
- Pinia Store。
- Runtime session。
- 本地历史。
- Smart HID Device Info/Status。
- VERSION / release metadata。
- 外部 Release / GitHub / 小程序配置。

--------------------------------------------------
PAGE-001 审核重点
--------------------------------------------------

- 首屏是否直接看见蓝牙状态和主按钮。
- 开始、停止、重试和两轮扫描。
- 扫描数量与筛选数量。
- name/localName/AD/Profile/ID 显示名。
- RSSI 更新、去重和列表上限。
- 卡片主体点击是否明确为广播详情。
- 普通连接与 Profile 动作是否混淆。
- 权限拒绝、蓝牙关闭、扫描失败、无设备、筛选无结果是否分开。
- Smart HID 历史是否干扰通用扫描。

--------------------------------------------------
PAGE-002～005 审核重点
--------------------------------------------------

- 配网、详情、历史、诊断四页是否都必要。
- 是否有重复入口或可以合并的内容。
- 历史数据不得冒充在线状态。
- Wi-Fi 密码、token 不展示、不进 URL、不持久化。
- 连接、表单、状态三阶段是否合理。
- 八类错误、取消等待、离页、重配和诊断恢复。
- Smart HID E5 后置，但页面产品结论必须现在完成。

--------------------------------------------------
PAGE-006 审核重点
--------------------------------------------------

- 页面首屏是否显示设备身份和连接状态。
- 连接、断开、重试。
- 服务加载、空服务、错误和重连是否常驻。
- 服务/特征属性是否准确。
- Read、TEXT Write、HEX Write、Notify。
- 日志隔离、清空、导出和容量。
- 返回后是否保留应用级 session。
- OTA 是否首版保留，缺安全设备时如何降级。

--------------------------------------------------
PAGE-007 审核重点
--------------------------------------------------

- 只显示真实活动 session。
- 打开详情是否复用连接。
- 单独/全部断开。
- 部分失败。
- 多设备同 UUID Notify 不串线。
- 空态返回扫描。

--------------------------------------------------
PAGE-008 审核重点
--------------------------------------------------

- 平台真实支持状态。
- 哪些字段真实可控。
- 默认 payload 是否可直接用。
- 31/32 字节。
- Central/Peripheral owner。
- 活动连接保护。
- start/stop/hide/unload。
- Observer 证据。

--------------------------------------------------
PAGE-009 / 010 审核重点
--------------------------------------------------

- 产品信息、平台状态和限制。
- 官网、仓库、文档、ESP32、反馈、分享。
- 隐私、安全、许可证。
- 其他小程序推广位置。
- 运行时版本和版本记录首项。
- 不展示未发布能力。

--------------------------------------------------
WEB-001 落地页审核重点
--------------------------------------------------

逐区块审核当前 docs/index.md 和 VitePress 配置：

1. Hero：产品名、定位、版本、主 CTA、次 CTA。
2. Signal cards：数字和声明是否真实。
3. Product Story：是否继续把多平台同步当核心卖点。
4. Workflow：是否覆盖当前真实闭环。
5. Platform Matrix：UniApp、微信、iOS、H5、参考客户端状态。
6. Download Hub：每个按钮是否有真实产物；不可用按钮必须删除或 unavailable。
7. Learning paths：入口是否仍把旧 MASTER 放在首位。
8. 当前缺失：真实截图、ESP32 Peripheral/Observer、在线原型、版本、证据、限制、Smart HID、贡献、安全。
9. Navigation、sidebar、SEO、OG、canonical URL。
10. 手机、桌面、暗色、无障碍和键盘操作。
11. 二维码、外链、GitHub、Release 和证据链接。

WEB-001 结论必须明确：

- 哪些当前区块保留。
- 哪些删除。
- 哪些重写。
- 哪些新增。
- 在正式 E5 前先采用何种“诚实开发状态”。
- 最终 release 后采用何种信息架构。

==================================================
七、G2：Runtime/Web 链路与全量矩阵
==================================================

创建或完整重写：

- docs/verification/uniapp-runtime-chain-audit.md
- docs/verification/uniapp-esp32-page-operation-matrix.md
- docs/verification/landing-page-link-and-claim-matrix.md

A. App Runtime 审计必须覆盖：

1. 启动和平台能力。
2. 权限。
3. 扫描 start/stop/timeout/hide/second round。
4. 广播归一化、详情和复制。
5. 连接和服务发现。
6. Read。
7. TEXT Write。
8. HEX Write。
9. Notify enable/value/disable。
10. 主动断开。
11. 被动断开和有限重连。
12. 跨 Tab session。
13. 多设备。
14. Peripheral support/create/start/stop/close。
15. OTA file/ready/data/commit/success/reboot。
16. Smart HID matcher/Device Info/QR/candidate/status waiter。
17. Smart HID history/diagnostics。
18. 关于页外链、复制、分享和小程序跳转。

每条链路写：

```text
用户入口
→ 页面函数
→ component/composable
→ store/service
→ ble-runtime/provisioning
→ uni/wx/plus API
→ callback/event
→ Store/UI
→ 正常结果
→ 失败结果
→ 清理
→ ESP32 依赖
→ 第一断点
→ 证据等级
```

必须搜索确认：

- Runtime 外是否仍注册全局 BLE callback。
- 页面是否绕过 Runtime。
- Notify 是否按 device/service/char tuple 路由。
- 旧 session 事件是否覆盖新 session。
- 页面离开是否错误关闭应用级 session。
- Peripheral server 和 adapter owner 是否唯一。

B. 页面—操作—ESP32矩阵

每个 OP 至少包含：

- PAGE/WEB ID。
- 页面区域和控件。
- 显示/禁用条件。
- 当前文件和函数。
- Runtime/Web 链路。
- ESP32 Peripheral / Observer / Smart HID / N/A。
- 成功 UI。
- 失败 UI。
- 清理。
- 自动化。
- Android/微信真机。
- 状态。
- 第一断点。

没有 E5 的保持 UNPROVEN。

C. 落地页声明/链接矩阵

每个公开声明和 CTA 一行：

- Section。
- Claim/CTA。
- 当前文案。
- 事实源。
- 当前证据。
- 目标状态。
- 链接/产物。
- 可用性。
- 自动化检查。
- 发布阻断条件。

至少覆盖：

- Hero。
- 产品版本。
- 平台状态。
- 能力卡。
- Android 下载。
- 微信二维码/入口。
- Peripheral 固件。
- Observer 固件。
- 在线原型。
- ESP32 快速开始。
- 测试证据。
- Smart HID。
- GitHub、Issue、Security、License。
- SEO/OG。

==================================================
八、当前 Gate 的验证
==================================================

本轮主要验证事实和文档完整性，允许执行：

- 现有纯逻辑单测。
- 现有统一 verify 脚本作为现状证据。
- Vue SFC parse。
- VitePress build 作为当前站点基线。
- 静态搜索。
- git diff --check。

如果测试失败：

- 记录最早断点。
- 不在本轮修业务代码、固件或网站。
- 不因为失败而把审核范围变成修复任务。

最终检查：

- G0 baseline 文件存在。
- 10 份 App 审核存在。
- WEB-001 审核存在。
- 每份审核章节齐全。
- Runtime audit 覆盖全部链路。
- OP matrix 有真实入口或 Blocker。
- Claim/link matrix 覆盖所有首页区块和 CTA。
- Gate board 已更新。
- 没有修改 apps/uniapp、hardware、core、docs/index、VitePress 和 workflows。
- git diff --check 通过。

建议提交：

docs(audit): review the complete UniApp ESP32 product delivery surface

不 push。

==================================================
九、G0～G2 最终报告
==================================================

GATES:
- G0 BASELINE: PASS / PARTIAL / FAIL
- G1 PRODUCT REVIEW: PASS / PARTIAL / FAIL
- G2 CHAIN & MATRIX: PASS / PARTIAL / FAIL

BASELINE:
- branch
- start commit
- end commit
- initial/final worktree
- tool versions actually checked

PRODUCT DECISIONS:
- PAGE-001～010
- WEB-001
- APPROVED / NEEDS_CHANGE / MERGE / REMOVE

TOP USER DECISIONS:
- 页面内容和合并/保留
- OTA 首版策略
- Smart HID 四页职责
- Android/微信入口
- 版本和下载策略
- 落地页当前开发状态与最终结构
- ESP32 Peripheral/Observer 范围

FIRST BREAKPOINTS:
- P0/P1/P2
- 页面 / Runtime / ESP32 / Web / Release 分类

FILES:
- 新增/修改文档

TESTS:
- 实际运行命令
- exit code
- 当前证据等级
- Hardware: NOT EXECUTED

GIT:
- commit
- pushed: NO

NEXT:
- 用户审阅 G1/G2
- 用户确认后才执行 G3 产品契约和版本冻结
- 不自动执行 G3

==================================================
十、后续 Gate 执行规则
==================================================

用户批准 G1/G2 后，仍使用本提示词，明确指定单个 Gate。

--------------------------------------------------
G3 契约、版本和公开状态
--------------------------------------------------

- 修订 product-contract。
- 建立产品契约自动门。
- 建立 VERSION、release/release-manifest.json、生成脚本和 docs/public/release/latest.json。
- 对齐 manifest/package/about/version/landing。
- 先把公开落地页改为诚实开发状态，移除明显假下载，但不提前宣称 E5。
- 完成后停下。

--------------------------------------------------
G4 App 和落地页原型
--------------------------------------------------

- 创建 10 页 4 平台 HTML 原型。
- 创建落地页信息架构原型。
- Playwright mobile/desktop/dark/light。
- 用户批准后停下。

--------------------------------------------------
G5 ESP32 Peripheral/Observer
--------------------------------------------------

- 先 fixture contract、serial schema、fault 文档和协议测试。
- 再拆分固件、两环境、pio test、build 和 SHA。
- 默认不 upload；用户指定板和端口后才进入硬件模式。
- 完成后停下。

--------------------------------------------------
G6 UniApp 通用 BLE
--------------------------------------------------

严格子 Gate：

G6-1 permission/platform
G6-2 PAGE-001
G6-3 PAGE-006
G6-4 PAGE-007
G6-5 PAGE-008
G6-6 OTA
G6-7 PAGE-009
G6-8 PAGE-010
G6-9 common BLE gate

每个子 Gate单独测试、提交和停下。

--------------------------------------------------
G7 Android/微信 E5
--------------------------------------------------

- 指定测试板、Observer、手机、固件 SHA。
- 按 PAGE 和 OP 执行。
- App + Serial/Observer 双端证据。
- 开发者工具不能代替微信真机。

--------------------------------------------------
G8 Smart HID
--------------------------------------------------

- 只在通用 BLE Gate 后执行。
- PAGE-002～005。
- 完整配网、错误恢复、历史、诊断和 USB HID。

--------------------------------------------------
G9 独立电脑复现
--------------------------------------------------

- BUILD_ONLY。
- HARDWARE_E5。
- RELEASE_VERIFY。
- 验证机只测试，不修源码。

--------------------------------------------------
G10 落地页终稿
--------------------------------------------------

生产实现必须包含：

- 正确 Hero、版本和状态。
- 核心闭环。
- 证据驱动能力卡。
- 平台状态。
- 真实 App 截图。
- 在线原型。
- Peripheral/Observer ESP32。
- 三条快速开始。
- 真实下载或 NOT_RELEASED。
- evidence 和限制。
- Smart HID Profile。
- 文档、Issue、Security、License。
- SEO/OG/canonical。
- 链接、二维码、下载 SHA、无障碍和响应式测试。

--------------------------------------------------
G11/G12 Release
--------------------------------------------------

- CI 主线改为 UniApp、文档、原型和 fixture。
- 旧 Flutter/Tauri Release 不能代表首版。
- Android、微信记录、两固件、manifest、SHA、证据和限制。
- Clean checkout、RC、另一台电脑 RELEASE_VERIFY。
- 发布后下载、新安装、二维码和文档烟测。

==================================================
十一、每个后续 Gate 的报告模板
==================================================

GATE:
STATUS:
BASELINE:
SCOPE:
PAGE/WEB/OP IDS:
CHANGES:
TESTS:
EVIDENCE E0-E6:
HARDWARE:
ARTIFACTS / SHA:
FIRST FAILURE:
OPEN DECISIONS:
GIT COMMIT:
PUSHED: NO
NEXT:

没有实际运行的项目不得写 PASS。
```
