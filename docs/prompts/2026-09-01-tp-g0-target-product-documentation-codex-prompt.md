# Codex 提示词：TP-G0——完整目标产品文档体系

> 用途：本机 Codex 先完整定义 Smart BLE 的目标产品，不修改业务代码，不编写目标测试脚本。
> 输出：`docs/target-product/**`、`contracts/target/**` 和 `REVIEW_SUMMARY.md`。
> 完成后停下给用户审阅，不自动进入 TP-G1。

---

## 可直接复制给 Codex

```text
你现在在本机执行 Smart BLE 的 TP-G0：完整目标产品文档体系。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

开始前必须读取：

1. AGENTS.md
2. docs/plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md
3. docs/target-product/README.md
4. docs/target-tests/README.md
5. docs/product-contract/**（仅作历史产品输入，不默认正确）
6. docs/product-review/**（只作当前实现/问题输入）
7. docs/verification/full-delivery-baseline.md
8. docs/verification/uniapp-runtime-chain-audit.md
9. docs/verification/uniapp-esp32-page-operation-matrix.md
10. docs/verification/landing-page-link-and-claim-matrix.md
11. Smart HID canonical contract 的锁定说明与当前镜像文档

当前代码历史应包含：

3495a46 docs(audit): record OTA CHAR_CTRL gap and unused broadcast composable

不要盲目 checkout。当前工作区可能存在用户已确认的未提交计划和 prompts，不得 reset、stash、checkout、删除或覆盖。

==================================================
一、本轮唯一目标
==================================================

定义“Smart BLE 第一完整版本最终应该是什么”，创建详细到无需猜业务规则即可继续写测试和实现的目标规范。

本轮必须完成：

- 产品范围和非目标；
- 用户、任务和场景；
- 完整功能目录；
- 10 个 App 页面 + 1 个落地页；
- 目标流程；
- 状态和错误；
- 平台能力与降级；
- 数据、存储、隐私；
- Runtime 目标架构；
- 通用 BLE/GATT；
- ESP32 Peripheral / Observer；
- Smart HID Profile；
- 日志、证据、安全、性能、无障碍；
- VERSION、Release Metadata、公开状态；
- 开源、运维、风险、追踪和 Definition of Done；
- 对应机器可读 JSON 契约；
- 用户审核摘要。

本轮禁止：

- 修改 apps/uniapp/**；
- 修改 core/ble-core/**；
- 修改 hardware/esp32/LightBLE/**；
- 修改现有业务测试；
- 创建 scripts/target 或 tests/target；
- 修改生产 docs/index.md、VitePress 配置和 Release workflow；
- 根据当前代码降低目标；
- 自动 push、tag、部署、烧写或真机测试；
- 自动进入 TP-G1。

==================================================
二、目标产品边界
==================================================

第一完整版本固定包含：

1. UniApp Android App。
2. BLE Toolkit+ 微信小程序。
3. H5 的页面/文档与明确 BLE 降级。
4. UniApp iOS 的目标定义，但未发布时必须 NOT_RELEASED。
5. LightBLE `fixture_peripheral`。
6. LightBLE `fixture_observer`。
7. Smart HID 第一方 Profile。
8. 10 个 App 页面。
9. 公开落地页 WEB-001。
10. HTML 交互原型目标。
11. Android / 微信 / ESP32 / Smart HID 证据目标。
12. VERSION、Release Metadata、下载、SHA、二维码与已知限制。
13. 开源开发者文档和 Profile 扩展指南。

首版不以以下实现为阻断项：

- Flutter；
- 原生 Android；
- 原生 iOS/macOS；
- Tauri、Electron、Avalonia；
- Windows/Linux placeholder；
- 云端、账号、会员、支付、订单、License；
- 新增第三个第一方 Profile。

它们在目标文档中只能标为 REFERENCE / NOT_NOW / NOT_RELEASED，不得与 UniApp 主线并列为完整产品入口。

==================================================
三、目标产品原则
==================================================

所有文档必须贯彻：

1. 目标先于当前实现。
2. 页面能打开不等于页面正确。
3. 真实设备结果优先于 UI 自报成功。
4. 构建、Mock、模拟器不等于 E5。
5. 历史数据不得冒充实时在线状态。
6. 不支持的平台必须正确降级，不模拟成功。
7. 资源所有权明确：Listener、Timer、Session、Adapter、Peripheral Server、File Handle。
8. OTA 必须完成完整事务与版本回读。
9. 落地页不能有假下载、假二维码和无证据声明。
10. 密码、token、API Key、MQTT credential、私钥不得持久化到不允许的位置或进入日志/URL/截图。
11. 每个 Must 必须可追踪到测试和发布条件。
12. 同一事实只有一个 SSOT，其余文档通过 ID/链接复用。

==================================================
四、文档元数据与质量规则
==================================================

每个新文档顶部必须有：

status: REVIEW
document_version: 1.0
owner: <明确角色>
last_reviewed: 2026-09-01
approved_by: null
supersedes: []

目标文档写到 REVIEW，不得自行标 APPROVED。

每份文档必须：

- 使用中文，协议字段保留英文；
- 有“本文负责什么 / 不负责什么”；
- 使用稳定 ID；
- 详细列出正常、边界、错误、取消和清理；
- 关键流程有 Mermaid；
- 使用相对链接；
- 无敏感数据；
- 不写当前实现 PASS/FAIL；
- 不出现空的 TBD、稍后补充、略、同上；
- 仍需用户选择时创建 `DEC-xxx`，写清可选项、推荐方案、影响和默认推荐，不留空白；
- 每份文档包含验收和关联测试 ID 规划，即使 TP-G1 尚未写脚本。

==================================================
五、必须创建的目标产品文档
==================================================

严格按 `docs/target-product/README.md` 清单创建并完整填写：

1. docs/target-product/00_DOCUMENT_CONTROL_AND_GLOSSARY.md
2. docs/target-product/01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md
3. docs/target-product/02_PERSONAS_JOBS_AND_SCENARIOS.md
4. docs/target-product/03_TARGET_FEATURE_CATALOG.md
5. docs/target-product/04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md
6. docs/target-product/05_TARGET_PAGE_CATALOG.md
7. docs/target-product/pages/PAGE-001_SCAN.md
8. docs/target-product/pages/PAGE-002_HID_PROVISION.md
9. docs/target-product/pages/PAGE-003_HID_DETAIL.md
10. docs/target-product/pages/PAGE-004_HID_HISTORY.md
11. docs/target-product/pages/PAGE-005_HID_DIAGNOSTICS.md
12. docs/target-product/pages/PAGE-006_DEVICE_DETAIL.md
13. docs/target-product/pages/PAGE-007_CONNECTED.md
14. docs/target-product/pages/PAGE-008_BROADCAST.md
15. docs/target-product/pages/PAGE-009_ABOUT.md
16. docs/target-product/pages/PAGE-010_VERSION.md
17. docs/target-product/web/WEB-001_LANDING_PAGE.md
18. docs/target-product/06_TARGET_USER_FLOWS.md
19. docs/target-product/07_INTERACTION_STATE_AND_ERROR_MODEL.md
20. docs/target-product/08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md
21. docs/target-product/09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md
22. docs/target-product/10_RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP.md
23. docs/target-product/11_BLE_GATT_PROTOCOL_CONTRACT.md
24. docs/target-product/12_ESP32_FIXTURE_CONTRACT.md
25. docs/target-product/13_SMART_HID_PROFILE_CONTRACT.md
26. docs/target-product/14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md
27. docs/target-product/15_SECURITY_AND_THREAT_MODEL.md
28. docs/target-product/16_NON_FUNCTIONAL_REQUIREMENTS.md
29. docs/target-product/17_ACCESSIBILITY_I18N_AND_CONTENT_GUIDE.md
30. docs/target-product/18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md
31. docs/target-product/19_OPEN_SOURCE_DEVELOPER_EXPERIENCE.md
32. docs/target-product/20_OPERATIONS_SUPPORT_AND_MAINTENANCE.md
33. docs/target-product/21_RISK_REGISTER_AND_DECISION_LOG.md
34. docs/target-product/22_TARGET_TRACEABILITY_MATRIX.md
35. docs/target-product/23_DEFINITION_OF_DONE.md
36. docs/target-product/REVIEW_SUMMARY.md

不得只创建空模板。每一份都要有实质内容。

==================================================
六、ID 体系
==================================================

建立并在所有文档中一致使用：

REQ-xxx
FEAT-xxx
PAGE-001～010
WEB-001
OP-xxx
FLOW-xxx
STATE-xxx
ERR-xxx
DATA-xxx
PROTO-xxx
SEC-xxx
NFR-xxx
TEST-C/U/I/P/E/A/W/H/R-xxx
EVID-xxx
DEC-xxx
RISK-xxx
FIX-xxx
CLAIM-xxx

规则：

- 不重用 ID；
- 不用自然语言替代 ID；
- 每个 Must REQ 至少映射 Feature、Page/Flow、Test 规划；
- 涉及硬件时映射 E5 Test；
- 涉及落地页声明时映射 CLAIM 和 TEST-R；
- 所有引用必须存在；
- 22_TARGET_TRACEABILITY_MATRIX.md 不得有孤立 Must。

==================================================
七、目标功能目录要求
==================================================

`03_TARGET_FEATURE_CATALOG.md` 必须把功能拆细，至少包含以下功能组和稳定 Feature ID：

SYS：
- 启动与平台识别；
- 四 Tab 与二级页；
- 应用前后台生命周期；
- 版本与构建渠道。

PERM：
- 蓝牙权限；
- 微信定位权限策略；
- 永久拒绝恢复；
- 蓝牙关闭与系统设置；
- 平台不支持。

SCAN：
- 开始、停止、超时；
- 第二轮独立扫描；
- 扫描 generation；
- deviceId 去重；
- RSSI 更新；
- 名称来源；
- 列表上限；
- 筛选与数量；
- 广播详情。

AD：
- name/localName/AD 0x09/0x08；
- Service UUID；
- Manufacturer Data；
- Service Data；
- 原始字节；
- 缺失/空字段；
- 复制。

CONN：
- 连接 attempt；
- 服务/特征发现；
- 空服务；
- 手动重试；
- 主动断开；
- 被动断开；
- 有限重连；
- 重连耗尽。

GATT：
- 属性识别；
- Read；
- TEXT Write；
- HEX Write；
- Write Queue；
- MTU 与分包；
- Notify/Indicate；
- tuple 路由；
- 超时和错误。

SESSION：
- 应用级 Session Registry；
- 跨页/跨 Tab；
- 多设备；
- stale event；
- Session ownership；
- Listener cleanup。

LOG：
- 按设备日志；
- 容量；
- 清空；
- 导出；
- 敏感过滤；
- 关联 OP/Request ID。

PERI：
- 平台能力；
- Payload 字段；
- 31/32 字节；
- Central/Peripheral owner；
- 活动连接保护；
- start/stop/hide/unload；
- Observer 验证。

OTA：
- 文件选择/校验；
- Subscribe STATUS；
- CTRL start；
- ready；
- DATA chunks；
- CTRL commit；
- success；
- abort；
- reboot；
- reconnect；
- version readback；
- 失败恢复。

HID-PROV：
- Profile matcher；
- Device Info；
- QR；
- Wi-Fi/Hub；
- candidate framing；
- waiter；
- 状态和错误；
- token/password 边界；
- READY。

HID-HIST：
- 历史存储；
- 详情快照；
- TTL；
- 移除；
- 自动诊断；
- owned/borrowed Session；
- 重配移交。

PRODUCT：
- 关于；
- VERSION；
- 版本历史；
- 平台状态；
- 分享；
- 反馈；
- 隐私；
- Security；
- License。

WEB：
- Hero；
- 核心闭环；
- 能力卡；
- 平台状态；
- 截图；
- 原型；
- ESP32；
- 三条快速开始；
- 下载/NOT_RELEASED；
- QR；
- Evidence/Limitations；
- Smart HID；
- SEO/OG/Canonical；
- 链接与无障碍。

DOC：
- 5 分钟开始；
- ESP32 从零；
- Profile 扩展；
- Contribution；
- Issue/Security；
- Release/Changelog。

每个 Feature 必须按 target README 规定的完整字段写，不允许只写名称。

==================================================
八、目标页面要求
==================================================

页面结构遵守 `docs/target-product/README.md` 统一 24 章节模板。

特别要求：

PAGE-001：
- 顶部平台/蓝牙/权限状态；
- 开始/停止/重试；
- 发现总数与筛选数；
- 筛选；
- 设备卡；
- 广播详情；
- 连接/Profile 动作；
- Smart HID 历史紧凑入口，不重复完整列表；
- 至少列出权限拒绝、蓝牙关、扫描失败、无设备、筛选空五个独立状态。

PAGE-002：
- 连接→身份→表单→QR→下发→状态；
- 无正式跳过 ControlHub；
- Mock 仅测试；
- 密码掩码/显示；
- token 不展示不持久化；
- READY 后预期断开和 Session 释放。

PAGE-003：
- 历史快照醒目说明；
- 缺失字段隐藏；
- 重配/诊断主动作；
- 高级 BLE 折叠且说明可发现条件。

PAGE-004：
- Smart HID 历史唯一完整列表；
- 查看详情/重配/诊断/移除；
- 移除仅本机；
- 90 天 TTL 说明；
- 不显示在线绿点。

PAGE-005：
- 进入自动诊断一次；
- 手动重试；
- Pending 不等于 OK；
- 时间；
- owned/borrowed Session；
- 重配移交。

PAGE-006：
- 设备身份/连接；
- 服务树；
- Read/Write/Notify；
- 日志；
- OTA；
- 用户订阅 Notify 属于 Session；
- 主动断开移出活动 Registry；
- OTA 未达到目标时正式版 Blocked/隐藏。

PAGE-007：
- 只显示活动 Session；
- 配网内部 Session 不进入；
- 复用连接；
- 单断/全断/部分失败；
- 重连进度；
- 多设备隔离。

PAGE-008：
- 平台真实可控字段；
- 系统接管字段明确；
- 默认 Payload；
- 31/32；
- Central/Peripheral Owner；
- 活动连接保护；
- 生命周期；
- ESP32 Observer 为正式证据。

PAGE-009：
- 产品/版本；
- 平台状态；
- 核心能力；
- 官网/GitHub/文档/ESP32；
- 反馈/分享；
- Privacy/Security/License；
- 其他小程序仅微信页底折叠。

PAGE-010：
- VERSION 唯一源；
- 当前版本；
- 发布日期；
- 新增/修复/优化/限制；
- dev.shortsha；
- 与 Release Metadata 一致。

WEB-001：
- 正确产品定位，不是多端大一统；
- PREVIEW/VERIFIED 等状态；
- 真实 CTA；
- 无产物时 NOT_RELEASED 且无假链接；
- App 截图；
- 原型；
- Peripheral/Observer；
- 三条快速开始；
- Evidence、SHA、设备和限制；
- Smart HID；
- GitHub/Issue/Security/License；
- SEO/OG/canonical；
- mobile/desktop/dark/light/a11y。

==================================================
九、目标流程要求
==================================================

`06_TARGET_USER_FLOWS.md` 至少定义：

FLOW-001 首次启动与权限
FLOW-002 两轮扫描
FLOW-003 广播详情
FLOW-004 连接与服务发现
FLOW-005 Read/Write/Notify
FLOW-006 跨页 Session
FLOW-007 多设备
FLOW-008 手机 Peripheral
FLOW-009 OTA 完整事务
FLOW-010 Smart HID 首次配网
FLOW-011 Smart HID 历史/诊断/重配
FLOW-012 关于/分享/反馈
FLOW-013 落地页体验/下载/ESP32
FLOW-014 Release 后新安装和首次联调

每条必须有主路径、错误路径、取消、清理、Mermaid 流程图、Mermaid 时序图和 Test ID 规划。

==================================================
十、目标 Runtime 与资源所有权
==================================================

`10_RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP.md` 必须定义目标层次：

```text
Page
→ Composable
→ Store / Workflow
→ Domain Service
→ BLE Runtime / Platform Adapter
→ uni / wx / plus / native API
```

冻结：

- Central Runtime 是全局 BLE 回调唯一所有者；
- 页面不直接注册 onBLECharacteristicValueChange / ConnectionStateChange；
- Scan Generation 防迟到事件；
- Connect Attempt 去重；
- Session Registry 应用级持有；
- Notify tuple 路由；
- 用户开启的 Notify 与 Session 生命周期规则；
- Logger 按 device；
- Peripheral 单一 Owner；
- OTA Transaction 独立状态机；
- Smart HID Workflow 与通用 Runtime 分离；
- 成功/失败/超时/取消/离页的资源释放矩阵；
- 重入、并发和 stale callback 规则。

不得写当前 PAGE-008 内联实现为目标架构。

==================================================
十一、ESP32 与 OTA 目标
==================================================

`12_ESP32_FIXTURE_CONTRACT.md` 和 `11_BLE_GATT_PROTOCOL_CONTRACT.md` 必须定义：

fixture_peripheral：
- 广播名 `BLEToolkit-Server`；
- 主 Service；
- 权限组合 Service；
- OTA Service；
- Device Info；
- LED 4 模式；
- Notify；
- Fault Injection；
- 串口 JSON。

fixture_observer：
- 扫描手机 Peripheral；
- 输出时间、名称、RSSI、UUID、Manufacturer、Service Data、原始字节、最后发现时间。

OTA 目标顺序固定：

1. Subscribe STATUS。
2. CTRL start（size/chunk_size/target_version）。
3. Wait ready。
4. DATA chunks。
5. CTRL commit。
6. Wait success。
7. Device reboot。
8. Re-scan/reconnect。
9. Read firmware_version。
10. Version match 才成功。

取消必须 CTRL abort；无 ready/commit/success/version match 都不得成功。

注意：这是目标，不得写当前实现已经符合。

==================================================
十二、Smart HID 目标
==================================================

`13_SMART_HID_PROFILE_CONTRACT.md` 必须以 Smart-HID canonical contract 为外部正典，明确：

- Smart BLE 只实现受锁定客户端 Profile；
- 强/弱匹配；
- Device Info 二次确认；
- 错设备断开；
- QR、Wi-Fi、Hub、candidate；
- waiter 先注册；
- state/step 分离；
- 八类错误与唯一恢复动作；
- token/password 内存边界；
- 历史快照；
- 诊断 owned/borrowed Session；
- READY 后配网连接释放；
- ControlHub/MQTT/USB HID 不由 Smart BLE 通用 Runtime 承担；
- Smart HID 不阻塞通用 BLE 首版 Gate 的规则及发布状态。

==================================================
十三、安全、数据、性能与无障碍
==================================================

必须写实质内容：

数据：
- Device、Advertisement、Session、Characteristic、Log、HID History、Diagnostic、Version、Release、Evidence；
- TTL、容量、删除、迁移；
- 敏感字段分类。

安全：
- BLE 假设备；
- 恶意广播；
- QR/token 泄露；
- Wi-Fi 密码；
- 日志和截图；
- OTA 恶意固件/降级/中断；
- 下载供应链和 SHA；
- 外链/二维码；
- Smart HID 控制风险；
- 威胁、缓解和残余风险。

NFR 必须量化：
- 扫描时长和 UI 刷新；
- 设备列表上限；
- 日志上限；
- 读写/连接/Notify/OTA 超时；
- 多设备目标；
- 页面响应；
- 构建复现；
- 崩溃和资源泄漏标准。

无障碍：
- 触控目标；
- 对比度；
- 读屏 label；
- 焦点；
- 动态状态；
- 错误文案；
- 中英文术语；
- 不仅靠颜色；
- 微信和 App 差异。

==================================================
十四、机器可读目标契约
==================================================

创建：

contracts/target/product-target.schema.json
contracts/target/product-target.json
contracts/target/pages-target.schema.json
contracts/target/pages-target.json
contracts/target/flows-target.schema.json
contracts/target/flows-target.json
contracts/target/platform-target.schema.json
contracts/target/platform-target.json
contracts/target/ble-fixture-target.schema.json
contracts/target/ble-fixture-target.json
contracts/target/smart-hid-target.schema.json
contracts/target/smart-hid-target.json
contracts/target/landing-target.schema.json
contracts/target/landing-target.json
contracts/target/test-traceability.schema.json
contracts/target/test-traceability.json

要求：

- JSON 合法；
- Schema 有 required、enum、pattern、uniqueItems 和引用约束能表达的部分；
- Markdown 与 JSON ID 一致；
- 当前 TP-G0 的 test-traceability 可以先登记“planned test IDs”，但 Must 不得为空；
- status 为 REVIEW；
- approved_by 为 null；
- 不写当前实现状态；
- 不创建执行脚本，本轮只创建契约数据。

==================================================
十五、风险、决策与 REVIEW_SUMMARY
==================================================

`21_RISK_REGISTER_AND_DECISION_LOG.md` 至少包含：

- OTA 首版公开策略；
- Observer 必须第一方固件；
- 微信定位策略需 TP-G4 真机最终验证；
- Android 广播名称系统接管；
- UniApp iOS 发布时机；
- Smart HID 是否进入首版公开能力；
- 正式小程序码和 APK 未发布时的落地页策略；
- 多设备目标上限；
- Notify 跨页保留；
- 版本 SSOT；
- GitHub/Gitee 角色。

每项 DEC：选项、推荐、理由、影响、默认方案、用户是否必须确认。

`REVIEW_SUMMARY.md` 必须浓缩所有目标文档，包含：

- 产品范围；
- Must 功能数量和分组；
- 11 个界面摘要；
- 14 条流程；
- 平台矩阵；
- Runtime 架构；
- ESP32/OTA；
- Smart HID；
- Landing/Release；
- Security/NFR/A11y；
- DEC 清单；
- 文档和 ID 完整性统计；
- 用户批准复选框；
- 明确“未批准前禁止 TP-G1”。

==================================================
十六、完整性验证
==================================================

本轮不创建目标测试脚本，但需要执行只读/临时验证：

- `git diff --check`
- 使用 Node/Python 一次性命令确认所有目标 JSON 可解析
- 搜索重复 ID
- 搜索坏的相对 Markdown 链接
- 检查清单中所有文件存在
- 检查 PAGE/WEB 文档 24 章节齐全
- 检查 Must Feature 都有 planned Test ID
- 检查 Mermaid fenced block 基本成对
- 检查目标文档中不得出现当前状态词：`当前已实现`、`当前 FAIL`、具体 commit 作为目标状态

如需要写临时验证代码，放系统临时目录或用 one-liner，不提交 scripts/target。

==================================================
十七、提交和最终报告
==================================================

建议提交：

`docs(target): define the complete Smart BLE target product`

提交只包含：

- 新总计划和 target README（若尚未提交）；
- docs/target-product/**；
- contracts/target/**；
- TP-G0 prompt/index 必要更新。

不得包含 App、Runtime、固件、测试脚本、生产落地页和 build 产物。

不得 push。

最终报告：

TP-G0:
- PASS / PARTIAL / FAIL

BASELINE:
- branch
- start/end commit
- initial/final worktree

DOCUMENTS:
- 目标文档数量
- 页面文档数量
- JSON/Schema 数量
- Mermaid 数量
- REQ/FEAT/PAGE/FLOW/STATE/ERR/PROTO/SEC/NFR/CLAIM/DEC 数量

KEY TARGET:
- 产品范围
- 11 个界面
- 14 条流程
- Runtime
- ESP32/OTA
- Smart HID
- Landing/Release

OPEN DECISIONS:
- DEC ID、推荐方案和影响

VALIDATION:
- JSON parse
- ID uniqueness
- link checks
- template completeness
- git diff --check

BUSINESS CODE:
- NOT MODIFIED

TEST SCRIPTS:
- NOT CREATED（TP-G1）

GIT:
- commit
- pushed: NO

NEXT:
- 用户审阅 docs/target-product/REVIEW_SUMMARY.md
- 未批准前不进入 TP-G1

任何未实际完成的文档不得写 PASS。
```
