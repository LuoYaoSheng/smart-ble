# 00 文档治理、ID 体系与术语表

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE Product / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：

- `docs/target-product/` 全部目标文档的治理规则；
- 全产品唯一 ID 体系、编号空间与分配登记；
- 状态词、证据等级、优先级、公开状态等全部词汇的唯一解释；
- 术语表；
- 文档变更、冲突解决与批准流程。

本文不负责：

- 任何具体功能、页面、流程、协议的目标定义（见对应编号文档）；
- 当前实现状态（见 `docs/current-state/`）；
- 差距与修复（见 `docs/gap-analysis/`、`docs/remediation/`）。

---

## 2. 文档清单与状态

`docs/target-product/README.md` 第 4 节是文件清单的唯一事实源（SSOT）。本文只冻结治理规则。

所有目标文档状态词汇（唯一合法值）：

| 状态 | 含义 | 允许驱动实现 |
|---|---|---|
| DRAFT | 正在编写，内容不完整 | 否 |
| REVIEW | 内容完整，等待用户审阅 | 否 |
| APPROVED | 用户已批准 | 是 |
| SUPERSEDED | 已被替代，仅保留历史 | 否 |

TP-G0 交付时全部目标文档为 `REVIEW`，`approved_by: null`。只有用户批准 `REVIEW_SUMMARY.md` 后，才允许整体改为 `APPROVED`。

文档顶部元数据固定为 YAML 代码块，字段为 `status / document_version / owner / last_reviewed / approved_by / supersedes`。`supersedes` 为数组，无前驱时为 `[]`。

---

## 3. ID 体系（全产品唯一编号空间）

### 3.1 ID 类别与格式

| 类别 | 格式 | 分配登记处 |
|---|---|---|
| 产品需求 | `REQ-001` ~ `REQ-066` | `01`、`03`、`22` |
| 功能 | `FEAT-001` ~ `FEAT-081` | `03_TARGET_FEATURE_CATALOG.md`（唯一登记处） |
| App 页面 | `PAGE-001` ~ `PAGE-010` | `05_TARGET_PAGE_CATALOG.md` |
| Web 页面 | `WEB-001` | `web/WEB-001_LANDING_PAGE.md` |
| 页面操作 | `OP-P<页号3位>-<序号2位>` / `OP-W001-<序号2位>` | 对应页面文档第 7 节 |
| 页面状态 | `STATE-P<页号3位>-<序号2位>` / `STATE-W001-<序号2位>` | 对应页面文档第 8 节 |
| 全局引擎状态 | `STATE-GBL-xx` / `STATE-OTA-xx` / `STATE-HID-xx` | `07_INTERACTION_STATE_AND_ERROR_MODEL.md` |
| 用户流程 | `FLOW-001` ~ `FLOW-014` | `06_TARGET_USER_FLOWS.md` |
| 错误 | `ERR-<域>-<序号2位>`，域见 3.3 | `07_INTERACTION_STATE_AND_ERROR_MODEL.md`（唯一登记处） |
| 数据实体 | `DATA-001` ~ `DATA-013` | `09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md` |
| 协议 | `PROTO-001` ~ `PROTO-011` | `11`/`12`/`13`/`18` 对应协议文档 |
| 安全要求 | `SEC-001` ~ `SEC-019` | `15_SECURITY_AND_THREAT_MODEL.md` |
| 非功能要求 | `NFR-001` ~ `NFR-024` | `16_NON_FUNCTIONAL_REQUIREMENTS.md` |
| 公开声明 | `CLAIM-001` ~ `CLAIM-031` | `web/WEB-001` 与 `18` |
| 决策 | `DEC-001` ~ `DEC-017` | `21_RISK_REGISTER_AND_DECISION_LOG.md` |
| 风险 | `RISK-001` ~ `RISK-016` | `21_RISK_REGISTER_AND_DECISION_LOG.md` |
| 证据包类别 | `EVID-001` ~ `EVID-008` | `14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md` |
| 计划测试 | `TEST-C/U/I/P/E/A/W/H/R-xxx` | `22_TARGET_TRACEABILITY_MATRIX.md` + `contracts/target/test-traceability.json` |
| 修复任务 | `FIX-xxx` | TP-G2 之后在 `docs/remediation/` 分配；TP-G0 仅保留编号空间，不分配 |

### 3.2 ID 规则

