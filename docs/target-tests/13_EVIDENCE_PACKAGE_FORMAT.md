# 13 证据包格式

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：E4–E6 运行证据的采集格式与隐私红线。不负责：自动化输出（verify-target 即时输出）。

## 2. 目录

`docs/verification/runs/<YYYY-MM-DD>-<gate>/`（TP-G1 起保留，发布 Gate 只增不改）。

## 3. 每包含

| 项 | 要求 |
|---|---|
| environment.md | OS/设备/基础库/AppID 类型/串口口（实测枚举）/Commit |
| runs.md | 用例→结论→第一断点 表 |
| media/ | 截图/录屏（重命名含 TEST ID） |
| serial/ | Observer/Peripheral 串口 JSON 原始流 |
| artifacts.sha256 | 涉及产物的 SHA256 清单 |
| redaction-check.md | 敏感值扫描结论（R-004） |

## 4. 红线

无真实密码/token/个人标识；Observer 流为 Peripheral 正式证据；E0–E4 不得标注 E5+。

## 5. 退出条件

格式冻结；TP-G4+ 真机运行按此归档。
