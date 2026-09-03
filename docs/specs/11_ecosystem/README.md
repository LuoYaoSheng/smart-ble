# 11_ecosystem —— Smart BLE 生态级规范（三件套）

> 来源：用户提供的 Smart BLE 生态规范三份（2026-09-03 入库，**原文逐字复制，不改写**）：
> [API_UNIFIED_SPEC_v1.0.md](API_UNIFIED_SPEC_v1.0.md)（《Smart BLE API统一接口规范 v1.0》）
> [PLATFORM_CAPABILITY_MATRIX_v1.0.md](PLATFORM_CAPABILITY_MATRIX_v1.0.md)（《Smart BLE 平台功能差异矩阵 v1.0》）
> [FEATURE_CHECKLIST_v1.0.md](FEATURE_CHECKLIST_v1.0.md)（《Smart BLE 功能点清单 v1.0》）
> 对齐分析（本项目视角）：[ALIGNMENT_NOTES.md](ALIGNMENT_NOTES.md) —— 平台编号映射 / 能力冲突清单（C1–C7）/ 功能与 API 映射。

## 定位（与现行 canon 的关系）

| 问题 | 口径 |
|---|---|
| 这三份是什么 | **生态级上位基线**：定义 Smart BLE 多语言家族（uni-app / Flutter / Native / Desktop，12 平台）的统一 API、平台能力差异、全量功能点（BLE-001～013） |
| 本项目是什么 | 其中 **uni-app 实现线**（BLE Toolkit+ 1.0.5 重建）。产品范围与决策**仍以 02_product 为准**（先有产品，再有平台/生态——生态清单不反向扩 v1 范围） |
| 开发排期变吗 | **不变**。D1 首批 = 微信 + App·Android；Desktop 待 D2 spike；Web 暂缓（10_platform §6）。矩阵中 Flutter/Native/HarmonyOS 行为生态全集备查 |
| 能力口径冲突怎么办 | 以 [ALIGNMENT_NOTES.md](ALIGNMENT_NOTES.md) C1–C7 清单为准：**旧代码实证 + 现行 canon 优先**，不翻转已验证行为（**C1/C3 已于 2026-09-03（08-G0）裁决**：supported_limited / supported_foreground，真机证据待补——[08_development/PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md)；其余冲突项 C2/C4/C5 维持「待裁决」登记）；矩阵独有且无冲突项（如 Desktop 三系原生层分级）作为**第二口径**并入呈现 |
| 原型层如何消费 | 四平台 high-fi 实例评审栏注入「生态能力矩阵」卡（矩阵 §4–§9 对应行 + 冲突标注）；Web W4 平台对比补矩阵第二来源。**仅呈现，不改产品逻辑**（L1 不变式） |
| 后续阶段如何消费 | 08_development 四件套的直接输入：API_SPEC 吸收 BLE.* 统一接口（§3–§13）、ERROR_CODE 吸收 BLE_001～008（与 STATE_MODEL §2 业务错误码分层合并）、PERMISSION 对照清单 §15 各语言实现要求 |

## 阅读顺序

1. 本 README（定位）→ 2. 功能点清单（BLE-001～013 全集）→ 3. 平台差异矩阵（12 平台能力分级）→ 4. API 统一接口（BLE.* 契约）→ 5. ALIGNMENT_NOTES（本项目对齐与冲突）。
