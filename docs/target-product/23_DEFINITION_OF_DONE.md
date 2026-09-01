# 23 Definition of Done

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：分层完成定义——单页面/单功能/ESP32/真机/Web/Release/最终产品——以及与 Gate（TP-G0~G6）的对应。

本文不负责：具体验收步骤（`docs/target-tests/`）。

---

## 2. 分层 DoD

### 2.1 页面级 DoD（每个 PAGE/WEB）

1. 24 章节文档已批准（REVIEW→APPROVED）；
2. 全部 OP 有实现且四态（idle/loading/error/success 或 complete）可触发；
3. 页面自动化（TEST-P）通过：状态、跳转、错误、清理断言；
4. 无障碍项过 E4 走查（触控/对比度/读屏标签/不只靠颜色）；
5. 原型页面四态（正常/关键空/关键失败/平台差异）可切换；
6. 资源释放矩阵该页全部行通过 E2 清理断言；
7. 无禁止行为（各页第 22 节）。

### 2.2 功能级 DoD（每个 FEAT）

1. 输入/输出/错误/恢复与 `03` 一致（自动化断言）；
2. 对应计划测试全过（最低证据等级达标）；
3. 涉及硬件：E5 双端（客户端+设备/Observer）结果一致；
4. 涉及公开声明：CLAIM 状态与 Metadata 一致；
5. 日志与关联 ID 生效；
6. 无资源泄漏（NFR-020）。

### 2.3 ESP32/固件 DoD

1. 双模式（peripheral/observer）可构建、可烧写（无固定串口文档）；
2. 协议常量与 `11`/`12` 一致（TEST-C-012）；
3. on-target 测试通过（LED/权限组合/Notify 频率/OTA 全事务/故障注入/串口 schema）；
4. 产物含版本+shortsha+SHA256；
5. 独立电脑可复现构建（NFR-024）。

### 2.4 真机（E5）DoD

1. Android：TEST-A-001..014 全过（双机型）；
2. 微信：TEST-W-001..010 全过（正式基础库+真机，非模拟器）；
3. Smart HID：TEST-H-001..008 全过（真设备+ControlHub）；
4. 证据包 EVID-001..006 齐备（environment+manifest+媒体+结果矩阵，脱敏）；
5. 无 P0/P1 未决缺陷。

### 2.5 Web/Release（E6）DoD

1. 落地页 TEST-R-001..010 全过（声明/下载/QR/SHA/SEO/a11y/降级）；
2. Release Metadata 与五处版本一致（TEST-C-006）；
3. 全部 CLAIM 状态有证据支撑，无 NOT_RELEASED 之外的缺产物链接；
4. 独立电脑从固定 commit 复现构建+安装（FLOW-014 完整走通）。

### 2.6 最终产品 DoD

1. `01` 第 2 节 13 项固定范围全部交付且达到各自状态目标；
2. 所有 Must REQ 达最低证据等级（`22` 覆盖 100% 执行通过）；
3. 发布阻断规则（`01` 第 8 节）零触发；
4. 发布后烟测（TP-G6）通过：下载/安装/二维码/链接/固件/版本复测；
5. 文档-契约-代码-固件-版本-证据-公开状态七链一致可追踪。

## 3. Gate 对应

| Gate | DoD 段 | 退出 |
|---|---|---|
| TP-G0 | 文档体系 | 本文所在目录全部 REVIEW→用户批准 |
| TP-G1 | 测试规范与脚本 | 计划测试可执行且对错误 Fixture 会失败 |
| TP-G2 | 差距报告 | 每目标项有状态+第一断点 |
| TP-G3 | 修复 | 2.1/2.2 自动化先绿 |
| TP-G4 | E5 | 2.3/2.4 |
| TP-G5 | E6 | 2.5 |
| TP-G6 | 烟测 | 2.6 第 4 条 |

## 4. 反模式（不得视为 Done）

- "页面能打开"≠页面 Done；
- "单测绿"≠功能 Done（缺证据等级）；
- "写完当成功"（OTA/配网）≠事务 Done；
- "模拟器截图"≠E5；
- "本地构建过"≠E6；
- "文档写了"≠实现 Done（无测试映射）。

## 5. 验收条件

- [x] 六层 DoD 可执行且与 Gate 对齐；
- [x] 反模式清单明确。

关联计划测试：全部套件；`TEST-C-002`（DoD 引用完整性）。
