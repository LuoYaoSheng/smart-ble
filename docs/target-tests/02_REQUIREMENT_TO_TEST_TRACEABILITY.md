# 02 Requirement → Test 追踪

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 单源说明

完整映射以 `contracts/target/test-traceability.json` 为单源（103 条测试 × 9 套件）；
本文件为生成投影（TP-G1 由 JSON 生成，手改以 JSON 为准）。

覆盖口径（coverage 实算）：

- REQ 66 条：自动化可达 65 条（直接或经 FEAT 链）；1 条为纯 E5 真机语义
- FEAT 81 条（Must 80）：自动化直接覆盖 73 条 Must；其余为 E5/E6 专属（真机/发布）
- 每条 Must REQ 至少一条 E0/E1/E2 自动化或 E5 矩阵行；每条公开 CLAIM 至少一条 TEST-R

## 2. 套件总表

| 套件 | 等级 | 条数 | TP-G1 工件 |
|---|---|---|---|
| TEST-C | E0 | 14 | scripts/target/ 7 checker + tests/target/contract/ 39 用例 |
| TEST-U | E1 | 16 | tests/target/unit/ 15 文件 33 用例 |
| TEST-I | E2 | 10 | tests/target/integration/ 12 文件 27 用例 |
| TEST-P | E4 | 12 | page-behavior.manifest 完整定义 + 11 Playwright specs（逐 State/Operation；Driver 未实现时 BLOCKED） |
| TEST-E | E5 | 8 | tests/target/firmware/ 静态前置 + hardware 模板 |
| TEST-A | E5 | 14 | hardware/android-run-template.md |
| TEST-W | E5 | 10 | hardware/wechat-run-template.md |
| TEST-H | E5 | 8 | hardware/smart-hid-run-template.md |
| TEST-R | E6 | 11 | tests/target/release/ 9 用例 + clean-install.test.md |

## 3. 全量映射表
### TEST-C（E0 Contract/Static，14 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-C-001 | ID 唯一性与登记处一致性 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-002 | 文档元数据与字段完整性 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-003 | 状态词与禁用词合法值 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-004 | 平台矩阵与公开面一致性 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-005 | 路由与参数契约 | E0 | 是 | REQ-002 FEAT-002 PAGE-001 PAGE-002 PAGE-003 PAGE-004 | 自动化已落地 |
| TEST-C-006 | 版本五处一致 | E0 | 是 | REQ-004 REQ-056 FEAT-004 FEAT-066 PAGE-009 PAGE-010 | 自动化已落地 |
| TEST-C-007 | Profile 分层红线 | E0 | 是 | REQ-054 REQ-063 FEAT-053 FEAT-078 PAGE-001 FLOW-010 | 自动化已落地 |
| TEST-C-008 | FEAT→Test 映射非空 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-009 | 流程↔测试映射 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-010 | 数据/错误契约一致性 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-011 | 架构静态约束（回调注册/import 边界） | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-012 | 协议常量一致 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-013 | Smart HID 镜像与 lock 一致 | E0 | 是 | (meta) | 自动化已落地 |
| TEST-C-014 | 决策默认方案一致性 | E0 | 是 | (meta) | 自动化已落地 |

