# STATE_MODEL —— 状态模型（产品模型五件套之五）

> 依据：《产品模型 Product Model 规范 v2.0》§0/§2（2026-09-03 用户提供）
> 性质：**平台无关**的状态机收口索引。状态机正典以 [STATE_MACHINE.md](../04_architecture/STATE_MACHINE.md) §1–§9 为单一来源；异常路径审查见 [STATE_REVIEW](../06_review/STATE_REVIEW.md)。本文锁定清单、不变量与平台关系，不重复状态转移表。
> 前提：全部状态机为**产品资产**（10_platform §1：核心状态机平台无关）；平台只改变触发与呈现，不改变状态集合与转移。

## 1. 状态机清单

| # | 状态机 | 规模 | 来源（STATE_MACHINE） |
|---|---|---|---|
| 1 | BLE 连接会话（session-registry） | 8 态 | §1 |
| 2 | 重连（reconnectState） | 3 次退避；主动断开不触发 | §2 |
| 3 | Smart HID 配网工作流（workflow-engine） | connect → configure → status 三阶段 + 错误恢复路由 | §3 |
| 4 | 设备侧 STATUS（协议上行） | 驱动 P002 四行进度（wifi/hub/conn/usb） | §4 |
| 5 | 广播会话（BROADCAST_STATE） | 6 态（idle/启动中/广播中/停止/失败/平台不支持分支） | §5 |
| 6 | OTA 事务 | 12 态（pick/validating/transferring/committing/verifying/success/failed 等；枚举全集以 ota-manager 为准；**端到端 BLOCKED P-03**） | §6 |
| 7 | 扫描会话（P001 页面级） | 未扫/扫描中/完成/失败/权限态 | §7 |
| 8 | 诊断页状态（P005） | offline/检测中/完成（五行 ok/warn/fail）/error | §8 |
| 9 | 服务面板状态（P006） | idle/connecting/ready/error/empty + 断线重连 | §9 |

## 2. 不变量

1. **状态集合与转移平台无关**（L1）：平台原型/实现不得增删状态或改变恢复路由（BR-11）。
2. **异常三要素**：每个错误态呈现「提示 + 下一步 + 恢复动作」（BR-07；抽查见 STATE_REVIEW §4）。
3. **错误码即契约**：`wifi_failed / pairing_expired / controlhub_unreachable / timeout / scan_failed / identity_failed / connection_lost / OTA_HASH_MISMATCH / diagnostic_connect_failed …` 的语义与恢复动作以 PRD §7 与 STATE_REVIEW 为准；平台错误（如 Android `bluetooth_permission_denied`、Web `insecure_context`）为**平台补充态**，按 L3 圈外差异流程登记后方可加入。
4. **遗留【未知】**：STATE_REVIEW §5 登记项开发期核对，不阻塞（禁止脑补登记制度）。

## 3. 平台差异的合法位置

- **触发时机**：同一「权限态」在微信为授权弹窗、Android 为运行时权限链、Web 为环境门禁（`prototype/platform/{平台}/FLOW.md`）。
- **呈现**：状态徽章/横幅样式走共享设计系统；系统层弹窗为平台还原图层（`COMPONENT_RULE.md`）。
- **补充态**：仅平台特有的失败分支（如权限永久拒绝），须在该平台 PAGE_SPEC 标注并引 10_platform 条目。

## 4. 验收（规范 v2.0 §4）

- ☑ 状态明确：9 台状态机全部索引至 STATE_MACHINE 正典
- ☑ 异常路径经 STATE_REVIEW 收口（异常三要素抽查 + 【未知】登记）
- ☑ 平台原型场景库（low-fi 状态清单 / high-fi SCEN）与本清单一一对应
