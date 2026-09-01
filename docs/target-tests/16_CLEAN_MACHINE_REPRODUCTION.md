# 16 Clean Machine 复现

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

## 1. 范围 / 非范围

负责：独立电脑从零复现（TEST-E-008/TEST-R-011）。模板：tests/target/release/clean-install.test.md。

## 2. 模式

| 模式 | 范围 | 时限 |
|---|---|---|
| BUILD_ONLY | clone→依赖→build（App+固件）| — |
| HARDWARE_E5 | +烧写+真机闭环 | — |
| RELEASE_VERIFY | +Release 产物下载/SHA/安装/QR | 30 分钟（CLAIM-031） |

## 3. 铁律

固定 Commit+SHA；无私有知识；5 分钟 Quick Start（CLAIM-017）不得冒充 30 分钟闭环。

## 4. 退出条件

TP-G6 至少一台独立机器完成 RELEASE_VERIFY 并归档证据包。