### TEST-U（E1 Unit，16 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-U-001 | 平台识别纯函数 | E1 | 是 | REQ-001 FEAT-001 PAGE-001 FLOW-001 | 自动化已落地 |
| TEST-U-002 | 版本投影 | E1 | 是 | REQ-004 FEAT-004 PAGE-009 PAGE-010 WEB-001 FLOW-012 | 自动化已落地 |
| TEST-U-003 | 权限状态机 | E1 | 是 | REQ-005 REQ-006 REQ-007 FEAT-005 FEAT-006 FEAT-007 | 自动化已落地 |
| TEST-U-004 | 适配器状态映射 | E1 | 是 | REQ-008 FEAT-008 PAGE-001 PAGE-008 FLOW-001 | 自动化已落地 |
| TEST-U-005 | 扫描 generation/去重 | E1 | 是 | REQ-011 REQ-012 REQ-033 FEAT-011 FEAT-012 FEAT-036 | 自动化已落地 |
| TEST-U-006 | 显示名解析链 | E1 | 是 | REQ-013 FEAT-013 PAGE-001 FLOW-002 | 自动化已落地 |
| TEST-U-007 | 过滤器 | E1 | 是 | REQ-014 FEAT-014 PAGE-001 FLOW-002 | 自动化已落地 |
| TEST-U-008 | 广播解析三态 | E1 | 是 | REQ-016 REQ-017 FEAT-017 FEAT-018 PAGE-001 FLOW-003 | 自动化已落地 |
| TEST-U-009 | 属性约束 | E1 | 是 | REQ-024 FEAT-026 PAGE-006 FLOW-005 | 自动化已落地 |
| TEST-U-010 | HEX 编码校验 | E1 | 是 | REQ-026 FEAT-028 PAGE-006 FLOW-005 | 自动化已落地 |
| TEST-U-011 | MTU 分包 | E1 | 是 | REQ-028 FEAT-030 PAGE-006 FLOW-005 | 自动化已落地 |
| TEST-U-012 | 日志容量/导出 | E1 | 是 | REQ-034 REQ-035 REQ-037 REQ-065 FEAT-037 FEAT-038 | 自动化已落地 |
| TEST-U-013 | 脱敏规则 | E1 | 是 | REQ-036 REQ-050 FEAT-040 PAGE-002 PAGE-006 WEB-001 | 自动化已落地 |
| TEST-U-014 | 广播预算 31/32 | E1 | 是 | REQ-039 FEAT-042 FEAT-043 PAGE-008 FLOW-008 | 自动化已落地 |
| TEST-U-015 | Smart HID 校验/解析/恢复映射 | E1 | 是 | REQ-047 REQ-048 REQ-049 REQ-050 REQ-052 REQ-065 | 自动化已落地 |
| TEST-U-016 | OTA 固件包校验纯函数（DEC-016） | E1 | 是 | REQ-066 FEAT-081 PAGE-006 FLOW-009 | 自动化已落地 |

### TEST-I（E2 Integration/Fake Runtime，10 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-I-001 | 生命周期与清理 | E2 | 是 | REQ-003 REQ-033 FEAT-003 FEAT-036 PAGE-001 PAGE-002 | 自动化已落地 |
| TEST-I-002 | 扫描会话与迟到事件 | E2 | 是 | REQ-010 REQ-011 REQ-033 FEAT-010 FEAT-011 FEAT-012 | 自动化已落地 |
| TEST-I-003 | 连接/发现/断开/重连 | E2 | 是 | REQ-019 REQ-020 REQ-021 REQ-022 REQ-023 FEAT-020 | 自动化已落地 |
| TEST-I-004 | GATT 读写队列 | E2 | 是 | REQ-025 REQ-026 REQ-027 FEAT-027 FEAT-028 FEAT-029 | 自动化已落地 |
| TEST-I-005 | Characteristic Subscription 路由与隔离 | E2 | 是 | REQ-029 FEAT-031 FEAT-032 PAGE-006 PAGE-007 FLOW-005 | 自动化已落地 |
| TEST-I-006 | Registry 与统一断开 | E2 | 是 | REQ-030 REQ-031 REQ-032 REQ-033 FEAT-033 FEAT-034 | 自动化已落地 |
| TEST-I-007 | 广播 Owner 与保护 | E2 | 是 | REQ-040 REQ-041 REQ-042 FEAT-044 FEAT-045 PAGE-008 | 自动化已落地 |
| TEST-I-008 | OTA 事务时序 | E2 | 是 | REQ-044 REQ-045 FEAT-047 FEAT-048 FEAT-049 FEAT-050 | 自动化已落地 |
| TEST-I-009 | Smart HID workflow | E2 | 是 | REQ-047 REQ-048 REQ-050 REQ-051 REQ-053 FEAT-057 | 自动化已落地 |
| TEST-I-010 | OTA 错误包拒绝进入事务与 V1 整事务重试 | E2 | 是 | REQ-066 FEAT-081 PAGE-006 FLOW-009 | 自动化已落地 |

