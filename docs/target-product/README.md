# Smart BLE 目标产品规范入口

> 状态：REVIEW / TP-G0-R1 修订完成（12 项目标规范修正已合入），等待用户审阅 [`REVIEW_SUMMARY.md`](REVIEW_SUMMARY.md) 并批准
> 文档版本：1.2
> Owner：Smart BLE Product / Engineering
> 最后更新：2026-09-01
> 当前方法论：[`目标产品规范、测试体系、差距分析与修复总计划`](../plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md)
> 统计单源：`scripts/target-docs/inspect-target-docs.mjs`（目标文档质量工具，非 TP-G1 业务测试）

---

## 1. 本目录的职责

本目录是 Smart BLE **目标产品**的唯一人类可读正典，描述产品最终应该达到的状态。

它负责：

- 产品定位、范围和非目标；
- 用户、场景和任务；
- 目标功能；
- 目标页面和落地页；
- 用户流程、状态和错误；
- Android、微信、H5、iOS 和参考客户端的目标能力；
- BLE Runtime 的目标架构；
- LightBLE ESP32 Peripheral / Observer；
- Smart HID Profile；
- 数据、隐私、安全、性能和无障碍；
- 版本、Release Metadata 和公开状态；
- 开源交付、运维、风险、追踪和 Definition of Done。

它不负责：

- 当前代码已经实现了什么；
- 当前测试是否通过；
- 当前 Bug 和临时修复；
- 某次真机测试结果；
- 某个 Commit 的实现差距。

这些分别属于：

```text
docs/current-state/
docs/gap-analysis/
docs/remediation/
docs/verification/runs/
```

---

## 2. 正典优先级

目标产品层的优先级：

```text
00_DOCUMENT_CONTROL_AND_GLOSSARY.md
→ 01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md
→ 03_TARGET_FEATURE_CATALOG.md
→ 页面 / 流程 / 平台 / 协议文档
→ 22_TARGET_TRACEABILITY_MATRIX.md
→ contracts/target/*.json 机器投影
```

出现冲突时：

1. 先停止实现和测试修改；
2. 在 `21_RISK_REGISTER_AND_DECISION_LOG.md` 创建 `DEC-xxx`；
3. 同时修改人类文档与机器投影；
4. 运行目标契约门；
5. 不允许开发者在代码中自行选择其中一种解释。

---

## 3. 文档状态

每份文档顶部必须包含：

```yaml
status: DRAFT | REVIEW | APPROVED | SUPERSEDED
document_version: x.y
owner: <role>
last_reviewed: YYYY-MM-DD
approved_by: null | <name/role>
supersedes: []
```

状态定义：

- `DRAFT`：正在编写，不允许驱动业务实现；
- `REVIEW`：内容完整，等待用户审阅；
- `APPROVED`：可驱动目标测试和实现；
- `SUPERSEDED`：只保留历史，不再指导实现。

TP-G0 完成时，核心目标文档应达到 `REVIEW`；只有用户确认后才能改为 `APPROVED`。

---

## 4. 完整文档清单

### 4.1 治理与总览

| 文件 | 负责内容 | 最低详细度 |
|---|---|---|
| `00_DOCUMENT_CONTROL_AND_GLOSSARY.md` | 文档治理、ID、术语、状态、变更和批准规则 | 所有术语、状态与 ID 有唯一解释 |
| `01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md` | 定位、范围、非目标、首版边界、产品原则 | 明确包含/不包含和公开状态原则 |
| `02_PERSONAS_JOBS_AND_SCENARIOS.md` | 用户角色、Jobs To Be Done、典型场景 | 每个 Persona 至少 3 个完整场景 |

### 4.2 目标功能、导航和页面

