# STORAGE_POLICY —— 存储与数据位置策略（开发前冻结）

> 版本：1.0（开发前冻结抽取）· 生成日期：2026-09-03
> 输入（本文全部结论的来源，仅此四目录）：[02_product](../02_product/)（PRD / BUSINESS_RULE / DATA_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC / BUSINESS_FLOW / USER_FLOW）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（ALIGNMENT_NOTES / FEATURE_CHECKLIST）
> 性质：**不新增功能、不改变产品逻辑，只做抽取**。本文是零本地持久化决策（2026-09-02）的开发落地口径：数据放在哪里、哪里绝对禁止、敏感数据如何处理。实体字段契约见 [DATA_MODEL.md](../02_product/DATA_MODEL.md)，本文不重复字段表。

## 1. 总则：零本地持久化

- **2026-09-02 用户决策：移除全部本地存储**（含 `smart_ble.smart_hid.known_devices.v1` 及 90 天/20 条约束）——新版本为**零本地存储形态**，配网会话均为内存态。（PRD 变更记录 · PRD §4.2「本地持久化」行）
- 业务规则 BR-02：零本地持久化（BUSINESS_RULE.md §1）。
- 数据模型前提：全部实体为内存态，**无任何存储键**（DATA_MODEL.md 开头前提句）。
- 平台不变式：零本地持久化决策列入平台不得触碰清单（10_platform §4 不变式行）；任何平台不得为内存实体引入本地存储/缓存落盘（DATA_MODEL §2 第 1 条）。

## 2. 三零边界（全平台一致）

| # | 规则 | 内容 | 来源 |
|---|---|---|---|
| Z-1 | 零网络 | 零 HTTP、零登录、零账号、零云同步；全部能力本地 + BLE + 扫码 | BR-01 · PRD §1.2（后端依赖=无）· PRD §1.3 |
| Z-2 | 零本地持久化 | 不引入任何形式的本地存储（键值/文件/数据库/缓存落盘） | BR-02 · DATA_MODEL §2.1 |
| Z-3 | 平台一致 | 零后端约束在所有平台一致保持：**任何平台增强不引入 HTTP/云端** | 10_platform §3 尾句 |

对应产品边界（PRD §1.3，开发不得出现）：不做登录/会员/License/支付/订单/商业设备管理；不做云同步/远程设备管理；不做 HID 实时键鼠控制。

## 3. 唯一允许的数据位置：内存（9 类实体及生命周期）

来源：DATA_MODEL.md §1（实体清单原文索引）。

| 实体 | 要点 | 生命周期 |
|---|---|---|
| ScannedDevice | deviceId、name（可缺失→显示名 fallback）、RSSI、advertisement、profileMatch | 扫描会话内；节流合并更新 |
| advertisement | 广播数据视图：hex、byteLength、manufacturerId；平台缺失或长度 0 **显式呈现不猜值** | 随 ScannedDevice |
| GATT 服务树 | Service→Characteristic（uuid、标准名映射、props、value） | 单连接会话 |
| Session（会话） | 8 态承载：连接状态、notify 订阅集、写队列 | 连接生命周期 |
| 配网表单与凭据 | ssid/pwd/hub/token（来自 `shid://pair` 扫码）；仅内存、离开即清空、日志脱敏 | 配网向导会话 |
| 通信日志条目 | {time, type∈sys/err/read/write/recv/ok, msg}；上限截断；脱敏 BR-04 | 页面会话 |
| 广播表单 + 31B 预算 | name/uuid/mfgId/mfgData + 实时核算；平台扩展参数不改预算算法口径 | 广播会话 |
| 版本投影 | release-metadata 读取（通道不可用时回退构建内置） | 启动/关于页 |
| 诊断行（5 项） | BLE/Wi-Fi/ControlHub/控制连接/USB Ready，state∈ok/warn/fail/pending + detail | 单次诊断 |

## 4. 敏感数据规则（最严格档）