### TEST-P（E4 Page/Prototype/Visual，12 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-P-001 | PAGE-001 页面用例 | E4 | 是 | REQ-001 REQ-002 REQ-005 REQ-008 REQ-009 REQ-010 | 自动化已落地 |
| TEST-P-002 | PAGE-002 页面用例 | E4 | 是 | REQ-002 FEAT-055 PAGE-001 PAGE-002 PAGE-003 PAGE-004 | 自动化已落地 |
| TEST-P-003 | PAGE-003 页面用例 | E4 | 是 | REQ-002 REQ-052 FEAT-060 PAGE-001 PAGE-002 PAGE-003 | 自动化已落地 |
| TEST-P-004 | PAGE-004 页面用例 | E4 | 是 | REQ-002 REQ-052 FEAT-016 FEAT-059 FEAT-060 FEAT-061 | 自动化已落地 |
| TEST-P-005 | PAGE-005 页面用例 | E4 | 是 | REQ-002 REQ-053 FEAT-062 PAGE-001 PAGE-002 PAGE-003 | 自动化已落地 |
| TEST-P-006 | PAGE-006 页面用例 | E4 | 是 | REQ-002 REQ-019 REQ-030 REQ-034 REQ-035 REQ-043 | 自动化已落地 |
| TEST-P-007 | PAGE-007 页面用例 | E4 | 是 | REQ-002 REQ-030 FEAT-002 FEAT-033 PAGE-001 PAGE-002 | 自动化已落地 |
| TEST-P-008 | PAGE-008 页面用例 | E4 | 是 | REQ-002 REQ-038 REQ-039 FEAT-002 FEAT-041 FEAT-042 | 自动化已落地 |
| TEST-P-009 | PAGE-009 页面用例 | E4 | 是 | REQ-002 REQ-055 REQ-057 FEAT-002 FEAT-065 FEAT-067 | 自动化已落地 |
| TEST-P-010 | PAGE-010 页面用例 | E4 | 是 | REQ-002 REQ-056 FEAT-002 FEAT-066 PAGE-001 PAGE-002 | 自动化已落地 |
| TEST-P-011 | WEB-001 页面用例（联动 R） | E4 | 是 | WEB-001 | 自动化已落地 |
| TEST-P-012 | 原型四态覆盖 | E4 | 是 | WEB-001 | 自动化已落地 |

### TEST-E（E5 ESP32 on-target，8 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-E-001 | 夹具广播字段一致 | E5 | 是 | REQ-010 REQ-016 REQ-017 FEAT-010 FEAT-017 PAGE-001 | 矩阵/模板 |
| TEST-E-002 | 夹具连接/断开计数 | E5 | 是 | REQ-019 REQ-022 FEAT-020 FEAT-021 FEAT-023 PAGE-001 | 矩阵/模板 |
| TEST-E-003 | LED/权限组合服务 | E5 | 是 | REQ-024 REQ-025 REQ-026 REQ-028 FEAT-026 FEAT-027 | 矩阵/模板 |
| TEST-E-004 | Notify 周期与订阅 | E5 | 是 | REQ-029 FEAT-031 FEAT-032 PAGE-006 PAGE-007 FLOW-005 | 矩阵/模板 |
| TEST-E-005 | 故障注入（发现/写/断链） | E5 | 是 | REQ-020 REQ-021 REQ-023 REQ-027 FEAT-022 FEAT-024 | 矩阵/模板 |
| TEST-E-006 | Observer 观测手机广播 | E5 | 是 | REQ-039 REQ-041 REQ-042 FEAT-041 FEAT-042 FEAT-043 | 矩阵/模板 |
| TEST-E-007 | OTA 全事务与故障 | E5 | 是 | REQ-043 REQ-044 REQ-045 REQ-066 FEAT-046 FEAT-047 | 矩阵/模板 |
| TEST-E-008 | 独立电脑构建复现 | E5 | 是 | REQ-062 FEAT-073 FEAT-077 WEB-001 FLOW-013 CLAIM-016 | 矩阵/模板 |

