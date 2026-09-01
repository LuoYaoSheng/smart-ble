# 11 落地页与 Release 测试规范（TEST-R-001..011 / E6）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：公开落地页 WEB-001 与 Release 产物的声明真实性门禁。
不负责：页面视觉细节（06 号）；发布执行（TP-G5/6）。

## 2. TP-G1 已落地（tests/target/release/，9 用例静态）

| 文件 | 覆盖 | 初跑 |
|---|---|---|
| public-claims.test.mjs | R-003：落地页存在；APK/固件直链必须伴 SHA 且产物存在；VERIFIED 语义邻近证据 | PASS |
| release-artifacts.test.mjs | R-001/002：VERSION 单源；产物登记 URL+SHA 成对；下载规则与契约一致 | 1 FAIL（VERSION 缺失=差距） |
| links-and-qr.test.mjs | R-005/009：相对内链可达；站点根依赖链接→E6 诊断；码图必须文本等价 | PASS |
| clean-install.test.md | R-011：30 分钟 Clean Machine 手工模板（≠5 分钟 Quick Start） | 模板 |

## 3. 发布期门禁（E6 全量）

Hero/版本/状态与五处同源；能力卡证据联动；平台矩阵与 08 号一致；Android/微信/Peripheral/Observer 四入口可达；无产物=NOT_RELEASED 且零直链；URL/SHA 成对；QR 可扫且有文本等价；Evidence/Limitations 区块；SEO/OG/canonical；内外链矩阵；Android fresh install；ESP32 从零；Release Metadata=VERSION/commit/artifact 三元组一致。

## 4. 退出条件

静态 9 用例可运行；差距入册（VERSION 单源缺失为当前第一断点）；生产落地页零修改。