1. ID 一经发布不得重用、不得改义；废弃时保留编号并在登记处标 `Deprecated`。
2. 同一事实只有一个登记处（SSOT），其他文档通过 ID + 相对链接引用，不得复制定义。
3. 所有引用必须存在（无悬空引用）；`22_TARGET_TRACEABILITY_MATRIX.md` 不得有孤立 Must。
4. 每个 Must REQ 至少映射：1 个 FEAT、1 个 PAGE/FLOW/后台能力、≥1 个计划测试；涉及硬件再加 E5 测试（TEST-E/A/W/H）；涉及公开声明再加 CLAIM + TEST-R。
5. Markdown（人类正典）与 `contracts/target/*.json`（机器投影）ID 必须一致；不一致时目标契约门失败，不得静默取其一。

### 3.3 错误域前缀

| 域 | 前缀 | 覆盖 |
|---|---|---|
| 权限 | `ERR-PERM-xx` | 蓝牙/定位权限、永久拒绝、系统设置 |
| 蓝牙适配器 | `ERR-BT-xx` | 蓝牙关闭、适配器打开失败、平台不支持 |
| 扫描 | `ERR-SCAN-xx` | 启动/停止失败、超时异常 |
| 连接 | `ERR-CONN-xx` | 连接、服务发现、断开、重连耗尽 |
| GATT | `ERR-GATT-xx` | Read/Write/Notify/MTU/属性/编码 |
| 会话 | `ERR-SESSION-xx` | stale 事件、会话失效、清理失败 |
| 广播 | `ERR-PERI-xx` | 支持检查、启停、参数、冲突 |
| OTA | `ERR-OTA-xx` | start/ready/data/commit/success/version 各阶段 |
| Smart HID | `ERR-HID-xx` | 配网八类错误及客户端侧错误 |
| 数据 | `ERR-DATA-xx` | 存储、TTL、导出、版本读取 |
| 系统 | `ERR-SYS-xx` | 生命周期、导航、运行环境 |
| Web/发布 | `ERR-WEB-xx` | 链接、下载、二维码、Metadata 漂移 |

---

## 4. 证据等级（E0–E6）

| 等级 | 名称 | 证明范围 | 不能证明 |
|---|---|---|---|
| E0 | Contract / Static | ID、路由、配置、Schema、UUID、文档与引用 | 运行行为 |
| E1 | Unit | 纯函数、状态机、编解码、校验、错误映射 | 平台 API 与射频 |
| E2 | Fake Runtime / Integration | 调用顺序、并发、超时、取消、资源释放 | 真实权限、BLE 栈、硬件 |
| E3 | Build | Android/微信/H5/ESP32/文档可构建 | 功能可用 |
| E4 | Page / Prototype / Visual | 页面、状态、跳转、交互、响应式、无障碍基础 | 真实 BLE、插件与射频 |
| E5 | Real Device | 真实手机、微信、ESP32、Observer、Smart HID 结果 | 独立环境与公开产物 |
| E6 | Clean Machine / Release | 固定 Commit、Artifact SHA、下载、安装、二维码、公开页面 | 后续版本长期稳定性 |

规则：E0–E4 不得提升为 E5；开发机结果不得自动提升为 E6；发布范围内 BLE Must 最低 E5；下载、二维码与公开声明最低 E6。

---

## 5. 优先级与公开状态词汇

优先级（唯一合法值）：`Must`（首版发布阻断）、`Should`（首版尽力，缺失需记录原因）、`Could`（体验增强）、`Not Now`（明确不在首版）。

公开状态（唯一合法值，用于落地页、关于页、版本页与 Release Metadata）：

| 状态 | 含义 | 发布条件 |
|---|---|---|
| VERIFIED | 已有对应等级证据（BLE 能力 E5，公开产物 E6） | 证据链完整 |
| PREVIEW | 功能存在且有 E0–E4 证据，未到 E5/E6 | 必须展示"预览"字样与已知限制 |
| BLOCKED | 被外部条件阻断（固件、工具链、凭据） | 必须展示阻断原因 |
| UNSUPPORTED | 该平台明确不支持该能力 | 必须展示替代路径或说明 |
| NOT_RELEASED | 目标已定义、产物未发布（如 iOS App） | 不得出现下载入口 |

禁止词汇：无健康指标支撑的"稳定/完整支持/已全面支持"；无 E5 证据的"已验证"；不可用产物的"下载"按钮。

---

## 6. 术语表