### TEST-A（E5 Android 真机，14 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-A-001 | Android 权限链路 | E5 | 是 | REQ-001 REQ-005 REQ-007 FEAT-001 FEAT-005 FEAT-007 | 矩阵/模板 |
| TEST-A-002 | Android 导航 | E5 | 是 | REQ-002 FEAT-002 PAGE-001 PAGE-002 PAGE-003 PAGE-004 | 矩阵/模板 |
| TEST-A-003 | Android 生命周期 | E5 | 是 | REQ-003 FEAT-003 PAGE-001 PAGE-002 PAGE-006 PAGE-008 | 矩阵/模板 |
| TEST-A-004 | Android 蓝牙开关 | E5 | 是 | REQ-008 FEAT-008 PAGE-001 PAGE-008 FLOW-001 | 矩阵/模板 |
| TEST-A-005 | Android 扫描两轮/筛选/名称 | E5 | 是 | REQ-010 REQ-011 REQ-012 REQ-013 REQ-014 REQ-015 | 矩阵/模板 |
| TEST-A-006 | Android 连接/服务发现 | E5 | 是 | REQ-019 REQ-024 FEAT-020 FEAT-021 FEAT-026 PAGE-001 | 矩阵/模板 |
| TEST-A-007 | Android 主动/被动断开 | E5 | 是 | REQ-022 REQ-023 FEAT-023 FEAT-024 PAGE-006 PAGE-007 | 矩阵/模板 |
| TEST-A-008 | Android GATT 读写订阅/日志 | E5 | 是 | REQ-025 REQ-026 REQ-029 REQ-034 REQ-035 REQ-037 | 矩阵/模板 |
| TEST-A-009 | Android 双设备隔离 | E5 | 是 | REQ-029 REQ-030 REQ-031 REQ-032 FEAT-032 FEAT-033 | 矩阵/模板 |
| TEST-A-010 | Android 广播+Observer | E5 | 是 | REQ-038 REQ-039 REQ-040 REQ-041 FEAT-041 FEAT-042 | 矩阵/模板 |
| TEST-A-011 | Android OTA 完整事务 | E5 | 是 | REQ-043 REQ-044 REQ-045 REQ-066 FEAT-046 FEAT-047 | 矩阵/模板 |
| TEST-A-012 | Android 关于/版本一致 | E5 | 是 | REQ-055 FEAT-065 PAGE-009 FLOW-012 | 矩阵/模板 |
| TEST-A-013 | Android 性能与资源 | E5 | 是 | REQ-033 FEAT-036 | 矩阵/模板 |
| TEST-A-014 | Android 安装烟测 | E5 | 是 | FEAT-075 | 矩阵/模板 |

### TEST-W（E5 微信真机，10 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-W-001 | 微信权限（含定位） | E5 | 是 | REQ-001 REQ-005 REQ-006 REQ-007 FEAT-001 FEAT-005 | 矩阵/模板 |
| TEST-W-002 | 微信导航 | E5 | 是 | REQ-002 FEAT-002 PAGE-001 PAGE-002 PAGE-003 PAGE-004 | 矩阵/模板 |
| TEST-W-003 | 微信生命周期 | E5 | 是 | REQ-003 FEAT-003 PAGE-001 PAGE-002 PAGE-006 PAGE-008 | 矩阵/模板 |
| TEST-W-004 | 微信定位策略 | E5 | 是 | REQ-006 FEAT-006 PAGE-001 FLOW-001 | 矩阵/模板 |
| TEST-W-005 | 微信蓝牙开关 | E5 | 是 | REQ-008 FEAT-008 PAGE-001 PAGE-008 FLOW-001 | 矩阵/模板 |
| TEST-W-006 | 微信不支持降级 | E5 | 是 | REQ-009 FEAT-009 PAGE-001 PAGE-008 FLOW-001 WEB-001 | 矩阵/模板 |
| TEST-W-007 | 微信扫描/GATT | E5 | 是 | REQ-010 REQ-012 REQ-013 REQ-015 REQ-018 REQ-019 | 矩阵/模板 |
| TEST-W-008 | 微信会话/日志导出 | E5 | 是 | REQ-022 REQ-030 REQ-031 REQ-035 FEAT-023 FEAT-033 | 矩阵/模板 |
| TEST-W-009 | 微信多设备/广播 | E5 | 是 | REQ-032 REQ-038 REQ-040 FEAT-035 FEAT-041 FEAT-042 | 矩阵/模板 |
| TEST-W-010 | 微信 Smart HID/分享 | E5 | 是 | REQ-048 REQ-052 REQ-055 REQ-057 FEAT-053 FEAT-060 | 矩阵/模板 |

