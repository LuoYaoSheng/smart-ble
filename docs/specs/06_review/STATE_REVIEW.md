# STATE_REVIEW —— 状态与异常路径审查

> 2026-09-02 补写收口 · 依《AI 产品重构逻辑评审规范 v1.0》§15 六文件要求。状态定义以既有正典为准，本文审查**完备性与异常路径质量**，不重定义任何状态。
> 角色：产品负责人（状态视角）
> 输入：[STATE_MACHINE.md](../04_architecture/STATE_MACHINE.md)（§1–§9 九组状态机）· [PAGE_SPEC.md](../03_flow/PAGE_SPEC.md)（各页「状态列表 / 异常处理」+ §11 汇总矩阵）· [v1-new README](../prototype/v1-new/README.md)（六态场景库 44）· [UX_REVIEW.md](UX_REVIEW.md)
> 口径前提：Base Prototype 规范 §7 六态（默认/加载/成功/失败/空数据/权限异常）为页面状态完备性标尺；评审规范 §13（异常 = 提示 + 下一步 + 恢复路径）为异常质量标尺。

---

## 1. 审查方法

- **状态资产索引化**：九组状态机逐组登记（域 / 态数 / 源）。
- **页面级完备性**：PAGE_SPEC §11 矩阵 × v1-new 场景库核对六态覆盖。
- **异常三要素抽查**：对四类异常（蓝牙链路 / 权限 / 数据 / 用户取消）各抽代表路径核对「提示 + 下一步 + 恢复」。

## 2. 结论摘要

| 维度 | 结论 |
|---|---|
| 状态机完备 | 九组状态机覆盖全部六域（连接 / 重连 / 配网 / 设备侧协议 / 广播 / OTA / 扫描 / 诊断 / 服务面板），无域缺状态机 |
| 页面六态 | PAGE_SPEC §11 矩阵全页标注（本产品无网络场景，按「蓝牙链路异常」口径映射，PAGE_SPEC 头注）；v1-new 场景库 44 个场景全页可仿真（README 验收项 4/5 通过） |
| 异常三要素 | 抽查 6 条代表路径全部具备提示 + 下一步 + 恢复（§4），无「只报错不给路」路径 |
| 状态-UI 对齐 | 配网四行五值 ← STATUS state/step/error 映射（STATE_MACHINE §4）；广播徽章六值 ← BROADCAST_STATE（IA_REVIEW §6）；微信错误码 10000–10013 中文归一（PAGE_SPEC §6） |
| 已知留白 | 2 处【未知】登记在案（§5），均已有开发期核对路径，不阻塞 |

## 3. 状态资产索引（收口）

| 状态域 | 态数 | 源 |
|---|---|---|
| BLE 连接会话（session-registry） | 8 | STATE_MACHINE §1 |
| 自动重连（reconnectState） | 5（backoff 1/3/5s × 3 次） | §2 |
| Smart HID 配网工作流 | 4 + CANCELLED；token 内存 TTL 5 分钟 | §3 |
| 设备侧 STATUS（协议上行） | state ×10 / step ×7 / error ×8 | §4 |
| 广播会话（BROADCAST_STATE） | 6 | §5 |
| OTA 事务 | 12（行为视图） | §6 |
| 扫描页（PAGE001 页面级） | 5（starting / scanning / stopping / idle / failed） | §7 |
| 诊断页（PAGE005 页面级） | 页面 6 + 行级 5 | §8 |
| 服务面板（PAGE006 页面级） | 5（idle / connecting / ready / empty / error） | §9 |

## 4. 异常三要素抽查（评审规范 §13）

| 异常路径 | 提示 | 下一步 | 恢复路径 | 源 |
|---|---|---|---|---|
| 微信扫描授权拒绝 | 横幅 reason 分类（bluetooth_permission_denied 等） | 「去设置」 | 返回后重扫 | PAGE_SPEC §1 |
| 系统蓝牙未开（10001） | 弹「请先打开系统蓝牙」 | 开启系统蓝牙 | 适配器自动重试 3 次后可手动重试 | PAGE_SPEC §1 |
| 配网设备侧错误（8 码） | 定位失败行 + 中文提示 | 恢复按钮四分流（回表单 / 重新扫码 / 跳诊断 / 重下发） | diagnostics → P005 体检闭环 | PAGE_SPEC §2 |
| 配网中蓝牙断线 | 徽章变红 +「已填写的配网信息不会丢失」 | 重连按钮 | 重连后表单保留继续 | PAGE_SPEC §2 |
| 广播超 31 字节 | 红字 N/31（**不静默截断**） | 修改字段 | 重新核算后启动 | PAGE_SPEC §8；DATA_FLOW §6 |
| 调试中被动断线 | 会话 FAILED + 日志反馈 | 自动重连 backoff | 重连或手动重试（写队列 abort 不重发） | STATE_MACHINE §1/§2；PAGE_SPEC §6 |

## 5. 遗留【未知】登记（开发期核对，不阻塞）

| # | 项 | 核对路径 |
|---|---|---|
| 1 | OTA 12 态精确枚举名（CONNECTING 已定义但流程不进入） | 以 services/ota/ota-manager.js 源码/单测为准（STATE_MACHINE §6 注） |
| 2 | P008 平台分支现状仅覆盖 微信 / Android / iOS / Web（PAGE_SPEC §8 行为列）；Desktop 分支及其权限前置、徽章取值在平台扩展原型三查时定义 | 10_platform §7 平台扩展检查 |

## 6. 结论与下游

状态维度**无缺口**：九组状态机 + 页面级六态矩阵 + 44 场景库三层齐备，异常路径全部有出口。
下游：08_development/ERROR_CODE 的初始清单来源 = 设备侧 8 码（STATE_MACHINE §4）+ 微信 10000–10013 映射（PAGE_SPEC §6）+ 广播 / OTA 错误（STATE_MACHINE §5/§6）。

—— 2026-09-02 收口完成（评审规范 §15 六文件之五）。
