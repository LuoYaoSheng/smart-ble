# 14 缺陷分级与第一断点

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：TP-G2 起差距/缺陷的分级与定位口径。不负责：修复排期。

## 2. 分级

| 级 | 定义 | 处置 |
|---|---|---|
| P0 | 发布阻断：目标 Must 无自动化/公开假声明/OTA 假成功/安全泄露 | 立即整改，Gate 冻结 |
| P1 | Must 行为差距（如 ERR-CONN-03 半开、配网口径排除缺失） | TP-G2 优先批 |
| P2 | Should/文案/登记漂移（如 FEAT-035 优先级数据） | 随批修复 |

## 3. 第一断点格式

`NOT_IMPLEMENTED: [目标ID…] 第一断点: <缺失模块/接口/行为>`（verify-target 汇总前 20 预览；正式 gap 由 TP-G2 生成）。

## 4. 已登记缺陷（TP-G1 初跑）

| 级 | 缺陷 | 断点 |
|---|---|---|
| P2 | FEAT-035 优先级 md=Must/json=Should + 03 号 §17 陈旧汇总 | product-target.json 数据漂移（本轮禁改） |
| P1 | connectDevice 不编排服务发现 | ERR-CONN-03 半开泄漏面 |
| P1 | Registry 无配网会话分类 | PAGE-007 口径排除规则未实现 |
| P1 | 6 个目标模块 + 4 个目标接口缺失（display-name/log-redaction/public-status/version-metadata/write-queue/reconnect-policy；validateHexInput/validateOtaPackage/subscription_count/keyword 筛选） | TP-G2 批次 1 |
| P2 | VERSION 单源缺失 | 18 号五处同源源头 |
| P2 | 固件：Observer 名/LED 表/特征面与契约不一致 | TP-G2 固件批 |

## 5. 退出条件

分级口径冻结；TP-G2 按此生成正式差距报告。