| 文件 | 负责内容 | 最低详细度 |
|---|---|---|
| `03_TARGET_FEATURE_CATALOG.md` | 完整目标功能目录 | 每项含输入/输出/错误/平台/测试/发布条件 |
| `04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md` | 四 Tab、二级页、深链、返回和入口关系 | Mermaid 页面图 + 路由/参数表 |
| `05_TARGET_PAGE_CATALOG.md` | PAGE-001～010 与 WEB-001 总表 | 页面目的、首屏、依赖、测试和非目标 |
| `pages/PAGE-001_SCAN.md` | 扫描页完整目标契约 | 23 项页面规范章节 |
| `pages/PAGE-002_HID_PROVISION.md` | Smart HID 配网页 | 同上 |
| `pages/PAGE-003_HID_DETAIL.md` | Smart HID 详情页 | 同上 |
| `pages/PAGE-004_HID_HISTORY.md` | Smart HID 历史页 | 同上 |
| `pages/PAGE-005_HID_DIAGNOSTICS.md` | Smart HID 诊断页 | 同上 |
| `pages/PAGE-006_DEVICE_DETAIL.md` | 通用设备详情 | 同上，需完整 GATT/OTA |
| `pages/PAGE-007_CONNECTED.md` | 活动 Session 管理 | 同上，需多设备和清理 |
| `pages/PAGE-008_BROADCAST.md` | 手机 Peripheral | 同上，需 Observer 与字节预算 |
| `pages/PAGE-009_ABOUT.md` | 产品/帮助/开源 | 同上，需平台状态和公开入口 |
| `pages/PAGE-010_VERSION.md` | 版本历史 | 同上，需 VERSION/Metadata |
| `web/WEB-001_LANDING_PAGE.md` | 公开产品入口 | Hero 到 Release/Evidence 的完整 Web 契约 |

### 4.3 流程、状态和平台

| 文件 | 负责内容 | 最低详细度 |
|---|---|---|
| `06_TARGET_USER_FLOWS.md` | 至少 14 条主流程 | 每条含主路径、错误路径、流程图、时序图和测试映射 |
| `07_INTERACTION_STATE_AND_ERROR_MODEL.md` | 全局状态、错误码、恢复动作、Toast/Dialog/Banner 使用 | 状态机、错误映射和唯一恢复动作 |
| `08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md` | Android、微信、H5、iOS、参考客户端 | 每项能力 Full/Adapted/Unsupported/Not Released + UI 降级 |

### 4.4 数据、架构和协议

| 文件 | 负责内容 | 最低详细度 |
|---|---|---|
| `09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md` | 设备、Session、历史、日志、版本、证据数据 | Schema、生命周期、TTL、敏感字段和删除规则 |
| `10_RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP.md` | Runtime、Store、Workflow、Adapter、资源所有权 | 模块图、事件流、并发、重入和释放矩阵 |
| `11_BLE_GATT_PROTOCOL_CONTRACT.md` | 通用 BLE/GATT 目标语义 | UUID、属性、编码、超时、分包、错误和 MTU |
| `12_ESP32_FIXTURE_CONTRACT.md` | Peripheral/Observer 固件目标 | 服务、命令、Notify、OTA、Fault、串口和构建 |
| `13_SMART_HID_PROFILE_CONTRACT.md` | Profile 匹配、配网、状态、历史、诊断 | 与 canonical contract 的边界和完整时序 |

### 4.5 质量、安全与公开交付