### TEST-H（E5 Smart HID E2E，8 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-H-001 | Smart HID 匹配/身份 | E5 | 是 | REQ-047 FEAT-053 FEAT-054 PAGE-001 PAGE-002 FLOW-010 | 矩阵/模板 |
| TEST-H-002 | Smart HID 配网主路径 | E5 | 是 | REQ-048 REQ-050 REQ-051 FEAT-054 FEAT-055 FEAT-056 | 矩阵/模板 |
| TEST-H-003 | Smart HID 八类错误 | E5 | 是 | REQ-049 FEAT-057 FEAT-058 PAGE-002 FLOW-010 CLAIM-014 | 矩阵/模板 |
| TEST-H-004 | Smart HID 历史/详情/移除 | E5 | 是 | REQ-052 REQ-065 FEAT-059 FEAT-061 PAGE-003 PAGE-004 | 矩阵/模板 |
| TEST-H-005 | Smart HID 诊断/所有权 | E5 | 是 | REQ-053 FEAT-062 FEAT-063 PAGE-005 FLOW-011 PAGE-002 | 矩阵/模板 |
| TEST-H-006 | Smart HID 重配移交 | E5 | 是 | REQ-053 FEAT-064 PAGE-005 FLOW-011 PAGE-002 PAGE-003 | 矩阵/模板 |
| TEST-H-007 | Smart HID 边界矩阵 | E5 | 是 | REQ-047 REQ-049 | 矩阵/模板 |
| TEST-H-008 | Smart HID 微信侧 | E5 | 是 | FLOW-010 | 矩阵/模板 |

### TEST-R（E6 Landing/Release，11 条）

| Test ID | 标题 | 证据等级 | 发布阻断 | 映射（REQ/FEAT/PAGE·FLOW/CLAIM） | 工件状态 |
|---|---|---|---|---|---|
| TEST-R-001 | 下载产物与 SHA | E6 | 是 | REQ-059 FEAT-075 WEB-001 FLOW-013 FLOW-014 CLAIM-018 | 自动化已落地 |
| TEST-R-002 | 版本/Metadata 同源 | E6 | 是 | REQ-004 REQ-056 REQ-059 FEAT-004 FEAT-066 FEAT-075 | 自动化已落地 |
| TEST-R-003 | 声明与状态一致性 | E6 | 是 | REQ-009 REQ-046 REQ-055 REQ-058 REQ-060 FEAT-009 | 自动化已落地 |
| TEST-R-004 | 证据脱敏 | E6 | 是 | REQ-036 FEAT-040 PAGE-002 PAGE-006 WEB-001 | 矩阵/模板 |
| TEST-R-005 | 链接矩阵（5 分钟 Quick Start 教程） | E6 | 是 | REQ-057 REQ-062 REQ-064 FEAT-068 FEAT-074 FEAT-077 | 自动化已落地 |
| TEST-R-006 | SEO/性能/a11y 基线 | E6 | 是 | REQ-058 REQ-061 FEAT-069 FEAT-072 FEAT-076 WEB-001 | 矩阵/模板 |
| TEST-R-007 | 能力卡证据 | E6 | 是 | FEAT-070 FEAT-071 WEB-001 PAGE-009 CLAIM-003 CLAIM-020 | 自动化已落地 |
| TEST-R-008 | 固件下载/复现 | E6 | 是 | REQ-059 FEAT-075 FEAT-073 WEB-001 FLOW-013 FLOW-014 | 自动化已落地 |
| TEST-R-009 | 小程序码可用 | E6 | 是 | FEAT-075 WEB-001 FLOW-013 FLOW-014 CLAIM-027 | 矩阵/模板 |
| TEST-R-010 | Web 无障碍走查 | E6 | 是 | REQ-061 FEAT-076 WEB-001 CLAIM-030 | 矩阵/模板 |
| TEST-R-011 | 30 分钟 Clean Machine 端到端闭环（CLAIM-031） | E6 | 是 | CLAIM-031 | 矩阵/模板 |
