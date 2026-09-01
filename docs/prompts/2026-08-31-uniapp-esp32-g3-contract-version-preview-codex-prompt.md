# Codex 提示词：Smart BLE G3——产品契约、版本与诚实 PREVIEW 冻结

> 状态：SUPERSEDED / 当前不要执行
> 替代入口：[`2026-09-01-tp-g0-target-product-documentation-codex-prompt.md`](./2026-09-01-tp-g0-target-product-documentation-codex-prompt.md)
> 原因：本提示词直接从当前审计进入契约冻结；新方法先独立定义完整目标产品，再写目标测试和自动差距报告。本文仅保留为历史参考。

---

## 可直接复制给 Codex

```text
你现在在本机执行 Smart BLE 全面产品交付的 G3：产品契约、版本和公开状态冻结。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

当前唯一总计划：

docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md

当前 Gate 看板：

docs/verification/full-delivery-gate-board.md

G1/G2 审核事实：

- HEAD 应包含 `3495a46 docs(audit): record OTA CHAR_CTRL gap and unused broadcast composable`。
- G1/G2 已完成审核资料，不代表任何 BLE 能力已达到 E5。
- PAGE-001～PAGE-010 与 WEB-001 均保留，但内容结论均为 NEEDS_CHANGE。
- 无整页 REMOVE；无整页 MERGE。
- 扫描页完整 Smart HID 历史列表应收口到 PAGE-004，扫描页只保留紧凑入口或最近摘要。
- OP-021 当前不是“待真机验证”而已：UniApp 不写 CHAR_CTRL，LightBLE 固件明确要求 start/commit，因此实现状态为 FAIL，E5 状态为 BLOCKED_BY_PROTOCOL_FIX。
- `useBroadcastSession.js` 当前没有页面引用；PAGE-008 起停和生命周期全部内联在 `pages/broadcast/index.vue`。G3 只冻结目标职责，不在本轮接入或重构。

==================================================
一、本轮目标
==================================================

完成以下内容：

1. 先收口当前未提交的计划和提示词，形成独立计划基线提交。
2. 将缺陷严重度与证据状态彻底分离。
3. 把用户批准的 PAGE-001～010、WEB-001 产品决策写回产品契约。
4. 冻结 LightBLE Peripheral / Observer 目标协议和 OTA Control 状态机。
5. 冻结 PAGE-008 广播页面的目标职责分层。
6. 建立 Smart BLE 产品 VERSION 与 Preview Release Metadata。
7. 将当前 VitePress 首页改成诚实 PREVIEW，移除假下载和错误平台主线。
8. 建立产品契约、版本元数据和公开声明自动门禁。
9. 更新 Gate 看板，标记 G3 的真实结果。
10. 完成后停下，不进入 G4 原型，不修改 BLE/固件业务实现。

==================================================
二、严格边界
==================================================

本轮允许修改：

- `VERSION`
- `release/**`
- `docs/product-contract/**`
- `docs/verification/**` 中当前 Gate、矩阵和决策状态
- `docs/index.md`
- `docs/.vitepress/config.mjs`
- `docs/.vitepress/theme/style.css`（仅 PREVIEW 状态、禁用卡片等必要小改；禁止全面视觉重做）
- `docs/public/release/latest.json`
- `apps/uniapp/manifest.json` 的版本元数据
- `apps/uniapp/package.json` / `package-lock.json` 的版本元数据
- 关于页/版本页中纯版本文字或静态版本数据（仅为对齐 SSOT，不改页面布局和交互）
- `scripts/check-product-contract.mjs`
- `scripts/check-version-consistency.mjs`
- `scripts/check-release-metadata.mjs`
- `scripts/check-public-claims.mjs`
- 对应 `tests/unit/*.test.mjs`
- `scripts/verify-uniapp.sh`
- `.github/workflows/ci.yml` 中 `uniapp-contract` Job 的统一门禁调用
- 当前计划和 prompts 的状态/索引

本轮禁止修改：

- `apps/uniapp/services/ble-runtime/**`
- `apps/uniapp/utils/ota_manager.js`
- `apps/uniapp/pages/broadcast/index.vue` 的业务实现
- 其他 UniApp 页面布局、按钮和状态实现
- `apps/uniapp/composables/use-broadcast-session.js` 的实现
- `hardware/esp32/LightBLE/**`
- `core/ble-core/**`
- Smart HID canonical 协议
- `.github/workflows/release-build.yml` 的正式发布实现
- 新版 App HTML 原型
- 真机、固件烧写、部署、tag、Release、push

发现业务问题只能登记到 G5/G6 backlog，不能在 G3 顺手修复。

==================================================
三、启动与当前脏工作区处理
==================================================

先执行并记录：

- `git status --short --branch`
- `git rev-parse HEAD`
- `git log --oneline --decorate -n 12`
- `git diff --stat`
- `git diff --check`

参考 HEAD：

`3495a46`

不要盲目 checkout；只要求当前历史包含该提交。

当前工作区预计存在尚未提交的计划/提示词：

- `docs/plans/2026-08-31-uniapp-reference-product-plan.md`
- `docs/plans/2026-08-31-uniapp-esp32-complete-debugging-plan.md`
- `docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md`
- `docs/prompts/**`

这些属于用户已确认方向的计划基线：

- 不 reset。
- 不 stash。
- 不删除。
- 不覆盖。
- 先审查 diff。
- 修复其中 trailing whitespace。
- 明确 CURRENT / SUPERSEDED 状态。

计划入口固定为：

CURRENT：
`docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md`

SUPERSEDED：
- `docs/plans/2026-08-31-uniapp-reference-product-plan.md`
- `docs/plans/2026-08-31-uniapp-esp32-complete-debugging-plan.md`

先形成独立提交：

`docs(plan): freeze the full UniApp ESP32 product delivery roadmap`

该提交只能包含计划、prompt、索引和 whitespace 修正，不得包含 G3 契约、网站或元数据实现。

提交后重新检查工作区，再进入 G3 主体。

==================================================
四、G3-A：统一缺陷与证据状态模型
==================================================

在以下当前文档中统一分类：

- `docs/verification/full-delivery-gate-board.md`
- `docs/verification/full-delivery-baseline.md`
- `docs/verification/uniapp-esp32-page-operation-matrix.md`
- `docs/verification/landing-page-link-and-claim-matrix.md`
- `docs/product-review/README.md`
- 必要的 PAGE / WEB 审核结论
- `docs/product-contract/07_TEST_MATRIX.md`
- `docs/product-contract/08_RELEASE_GATES.md`

两套维度不得混用。

A. 缺陷严重度，只描述已确认的问题：

- `P0`：公开发布或核心流程必然误导/阻断。
- `P1`：核心正确性或协议实现已确认错误。
- `P2`：重要产品、交互、维护性或恢复问题。

B. 证据/执行状态：

- `UNPROVEN`
- `NOT_EXECUTED`
- `BLOCKED_BY_PROTOCOL_FIX`
- `BLOCKED_BY_FIXTURE`
- `BLOCKED_BY_TOOLCHAIN`
- `BLOCKED_BY_CREDENTIAL`
- `N/A`
- `PASS`
- `FAIL`

C. 公开状态：

- `VERIFIED`
- `PREVIEW`
- `BLOCKED`
- `UNSUPPORTED`
- `NOT_RELEASED`

必须按以下例子修正：

- PAGE-001 没做扫描真机：`E5 UNPROVEN`，不是代码 P0。
- PAGE-002 / PAGE-005 Smart HID E5 后置：`E5 NOT_EXECUTED`。
- PAGE-008 缺 Observer：`BLOCKED_BY_FIXTURE`。
- OP-021 OTA：实现/协议 `FAIL`，E5 `BLOCKED_BY_PROTOCOL_FIX`。
- WEB-001 假下载和错误主线：P0 Release Blocker。

历史 `docs/product-audit/**` 不做大范围改写；只更新当前正典、Gate 和当前审核产物。

==================================================
五、G3-B：冻结用户批准的页面决策
==================================================

将以下决策直接写入：

- `docs/product-contract/01_PRODUCT_SCOPE.md`
- `02_FEATURE_CATALOG.md`
- `03_USER_FLOWS.md`
- `04_PAGE_CONTRACTS.md`
- `05_PLATFORM_MATRIX.md`
- `07_TEST_MATRIX.md`
- `08_RELEASE_GATES.md`
- `09_HTML_PROTOTYPE_SPEC.md`
- `10_LANDING_PAGE_SPEC.md`
- `README.md`

不要再把这些问题保留成“待决定”。

PAGE-001：

- 页面保留。
- Smart HID 完整历史列表只在 PAGE-004；扫描页只保留紧凑入口，最多最近一台摘要。
- 无名设备：`未命名 BLE · <deviceId 后四位>`。
- 默认扫描时长：10 秒；允许手动停止。
- 同时显示原始发现数量与筛选后数量。
- 权限拒绝、蓝牙关闭、扫描失败、无设备、筛选无结果是不同状态。

PAGE-002：

- 保留连接 → 配置 → 状态三阶段。
- 正式产品不提供“跳过 ControlHub”。
- Mock 只允许测试/开发环境，不出现在正式用户流程。
- Wi-Fi 密码默认掩码，可显示/隐藏。
- READY 后释放配网 Session；预期断开不得显示为错误。

PAGE-003：

- 顶部明确“本地历史快照，不代表当前在线”。
- 缺失协议/固件字段隐藏，不堆叠“未记录”。
- 高级 BLE 放入折叠的开发者工具区，并提示设备需处于可发现状态。

PAGE-004：

- 保留为 Smart HID 历史唯一列表页。
- 移除只删除本机记录，不清除设备配置。
- 页面说明记录可能在 90 天后自动清理。

PAGE-005：

- 进入自动检测一次，同时保留手动“重新检测”。
- pending/尚未检测不得显示正常绿色。
- 页面自己建立的连接在离页关闭。
- 跳转重新配置时移交 Session 所有权，不能先关闭再重复连接。

PAGE-006：

- 用户主动开启的 Notify 属于设备 Session，不因离开详情页自动关闭。
- 主动断开后从活动 Session Registry 移除。
- OTA 在协议修复和安全 E5 前：正式版隐藏或禁用；Preview 可显示 `BLOCKED / 实验性`。

PAGE-007：

- 只展示真实活动 Session。
- Smart HID 配网内部临时连接不进入普通已连接列表。
- 被动断线且有限重连中显示“重连中”；耗尽后移出活动列表。
- 禁止使用“连接稳定”，统一“当前已连接”。

PAGE-008：

- 正式 E5 必须使用 ESP32 Observer；第二手机/nRF Connect 只作补充证据。
- 平台不能控制名称时隐藏或禁用名称输入并提示“名称由系统接管”。
- 目标职责冻结为：
  - PAGE-008：表单与用户操作。
  - `useBroadcastSession`：状态、日志、起停互斥、onHide/onUnload、错误反馈。
  - Platform Adapter：微信 Peripheral Server / App 原生插件。
  - Payload Service：UUID、HEX、字节预算、31/32 边界。
- 当前 composable 尚未接入的事实保留为 G6 backlog，本轮不改代码。

PAGE-009：

- 产品信息、平台状态、帮助和开源入口优先。
- “更多小程序”仅微信显示、页底折叠。
- GitHub Issue 为主要反馈入口；Gitee 为镜像。
- iOS 只显示 `NOT_RELEASED`，不能列入已支持。

PAGE-010：

- 根 `VERSION` 为产品版本 SSOT。
- Git tag 必须校验 VERSION。
- 开发构建展示 `<version>-dev.<shortsha>`。
- 首项版本与运行时、关于页、Release Metadata 一致。

WEB-001：

- 正式域名继续 `lightble.i2kai.com`；GitHub Pages 作为部署底座。
- G3 后公开状态为 `PREVIEW`。
- 删除“6+ 运行入口同时维护”“Flutter Mobile Mainline”“下载全部平台”。
- Flutter/Tauri/原生端放入参考实现，不作为首版主 CTA。
- 无真实 UniApp Android 产物时不显示可点击 APK 下载。
- 公开站只显示正式小程序码；没有正式码时显示 `NOT_RELEASED`，不显示假二维码。
- 下载按钮必须来自 Release Metadata。

==================================================
六、G3-C：冻结 LightBLE Peripheral / Observer 与 OTA 目标契约
==================================================

更新 `docs/product-contract/06_ESP32_REFERENCE.md`，并创建机器可读目标契约：

`core/protocols/smart-ble-fixture-contract.json`

该 JSON 是 G5/G6 的目标正典，不代表当前实现已经符合。至少包含：

- `contract_version`
- `device_name`: `BLEToolkit-Server`
- `fixture_modes`: `fixture_peripheral` / `fixture_observer`
- 主 Service / 权限 Service / OTA Service 与 Characteristic UUID
- LED 命令
- Notify 规则
- Observer 输出字段
- Fault Injection 名称
- OTA 状态机

OTA 目标流程必须精确定义为：

1. 先订阅 `CHAR_STATUS`。
2. 向 `CHAR_CTRL` 写 start：

```json
{
  "action": "start",
  "size": 123456,
  "chunk_size": 180,
  "target_version": "1.0.6"
}
```

3. 等待 `STATUS ready`，未 ready 不得发送 DATA。
4. 向 `CHAR_DATA` 分包；默认 180B，可由协商 MTU 决定安全值。
5. 所有 DATA 完成后向 `CHAR_CTRL` 写：

```json
{ "action": "commit" }
```

6. 等待 `STATUS success`。
7. 设备重启。
8. 客户端重新扫描/连接并读取 Device Info。
9. `firmware_version` 必须等于 expected target version，才算最终成功。

取消：

```json
{ "action": "abort" }
```

状态至少包含：

- `ready`
- `progress`
- `success`
- `error`
- `aborted`

错误码至少包含：

- `invalid_start`
- `ota_already_started`
- `ota_not_started`
- `size_mismatch`
- `write_failed`
- `commit_failed`
- `aborted`
- `version_mismatch`

冻结规则：

- 写完 DATA 绝不等于成功。
- 无 ready 不得传 DATA。
- 无 commit 不得 success。
- 无 success 不得成功。
- 重启后版本不一致不得成功。
- 当前 UniApp/固件与该目标契约不一致，状态必须写 `IMPLEMENTATION_FAIL / BLOCKED_BY_PROTOCOL_FIX`。

本轮不得修改 `ota_manager.js`、其现有测试或 ESP32 固件；只冻结目标契约和未来测试要求。

==================================================
七、G3-D：建立 VERSION 与 Release Metadata
==================================================

当前产品 Preview 版本冻结为：

`1.0.5`

创建根文件：

`VERSION`

内容只有：

`1.0.5`

创建：

- `release/release-manifest.json`
- `docs/public/release/latest.json`
- `scripts/generate-release-metadata.mjs`
- `scripts/check-version-consistency.mjs`
- `scripts/check-release-metadata.mjs`
- 对应测试

Release Metadata 至少包含：

- `schema_version`
- `product`: `Smart BLE`
- `version`: `1.0.5`
- `channel`: `preview`
- `public_status`: `PREVIEW`
- `source_commit`: Preview 可为 `null`；正式 Release 必须非空
- `dirty`: Preview 可为 `null`；正式 Release 必须 false
- Android 状态：`NOT_RELEASED`
- 微信状态：`PREVIEW` 或 `NOT_RELEASED`，按当前真实配置；不得写 VERIFIED
- iOS：`NOT_RELEASED`
- H5 BLE：`UNSUPPORTED`
- Flutter/Tauri/原生端：`REFERENCE`
- Peripheral 固件：当前源码存在但新 fixture 未完成，状态 `PREVIEW` 或 `NOT_RELEASED`
- Observer 固件：`NOT_RELEASED`
- OTA：`BLOCKED`
- Smart HID：`PREVIEW`
- artifacts 列表；没有产物时 URL/SHA 必须 null，不得生成假链接
- evidence run；当前无 E5 时为 null
- known limitations

防止 commit 自引用：

- Preview 追踪文件允许 `source_commit: null`。
- `generate-release-metadata.mjs` 在 Release/CI 时通过参数或环境注入 commit、dirty、artifact URL/SHA。
- 不在 tracked 文件中写一个因提交自身而永远变化的 commit。

版本一致性规则：

- 根 VERSION = `apps/uniapp/manifest.json` versionName。
- `apps/uniapp/package.json` 与 lock 的项目版本对齐为 1.0.5；若确认它仅是工具包版本，也必须在元数据文档中明确，不允许静默漂移。
- 关于页运行时 fallback、版本记录首项与 VERSION 一致。
- Release Metadata version 与 VERSION 一致。
- Preview 允许无 artifact；VERIFIED/正式 Release 不允许缺 commit、SHA、evidence。

仅允许版本元数据调整，不改 App 页面布局和业务行为。

==================================================
八、G3-E：将生产落地页改成诚实 PREVIEW
==================================================

修改：

- `docs/index.md`
- `docs/.vitepress/config.mjs`
- 必要时最小修改 `docs/.vitepress/theme/style.css`

本轮不是 G10 最终视觉重做，只完成真实定位和可用入口。

Hero：

- 产品名：Smart BLE。
- 定位：开源 BLE 调试、学习与 ESP32 联动工具。
- 明确当前主线：UniApp Android + 微信小程序 + LightBLE。
- 显示状态：PREVIEW。
- 主 CTA：产品规范或当前可用体验入口。
- 次 CTA：ESP32 参考契约、GitHub。
- 无真实 APK 时不得显示“下载 Android”。

删除或改写：

- `6+ 运行入口`。
- `Flutter Mobile Mainline`。
- `下载全部平台`。
- 将 Flutter/Tauri/原生端与首版并列的完整支持文案。
- Android/Windows/macOS 共用 `releases/latest` 的假下载卡。
- “跨平台低功耗蓝牙大一统开发库”等 SEO/OG 文案。
- 旧 MASTER 文档作为主要 CTA。

PREVIEW 首页至少包含：

1. 当前产品与 Preview 状态。
2. 当前主线和真实平台状态。
3. 核心 BLE 闭环。
4. 当前可证明能力与 `UNPROVEN/BLOCKED` 限制说明。
5. ESP32 Peripheral / Observer 的目标角色；Observer 标 NOT_RELEASED。
6. 产品契约、测试矩阵和 GitHub。
7. 当前已知限制：无 E5、OTA 协议未接线、Observer 未实现、无 UniApp Android 正式下载。
8. Smart HID 作为第一方 Profile，状态 PREVIEW。
9. 参考客户端折叠/次要展示，不作为主 CTA。
10. Security、License、Issue 入口。

下载/二维码规则：

- Release Metadata URL 为 null 时，UI 不得渲染可点击下载。
- 可显示静态“尚未发布”卡，但不是 `<a>` 假链接。
- 没有正式小程序码时，不展示现有无关 QR 图作为体验入口。

SEO/OG：

- title/description 与 Preview 产品定位一致。
- canonical URL 仍使用 `https://lightble.i2kai.com/`。
- 不宣称未验证平台。

==================================================
九、G3-F：自动门禁
==================================================

新增：

- `scripts/check-product-contract.mjs`
- `scripts/check-version-consistency.mjs`
- `scripts/check-release-metadata.mjs`
- `scripts/check-public-claims.mjs`
- `tests/unit/product-contract.test.mjs`
- `tests/unit/version-consistency.test.mjs`
- `tests/unit/release-metadata.test.mjs`
- `tests/unit/public-claims.test.mjs`

A. 产品契约门：

- PAGE-001～010 唯一、完整。
- FLOW-001～010 唯一、完整。
- 功能 ID 与 TEST-A/W/E/P 不重复。
- `pages.json` 路由与 PAGE 集合一致。
- 四 Tab 固定为扫描、已连接、广播、关于。
- Smart HID 不占独立 Tab。
- product-contract README 相对链接有效。
- 跨 PAGE/FLOW/Feature/Test 引用存在。
- H5 不得标真实 BLE Full。

B. 版本门：

- VERSION、manifest、package/lock、关于 fallback、版本记录首项、release manifest 一致。
- 禁止硬编码新的漂移版本。

C. Release Metadata 门：

- 状态值合法。
- PREVIEW 可无 artifact，但 artifact URL/SHA 必须同时为空。
- VERIFIED/正式 Release 必须有 commit、dirty=false、artifact SHA 和 evidence。
- OTA 当前必须 BLOCKED。
- Observer 当前必须 NOT_RELEASED。
- H5 BLE 必须 UNSUPPORTED。

D. 公开声明门：

至少禁止当前首页/配置重新出现：

- `6+` 运行入口营销声明。
- `Mobile Mainline` 标记 Flutter。
- `下载全部平台`。
- Android/Windows/macOS 共享无证明的 `releases/latest` 主下载。
- “大一统开发库”SEO/OG。
- 未发布平台标 VERIFIED。

同时检查：

- 首页必须显示 PREVIEW。
- 页面至少链接产品契约、ESP32、GitHub、限制/状态。
- 所有内部相对链接存在。

将门禁加入：

- `scripts/verify-uniapp.sh`
- `.github/workflows/ci.yml` 的 `uniapp-contract` Job

CI 最小改法：

- 保留 Smart HID canonical checkout。
- 使用 `SMART_HID_WORKSPACE=../smart-hid-canonical bash scripts/verify-uniapp.sh` 作为统一门。
- 删除该 Job 中已经被统一脚本完整覆盖的手工测试清单，或确保不重复维护两套事实源。
- 不改其他 Flutter/Tauri/原生 Job；它们在 G11 再重新定位。

==================================================
十、测试驱动顺序
==================================================

所有 checker 先写失败测试：

1. 故意构造重复 PAGE/坏链接/错误 Tab，证明 product contract gate 会 FAIL。
2. 故意改 VERSION 或 manifest fixture，证明 version gate 会 FAIL。
3. 构造 PREVIEW 假下载或 VERIFIED 缺 SHA，证明 release gate 会 FAIL。
4. 构造首页禁用文案或 releases/latest 假下载，证明 public claim gate 会 FAIL。
5. 再实现 checker 并让真实仓库 PASS。

测试不得通过修改业务实现来“迎合”门禁。

==================================================
十一、验证命令
==================================================

按顺序实际运行并记录 exit code：

- `git diff --check`
- `node tests/unit/product-contract.test.mjs`
- `node tests/unit/version-consistency.test.mjs`
- `node tests/unit/release-metadata.test.mjs`
- `node tests/unit/public-claims.test.mjs`
- `node scripts/check-product-contract.mjs`
- `node scripts/check-version-consistency.mjs`
- `node scripts/check-release-metadata.mjs`
- `node scripts/check-public-claims.mjs`
- `SMART_HID_WORKSPACE=../Smart-HID-Workspace bash scripts/verify-uniapp.sh`
- `npm run docs:build`，工作目录 `docs/`

如果本机 sibling Smart-HID 路径不同，先查真实路径，用环境变量传入；不得把绝对路径写进脚本。

本轮硬件：

`NOT EXECUTED`

本轮不运行 pio、不烧写、不做微信/Android真机。

==================================================
十二、提交拆分
==================================================

建议形成以下聚焦提交：

1. `docs(plan): freeze the full UniApp ESP32 product delivery roadmap`
2. `docs(contract): freeze approved UniApp and ESP32 product decisions`
3. `feat(release): add Smart BLE version and preview metadata`
4. `docs(site): publish an honest Smart BLE preview`
5. `test(governance): enforce product version and public claims`

若某提交没有对应改动，不要为了凑数量创建空提交。

不得 push。

==================================================
十三、G3 退出条件
==================================================

以下全部成立才可 G3 PASS：

- 当前计划入口已提交并唯一。
- G1/G2 产品决策全部进入正典，不再留成悬空问题。
- 缺陷严重度与证据状态分离。
- OP-021 明确为实现 FAIL + E5 BLOCKED_BY_PROTOCOL_FIX。
- OTA target contract 明确 start/ready/data/commit/success/reboot/version-readback。
- PAGE-008 目标职责分层明确，当前死 composable 被登记为 G6 backlog。
- 根 VERSION、manifest、package/lock、版本页和 release metadata 一致。
- 公开 Release Metadata 为 PREVIEW，不含假 artifact。
- VitePress 首页不再传播多平台大一统和假下载。
- 自动门禁可以发现契约、版本、Metadata 和公开声明漂移。
- `verify-uniapp.sh` PASS。
- VitePress build PASS。
- 没有修改 BLE Runtime、OTA Manager、ESP32 固件或 PAGE-008 业务实现。
- 工作区仅保留有意提交，最终 clean。

==================================================
十四、最终汇报
==================================================

GATE:
- G3 CONTRACT / VERSION / PREVIEW
- PASS / PARTIAL / FAIL / BLOCKED

BASELINE:
- branch
- start commit（应包含 3495a46）
- end commit
- initial/final worktree

PLAN BASELINE:
- CURRENT plan
- SUPERSEDED plans
- plan commit

CONTRACT DECISIONS:
- PAGE-001～010
- WEB-001
- OTA target sequence
- PAGE-008 target architecture

STATUS MODEL:
- defect severity
- evidence states
- public states

VERSION / RELEASE:
- VERSION
- manifest/package/version-page result
- release metadata status
- artifact availability

LANDING PAGE:
- removed false claims
- Preview sections
- download/QR behavior
- SEO/OG result

TESTS:
- commands
- exit codes
- docs build
- Hardware: NOT EXECUTED

FILES / COMMITS:
- each commit
- pushed: NO

OPEN BLOCKERS:
- OTA implementation G5/G6
- Observer fixture G5
- App page implementation G6
- Android/WeChat E5 G7
- Smart HID E5 G8

NEXT:
- G4 App + landing page prototype
- 不自动执行 G4

任何未实际执行的内容不得写 PASS。
```