| 文件 | 负责内容 | 最低详细度 |
|---|---|---|
| `14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md` | App/固件日志、事件、Evidence 包 | Schema、脱敏、容量、关联 ID 和证据格式 |
| `15_SECURITY_AND_THREAT_MODEL.md` | BLE、二维码、凭据、日志、下载和供应链威胁 | 资产、威胁、缓解、残余风险和安全测试 |
| `16_NON_FUNCTIONAL_REQUIREMENTS.md` | 性能、稳定性、容量、兼容、恢复、可维护性 | 可量化阈值和测试方法 |
| `17_ACCESSIBILITY_I18N_AND_CONTENT_GUIDE.md` | 无障碍、中文文案、术语、平台措辞 | 触控、读屏、对比度、焦点、错误文案和本地化 |
| `18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md` | VERSION、Tag、Manifest、Artifact、公开状态 | Schema、生成、校验、Preview/Verified 规则 |
| `19_OPEN_SOURCE_DEVELOPER_EXPERIENCE.md` | 5 分钟上手、构建、Profile 扩展、贡献 | 新电脑路径、最小示例、Issue/Security/License |
| `20_OPERATIONS_SUPPORT_AND_MAINTENANCE.md` | 发布后支持、兼容、回滚、维护和弃用 | Runbook、SLA、升级/降级和故障处理 |
| `21_RISK_REGISTER_AND_DECISION_LOG.md` | 风险与产品决策 | DEC/RISK 表、状态、Owner、影响和复审日期 |
| `22_TARGET_TRACEABILITY_MATRIX.md` | REQ→Feature→Page→Flow→Test→Claim | Must 覆盖率 100%，不得有孤立 ID |
| `23_DEFINITION_OF_DONE.md` | 页面、功能、ESP32、真机、Web 和 Release 完成定义 | 分层 DoD 和最终产品 DoD |

---

## 5. 每个页面文档的统一模板

每个 PAGE / WEB 文档必须使用以下章节，不允许省略；不适用项写 `N/A + 原因`。

```text
# PAGE/WEB ID 与名称

## 0. 文档元数据
## 1. 页面目标与存在必要性
## 2. 用户角色与使用场景
## 3. 进入来源、路由参数、深链与冷启动
## 4. 信息架构与区块顺序
## 5. 首屏必须可见内容
## 6. 字段定义与数据来源
## 7. 完整操作表
## 8. 完整状态表
## 9. 错误、空态和恢复动作
## 10. 页面跳转与返回规则
## 11. Runtime / Web 调用链
## 12. 资源所有权与生命周期
## 13. 平台差异与降级
## 14. ESP32 / Smart HID / Release 依赖
## 15. 安全、隐私和脱敏
## 16. 性能、容量和超时
## 17. 无障碍、文案和视觉规则
## 18. 自动化测试映射
## 19. 真机 / 发布测试映射
## 20. 公开声明与证据要求
## 21. 验收条件
## 22. 非目标与禁止行为
## 23. Mermaid 流程图 / 状态图
## 24. 关联 ID 与链接
```

操作表固定字段：

| 字段 | 要求 |
|---|---|
| Operation ID | 稳定 `OP-xxx` |
| 控件/入口 | 按钮、卡片、开关、输入、链接、生命周期 |
| 显示条件 | 何时出现 |
| 禁用条件 | 何时不可操作及原因 |
| 用户输入 | 类型、格式、长度和默认值 |
| 调用链 | 目标模块，不写当前实现 |
| 成功反馈 | 页面、设备和后续状态 |
| 失败反馈 | 错误码、文案和恢复动作 |
| 跳转/返回 | 目标页和状态保留 |
| 清理 | Listener、Session、Timer、Server、Adapter |
| 测试 | 自动化与 E5/E6 ID |

状态表固定字段：

| 字段 | 要求 |
|---|---|
| State ID | `STATE-xxx` |
| 状态名称 | 用户可理解名称 |
| 进入条件 | 唯一且可测试 |
| 页面内容 | 图标、标题、说明、CTA |
| 允许操作 | 不得与状态冲突 |
| 退出条件 | 成功、失败、取消、超时 |
| 数据更新 | Store/Session/History 变化 |
| 测试 | 正常、边界和恢复 |

---

## 6. 首版目标功能组

目标功能目录至少包含以下组，不代表仅限这些项：