| 术语 | 唯一解释 |
|---|---|
| Smart BLE | 本产品：开源的跨平台 BLE 调试、学习与硬件联动工具。首版主线为 UniApp Android App + 微信小程序 |
| UniApp 主线 | `apps/uniapp`：同一代码产出 Android App 与微信小程序的正式产品入口 |
| BLE | Bluetooth Low Energy |
| Central / Observer 角色（手机侧） | 手机作为中心设备扫描、连接外围设备 |
| Peripheral | 外围设备角色。本文中指：(a) ESP32 夹具对外提供 GATT 服务；(b) 手机进入广播模式（PAGE-008） |
| GATT | Generic Attribute Profile；Service / Characteristic / Descriptor 层级 |
| Characteristic 属性 | read / write / writeNoResponse / notify / indicate 的能力组合 |
| MTU | ATT 最大传输单元；单次 ATT write 有效载荷上限为 MTU−3 |
| Notify / Indicate | 服务端主动推送；Indicate 需客户端确认 |
| Scan Generation | 一轮扫描的唯一代号；旧代号的迟到发现事件必须被丢弃 |
| Connection Attempt | 一次去重后的连接尝试（同设备并发连接请求合并） |
| Session | 一台设备的应用级连接上下文（含 Notify 订阅、重连计数、日志句柄） |
| Session Registry | 应用级注册表；页面销毁不销毁 Session |
| Notify tuple 路由 | 以 `(deviceId, serviceId, characteristicId)` 三元组把通知分发给正确订阅者 |
| Late/Stale Event | 平台回调晚于状态切换到达的事件；必须被 generation/session 校验丢弃 |
| Profile | 设备家族档案：matcher（强/弱匹配）+ 路由 + 协议编解码 + 能力声明。Smart HID 是第一个第一方 Profile |
| 强匹配 / 弱匹配 | 强：广播 Service UUID 精确命中；弱：名称前缀命中。弱匹配连接后必须二次身份确认 |
| Smart HID | 第一方 Profile：对 SHID-* 设备完成 BLE 配网（Wi-Fi + ControlHub + token）与诊断 |
| ControlHub | Smart HID 外部系统（LAN HTTP 服务，默认端口 17892）：签发配对 QR、下发 MQTT 凭据、转发控制命令。不由本产品实现 |
| Pairing QR | `shid://pair?token=<32hex>&host=<ip>&port=<17892>` 形态的动态一次性二维码（token 5 分钟有效） |
| fixture_peripheral | LightBLE ESP32 固件模式：对外广播并提供 GATT/LED/权限演示/OTA 服务，供手机连接调试 |
| fixture_observer | LightBLE ESP32 固件模式：扫描手机广播并从串口输出 JSON 观测流，作为手机 Peripheral 的正式证据 |
| Fault Injection | 夹具固件的受控故障模式（延迟、拒绝写入、OTA 失败等），用于错误路径测试；默认关闭 |
| OTA Transaction | 完整固件升级事务：STATUS subscribe → CTRL start → ready → DATA chunks → CTRL commit → success → reboot → reconnect → version readback |
| VERSION | 仓库根的单一人读版本文件，是 App/文档/关于页/版本页的版本唯一事实源 |
| Release Metadata | 每次 Release 的机器可读清单（版本、commit、产物 URL、SHA256、证据链接、已知限制） |
| Evidence / 证据包 | 按规定格式保存的测试证据（环境、日志、截图/视频、SHA），编号 `EVID-xxx` |
| First Breakpoint | 失败用例中最早偏离目标的位置（模块/调用/状态），不是最终 UI 症状 |
| SSOT | Single Source Of Truth，唯一事实源 |
| Dev 版本号 `dev.<shortsha>` | 未发布构建的版本显示格式，避免与正式版本混淆 |
| 已知限制（Known Limitations） | 公开发布时必须随附的未解决限制清单，来自 Release Metadata |
| H5 降级 | H5 端不发起真实 BLE 调用，仅提供文档/模拟/入口，并明确提示不支持 |

---

## 7. 变更与批准流程

1. 任何目标变更先改人类正典（对应登记文档），同步改 `contracts/target/*.json`；
2. 涉及未决选择时在 `21_RISK_REGISTER_AND_DECISION_LOG.md` 建 `DEC-xxx`，写明选项、推荐、影响与默认推荐；
3. 冲突时按 `README.md` 第 2 节优先级链处理，停止实现/测试修改，先解决冲突；
4. TP-G0 后任何文档从 `REVIEW` → `APPROVED` 仅允许由用户在 `REVIEW_SUMMARY.md` 批准后进行；
5. `APPROVED` 后的目标文档变更需递增 `document_version` 并在 `supersedes` 语义下留痕。

---

## 8. 验收条件与关联测试规划

本文验收：

- 全部 ID 类别有格式、登记处和规则；
- 状态词、证据等级、优先级、公开状态有唯一解释且全文一致；
- 术语表覆盖全部跨文档术语；
- 变更与批准流程可执行。

关联计划测试：`TEST-C-001`（ID 唯一性与登记处一致性）、`TEST-C-002`（文档元数据完整性）、`TEST-C-003`（状态词合法值检查）。
