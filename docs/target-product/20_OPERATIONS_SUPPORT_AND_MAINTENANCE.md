# 20 运维、支持与维护

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Ops
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：发布后支持模型、兼容性运维、回滚、维护节奏、弃用规则与故障 Runbook。

本文不负责：发布流程本身（`18`）；测试规范（`docs/target-tests/`）。

---

## 2. 支持模型

| 渠道 | 用途 | 响应目标 |
|---|---|---|
| GitHub/Gitee Issue（DEC-011） | Bug 与功能 | P0 24h 响应、P1 72h、P2 一周 |
| SECURITY.md 私密渠道 | 安全披露 | 24h 响应、修复前不公开 |
| 文档站 FAQ/故障表 | 自助 | 随版本更新 |

分级：P0=崩溃/假成功/数据泄漏/下载不可用；P1=核心功能 FAIL（扫描/连接/GATT/OTA/配网主路径）；P2=体验问题。

## 3. 兼容性运维

- Android：每版本至少验证 2 台机型（NFR-023）；系统大版本升级后回归 TEST-A 套件；
- 微信：基础库升级监控；正式版发布前在最新稳定基础库跑 TEST-W；
- ESP32：PlatformIO/arduino 框架升级后重跑 TEST-E 构建+冒烟；
- 固件↔App 协议兼容：协议常量锁（TEST-C-012）变更必须双向同步发布。

## 4. 回滚与降级

| 对象 | 回滚方式 |
|---|---|
| App（微信） | 平台审核回退上一版本 |
| App（Android APK） | 落地页指回上一 Release 产物（Metadata 切换） |
| 固件 | 旧固件 bin 重刷；OTA 失败自动保留旧版本运行 |
| 落地页 | 静态站重新部署上一 commit 构建产物 |
| Release Metadata | Git 回退+重新发布（不手改线上数据） |

降级策略：某能力证据失效（如平台 API 变更）→该 CLAIM 降 PREVIEW/BLOCKED 并更新已知限制，不静默保留 VERIFIED。

## 5. 维护节奏

- 例行：每 Release 前全量目标测试；发布后烟测（TP-G6）；
- 依赖巡检：季度（PlatformIO/微信基础库/HBuilderX）；
- 文档同步：任何目标变更走 `00` 第 7 节流程；
- 证据归档：EVID 包随 Release 归档不删除。

## 6. 弃用规则

- 协议字段/错误码：先标 Deprecated（保留兼容）→下个大版本移除；外部正典同步；
- 页面/功能下线：提前一个版本在页面与文档公告；
- 夹具模式变更：固件版本号+迁移说明。

## 7. 故障 Runbook（摘录）

| 症状 | 首查 | 处置 |
|---|---|---|
| 用户扫不到设备 | 权限/蓝牙状态（FLOW-001 路径） | 引导 S-03/04；仍失败收集环境开 Issue |
| OTA 全量失败 | 固件空间/版本回读日志 | ERR-OTA 码定位；引导串口取证 |
| 配网停在 MQTT | TEST-H 诊断路径 | 引导诊断页；确认 ControlHub/MQTT 状态 |
| 落地页下载 404 | Release Metadata/产物 | ERR-WEB-01 流程：修复→重发→复测 |
| 微信扫描失效（新基础库） | 权限策略变更（DEC-003） | 回归 TEST-W-001；必要时发兼容版本 |

## 8. 验收条件与关联测试规划

- [x] 支持/兼容/回滚/维护/弃用/Runbook 齐备；
- [x] 与 `18`/`15` 引用一致。

关联计划测试：`TEST-R-001..010`（发布运维自动化）、TP-G6 烟测模板（`docs/target-tests/` 后续定义）。