```text
SYS       启动、平台、导航、版本、生命周期
PERM      蓝牙、定位、系统设置和永久拒绝恢复
SCAN      扫描、停止、超时、第二轮、去重、RSSI、名称
AD        广播解析、UUID、Manufacturer、Service Data、复制
CONN      连接、发现、重试、主动/被动断开
GATT      Read、TEXT/HEX Write、Notify/Indicate、属性、MTU、队列
SESSION   跨页、跨 Tab、多设备、重连、迟到事件、资源清理
LOG       设备日志、容量、导出、脱敏和关联 ID
PERI      手机 Peripheral、Payload、31/32、Owner、Observer
OTA       start、ready、data、commit、success、abort、重启、版本回读
HID-PROV  Smart HID 匹配、身份、QR、candidate、状态与错误
HID-HIST  历史、详情、诊断、重配和 Session 所有权
PRODUCT   关于、版本、分享、反馈、隐私、安全和许可证
WEB       落地页、状态、下载、二维码、证据、SEO 和 Release
DOC       ESP32 教程、Profile 指南、贡献、Security 和开源交付
```

每一组必须拆成稳定 `FEAT-xxx`，不得用一行“大功能”逃避错误和边界定义。

---

## 7. 首版页面与导航目标

顶层 Tab 固定：

```text
扫描 PAGE-001
已连接 PAGE-007
广播 PAGE-008
关于 PAGE-009
```

二级页：

```text
PAGE-002 Smart HID 配网
PAGE-003 Smart HID 详情
PAGE-004 Smart HID 历史
PAGE-005 Smart HID 诊断
PAGE-006 通用设备详情
PAGE-010 版本记录
```

公开 Web：

```text
WEB-001 落地页
```

Smart HID 是 Profile，不占独立 Tab。

---

## 8. Mermaid 要求

必须提供以下图：

- 产品总体架构图；
- 信息架构与页面跳转图；
- 扫描状态机；
- 连接/Session 状态机；
- Notify 订阅时序；
- Central/Peripheral 模式所有权图；
- OTA 时序和状态机；
- Smart HID 配网时序；
- Evidence/Release 数据流；
- Landing Page 信息架构；
- 目标测试金字塔；
- Target→Current→Gap→Fix 追踪图。

Mermaid 必须使用稳定 ID，不只画自然语言框。

---

## 9. TP-G0 完整性检查

TP-G0 退出前必须检查：

- [ ] 所有清单文件存在；
- [ ] 每份文档有元数据；
- [ ] PAGE/WEB 文档使用完整模板；
- [ ] 所有 Must 功能有 Feature ID；
- [ ] 所有 Feature 有 Page/Flow 或明确后台能力；
- [ ] 所有页面操作有 Operation ID；
- [ ] 所有状态有 State ID；
- [ ] 所有错误有 Error ID 和恢复动作；
- [ ] Android/微信/H5/iOS 平台结论明确；
- [ ] Peripheral/Observer 目标完整；
- [ ] OTA 目标时序完整；
- [ ] Smart HID 与 canonical 边界明确；
- [ ] WEB-001 没有假下载和无证据声明；
- [ ] Security/NFR/Accessibility/Privacy 不缺；
- [ ] VERSION/Release/公开状态有唯一规则；
- [ ] 风险、决策、追踪和 DoD 完整；
- [ ] 机器契约文件存在且引用一致；
- [ ] 核心文档状态为 REVIEW；
- [ ] 暂未修改业务代码和测试实现。

---

## 10. 用户审核入口

TP-G0 完成后，用户不需要逐个浏览几十个文件才能做决定。必须额外生成：

```text
docs/target-product/REVIEW_SUMMARY.md
```

该摘要至少包含：

- 产品范围；
- Must 功能总表；
- 11 个产品界面摘要；
- 14 条主流程摘要；
- 平台矩阵；
- ESP32 与 Smart HID；
- OTA；
- 落地页；
- 版本和发布；
- 尚需用户确认的 DEC；
- 文档完整性统计；
- 进入 TP-G1 的批准清单。

用户批准 `REVIEW_SUMMARY.md` 后，才允许将目标文档状态改为 APPROVED，并进入测试脚本阶段。