| # | 规则 | 内容 | 来源 |
|---|---|---|---|
| S-1 | 仅内存 | Wi-Fi 密码与配对凭据只用于本次下发，不写入日志或本地存储；**离开配网页即清空**（onUnload 清空密码/hubInfo 并断开连接） | BR-03 · PAGE_SPEC §0.4 |
| S-2 | token TTL | 配对 token 仅内存 **5 分钟** | BUSINESS_FLOW §4 · USER_FLOW S2 |
| S-3 | 日志脱敏 | 通信日志全局脱敏（F026）：token/password/secret 等敏感键→`***`（SENSITIVE_PROFILE_KEYS 黑名单 + 保护键白名单不脱敏） | BR-04 · BUSINESS_FLOW §7 |
| S-4 | 导出物脱敏 | token/密码在**任何导出物**（剪贴板/分享/文件）中保持脱敏 | DATA_MODEL §2 第 3 条 |
| S-5 | 验收锚点 | Wi-Fi 密码与配对 token 不出现在本地存储与日志中（R28） | PRD §8 R28 |
| S-6 | 快照即内存 | 配网成功设备快照保留在内存会话，不落盘（R17 括注；PAGE_SPEC §2） | PRD §8 R17 |

## 5. 日志策略（内存日志的容量与导出口径）

- 容量管理：全局 500 / 单设备 200 / LRU 40 设备（logger 容量管理）。（BUSINESS_FLOW §7）
- 呈现：UI 六色（sys/err/read/write/recv/ok），条目=时间+类型 chip+消息。（PAGE_SPEC §6 数据展示规则）
- 导出：格式化文本写入剪贴板并 toast（R11）；空日志 toast「暂无日志」。
- 导出形态平台差异（10_platform §4「日志导出」行）：微信=剪贴板；App=剪贴板+系统分享（**文件=候选**）；Web=剪贴板/下载；Desktop=**文件流=候选**。
- **文件流导出为未决策候选增强，不得实现**（BR-12：候选增强须先回写 10_platform §4 并补三查方可做）。

## 6. 剪贴板口径（瞬态通道，非存储）

复制类操作是本产品唯一的「数据离机」通道，均为单次写入+toast 确认，不构成存储：复制广播数据（R04「已复制」）、导出日志（R11「日志已复制」）、复制外链网址（PAGE_SPEC §9「网址已复制/反馈链接已复制」）、复制版本信息（R26「版本已复制」）、配网下发相关的敏感字段**永不进入剪贴板**（S-4）。反馈约定统一于 PAGE_SPEC §0.2。

## 7. 因零持久化而不纳入的生态功能（负面清单）

来源：ALIGNMENT_NOTES.md §3（功能点清单映射，逐条标注不纳入）。

| 生态功能点 | 处置 | 依据 |
|---|---|---|
| BLE-009 设备管理（我的设备/设备别名/收藏/删除） | **不纳入**（2026-09-02 零本地持久化决策：全部不做）；会话内 Profile 状态由 F019 承载 | ALIGNMENT_NOTES §3 BLE-009 行 |
| BLE-002-08 设备收藏 | 不纳入（零持久化） | ALIGNMENT_NOTES §3 BLE-002 行 |
| BLE-004 服务收藏 / Descriptor 读取 | 服务收藏不纳入（收藏=零持久化）；Descriptor 读取未纳入 | ALIGNMENT_NOTES §3 BLE-004 行 |
| BLE-005 数据历史 | 生态扩展项，未纳入现版 | ALIGNMENT_NOTES §3 BLE-005 行 |
| BLE-006 CSV/JSON 导出 | 现版口径=剪贴板/系统分享 | ALIGNMENT_NOTES §3 BLE-006 行 |

## 8. 已移除的存储业务（历史存档，开发不得复刻）

随 F023 一并移除（2026-09-02 用户决策）：known_devices 本地落档、90 天 TTL、上限 20 条、进入首页 prune——**新开发不实现**（BUSINESS_FLOW §4「已移除业务」；PRD 变更记录第 1 行：本地存储 `smart_ble.smart_hid.known_devices.v1` 及约束随功能一并移除，新开发不必实现）。

## 9. 冻结校验

- ☑ 存储位置唯一：内存；无任何存储键、无任何落盘路径（对齐 DATA_MODEL 前提）
- ☑ 三零边界 + 六条敏感规则 + 日志口径全部带来源引用，无新造规则
- ☑ 负面清单（§7）与已移除业务（§8）明确「不做」，防止生态清单/旧功能反向渗入
- ☑ 平台义务明确：任何平台实现引入 HTTP/云端/落盘即违反 L1（10_platform §4；BR-11/BR-12）
